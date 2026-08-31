using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Purchases.Dtos;

public record CreatePurchaseOrderDto(
    [Required] long SupplierId,
    int? PaymentTermDays,
    [Required][MinLength(1)] List<CreatePurchaseOrderItemDto> Items
);
