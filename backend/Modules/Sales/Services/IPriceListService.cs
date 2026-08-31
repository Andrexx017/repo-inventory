using Inventory.Modules.Sales.Dtos;

namespace Inventory.Modules.Sales.Services;

public interface IPriceListService
{
    Task<IReadOnlyList<PriceListDto>> GetAllAsync();
    Task<PriceListDto?> GetByIdAsync(long id);
}
