using Inventory.Modules.Dashboard.Dtos;

namespace Inventory.Modules.Dashboard.Services;

public interface IDashboardService
{
    // RF-29: ventas del mes en curso vs. meses anteriores.
    Task<SalesSummaryDto> GetSalesSummaryAsync(long branchId);

    // RF-30: rotación de inventario (productos de alta/baja demanda).
    Task<InventoryRotationDto> GetInventoryRotationAsync(long branchId);

    // RF-31: transferencias activas y su impacto en el inventario.
    Task<ActiveTransfersDto> GetActiveTransfersAsync(long branchId);

    // RF-32: productos próximos a agotarse según su stock mínimo.
    Task<LowStockIndicatorsDto> GetLowStockIndicatorsAsync(long branchId);

    // RF-33: comparativa entre TODAS las sucursales — la restricción a
    // general_admin se aplica en el Controller, no acá.
    Task<BranchComparisonDto> GetBranchComparisonAsync();
}
