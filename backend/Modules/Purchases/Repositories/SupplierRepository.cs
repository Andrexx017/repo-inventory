using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Purchases.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Purchases.Repositories;

public class SupplierRepository : ISupplierRepository
{
    private readonly AppDbContext _db;

    public SupplierRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<Supplier>> GetAllAsync() =>
        await _db.Suppliers.Where(s => s.Active).ToListAsync();

    public Task<Supplier?> GetByIdAsync(long id) =>
        _db.Suppliers.FirstOrDefaultAsync(s => s.Id == id);
}
