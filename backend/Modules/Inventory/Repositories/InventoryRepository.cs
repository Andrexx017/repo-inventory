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
}