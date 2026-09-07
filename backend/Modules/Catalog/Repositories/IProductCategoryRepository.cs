using Inventory.Modules.Catalog.Entities;

namespace Inventory.Modules.Catalog.Repositories;

public interface IProductCategoryRepository
{
    Task<IReadOnlyList<ProductCategory>> GetAllAsync();
    Task<ProductCategory?> GetByIdAsync(long id);
    Task<ProductCategory?> GetByNameAsync(string name);
    Task AddAsync(ProductCategory category);
}
