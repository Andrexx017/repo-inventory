using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Catalog.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Catalog.Repositories;

public class UnitOfMeasureRepository : IUnitOfMeasureRepository
{
    private readonly AppDbContext _db;

    public UnitOfMeasureRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<UnitOfMeasure>> GetAllAsync() =>
        await _db.UnitsOfMeasure.ToListAsync();

    public Task<UnitOfMeasure?> GetByIdAsync(long id) =>
        _db.UnitsOfMeasure.FirstOrDefaultAsync(u => u.Id == id);
}
