using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Inventory.Dtos;

// RF-09: "definir un stock mínimo por producto y sucursal". MaximumStock es
// opcional porque la tabla lo permite NULL (todavía no hay ninguna regla que lo
// exija — RF-34, "adicional", es quien lo va a usar para alertas de exceso).
public record UpdateInventoryThresholdsDto(
    [Required] [Range(0, double.MaxValue)] decimal MinimumStock,
    [Range(0, double.MaxValue)] decimal? MaximumStock
);
