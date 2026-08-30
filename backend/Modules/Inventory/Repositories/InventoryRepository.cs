using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Inventory.Repositories;

public class InventoryRepository : IInventoryRepository
{
    private readonly AppDbContext _db;

    public InventoryRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<InventoryItem>> GetByBranchAsync(long branchId) =>
        await _db.InventoryItems
            .Where(i => i.BranchId == branchId)
            .Include(i => i.Product).ThenInclude(p => p.BaseUnit)
            .Include(i => i.Product).ThenInclude(p => p.Category)
            .ToListAsync();

    public Task<InventoryItem?> GetItemAsync(long branchId, long productId) =>
        _db.InventoryItems
            .Include(i => i.Product)
            .Include(i => i.Branch)
            .FirstOrDefaultAsync(i => i.BranchId == branchId && i.ProductId == productId);

    public void AddItem(InventoryItem item) =>
        _db.InventoryItems.Add(item);

    public void AddMovement(InventoryMovement movement) =>
        _db.InventoryMovements.Add(movement);

    public Task SaveChangesAsync() =>
        _db.SaveChangesAsync();
}