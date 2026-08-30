using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Inventory.Dtos;

public record CreateInventoryMovementDto(
    [Required] long ProductId,
    [Required] string MovementType,
    decimal Quantity,
    decimal? UnitCost,
    [Required] string Reason,
    DateTimeOffset MovementDate
);
