using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Catalog.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Catalog.Repositories;

public class ProductCategoryRepository : IProductCategoryRepository
{
    private readonly AppDbContext _db;

    public ProductCategoryRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ProductCategory>> GetAllAsync() =>
        await _db.ProductCategories.ToListAsync();

    public Task<ProductCategory?> GetByIdAsync(long id) =>
        _db.ProductCategories.FirstOrDefaultAsync(c => c.Id == id);

    public Task<ProductCategory?> GetByNameAsync(string name) =>
        _db.ProductCategories.FirstOrDefaultAsync(c => c.Name == name);

    public async Task AddAsync(ProductCategory category)
    {
        await _db.ProductCategories.AddAsync(category);
        await _db.SaveChangesAsync();
    }
}
