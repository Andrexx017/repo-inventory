namespace Inventory.Modules.Purchases.Dtos;

public record PurchaseOrderItemDto(
    long Id,
    long ProductId,
    string ProductSku,
    string ProductName,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountPct,
    decimal Subtotal
);
