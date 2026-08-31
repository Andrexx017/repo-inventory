namespace Inventory.Modules.Purchases.Dtos;

public record PurchaseOrderDto(
    long Id,
    string OrderNumber,
    long SupplierId,
    string SupplierName,
    long BranchId,
    string BranchName,
    string Status,
    DateTimeOffset OrderDate,
    int? PaymentTermDays,
    decimal Subtotal,
    decimal TotalDiscount,
    decimal Total,
    long CreatedBy,
    DateTimeOffset CreatedAt,
    IReadOnlyList<PurchaseOrderItemDto> Items
);
