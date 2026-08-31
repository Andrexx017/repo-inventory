using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Purchases.Dtos;

public record CreatePurchaseReceiptDto(
    string? Notes,
    [Required][MinLength(1)] List<CreatePurchaseReceiptItemDto> Items
);
