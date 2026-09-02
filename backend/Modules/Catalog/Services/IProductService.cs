using Inventory.Modules.Catalog.Dtos;
using Inventory.Shared.Dtos;

namespace Inventory.Modules.Catalog.Services;

public interface IProductService
{
    Task<IReadOnlyList<ProductDto>> GetAllAsync();

    Task<PagedResult<ProductDto>> GetPagedAsync(
        string? search, long? categoryId, long? baseUnitId, bool? active,
        decimal? minPrice, decimal? maxPrice, int page, int pageSize);

    Task<ProductDto?> GetByIdAsync(long id);
    Task<ProductDto> CreateAsync(CreateProductDto request);
    Task<ProductDto?> UpdateAsync(long id, UpdateProductDto request);

    // RF-10: asocia una unidad alternativa (con su factor de conversión) a un
    // producto existente. Devuelve el producto completo para que el frontend
    // pueda refrescar la lista de AlternateUnits sin pedirlo aparte.
    Task<ProductDto> AddUnitAsync(long productId, CreateProductUnitDto request);
}
