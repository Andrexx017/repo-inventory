using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Sales.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Sales.Repositories;

public class PriceListRepository : IPriceListRepository
{
    private readonly AppDbContext _db;

    public PriceListRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<PriceList>> GetAllAsync() =>
        await _db.PriceLists.Where(pl => pl.Active).ToListAsync();

    public Task<PriceList?> GetByIdAsync(long id) =>
        _db.PriceLists.FirstOrDefaultAsync(pl => pl.Id == id);

    public async Task<decimal?> GetPriceAsync(long priceListId, long productId)
    {
        var item = await _db.PriceListItems.FirstOrDefaultAsync(
            i => i.PriceListId == priceListId && i.ProductId == productId);
        return item?.Price;
    }

    public async Task<IReadOnlyList<PriceListItem>> GetItemsAsync(long priceListId) =>
        await _db.PriceListItems.Where(i => i.PriceListId == priceListId).ToListAsync();

    public async Task UpsertItemAsync(long priceListId, long productId, decimal price)
    {
        var existing = await _db.PriceListItems.FirstOrDefaultAsync(
            i => i.PriceListId == priceListId && i.ProductId == productId);

        if (existing is null)
        {
            await _db.PriceListItems.AddAsync(new PriceListItem
            {
                PriceListId = priceListId,
                ProductId = productId,
                Price = price,
            });
        }
        else
        {
            existing.Price = price;
        }

        await _db.SaveChangesAsync();
    }

    public async Task<bool> RemoveItemAsync(long priceListId, long productId)
    {
        var existing = await _db.PriceListItems.FirstOrDefaultAsync(
            i => i.PriceListId == priceListId && i.ProductId == productId);

        if (existing is null) return false;

        _db.PriceListItems.Remove(existing);
        await _db.SaveChangesAsync();
        return true;
    }
}
