using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Transfers.Dtos;
using Inventory.Modules.Transfers.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Transfers.Repositories;

public class TransferRepository : ITransferRepository
{
    private readonly AppDbContext _db;

    public TransferRepository(AppDbContext db)
    {
        _db = db;
    }

    // Sin AsNoTracking a propósito: PrepareAsync (RF-21) modifica Status y las
    // líneas sobre el objeto devuelto por este mismo método.
    public Task<Transfer?> GetByIdAsync(long id) =>
        _db.Transfers
            .Include(t => t.OriginBranch)
            .Include(t => t.DestinationBranch)
            .Include(t => t.Items).ThenInclude(i => i.Product)
            .Include(t => t.Events)
            .FirstOrDefaultAsync(t => t.Id == id);

    // "En curso" (RF-27) = todavía no llegó a un estado final. 'requested' se
    // excluye a propósito: recién solicitada, ni siquiera empezó el flujo
    // logístico (preparación/despacho) que este filtro está pensado para mostrar.
    private static readonly string[] ActiveStatuses = ["preparing", "in_transit", "partially_received"];

    // statuses (RF-26/pestañas del frontend: solicitadas/tránsito/recibidas) filtra
    // por un conjunto explícito de estados — a diferencia de activeOnly (RF-27,
    // "en curso"), que es un conjunto fijo. Se pueden combinar con AND.
    public async Task<IReadOnlyList<Transfer>> GetByBranchAsync(
        long branchId, bool activeOnly = false, IReadOnlyList<string>? statuses = null,
        DateTimeOffset? from = null, DateTimeOffset? to = null)
    {
        var query = _db.Transfers
            .Where(t => t.OriginBranchId == branchId || t.DestinationBranchId == branchId);

        if (activeOnly)
        {
            query = query.Where(t => ActiveStatuses.Contains(t.Status));
        }

        if (statuses is { Count: > 0 })
        {
            query = query.Where(t => statuses.Contains(t.Status));
        }

        if (from is not null)
        {
            query = query.Where(t => t.RequestDate >= from);
        }

        if (to is not null)
        {
            query = query.Where(t => t.RequestDate <= to);
        }

        return await query
            .Include(t => t.OriginBranch)
            .Include(t => t.DestinationBranch)
            .Include(t => t.Items).ThenInclude(i => i.Product)
            .OrderByDescending(t => t.RequestDate)
            .ToListAsync();
    }

    // Indicadores del encabezado de Transferencias — agregados/proyecciones
    // livianas en vez de traer el grafo completo (Include de sucursales/items)
    // que sí necesita GetByBranchAsync para armar el TransferDto.
    public async Task<TransfersKpiDto> GetKpiSummaryAsync(long branchId)
    {
        var now = DateTimeOffset.UtcNow;
        var monthStart = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var monthEnd = monthStart.AddMonths(1);

        var branchTransfers = _db.Transfers
            .Where(t => t.OriginBranchId == branchId || t.DestinationBranchId == branchId);

        var inTransit = await branchTransfers.CountAsync(t => t.Status == "in_transit");
        var pendingAction = await branchTransfers.CountAsync(t => t.Status == "requested" || t.Status == "preparing");

        var receivedThisMonthQuery = branchTransfers.Where(t =>
            (t.Status == "fully_received" || t.Status == "partially_received")
            && t.ActualArrivalDate != null
            && t.ActualArrivalDate >= monthStart && t.ActualArrivalDate < monthEnd);

        var receivedThisMonth = await receivedThisMonthQuery.CountAsync();
        var receivedWithShortageThisMonth = await receivedThisMonthQuery.CountAsync(t => t.Status == "partially_received");

        var delayPairs = await branchTransfers
            .Where(t => t.EstimatedArrivalDate != null && t.ActualArrivalDate != null)
            .Select(t => new { t.EstimatedArrivalDate, t.ActualArrivalDate })
            .ToListAsync();

        double? averageDelayDays = delayPairs.Count > 0
            ? delayPairs.Average(p => (p.ActualArrivalDate!.Value - p.EstimatedArrivalDate!.Value).TotalDays)
            : null;

        return new TransfersKpiDto(inTransit, pendingAction, receivedThisMonth, receivedWithShortageThisMonth, averageDelayDays);
    }

    public async Task<IReadOnlyList<Transfer>> GetForComplianceReportAsync(long? branchId)
    {
        var query = _db.Transfers.AsQueryable();

        if (branchId is { } id)
        {
            query = query.Where(t => t.OriginBranchId == id || t.DestinationBranchId == id);
        }

        // Sin AsNoTracking en el resto del repo porque PrepareAsync/ShipAsync/etc.
        // modifican el grafo devuelto por GetByIdAsync — este método es de solo
        // lectura agregada, así que sí puede evitar el tracking.
        return await query
            .Include(t => t.OriginBranch)
            .Include(t => t.DestinationBranch)
            .AsNoTracking()
            .ToListAsync();
    }

    public Task<int> CountAsync() => _db.Transfers.CountAsync();

    public void Add(Transfer transfer) => _db.Transfers.Add(transfer);

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
