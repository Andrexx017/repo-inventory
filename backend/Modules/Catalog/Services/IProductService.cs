using Inventory.Modules.Catalog.Dtos;

namespace Inventory.Modules.Catalog.Services;

public interface IProductService
{
    Task<IReadOnlyList<ProductDto>> GetAllAsync();
    Task<ProductDto?> GetByIdAsync(long id);
}
