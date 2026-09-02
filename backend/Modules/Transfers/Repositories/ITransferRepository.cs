using Inventory.Modules.Transfers.Dtos;
using Inventory.Modules.Transfers.Entities;

namespace Inventory.Modules.Transfers.Repositories;

public interface ITransferRepository
{
    Task<Transfer?> GetByIdAsync(long id);

    // Una sucursal necesita ver tanto lo que solicitó (destino) como lo que le
    // piden despachar (origen) — por eso filtra por branchId en cualquiera de
    // los dos roles, no solo uno.
    // activeOnly (RF-27): filtra a solo las transferencias "en curso" (todavía
    // no cerradas del todo), en vez de traer también las ya resueltas.
    // statuses: filtro explícito por estado(s) — lo usan las pestañas del
    // frontend (solicitadas/tránsito/recibidas). from/to filtran por rango de
    // fechas sobre RequestDate.
    Task<IReadOnlyList<Transfer>> GetByBranchAsync(
        long branchId, bool activeOnly = false, IReadOnlyList<string>? statuses = null,
        DateTimeOffset? from = null, DateTimeOffset? to = null);

    // Indicadores del encabezado (en tránsito/pendientes/recibidas del mes/
    // retraso promedio) — agregados, no requieren traer las transferencias completas.
    Task<TransfersKpiDto> GetKpiSummaryAsync(long branchId);

    // RF-28: transferencias para el reporte de cumplimiento logístico. branchId
    // null = reporte global (solo Admin); con valor, se acota a esa sucursal
    // (origen o destino) igual que GetByBranchAsync.
    Task<IReadOnlyList<Transfer>> GetForComplianceReportAsync(long? branchId);

    Task<int> CountAsync();
    void Add(Transfer transfer);
    Task SaveChangesAsync();
}
