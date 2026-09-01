namespace Inventory.Modules.Sales.Dtos;

// Combina TODO el catálogo de productos activos con el precio que tienen (si
// lo tienen) en una lista puntual — Price es null cuando el producto todavía
// no fue agregado a esa lista, para que el modal de edición pueda mostrarlo
// como "sin precio" y dejar cargarlo, en vez de ocultarlo directamente.
public record PriceListItemDto(
    long ProductId,
    string ProductSku,
    string ProductName,
    decimal? Price
);
