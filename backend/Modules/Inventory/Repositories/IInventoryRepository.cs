using Inventory.Modules.Inventory.Entities;

namespace Inventory.Modules.Inventory.Repositories;

public interface IInventoryRepository
{
    Task<IReadOnlyList<InventoryItem>> GetByBranchAsync(long branchId);

    Task<InventoryItem?> GetItemAsync(long branchId, long productId);
    void AddItem(InventoryItem item);
    void AddMovement(InventoryMovement movement);
    Task SaveChangesAsync();

    // RF-11: historial de movimientos de una sucursal (opcionalmente filtrado por
    // producto), del más reciente al más antiguo — es la consulta de auditoría.
    Task<IReadOnlyList<InventoryMovement>> GetMovementsByBranchAsync(long branchId, long? productId);

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