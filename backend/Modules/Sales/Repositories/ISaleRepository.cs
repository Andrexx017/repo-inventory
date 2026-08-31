using Inventory.Modules.Sales.Entities;
using Microsoft.EntityFrameworkCore.Storage;

namespace Inventory.Modules.Sales.Repositories;

public interface ISaleRepository
{
    Task<Sale?> GetByIdAsync(long id);
    Task<IReadOnlyList<Sale>> GetByBranchAsync(long branchId);
    Task<int> CountAsync();
    void Add(Sale sale);
    Task SaveChangesAsync();

    // Reservada para operaciones que necesitan más de un SaveChangesAsync en
    // secuencia (backend/docs/decisions.md) — acá, obtener sale.Id antes de
    // poder crear los InventoryMovement que lo referencian (ver SaleService).
    Task<IDbContextTransaction> BeginTransactionAsync();
}
