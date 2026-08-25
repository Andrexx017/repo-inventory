using Inventory.Modules.Auth.Dtos;
using Inventory.Modules.Auth.Entities;
using Inventory.Modules.Auth.Repositories;

namespace Inventory.Modules.Auth.Services;

public class RoleService : IRoleService
{
    private readonly IRoleRepository _roles;

    public RoleService(IRoleRepository roles)
    {
        _roles = roles;
    }

    public async Task<IReadOnlyList<RoleDto>> GetAllAsync()
    {
        var roles = await _roles.GetAllAsync();
        return roles.Select(ToDto).ToList();
    }

    public async Task<RoleDto?> GetByIdAsync(long id)
    {
        var role = await _roles.GetByIdAsync(id);
        return role is null ? null : ToDto(role);
    }

    private static RoleDto ToDto(Role role) => new(role.Id, role.Code, role.Name, role.Description);
}
