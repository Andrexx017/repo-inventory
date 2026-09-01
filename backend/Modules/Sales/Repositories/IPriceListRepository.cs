using Inventory.Modules.Sales.Entities;

namespace Inventory.Modules.Sales.Repositories;

public interface IPriceListRepository
{
    Task<IReadOnlyList<PriceList>> GetAllAsync();
    Task<PriceList?> GetByIdAsync(long id);

    // RF-18: resuelve el precio de un producto puntual dentro de una lista —
    // null si esa lista no tiene un precio definido para ese producto.
    Task<decimal?> GetPriceAsync(long priceListId, long productId);

    // Gestión de ítems de una lista (modal de edición en el frontend) — antes
    // de esto no existía ninguna forma de agregar un producto a una lista ya
    // creada, así que una venta con esa lista fallaba para cualquier producto
    // que no viniera ya sembrado en 03-seed.sql.
    Task<IReadOnlyList<PriceListItem>> GetItemsAsync(long priceListId);
    Task UpsertItemAsync(long priceListId, long productId, decimal price);
    Task<bool> RemoveItemAsync(long priceListId, long productId);
}
