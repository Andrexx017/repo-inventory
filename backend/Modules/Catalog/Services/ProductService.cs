using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Entities;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Catalog.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _products;
    private readonly IUnitOfMeasureRepository _units;

    public ProductService(IProductRepository products, IUnitOfMeasureRepository units)
    {
        _products = products;
        _units = units;
    }

    public async Task<IReadOnlyList<ProductDto>> GetAllAsync()
    {
        var products = await _products.GetAllAsync();
        return products.Select(ToDto).ToList();
    }

    public async Task<ProductDto?> GetByIdAsync(long id)
    {
        var product = await _products.GetByIdAsync(id);
        return product is null ? null : ToDto(product);
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
