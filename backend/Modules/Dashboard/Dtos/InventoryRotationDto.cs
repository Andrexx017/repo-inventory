namespace Inventory.Modules.Dashboard.Dtos;

// RF-30: rotación de inventario — productos de alta y baja demanda, medida en
// unidades vendidas dentro de PeriodDays. TopDemand/LowDemand ya vienen
// ordenados (descendente/ascendente) y acotados a un puñado de filas cada uno,
// pensados para mostrarse directo como dos listas cortas, no una tabla completa.
public record InventoryRotationDto(
    long BranchId,
    string BranchName,
    int PeriodDays,
    IReadOnlyList<ProductRotationDto> TopDemand,
    IReadOnlyList<ProductRotationDto> LowDemand
);
