namespace Inventory.Modules.Dashboard.Dtos;

public record MonthlySalesDto(
    int Year,
    int Month,
    decimal TotalSales,
    int SalesCount
);
