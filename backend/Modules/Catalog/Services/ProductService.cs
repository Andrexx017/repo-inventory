using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Entities;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Shared.Dtos;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Catalog.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _products;
    private readonly IUnitOfMeasureRepository _units;
    private readonly IProductCategoryRepository _categories;

    public ProductService(IProductRepository products, IUnitOfMeasureRepository units, IProductCategoryRepository categories)
    {
        _products = products;
        _units = units;
        _categories = categories;
    }

    public async Task<IReadOnlyList<ProductDto>> GetAllAsync()
    {
        var products = await _products.GetAllAsync();
        return products.Select(ToDto).ToList();
    }

    public async Task<PagedResult<ProductDto>> GetPagedAsync(
        string? search, long? categoryId, long? baseUnitId, bool? active,
        decimal? minPrice, decimal? maxPrice, int page, int pageSize)
    {
        var result = await _products.GetPagedAsync(search, categoryId, baseUnitId, active, minPrice, maxPrice, page, pageSize);
        var items = result.Items.Select(ToDto).ToList();
        return new PagedResult<ProductDto>(items, result.TotalCount, result.Page, result.PageSize);
    }

    public async Task<ProductDto?> GetByIdAsync(long id)
    {
        var product = await _products.GetByIdAsync(id);
        return product is null ? null : ToDto(product);
    }

    public async Task<ProductDto> CreateAsync(CreateProductDto request)
    {
        if (await _products.GetBySkuAsync(request.Sku) is not null)
        {
            throw new ConflictException($"Ya existe un producto con el SKU '{request.Sku}'.");
        }

        if (await _units.GetByIdAsync(request.BaseUnitId) is null)
        {
            throw new DomainException($"La unidad de medida {request.BaseUnitId} no existe.");
        }

        if (request.CategoryId is not null && await _categories.GetByIdAsync(request.CategoryId.Value) is null)
        {
            throw new DomainException($"La categoría {request.CategoryId} no existe.");
        }

        var product = new Product
        {
            Sku = request.Sku,
            Name = request.Name,
            Description = request.Description,
            CategoryId = request.CategoryId,
            BaseUnitId = request.BaseUnitId,
            ReferencePrice = request.ReferencePrice,
            Active = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await _products.AddAsync(product);

        // Se vuelve a pedir el producto completo (mismo criterio que AddUnitAsync)
        // para que Category/BaseUnit vengan resueltos por el JOIN de GetByIdAsync.
        var created = await _products.GetByIdAsync(product.Id);
        return ToDto(created!);
    }

    public async Task<ProductDto?> UpdateAsync(long id, UpdateProductDto request)
    {
        var product = await _products.GetByIdAsync(id);
        if (product is null)
        {
            return null;
        }

        if (await _units.GetByIdAsync(request.BaseUnitId) is null)
        {
            throw new DomainException($"La unidad de medida {request.BaseUnitId} no existe.");
        }

        if (request.CategoryId is not null && await _categories.GetByIdAsync(request.CategoryId.Value) is null)
        {
            throw new DomainException($"La categoría {request.CategoryId} no existe.");
        }

        product.Name = request.Name;
        product.Description = request.Description;
        product.CategoryId = request.CategoryId;
        product.BaseUnitId = request.BaseUnitId;
        product.ReferencePrice = request.ReferencePrice;
        product.Active = request.Active;

        await _products.UpdateAsync(product);

        // Igual criterio que CreateAsync: releer para que Category/BaseUnit queden
        // resueltos con el valor nuevo, no con la navegación ya cargada del FK viejo.
        var updated = await _products.GetByIdAsync(id);
        return ToDto(updated!);
    }

    public async Task<ProductDto> AddUnitAsync(long productId, CreateProductUnitDto request)
    {
        var product = await _products.GetByIdAsync(productId)
            ?? throw new DomainException($"El producto {productId} no existe.");

        // Igual criterio que RegisterIncomingMovementAsync (Inventory): validar acá
        // con un mensaje claro (400) antes de dejar que la FK de Postgres reviente
        // como un 500 crudo si mandan un unitId inexistente.
        var unit = await _units.GetByIdAsync(request.UnitId)
            ?? throw new DomainException($"La unidad de medida {request.UnitId} no existe.");

        if (product.BaseUnitId == unit.Id)
        {
            throw new DomainException($"'{unit.Name}' ya es la unidad base del producto, no hace falta asociarla como alternativa.");
        }

        // La tabla ya tiene UNIQUE (product_id, unit_id) — se repite acá para un
        // ConflictException (409) legible en vez de la excepción cruda de Postgres.
        if (product.ProductUnits.Any(pu => pu.UnitId == request.UnitId))
        {
            throw new ConflictException($"El producto ya tiene asociada la unidad '{unit.Name}'.");
        }

        await _products.AddProductUnitAsync(new ProductUnit
        {
            ProductId = productId,
            UnitId = request.UnitId,
            ConversionFactor = request.ConversionFactor,
            IsPurchaseUnit = request.IsPurchaseUnit,
            IsSaleUnit = request.IsSaleUnit,
        });

        // Se vuelve a pedir el producto completo (en vez de armar el DTO a mano)
        // para que AlternateUnits venga con el Unit.Name/Abbreviation ya resueltos
        // por el JOIN de GetByIdAsync, sin duplicar ese mapeo acá.
        var updated = await _products.GetByIdAsync(productId);
        return ToDto(updated!);
    }

    private static ProductDto ToDto(Product product) => new(
        product.Id,
        product.Sku,
        product.Name,
        product.Description,
        product.CategoryId,
        product.Category?.Name,
        product.BaseUnitId,
        product.BaseUnit.Name,
        product.BaseUnit.Abbreviation,
        product.ReferencePrice,
        product.Active,
        product.CreatedAt,
        product.ProductUnits.Select(ToUnitDto).ToList()
    );

    private static ProductUnitDto ToUnitDto(ProductUnit productUnit) => new(
        productUnit.UnitId,
        productUnit.Unit.Name,
        productUnit.Unit.Abbreviation,
        productUnit.ConversionFactor,
        productUnit.IsPurchaseUnit,
        productUnit.IsSaleUnit
    );
}
