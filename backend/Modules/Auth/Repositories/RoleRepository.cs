using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Auth.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Auth.Repositories;

public class RoleRepository : IRoleRepository
{
    private readonly AppDbContext _db;

    public RoleRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<Role>> GetAllAsync() =>
        await _db.Roles.ToListAsync();

    public Task<Role?> GetByIdAsync(long id) =>
        _db.Roles.FirstOrDefaultAsync(r => r.Id == id);
}
