namespace Inventory.Modules.Inventory.Dtos;

public record InventoryMovementDto(
    long Id,
    long BranchId,
    string BranchName,
    long ProductId,
    string ProductSku,
    string ProductName,
    string MovementType,
    decimal Quantity,
    decimal? UnitCost,
    string Reason,
    long ResponsibleUserId,
    string? ReferenceType,
    long? ReferenceId,
    DateTimeOffset MovementDate,
    DateTimeOffset CreatedAt
);
