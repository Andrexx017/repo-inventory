namespace Inventory.Modules.Sales.Dtos;

// RF-19: este mismo DTO ES el "comprobante consultable posteriormente" —
// no hay una entidad ni un documento separado, es la venta con sus líneas.
public record SaleDto(
    long Id,
    string SaleNumber,
    long BranchId,
    string BranchName,
    long? PriceListId,
    string? PriceListName,
    long SellerId,
    string SellerName,
    string? CustomerName,
    DateTimeOffset SaleDate,
    decimal Subtotal,
    decimal TotalDiscount,
    decimal Total,
    string Status,
    DateTimeOffset CreatedAt,
    IReadOnlyList<SaleItemDto> Items
);
