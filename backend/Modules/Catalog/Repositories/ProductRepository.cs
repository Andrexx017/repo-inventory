using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Catalog.Entities;
using Inventory.Shared.Dtos;
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

    // Para la pantalla de gestión del catálogo (paginada) — a diferencia de
    // GetAllAsync, que sigue trayendo el catálogo completo porque lo usan como
    // fuente de <select> media docena de módulos (Ventas, Compras,
    // Transferencias, Inventario, buscador global).
    public async Task<PagedResult<Product>> GetPagedAsync(
        string? search, long? categoryId, long? baseUnitId, bool? active,
        decimal? minPrice, decimal? maxPrice, int page, int pageSize)
    {
        var query = _db.Products.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(p => EF.Functions.ILike(p.Sku, term) || EF.Functions.ILike(p.Name, term));
        }

        if (categoryId is not null)
        {
            query = query.Where(p => p.CategoryId == categoryId);
        }

        if (baseUnitId is not null)
        {
            query = query.Where(p => p.BaseUnitId == baseUnitId);
        }

        if (active is not null)
        {
            query = query.Where(p => p.Active == active);
        }

        if (minPrice is not null)
        {
            query = query.Where(p => p.ReferencePrice != null && p.ReferencePrice >= minPrice);
        }

        if (maxPrice is not null)
        {
            query = query.Where(p => p.ReferencePrice != null && p.ReferencePrice <= maxPrice);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .Include(p => p.Category)
            .Include(p => p.BaseUnit)
            .Include(p => p.ProductUnits).ThenInclude(pu => pu.Unit)
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<Product>(items, totalCount, page, pageSize);
    }

    public Task<Product?> GetByIdAsync(long id) =>
        _db.Products
            .Include(p => p.Category)
            .Include(p => p.BaseUnit)
            .Include(p => p.ProductUnits).ThenInclude(pu => pu.Unit)
            .FirstOrDefaultAsync(p => p.Id == id);

    public Task<Product?> GetBySkuAsync(string sku) =>
        _db.Products.FirstOrDefaultAsync(p => p.Sku == sku);

    public async Task AddAsync(Product product)
    {
        await _db.Products.AddAsync(product);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Product product)
    {
        _db.Products.Update(product);
        await _db.SaveChangesAsync();
    }

    public async Task AddProductUnitAsync(ProductUnit productUnit)
    {
        await _db.ProductUnits.AddAsync(productUnit);
        await _db.SaveChangesAsync();
    }
}