using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Transfers.Dtos;

public record CreateTransferItemDto(
    [Required] long ProductId,
    decimal RequestedQuantity
);
