using Inventory.Modules.Sales.Entities;

namespace Inventory.Modules.Sales.Repositories;

public interface IPriceListRepository
{
    Task<IReadOnlyList<PriceList>> GetAllAsync();
    Task<PriceList?> GetByIdAsync(long id);

    // RF-18: resuelve el precio de un producto puntual dentro de una lista —
    // null si esa lista no tiene un precio definido para ese producto.
    Task<decimal?> GetPriceAsync(long priceListId, long productId);
}
