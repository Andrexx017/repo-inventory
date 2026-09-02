using Inventory.Modules.Inventory.Dtos;
using Inventory.Modules.Inventory.Entities;
using Inventory.Shared.Dtos;

namespace Inventory.Modules.Inventory.Services;

public interface IInventoryService
{
    // RF-09/RF-34, expuesto para otros módulos que cambian stock por su cuenta
    // (ej. Sales, Transfers) y necesitan la misma lógica de alerta/auto-resolución
    // que ya usan los movimientos manuales — evita duplicar esta regla en cada
    // módulo. Chequea AMBOS umbrales (mínimo y máximo, RF-34: "por arriba o por
    // abajo"), no solo el mínimo — de ahí el nombre, distinto del original
    // CheckLowStockAlertAsync de RF-09.
    Task CheckStockAlertsAsync(InventoryItem item, long actingUserId);

    Task<IReadOnlyList<InventoryItemDto>> GetByBranchAsync(long branchId);

    // Paginada y filtrable (búsqueda, categoría, estado ok/bajo/critico) —
    // ver comentario en GetPagedByBranchAsync del repositorio.
    Task<PagedResult<InventoryItemDto>> GetPagedByBranchAsync(
        long branchId, string? search, long? categoryId, string? status, int page, int pageSize);

    Task<InventoryMovementDto> RegisterIncomingMovementAsync(
        long branchId, CreateInventoryMovementDto request, long responsibleUserId);
    // RF-08: retiro de producto (venta, merma, ajuste) — resta stock en vez de sumarlo
    Task<InventoryMovementDto> RegisterOutgoingMovementAsync(
        long branchId, CreateInventoryMovementDto request, long responsibleUserId);

    // RF-11: historial de movimientos de una sucursal, opcionalmente filtrado por
    // producto y por rango de fechas (from/to), y paginado (page/pageSize) para
    // no traer el historial completo.
    Task<PagedResult<InventoryMovementDto>> GetMovementsAsync(
        long branchId, long? productId, DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize);

    // RF-09: define/actualiza el stock mínimo (y máximo opcional) de un producto en
    // una sucursal. Get-or-create: se puede fijar el umbral antes de que exista
    // stock todavía (el producto arranca con CurrentQuantity = 0).
    Task<InventoryItemDto> SetThresholdsAsync(
        long branchId, long productId, UpdateInventoryThresholdsDto request, long userId);

    // RF-09/RF-34: alertas de stock (bajo y alto) generadas para una sucursal
    // (pendientes y resueltas).
    Task<IReadOnlyList<StockAlertDto>> GetAlertsAsync(long branchId);

    // RF-34: marca una alerta como resuelta a mano (responsable + fecha), a
    // diferencia de la auto-resolución que ya hace CheckStockAlertsAsync cuando
    // el stock se recupera solo.
    Task<StockAlertDto> ResolveAlertAsync(long branchId, long alertId, long actingUserId);
}