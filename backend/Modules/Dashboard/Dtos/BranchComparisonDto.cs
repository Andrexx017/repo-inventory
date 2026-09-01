namespace Inventory.Modules.Dashboard.Dtos;

// RF-33: comparativa de rendimiento entre TODAS las sucursales — visible
// únicamente para general_admin (aplicado en el Controller, no acá).
public record BranchComparisonDto(
    IReadOnlyList<BranchPerformanceDto> Branches
);
