using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Sales.Dtos;
using Inventory.Modules.Sales.Entities;
using Inventory.Shared.Dtos;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Inventory.Modules.Sales.Repositories;

public class SaleRepository : ISaleRepository
{
    private readonly AppDbContext _db;

    public SaleRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<Sale?> GetByIdAsync(long id) =>
        _db.Sales
            .Include(s => s.Branch)
            .Include(s => s.PriceList)
            .Include(s => s.Seller)
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(s => s.Id == id);

    public async Task<PagedResult<Sale>> GetByBranchAsync(
        long branchId, DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize)
    {
        var query = _db.Sales.Where(s => s.BranchId == branchId);

        if (from is not null)
        {
            query = query.Where(s => s.SaleDate >= from);
        }

        if (to is not null)
        {
            query = query.Where(s => s.SaleDate <= to);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .Include(s => s.Branch)
            .Include(s => s.PriceList)
            .Include(s => s.Seller)
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .OrderByDescending(s => s.SaleDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<Sale>(items, totalCount, page, pageSize);
    }

    // Indicadores del encabezado de la pantalla de Ventas (hoy/mes/producto top)
    // calculados con agregados SQL — evita traer todas las ventas de la
    // sucursal solo para sumarlas, que es justo lo que GetByBranchAsync ya no
    // hace ahora que está paginado.
    public async Task<SalesKpiDto> GetKpiSummaryAsync(long branchId)
    {
        var now = DateTimeOffset.UtcNow;
        var todayStart = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
        var todayEnd = todayStart.AddDays(1);
        var monthStart = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var monthEnd = monthStart.AddMonths(1);

        var salesToday = await _db.Sales
            .CountAsync(s => s.BranchId == branchId && s.SaleDate >= todayStart && s.SaleDate < todayEnd);

        var unitsToday = await _db.SaleItems
            .Where(i => i.Sale.BranchId == branchId && i.Sale.SaleDate >= todayStart && i.Sale.SaleDate < todayEnd)
            .SumAsync(i => (decimal?)i.Quantity) ?? 0;

        var monthSales = _db.Sales.Where(s => s.BranchId == branchId && s.SaleDate >= monthStart && s.SaleDate < monthEnd);
        var salesThisMonth = await monthSales.CountAsync();
        var monthTotal = await monthSales.SumAsync(s => (decimal?)s.Total) ?? 0;

        var topProduct = await _db.SaleItems
            .Where(i => i.Sale.BranchId == branchId && i.Sale.SaleDate >= monthStart && i.Sale.SaleDate < monthEnd)
            .GroupBy(i => i.Product.Name)
            .Select(g => new { Name = g.Key, Units = g.Sum(i => i.Quantity) })
            .OrderByDescending(g => g.Units)
            .FirstOrDefaultAsync();

        return new SalesKpiDto(
            salesToday,
            unitsToday,
            salesThisMonth,
            monthTotal,
            topProduct?.Name,
            topProduct?.Units ?? 0);
    }

    public Task<int> CountAsync() => _db.Sales.CountAsync();

    public void Add(Sale sale) => _db.Sales.Add(sale);

    // Comparte el AppDbContext scoped con IInventoryRepository — un solo
    // SaveChangesAsync confirma la venta, el InventoryItem descontado, el
    // InventoryMovement y la alerta de stock bajo (si se disparó), todo junto.
    public Task SaveChangesAsync() => _db.SaveChangesAsync();

    public Task<IDbContextTransaction> BeginTransactionAsync() => _db.Database.BeginTransactionAsync();
}
