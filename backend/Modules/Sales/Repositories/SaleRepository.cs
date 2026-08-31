using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Sales.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Inventory.Modules.Sales.Repositories;

public class SaleRepository : ISaleRepository
{
    private readonly AppDbContext _db;

    public SaleRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<Sale?> GetByIdAsync(long id) =>
        _db.Sales
            .Include(s => s.Branch)
            .Include(s => s.PriceList)
            .Include(s => s.Seller)
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(s => s.Id == id);

    public async Task<IReadOnlyList<Sale>> GetByBranchAsync(long branchId) =>
        await _db.Sales
            .Where(s => s.BranchId == branchId)
            .Include(s => s.Branch)
            .Include(s => s.PriceList)
            .Include(s => s.Seller)
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .OrderByDescending(s => s.SaleDate)
            .ToListAsync();

    public Task<int> CountAsync() => _db.Sales.CountAsync();

    public void Add(Sale sale) => _db.Sales.Add(sale);

    // Comparte el AppDbContext scoped con IInventoryRepository — un solo
    // SaveChangesAsync confirma la venta, el InventoryItem descontado, el
    // InventoryMovement y la alerta de stock bajo (si se disparó), todo junto.
    public Task SaveChangesAsync() => _db.SaveChangesAsync();

    public Task<IDbContextTransaction> BeginTransactionAsync() => _db.Database.BeginTransactionAsync();
}
