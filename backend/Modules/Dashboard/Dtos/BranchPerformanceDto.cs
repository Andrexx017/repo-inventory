namespace Inventory.Modules.Dashboard.Dtos;

public record BranchPerformanceDto(
    long BranchId,
    string BranchName,
    decimal CurrentMonthSales,
    decimal PreviousMonthSales,
    decimal? PercentChangeVsPreviousMonth,
    int ActiveTransfersCount,
    int LowStockProductsCount
);
