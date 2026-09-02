using Inventory.Modules.Inventory.Entities;
using Inventory.Shared.Dtos;

namespace Inventory.Modules.Inventory.Repositories;

public interface IInventoryRepository
{
    Task<IReadOnlyList<InventoryItem>> GetByBranchAsync(long branchId);

    // Paginada y filtrable (búsqueda por SKU/nombre, categoría, estado de
    // stock ok/bajo/critico) — para la pantalla de Existencias. GetByBranchAsync
    // (arriba) sigue trayendo el inventario completo porque lo usan la campana
    // de notificaciones y el Home para cruzar alertas por productId.
    Task<PagedResult<InventoryItem>> GetPagedByBranchAsync(
        long branchId, string? search, long? categoryId, string? status, int page, int pageSize);

    Task<InventoryItem?> GetItemAsync(long branchId, long productId);
    void AddItem(InventoryItem item);
    void AddMovement(InventoryMovement movement);
    Task SaveChangesAsync();

    // RF-11: historial de movimientos de una sucursal (opcionalmente filtrado por
    // producto y por rango de fechas), del más reciente al más antiguo — es la
    // consulta de auditoría. Paginado (page/pageSize) porque el historial no
    // tiene límite de crecimiento.
    Task<PagedResult<InventoryMovement>> GetMovementsByBranchAsync(
        long branchId, long? productId, DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize);

    // RF-09/RF-34: alertas de stock por sucursal. GetPendingAlertAsync evita duplicar
    // una alerta mientras la anterior siga sin resolver (ver InventoryService).
    Task<StockAlert?> GetPendingAlertAsync(long branchId, long productId, string alertType);
    void AddAlert(StockAlert alert);
    Task<IReadOnlyList<StockAlert>> GetAlertsByBranchAsync(long branchId);

    // RF-34: una alerta puntual para poder marcarla resuelta manualmente — a
    // diferencia de GetPendingAlertAsync (que busca por tipo, sin Id), acá el
    // cliente ya sabe qué alerta quiere resolver.
    Task<StockAlert?> GetAlertByIdAsync(long branchId, long alertId);
}