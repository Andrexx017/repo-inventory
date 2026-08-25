using Inventory.Modules.Auth.Dtos;

namespace Inventory.Modules.Auth.Services;

public interface IUserService
{
    Task<IReadOnlyList<UserDto>> GetAllAsync();
    Task<UserDto?> GetByIdAsync(long id);
    Task<UserDto> CreateAsync(CreateUserDto request);
    Task<UserDto?> UpdateAsync(long id, UpdateUserDto request);
}
