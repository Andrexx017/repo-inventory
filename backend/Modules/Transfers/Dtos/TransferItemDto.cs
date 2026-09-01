namespace Inventory.Modules.Transfers.Dtos;

public record TransferItemDto(
    long Id,
    long ProductId,
    string ProductSku,
    string ProductName,
    decimal RequestedQuantity,
    decimal ShippedQuantity,
    decimal ReceivedQuantity,
    decimal Difference
);
