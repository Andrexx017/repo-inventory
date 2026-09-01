using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Transfers.Dtos;

public record ShipTransferDto(
    [Required] string Carrier,
    [Required] DateTimeOffset EstimatedDeliveryDate,
    // RF-26: clasificación de la ruta en el momento del despacho, que es cuando
    // se conocen el transportista y el costo real de envío.
    string? RoutePriority,
    decimal? ShippingCost,
    string? Notes
);