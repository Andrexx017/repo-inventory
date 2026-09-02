using Inventory.Modules.Purchases.Dtos;
using Inventory.Modules.Purchases.Entities;
using Inventory.Shared.Dtos;

namespace Inventory.Modules.Purchases.Repositories;

public interface IPurchaseOrderRepository
{
    Task<PurchaseOrder?> GetByIdAsync(long id);

    // RF-14: histórico de compras consultable por proveedor y por producto —
    // supplierId/productId son opcionales, mismo criterio que el ?productId=
    // de GetMovementsByBranchAsync en el módulo Inventory. from/to filtran por
    // rango de fechas sobre OrderDate. Paginado (page/pageSize) porque el
    // historial no tiene límite de crecimiento.
    Task<PagedResult<PurchaseOrder>> GetByBranchAsync(
        long branchId, long? supplierId, long? productId, DateTimeOffset? from, DateTimeOffset? to,
        int page, int pageSize);

    // Indicadores del encabezado (activas/pendientes/valor del mes) — agregados,
    // no requieren traer las órdenes completas.
    Task<PurchaseOrdersKpiDto> GetKpiSummaryAsync(long branchId);
    Task<int> CountAsync();
    void Add(PurchaseOrder order);
    Task SaveChangesAsync();
}
