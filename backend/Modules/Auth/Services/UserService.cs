using Inventory.Infrastructure.Auth;
using Inventory.Modules.Auth.Dtos;
using Inventory.Modules.Auth.Entities;
using Inventory.Modules.Auth.Repositories;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Auth.Services;

// RF-02: el Administrador general crea/edita/desactiva usuarios, asignando rol
// y (salvo para el propio Administrador general) una sucursal.
public class UserService : IUserService
{
    private readonly IUserRepository _users;
    private readonly IRoleRepository _roles;
    private readonly IBranchRepository _branches;
    private readonly IPasswordHasher _passwordHasher;

    public UserService(IUserRepository users, IRoleRepository roles, IBranchRepository branches, IPasswordHasher passwordHasher)
    {
        _users = users;
        _roles = roles;
        _branches = branches;
        _passwordHasher = passwordHasher;
    }

    public async Task<IReadOnlyList<UserDto>> GetAllAsync()
    {
        var users = await _users.GetAllAsync();
        return users.Select(ToDto).ToList();
    }

    public async Task<UserDto?> GetByIdAsync(long id)
    {
        var user = await _users.GetByIdAsync(id);
        return user is null ? null : ToDto(user);
    }

    public async Task<UserDto> CreateAsync(CreateUserDto request)
    {
        if (await _users.GetByEmailAsync(request.Email) is not null)
        {
            throw new ConflictException($"Ya existe un usuario con el email '{request.Email}'.");
        }

        var role = await _roles.GetByIdAsync(request.RoleId)
            ?? throw new DomainException($"El rol {request.RoleId} no existe.");

        var branch = await ValidateBranchAsync(role, request.BranchId);

        var user = new User
        {
            RoleId = role.Id,
            BranchId = branch?.Id,
            Name = request.Name,
            Email = request.Email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Active = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await _users.AddAsync(user);
        return ToDto(user, role, branch);
    }

    public async Task<UserDto?> UpdateAsync(long id, UpdateUserDto request)
    {
        var user = await _users.GetByIdAsync(id);
        if (user is null)
        {
            return null;
        }

        var existingByEmail = await _users.GetByEmailAsync(request.Email);
        if (existingByEmail is not null && existingByEmail.Id != id)
        {
            throw new ConflictException($"Ya existe un usuario con el email '{request.Email}'.");
        }

        var role = await _roles.GetByIdAsync(request.RoleId)
            ?? throw new DomainException($"El rol {request.RoleId} no existe.");

        var branch = await ValidateBranchAsync(role, request.BranchId);

        user.Name = request.Name;
        user.Email = request.Email;
        user.RoleId = role.Id;
        user.BranchId = branch?.Id;
        user.Active = request.Active;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = _passwordHasher.Hash(request.Password);
        }

        await _users.UpdateAsync(user);
        return ToDto(user, role, branch);
    }

    private async Task<Branch?> ValidateBranchAsync(Role role, long? branchId)
    {
        if (role.Code == RoleCodes.GeneralAdmin)
        {
            if (branchId is not null)
            {
                throw new DomainException("El Administrador general no debe tener sucursal asignada.");
            }

            return null;
        }

        if (branchId is null)
        {
            throw new DomainException("El rol seleccionado requiere una sucursal.");
        }

        return await _branches.GetByIdAsync(branchId.Value)
            ?? throw new DomainException($"La sucursal {branchId} no existe.");
    }

    private static UserDto ToDto(User user) => ToDto(user, user.Role, user.Branch);

    private static UserDto ToDto(User user, Role role, Branch? branch) => new(
        user.Id,
        user.Name,
        user.Email,
        role.Id,
        role.Code,
        role.Name,
        branch?.Id,
        branch?.Name,
        user.Active,
        user.CreatedAt);
}
