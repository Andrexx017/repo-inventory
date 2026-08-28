namespace Inventory.Modules.Inventory.Dtos;

public record InventoryItemDto(
    long Id,
    long BranchId,
    long ProductId,
    string ProductSku,
    string ProductName,
    string? CategoryName,
    string BaseUnitName,
    string BaseUnitAbbreviation,
    decimal CurrentQuantity,
    decimal MinimumStock,
    decimal? MaximumStock,
    decimal WeightedAverageCost,
    DateTimeOffset UpdatedAt
);