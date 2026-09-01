using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Transfers.Dtos;

public record PrepareTransferItemDto(
    [Required] long TransferItemId,
    decimal ShippedQuantity
);
