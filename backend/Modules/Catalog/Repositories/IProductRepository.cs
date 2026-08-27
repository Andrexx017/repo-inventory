using Inventory.Modules.Catalog.Entities;

namespace Inventory.Modules.Catalog.Repositories;

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> GetAllAsync();
    Task<Product?> GetByIdAsync(long id);
}

