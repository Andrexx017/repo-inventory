using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Sales.Dtos;

public record CreateSaleDto(
    long? PriceListId,
    string? CustomerName,
    [Required][MinLength(1)] List<CreateSaleItemDto> Items
);
