using Inventory.Infrastructure.Auth;
using Inventory.Modules.Auth.Dtos;
using Inventory.Modules.Auth.Repositories;

namespace Inventory.Modules.Auth.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenGenerator _tokenGenerator;

    public AuthService(IUserRepository users, IPasswordHasher passwordHasher, ITokenGenerator tokenGenerator)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _tokenGenerator = tokenGenerator;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request)
    {
        var user = await _users.GetByEmailAsync(request.Email);

        if (user is null || !user.Active || !_passwordHasher.Verify(user.PasswordHash, request.Password))
        {
            return null;
        }

        var token = _tokenGenerator.GenerateToken(user.Id, user.Role.Code, user.BranchId);

        return new LoginResponseDto(token, user.Name, user.Role.Code, user.BranchId);
    }
}
