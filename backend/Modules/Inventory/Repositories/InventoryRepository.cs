using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Inventory.Entities;
using Inventory.Shared.Dtos;
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

    // Para la pantalla de Existencias (paginada, con búsqueda/filtros) — a
    // diferencia de GetByBranchAsync (arriba), que sigue trayendo TODAS las
    // existencias de la sucursal sin paginar porque la campana de
    // notificaciones y el Home la usan para cruzar alertas por productId,
    // no solo para pintar una tabla (mismo criterio que GetAllAsync en
    // ProductRepository).
    // status (ok/bajo/critico) replica en SQL el mismo semáforo que
    // useInventory.js calcula en el frontend (stockStatus()) — se duplica acá
    // a propósito para poder filtrar en la base sin traer todo el inventario.
    public async Task<PagedResult<InventoryItem>> GetPagedByBranchAsync(
        long branchId, string? search, long? categoryId, string? status, int page, int pageSize)
    {
        var query = _db.InventoryItems.Where(i => i.BranchId == branchId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(i => EF.Functions.ILike(i.Product.Sku, term) || EF.Functions.ILike(i.Product.Name, term));
        }

        if (categoryId is not null)
        {
            query = query.Where(i => i.Product.CategoryId == categoryId);
        }

        query = status switch
        {
            "critico" => query.Where(i => i.MinimumStock > 0 && i.CurrentQuantity <= i.MinimumStock * 0.5m),
            "bajo" => query.Where(i => i.MinimumStock > 0
                && i.CurrentQuantity <= i.MinimumStock && i.CurrentQuantity > i.MinimumStock * 0.5m),
            "ok" => query.Where(i => i.MinimumStock <= 0 || i.CurrentQuantity > i.MinimumStock),
            _ => query,
        };

        var totalCount = await query.CountAsync();

        var items = await query
            .Include(i => i.Product).ThenInclude(p => p.BaseUnit)
            .Include(i => i.Product).ThenInclude(p => p.Category)
            .OrderBy(i => i.Product.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<InventoryItem>(items, totalCount, page, pageSize);
    }

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
    public async Task<PagedResult<InventoryMovement>> GetMovementsByBranchAsync(
        long branchId, long? productId, DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize)
    {
        var query = _db.InventoryMovements
            .Where(m => m.BranchId == branchId)
            .Include(m => m.Branch)
            .Include(m => m.Product)
            .Include(m => m.ResponsibleUser)
            .AsQueryable();

        if (productId is not null)
        {
            query = query.Where(m => m.ProductId == productId);
        }

        if (from is not null)
        {
            query = query.Where(m => m.MovementDate >= from);
        }

        if (to is not null)
        {
            query = query.Where(m => m.MovementDate <= to);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(m => m.MovementDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<InventoryMovement>(items, totalCount, page, pageSize);
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

    // RF-34: sin AsNoTracking a propósito — ResolveAlertAsync modifica Status/
    // ResolvedBy/ResolvedAt sobre el objeto que devuelve este mismo método.
    public Task<StockAlert?> GetAlertByIdAsync(long branchId, long alertId) =>
        _db.StockAlerts
            .Include(a => a.Branch)
            .Include(a => a.Product)
            .FirstOrDefaultAsync(a => a.Id == alertId && a.BranchId == branchId);
}