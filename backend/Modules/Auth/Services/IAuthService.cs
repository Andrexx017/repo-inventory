using Inventory.Modules.Auth.Dtos;

namespace Inventory.Modules.Auth.Services;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto request);
}
