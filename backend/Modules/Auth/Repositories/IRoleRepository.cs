using Inventory.Modules.Auth.Entities;

namespace Inventory.Modules.Auth.Repositories;

public interface IRoleRepository
{
    Task<IReadOnlyList<Role>> GetAllAsync();
    Task<Role?> GetByIdAsync(long id);
}
