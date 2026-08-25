using Inventory.Modules.Auth.Dtos;

namespace Inventory.Modules.Auth.Services;

public interface IRoleService
{
    Task<IReadOnlyList<RoleDto>> GetAllAsync();
    Task<RoleDto?> GetByIdAsync(long id);
}
