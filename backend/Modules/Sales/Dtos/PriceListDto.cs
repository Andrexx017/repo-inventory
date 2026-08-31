namespace Inventory.Modules.Sales.Dtos;

public record PriceListDto(
    long Id,
    string Name,
    string? Description,
    bool Active,
    DateOnly? StartDate,
    DateOnly? EndDate
);
