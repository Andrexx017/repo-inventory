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
    Task<IReadOnlyList<Transfer>> GetByBranchAsync(long branchId, bool activeOnly = false);

    // RF-28: transferencias para el reporte de cumplimiento logístico. branchId
    // null = reporte global (solo Admin); con valor, se acota a esa sucursal
    // (origen o destino) igual que GetByBranchAsync.
    Task<IReadOnlyList<Transfer>> GetForComplianceReportAsync(long? branchId);

    Task<int> CountAsync();
    void Add(Transfer transfer);
    Task SaveChangesAsync();
}
