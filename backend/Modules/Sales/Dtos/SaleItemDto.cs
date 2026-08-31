namespace Inventory.Modules.Sales.Dtos;

public record SaleItemDto(
    long Id,
    long ProductId,
    string ProductSku,
    string ProductName,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountPct,
    decimal Subtotal
);
