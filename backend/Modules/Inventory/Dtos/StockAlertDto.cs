namespace Inventory.Modules.Inventory.Dtos;

// Igual criterio que InventoryItemDto/InventoryMovementDto: se aplanan
// BranchName/ProductSku/ProductName en vez de exponer las entidades de EF Core.
public record StockAlertDto(
    long Id,
    long BranchId,
    string BranchName,
    long ProductId,
    string ProductSku,
    string ProductName,
    string AlertType,
    decimal QuantityAtTrigger,
    decimal ThresholdValue,
    string Status,
    DateTimeOffset TriggeredAt,
    long? ResolvedBy,
    DateTimeOffset? ResolvedAt
);
