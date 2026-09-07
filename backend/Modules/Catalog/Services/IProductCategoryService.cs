using Inventory.Modules.Catalog.Dtos;

namespace Inventory.Modules.Catalog.Services;

public interface IProductCategoryService
{
    Task<IReadOnlyList<ProductCategoryDto>> GetAllAsync();
    Task<ProductCategoryDto> CreateAsync(CreateProductCategoryDto request);
}
