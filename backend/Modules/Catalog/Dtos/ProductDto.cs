namespace Inventory.Modules.Catalog.Dtos;

public record ProductDto(
    long Id,
    string Sku,
    string Name,
    string? Description,
    long? CategoryId,
    string? CategoryName,
    long BaseUnitId,
    string BaseUnitName,
    string BaseUnitAbbreviation,
    decimal? ReferencePrice,
    bool Active,
    DateTimeOffset CreatedAt,
    IReadOnlyList<ProductUnitDto> AlternateUnits
);