using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Transfers.Dtos;

public record PrepareTransferDto(
    string? Notes,
    [Required][MinLength(1)] List<PrepareTransferItemDto> Items
);
