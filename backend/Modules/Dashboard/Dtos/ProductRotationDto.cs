namespace Inventory.Modules.Dashboard.Dtos;

public record ProductRotationDto(
    long ProductId,
    string ProductSku,
    string ProductName,
    decimal QuantitySold,
    decimal CurrentStock
);
