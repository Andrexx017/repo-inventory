using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Catalog.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Catalog.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly AppDbContext _db;

    public ProductRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<Product>> GetAllAsync() =>
        await _db.Products
            .Include(p => p.Category)
            .Include(p => p.BaseUnit)
            .Include(p => p.ProductUnits).ThenInclude(pu => pu.Unit)
            .ToListAsync();

    public Task<Product?> GetByIdAsync(long id) =>
        _db.Products
            .Include(p => p.Category)
            .Include(p => p.BaseUnit)
            .Include(p => p.ProductUnits).ThenInclude(pu => pu.Unit)
            .FirstOrDefaultAsync(p => p.Id == id);

    public async Task AddProductUnitAsync(ProductUnit productUnit)
    {
        await _db.ProductUnits.AddAsync(productUnit);
        await _db.SaveChangesAsync();
    }
}