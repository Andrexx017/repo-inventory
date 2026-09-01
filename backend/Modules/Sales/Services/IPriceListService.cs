using Inventory.Modules.Sales.Dtos;

namespace Inventory.Modules.Sales.Services;

public interface IPriceListService
{
    Task<IReadOnlyList<PriceListDto>> GetAllAsync();
    Task<PriceListDto?> GetByIdAsync(long id);

    Task<IReadOnlyList<PriceListItemDto>> GetItemsAsync(long priceListId);
    Task SetItemPriceAsync(long priceListId, long productId, decimal price);
    Task<bool> RemoveItemAsync(long priceListId, long productId);
}
