using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Dashboard.Dtos;
using Inventory.Modules.Inventory.Services;
using Inventory.Modules.Sales.Services;
using Inventory.Modules.Transfers.Services;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Dashboard.Services;

// Dashboard no tiene tablas propias (backend/docs/decisions.md) — en vez de
// inyectar los repositorios crudos de cada módulo, inyecta sus Services
// (IInventoryService, ISaleService, ITransferService), mismo criterio que ya
// usa TransferService con IInventoryService: evita duplicar acá el mapeo a DTO
// (Sku/Name aplanados, Difference calculado, etc.) que cada módulo ya resuelve.
public class DashboardService : IDashboardService
{
    // RF-29: cuántos meses de historial mostrar (incluye el actual). RF-30:
    // ventana de "rotación reciente" y cuántos productos mostrar por extremo
    // (alta/baja demanda) — valores fijos, sin RF que pida hacerlos configurables.
    private const int MonthlyHistoryMonths = 6;
    private const int RotationPeriodDays = 30;
    private const int RotationTopCount = 5;

    private readonly IBranchRepository _branches;
    private readonly ISaleService _saleService;
    private readonly IInventoryService _inventoryService;
    private readonly ITransferService _transferService;

    public DashboardService(
        IBranchRepository branches,
        ISaleService saleService,
        IInventoryService inventoryService,
        ITransferService transferService)
    {
        _branches = branches;
        _saleService = saleService;
        _inventoryService = inventoryService;
        _transferService = transferService;
    }

    public async Task<SalesSummaryDto> GetSalesSummaryAsync(long branchId)
    {
        var branch = await _branches.GetByIdAsync(branchId)
            ?? throw new DomainException($"La sucursal {branchId} no existe.");

        var monthlyHistory = await BuildMonthlyHistoryAsync(branchId);

        // MonthlyHistoryMonths >= 2 garantiza estos dos índices siempre presentes.
        var currentMonth = monthlyHistory[^1];
        var previousMonth = monthlyHistory[^2];

        decimal? percentChange = previousMonth.TotalSales > 0
            ? Math.Round((currentMonth.TotalSales - previousMonth.TotalSales) / previousMonth.TotalSales * 100, 2)
            : null;

        return new SalesSummaryDto(
            branchId,
            branch.Name,
            currentMonth.TotalSales,
            currentMonth.SalesCount,
            previousMonth.TotalSales,
            percentChange,
            monthlyHistory);
    }

    public async Task<InventoryRotationDto> GetInventoryRotationAsync(long branchId)
    {
        var branch = await _branches.GetByIdAsync(branchId)
            ?? throw new DomainException($"La sucursal {branchId} no existe.");

        var inventoryItems = await _inventoryService.GetByBranchAsync(branchId);
        var sales = (await _saleService.GetByBranchAsync(branchId, from: null, to: null, page: 1, pageSize: int.MaxValue)).Items;

        var periodStart = DateTimeOffset.UtcNow.AddDays(-RotationPeriodDays);
        var soldQuantityByProduct = sales
            .Where(s => s.Status == "confirmed" && s.SaleDate >= periodStart)
            .SelectMany(s => s.Items)
            .GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

        // Parte del catálogo con stock en la sucursal, no de las ventas — así un
        // producto sin ninguna venta en el período (candidato típico de "baja
        // demanda") también aparece, con QuantitySold en 0.
        var rotation = inventoryItems
            .Select(item => new ProductRotationDto(
                item.ProductId,
                item.ProductSku,
                item.ProductName,
                soldQuantityByProduct.GetValueOrDefault(item.ProductId),
                item.CurrentQuantity))
            .ToList();

        var topDemand = rotation.OrderByDescending(r => r.QuantitySold).Take(RotationTopCount).ToList();
        var lowDemand = rotation.OrderBy(r => r.QuantitySold).Take(RotationTopCount).ToList();

        return new InventoryRotationDto(branchId, branch.Name, RotationPeriodDays, topDemand, lowDemand);
    }

    public async Task<ActiveTransfersDto> GetActiveTransfersAsync(long branchId)
    {
        var branch = await _branches.GetByIdAsync(branchId)
            ?? throw new DomainException($"La sucursal {branchId} no existe.");

        // Reusa la misma definición de "activa" que ya decidió RF-27
        // (TransferRepository.ActiveStatuses: preparing/in_transit/partially_received,
        // sin "requested") en vez de inventar un segundo criterio acá.
        var activeTransfers = await _transferService.GetByBranchAsync(branchId, activeOnly: true);

        var inventoryImpact = activeTransfers
            .Where(t => t.DestinationBranchId == branchId
                && (t.Status == "in_transit" || t.Status == "partially_received"))
            .SelectMany(t => t.Items)
            .Where(i => i.Difference > 0)
            .GroupBy(i => i.ProductId)
            .Select(g => new TransferInventoryImpactDto(
                g.Key, g.First().ProductSku, g.First().ProductName, g.Sum(i => i.Difference)))
            .ToList();

        return new ActiveTransfersDto(branchId, branch.Name, activeTransfers, inventoryImpact);
    }

    public async Task<LowStockIndicatorsDto> GetLowStockIndicatorsAsync(long branchId)
    {
        var branch = await _branches.GetByIdAsync(branchId)
            ?? throw new DomainException($"La sucursal {branchId} no existe.");

        var items = await _inventoryService.GetByBranchAsync(branchId);

        // Mismo criterio que InventoryService.CheckStockAlertsAsync (RF-09/RF-34):
        // MinimumStock en 0 significa "sin umbral configurado", se excluye.
        var lowStock = items
            .Where(i => i.MinimumStock > 0 && i.CurrentQuantity <= i.MinimumStock)
            .OrderBy(i => i.CurrentQuantity - i.MinimumStock) // más negativo = más urgente
            .Select(i => new LowStockIndicatorDto(i.ProductId, i.ProductSku, i.ProductName, i.CurrentQuantity, i.MinimumStock))
            .ToList();

        return new LowStockIndicatorsDto(branchId, branch.Name, lowStock);
    }

    public async Task<BranchComparisonDto> GetBranchComparisonAsync()
    {
        var branches = await _branches.GetAllAsync();
        var performance = new List<BranchPerformanceDto>();

        // N+1 deliberado: se reusan los tres métodos de arriba por sucursal en
        // vez de duplicar su lógica en una consulta agregada aparte — el número
        // de sucursales de esta prueba no justifica optimizarlo (mismo criterio
        // ya aplicado en RF-33/GetComplianceReportAsync: agregación en memoria).
        foreach (var branch in branches)
        {
            var salesSummary = await GetSalesSummaryAsync(branch.Id);
            var activeTransfers = await GetActiveTransfersAsync(branch.Id);
            var lowStock = await GetLowStockIndicatorsAsync(branch.Id);

            performance.Add(new BranchPerformanceDto(
                branch.Id,
                branch.Name,
                salesSummary.CurrentMonthTotal,
                salesSummary.PreviousMonthTotal,
                salesSummary.PercentChangeVsPreviousMonth,
                activeTransfers.ActiveTransfers.Count,
                lowStock.Items.Count));
        }

        return new BranchComparisonDto(performance);
    }

    private async Task<List<MonthlySalesDto>> BuildMonthlyHistoryAsync(long branchId)
    {
        var sales = (await _saleService.GetByBranchAsync(branchId, from: null, to: null, page: 1, pageSize: int.MaxValue)).Items;
        // Ventas anuladas no representan volumen real vendido.
        var confirmedSales = sales.Where(s => s.Status == "confirmed").ToList();

        var now = DateTimeOffset.UtcNow;
        var currentMonthStart = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);

        var monthlyHistory = new List<MonthlySalesDto>();
        for (var i = MonthlyHistoryMonths - 1; i >= 0; i--)
        {
            var monthStart = currentMonthStart.AddMonths(-i);
            var monthEnd = monthStart.AddMonths(1);
            var monthSales = confirmedSales.Where(s => s.SaleDate >= monthStart && s.SaleDate < monthEnd).ToList();

            monthlyHistory.Add(new MonthlySalesDto(
                monthStart.Year, monthStart.Month, monthSales.Sum(s => s.Total), monthSales.Count));
        }

        return monthlyHistory;
    }
}
