namespace Inventory.Modules.Purchases.Dtos;

public record PurchaseReceiptDto(
    long Id,
    long PurchaseOrderId,
    DateTimeOffset ReceiptDate,
    long ReceivedBy,
    bool IsComplete,
    string? Notes,
    IReadOnlyList<PurchaseReceiptItemDto> Items
);
