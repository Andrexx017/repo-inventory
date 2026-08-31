using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Purchases.Dtos;

public record CreatePurchaseOrderItemDto(
    [Required] long ProductId,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountPct
);
