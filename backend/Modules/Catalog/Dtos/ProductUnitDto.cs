namespace Inventory.Modules.Catalog.Dtos;

public record ProductUnitDto(
    long UnitId,
    string UnitName,
    string UnitAbbreviation,
    decimal ConversionFactor,
    bool IsPurchaseUnit,
    bool IsSaleUnit
);