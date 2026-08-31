using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Purchases.Dtos;

public record CreatePurchaseReceiptItemDto(
    [Required] long PurchaseOrderItemId,
    decimal ReceivedQuantity
);
