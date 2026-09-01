using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Transfers.Dtos;

public record ReceiveTransferItemDto(
    [Required] long TransferItemId,
    decimal ReceivedQuantity
);
