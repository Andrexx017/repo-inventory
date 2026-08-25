using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Auth.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Auth.Repositories;

public class BranchRepository : IBranchRepository
{
    private readonly AppDbContext _db;

    public BranchRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<Branch>> GetAllAsync() =>
        await _db.Branches.ToListAsync();

    public Task<Branch?> GetByIdAsync(long id) =>
        _db.Branches.FirstOrDefaultAsync(b => b.Id == id);

    public Task<Branch?> GetByCodeAsync(string code) =>
        _db.Branches.FirstOrDefaultAsync(b => b.Code == code);

    public async Task AddAsync(Branch branch)
    {
        await _db.Branches.AddAsync(branch);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Branch branch)
    {
        _db.Branches.Update(branch);
        await _db.SaveChangesAsync();
    }
}
