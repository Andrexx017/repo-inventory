using Inventory.Infrastructure.Persistence;
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

    public async Task<IReadOnlyList<Transfer>> GetByBranchAsync(long branchId, bool activeOnly = false)
    {
        var query = _db.Transfers
            .Where(t => t.OriginBranchId == branchId || t.DestinationBranchId == branchId);

        if (activeOnly)
        {
            query = query.Where(t => ActiveStatuses.Contains(t.Status));
        }

        return await query
            .Include(t => t.OriginBranch)
            .Include(t => t.DestinationBranch)
            .Include(t => t.Items).ThenInclude(i => i.Product)
            .OrderByDescending(t => t.RequestDate)
            .ToListAsync();
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
