using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Sales.Dtos;

// Sin UnitPrice a propósito: el precio nunca lo manda el cliente, lo resuelve
// el servidor (lista de precio o precio de referencia) — ver SaleService.
public record CreateSaleItemDto(
    [Required] long ProductId,
    decimal Quantity,
    decimal DiscountPct
);
