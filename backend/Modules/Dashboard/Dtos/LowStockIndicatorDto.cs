namespace Inventory.Modules.Dashboard.Dtos;

public record LowStockIndicatorDto(
    long ProductId,
    string ProductSku,
    string ProductName,
    decimal CurrentQuantity,
    decimal MinimumStock
);
