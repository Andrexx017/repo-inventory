using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Entities;
using Inventory.Modules.Catalog.Repositories;

namespace Inventory.Modules.Catalog.Services;

public class ProductCategoryService : IProductCategoryService
{
    private readonly IProductCategoryRepository _categories;

    public ProductCategoryService(IProductCategoryRepository categories)
    {
        _categories = categories;
    }

    public async Task<IReadOnlyList<ProductCategoryDto>> GetAllAsync()
    {
        var categories = await _categories.GetAllAsync();
        return categories.Select(ToDto).ToList();
    }

    private static ProductCategoryDto ToDto(ProductCategory category) => new(category.Id, category.Name, category.Description);
}
