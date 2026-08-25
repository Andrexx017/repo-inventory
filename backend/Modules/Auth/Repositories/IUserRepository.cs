using Inventory.Modules.Auth.Entities;

namespace Inventory.Modules.Auth.Repositories;

public interface IUserRepository
{
    Task<IReadOnlyList<User>> GetAllAsync();
    Task<User?> GetByIdAsync(long id);
    Task<User?> GetByEmailAsync(string email);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
}
