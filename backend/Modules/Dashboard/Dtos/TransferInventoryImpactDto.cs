namespace Inventory.Modules.Dashboard.Dtos;

public record TransferInventoryImpactDto(
    long ProductId,
    string ProductSku,
    string ProductName,
    // Suma de Difference (shipped - received) de las líneas todavía pendientes
    // de esta sucursal como DESTINO — stock que va a entrar y que "current_quantity"
    // todavía no refleja.
    decimal QuantityInTransit
);
