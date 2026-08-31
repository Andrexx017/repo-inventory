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
}
