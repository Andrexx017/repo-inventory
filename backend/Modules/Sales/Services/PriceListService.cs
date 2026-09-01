using Inventory.Modules.Catalog.Repositories;
using Inventory.Modules.Sales.Dtos;
using Inventory.Modules.Sales.Entities;
using Inventory.Modules.Sales.Repositories;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Sales.Services;

public class PriceListService : IPriceListService
{
    private readonly IPriceListRepository _priceLists;
    private readonly IProductRepository _products;

    public PriceListService(IPriceListRepository priceLists, IProductRepository products)
    {
        _priceLists = priceLists;
        _products = products;
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

    // Devuelve TODOS los productos activos del catálogo, no solo los que ya
    // tienen precio en esta lista — así el modal de edición puede mostrar
    // cualquier producto y dejar cargarle un precio, en vez de solo poder
    // editar los que alguien ya haya agregado antes (el bug original: un
    // producto nuevo del catálogo nunca aparecía en "Lista Mayorista").
    public async Task<IReadOnlyList<PriceListItemDto>> GetItemsAsync(long priceListId)
    {
        _ = await _priceLists.GetByIdAsync(priceListId)
            ?? throw new DomainException($"La lista de precios {priceListId} no existe.");

        var products = await _products.GetAllAsync();
        var items = await _priceLists.GetItemsAsync(priceListId);
        var priceByProduct = items.ToDictionary(i => i.ProductId, i => i.Price);

        return products
            .Where(p => p.Active)
            .OrderBy(p => p.Name)
            .Select(p => new PriceListItemDto(
                p.Id,
                p.Sku,
                p.Name,
                priceByProduct.TryGetValue(p.Id, out var price) ? price : null))
            .ToList();
    }

    public async Task SetItemPriceAsync(long priceListId, long productId, decimal price)
    {
        if (price < 0)
        {
            throw new DomainException("El precio no puede ser negativo.");
        }

        _ = await _priceLists.GetByIdAsync(priceListId)
            ?? throw new DomainException($"La lista de precios {priceListId} no existe.");

        _ = await _products.GetByIdAsync(productId)
            ?? throw new DomainException($"El producto {productId} no existe.");

        await _priceLists.UpsertItemAsync(priceListId, productId, price);
    }

    public async Task<bool> RemoveItemAsync(long priceListId, long productId) =>
        await _priceLists.RemoveItemAsync(priceListId, productId);

    private static PriceListDto ToDto(PriceList priceList) => new(
        priceList.Id,
        priceList.Name,
        priceList.Description,
        priceList.Active,
        priceList.StartDate,
        priceList.EndDate);
}
