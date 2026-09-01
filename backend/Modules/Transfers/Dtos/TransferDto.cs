namespace Inventory.Modules.Transfers.Dtos;

public record TransferDto(
    long Id,
    string TransferNumber,
    long OriginBranchId,
    string OriginBranchName,
    long DestinationBranchId,
    string DestinationBranchName,
    long RequestedBy,
    string Status,
    string Urgency,
    string? RoutePriority,
    string? Carrier,
    decimal? ShippingCost,
    DateTimeOffset RequestDate,
    DateTimeOffset? EstimatedShipDate,
    DateTimeOffset? ActualShipDate,
    DateTimeOffset? EstimatedArrivalDate,
    DateTimeOffset? ActualArrivalDate,
    // RF-25/HU-12: comparación entre tiempo estimado y real de entrega, en días.
    // Positivo = llegó más tarde de lo estimado, negativo = más temprano, 0 = a tiempo.
    // Null mientras falte alguna de las dos fechas (todavía no despachada o no recibida).
    double? DeliveryDelayDays,
    DateTimeOffset CreatedAt,
    IReadOnlyList<TransferItemDto> Items
);
