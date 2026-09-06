using Inventory.Modules.Transfers.Dtos;
using Inventory.Shared.Dtos;

namespace Inventory.Modules.Transfers.Services;

public interface ITransferService
{
    // RF-20: la sucursal DESTINO (o el admin) solicita la transferencia.
    Task<TransferDto> CreateAsync(long destinationBranchId, CreateTransferDto request, long requestedByUserId);

    // sortBy (RF-26): "priority", "cost" o "time" — clasifica las rutas de la
    // sucursal por esos tres criterios; null = orden por defecto (más reciente
    // primero). activeOnly (RF-27): solo transferencias en curso. statuses:
    // filtro explícito por estado(s) (pestañas del frontend). from/to filtran
    // por rango de fechas sobre RequestDate. Paginado (page/pageSize).
    Task<PagedResult<TransferDto>> GetByBranchAsync(
        long branchId, string? sortBy, bool activeOnly, IReadOnlyList<string>? statuses,
        DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize);

    Task<TransfersKpiDto> GetKpiSummaryAsync(long branchId);
    Task<TransferDto?> GetByIdAsync(long id);

    // El Gerente (+Admin) de la sucursal DESTINO aprueba la solicitud de su
    // propio Operador antes de que la sucursal origen pueda prepararla.
    Task<TransferDto> ApproveAsync(long destinationBranchId, long id, long actingUserId);

    // Denegar (sin aprobar todavía) o cancelar (ya en preparación) — desde
    // origen o destino, mientras no se haya despachado físicamente.
    Task<TransferDto> CancelAsync(long branchId, long id, long actingUserId);

    // RF-21: la sucursal ORIGEN revisa disponibilidad y confirma/ajusta cuánto
    // va a despachar de cada línea.
    Task<TransferDto> PrepareAsync(long originBranchId, long id, PrepareTransferDto request, long actingUserId);

    // RF-22: la sucursal ORIGEN despacha físicamente la transferencia.
    Task<TransferDto> ShipAsync(long originBranchId, long id, ShipTransferDto request, long actingUserId);

    // RF-23/RF-24: la sucursal DESTINO confirma cuánto recibió de cada línea —
    // completa (RF-23) o con faltante y tratamiento obligatorio (RF-24).
    Task<TransferDto> ReceiveAsync(long destinationBranchId, long id, ReceiveTransferDto request, long actingUserId);

    // RF-28: reporte de cumplimiento logístico agrupado por ruta. branchId null
    // = reporte global (solo Admin); con valor, acotado a esa sucursal.
    Task<IReadOnlyList<RouteComplianceDto>> GetComplianceReportAsync(long? branchId);
}
