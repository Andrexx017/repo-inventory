using Inventory.Modules.Sales.Dtos;
using Inventory.Modules.Sales.Entities;
using Inventory.Modules.Sales.Repositories;

namespace Inventory.Modules.Sales.Services;

public class PriceListService : IPriceListService
{
    private readonly IPriceListRepository _priceLists;

    public PriceListService(IPriceListRepository priceLists)
    {
        _priceLists = priceLists;
    }

    public async Task<IReadOnlyList<PriceListDto>> GetAllAsync()
    {
        var priceLists = await _priceLists.GetAllAsync();
        return priceLists.Select(ToDto).ToList();
    }

    public async Task<PriceListDto?> GetByIdAsync(long id)
    {
        var priceList = await _priceLists.GetByIdAsync(id);
        return priceList is null ? null : ToDto(priceList);
    }

    private static PriceListDto ToDto(PriceList priceList) => new(
        priceList.Id,
        priceList.Name,
        priceList.Description,
        priceList.Active,
        priceList.StartDate,
        priceList.EndDate);
}
