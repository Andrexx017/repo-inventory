using Inventory.Modules.Sales.Dtos;
using Inventory.Modules.Sales.Entities;
using Inventory.Shared.Dtos;
using Microsoft.EntityFrameworkCore.Storage;

namespace Inventory.Modules.Sales.Repositories;

public interface ISaleRepository
{
    Task<Sale?> GetByIdAsync(long id);

    // Paginado (page/pageSize) porque el historial de ventas de una sucursal
    // no tiene límite de crecimiento, mismo criterio que GetMovementsByBranchAsync.
    // from/to (opcionales) filtran por rango de fechas sobre SaleDate.
    Task<PagedResult<Sale>> GetByBranchAsync(
        long branchId, DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize);

    // Indicadores de hoy/mes/producto top para el encabezado de la pantalla de
    // Ventas — agregados en SQL, no requieren traer las ventas completas.
    Task<SalesKpiDto> GetKpiSummaryAsync(long branchId);
    Task<int> CountAsync();
    void Add(Sale sale);
    Task SaveChangesAsync();

    // Reservada para operaciones que necesitan más de un SaveChangesAsync en
    // secuencia (backend/docs/decisions.md) — acá, obtener sale.Id antes de
    // poder crear los InventoryMovement que lo referencian (ver SaleService).
    Task<IDbContextTransaction> BeginTransactionAsync();
}
