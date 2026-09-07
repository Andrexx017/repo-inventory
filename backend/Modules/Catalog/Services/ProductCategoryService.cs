using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Entities;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Shared.Exceptions;

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

    public async Task<ProductCategoryDto> CreateAsync(CreateProductCategoryDto request)
    {
        if (await _categories.GetByNameAsync(request.Name) is not null)
        {
            throw new ConflictException($"Ya existe una categoría con el nombre '{request.Name}'.");
        }

        var category = new ProductCategory
        {
            Name = request.Name,
            Description = request.Description,
        };

        await _categories.AddAsync(category);
        return ToDto(category);
    }

    private static ProductCategoryDto ToDto(ProductCategory category) => new(category.Id, category.Name, category.Description);
}
