namespace Inventory.Modules.Dashboard.Dtos;

// RF-32: productos próximos a agotarse según su stock mínimo. Items ya viene
// ordenado del más urgente (mayor déficit bajo el mínimo) al menos urgente.
public record LowStockIndicatorsDto(
    long BranchId,
    string BranchName,
    IReadOnlyList<LowStockIndicatorDto> Items
);
