namespace Inventory.Modules.Purchases.Dtos;

public record PurchaseReceiptItemDto(
    long Id,
    long PurchaseOrderItemId,
    long ProductId,
    string ProductSku,
    string ProductName,
    decimal ReceivedQuantity
);
