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
            // ThenInclude(BaseUnit)/Include(Category): antes solo hacía falta Product.Sku/Name
            // para armar InventoryMovementDto, pero SetThresholdsAsync (RF-09) devuelve un
            // InventoryItemDto completo, que sí necesita BaseUnit/Category ya cargados —
            // sin este include, item.Product.BaseUnit sale null y explota en ToDto().
            .Include(i => i.Product).ThenInclude(p => p.BaseUnit)
            .Include(i => i.Product).ThenInclude(p => p.Category)
            .Include(i => i.Branch)
            .FirstOrDefaultAsync(i => i.BranchId == branchId && i.ProductId == productId);

    public void AddItem(InventoryItem item) =>
        _db.InventoryItems.Add(item);

    public void AddMovement(InventoryMovement movement) =>
        _db.InventoryMovements.Add(movement);

    public Task SaveChangesAsync() =>
        _db.SaveChangesAsync();

    // RF-11: historial ordenado del más reciente al más antiguo (OrderByDescending),
    // que es como se quiere ver una bitácora de auditoría. productId es opcional:
    // sin filtro trae todos los movimientos de la sucursal (auditoría general),
    // con filtro trae la trazabilidad de un solo producto.
    public async Task<IReadOnlyList<InventoryMovement>> GetMovementsByBranchAsync(long branchId, long? productId)
    {
        var query = _db.InventoryMovements
            .Where(m => m.BranchId == branchId)
            .Include(m => m.Branch)
            .Include(m => m.Product)
            .AsQueryable();

        if (productId is not null)
        {
            query = query.Where(m => m.ProductId == productId);
        }

        return await query.OrderByDescending(m => m.MovementDate).ToListAsync();
    }

    // RF-09: busca una alerta ya disparada y todavía sin resolver para ese
    // producto/sucursal/tipo — así el Service no crea una segunda alerta
    // duplicada mientras la primera siga 'pending'.
    public Task<StockAlert?> GetPendingAlertAsync(long branchId, long productId, string alertType) =>
        _db.StockAlerts.FirstOrDefaultAsync(a =>
            a.BranchId == branchId &&
            a.ProductId == productId &&
            a.AlertType == alertType &&
            a.Status == "pending");

    public void AddAlert(StockAlert alert) =>
        _db.StockAlerts.Add(alert);

    public async Task<IReadOnlyList<StockAlert>> GetAlertsByBranchAsync(long branchId) =>
        await _db.StockAlerts
            .Where(a => a.BranchId == branchId)
            .Include(a => a.Branch)
            .Include(a => a.Product)
            .OrderByDescending(a => a.TriggeredAt)
            .ToListAsync();
}