using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Auth.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Auth.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public UserRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<User>> GetAllAsync() =>
        await _db.Users.Include(u => u.Role).Include(u => u.Branch).ToListAsync();

    public Task<User?> GetByIdAsync(long id) =>
        _db.Users.Include(u => u.Role).Include(u => u.Branch).FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByEmailAsync(string email) =>
        _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Email == email);

    public async Task AddAsync(User user)
    {
        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(User user)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
    }
}
