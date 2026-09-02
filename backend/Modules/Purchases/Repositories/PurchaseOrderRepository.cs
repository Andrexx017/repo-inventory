using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Purchases.Dtos;
using Inventory.Modules.Purchases.Entities;
using Inventory.Shared.Dtos;
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

    public async Task<PagedResult<PurchaseOrder>> GetByBranchAsync(
        long branchId, long? supplierId, long? productId, DateTimeOffset? from, DateTimeOffset? to,
        int page, int pageSize)
    {
        var query = _db.PurchaseOrders.Where(po => po.BranchId == branchId);

        if (supplierId is not null)
        {
            query = query.Where(po => po.SupplierId == supplierId);
        }

        if (productId is not null)
        {
            query = query.Where(po => po.Items.Any(i => i.ProductId == productId));
        }

        if (from is not null)
        {
            query = query.Where(po => po.OrderDate >= from);
        }

        if (to is not null)
        {
            query = query.Where(po => po.OrderDate <= to);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .Include(po => po.Supplier)
            .Include(po => po.Branch)
            .Include(po => po.Items).ThenInclude(i => i.Product)
            .OrderByDescending(po => po.OrderDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<PurchaseOrder>(items, totalCount, page, pageSize);
    }

    // Indicadores del encabezado de Compras — agregados en SQL, no requieren
    // traer las órdenes completas (ver GetByBranchAsync, ya paginado).
    public async Task<PurchaseOrdersKpiDto> GetKpiSummaryAsync(long branchId)
    {
        var now = DateTimeOffset.UtcNow;
        var monthStart = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var monthEnd = monthStart.AddMonths(1);

        var branchOrders = _db.PurchaseOrders.Where(po => po.BranchId == branchId);

        var activeOrders = await branchOrders.CountAsync(po => po.Status != "fully_received" && po.Status != "cancelled");
        var pendingApproval = await branchOrders.CountAsync(po => po.Status == "draft");
        var pendingReceipts = await branchOrders.CountAsync(po => po.Status == "confirmed" || po.Status == "partially_received");
        var monthValue = await branchOrders
            .Where(po => po.OrderDate >= monthStart && po.OrderDate < monthEnd)
            .SumAsync(po => (decimal?)po.Total) ?? 0;

        return new PurchaseOrdersKpiDto(activeOrders, pendingApproval, pendingReceipts, monthValue);
    }

    public Task<int> CountAsync() => _db.PurchaseOrders.CountAsync();

    public void Add(PurchaseOrder order) => _db.PurchaseOrders.Add(order);

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
