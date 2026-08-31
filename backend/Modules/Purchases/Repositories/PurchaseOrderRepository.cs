using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Purchases.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Purchases.Repositories;

public class PurchaseOrderRepository : IPurchaseOrderRepository
{
    private readonly AppDbContext _db;

    public PurchaseOrderRepository(AppDbContext db)
    {
        _db = db;
    }

    // Sin AsNoTracking a propósito: ApproveAsync/CancelAsync leen con este mismo
    // método y después modifican Status sobre el objeto devuelto (mismo criterio
    // que InventoryRepository.GetItemAsync — EF solo genera UPDATE de una entidad
    // si la está trackeando).
    public Task<PurchaseOrder?> GetByIdAsync(long id) =>
        _db.PurchaseOrders
            .Include(po => po.Supplier)
            .Include(po => po.Branch)
            .Include(po => po.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(po => po.Id == id);

    public async Task<IReadOnlyList<PurchaseOrder>> GetByBranchAsync(long branchId, long? supplierId, long? productId)
    {
        var query = _db.PurchaseOrders
            .Where(po => po.BranchId == branchId)
            .Include(po => po.Supplier)
            .Include(po => po.Branch)
            .Include(po => po.Items).ThenInclude(i => i.Product)
            .AsQueryable();

        if (supplierId is not null)
        {
            query = query.Where(po => po.SupplierId == supplierId);
        }

        if (productId is not null)
        {
            query = query.Where(po => po.Items.Any(i => i.ProductId == productId));
        }

        return await query.OrderByDescending(po => po.OrderDate).ToListAsync();
    }

    public Task<int> CountAsync() => _db.PurchaseOrders.CountAsync();

    public void Add(PurchaseOrder order) => _db.PurchaseOrders.Add(order);

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
