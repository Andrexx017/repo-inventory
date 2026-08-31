using Inventory.Modules.Inventory.Dtos;

namespace Inventory.Modules.Inventory.Services;

public interface IInventoryService
{
    Task<IReadOnlyList<InventoryItemDto>> GetByBranchAsync(long branchId);
    Task<InventoryMovementDto> RegisterIncomingMovementAsync(
        long branchId, CreateInventoryMovementDto request, long responsibleUserId);
    // RF-08: retiro de producto (venta, merma, ajuste) — resta stock en vez de sumarlo
    Task<InventoryMovementDto> RegisterOutgoingMovementAsync(
        long branchId, CreateInventoryMovementDto request, long responsibleUserId);

    // RF-11: historial de movimientos de una sucursal, opcionalmente filtrado por producto.
    Task<IReadOnlyList<InventoryMovementDto>> GetMovementsAsync(long branchId, long? productId);

    // RF-09: define/actualiza el stock mínimo (y máximo opcional) de un producto en
    // una sucursal. Get-or-create: se puede fijar el umbral antes de que exista
    // stock todavía (el producto arranca con CurrentQuantity = 0).
    Task<InventoryItemDto> SetThresholdsAsync(long branchId, long productId, UpdateInventoryThresholdsDto request);

    // RF-09: alertas de stock bajo generadas para una sucursal (pendientes y resueltas).
    Task<IReadOnlyList<StockAlertDto>> GetAlertsAsync(long branchId);
}