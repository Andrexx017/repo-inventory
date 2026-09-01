using System.Security.Cryptography;
using Inventory.Infrastructure.Auth;
using Inventory.Infrastructure.Email;
using Inventory.Modules.Auth.Dtos;
using Inventory.Modules.Auth.Entities;
using Inventory.Modules.Auth.Repositories;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Auth.Services;

public class AuthService : IAuthService
{
    private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromMinutes(30);

    private readonly IUserRepository _users;
    private readonly IPasswordResetTokenRepository _resetTokens;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenGenerator _tokenGenerator;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;

    public AuthService(
        IUserRepository users,
        IPasswordResetTokenRepository resetTokens,
        IPasswordHasher passwordHasher,
        ITokenGenerator tokenGenerator,
        IEmailSender emailSender,
        IConfiguration configuration)
    {
        _users = users;
        _resetTokens = resetTokens;
        _passwordHasher = passwordHasher;
        _tokenGenerator = tokenGenerator;
        _emailSender = emailSender;
        _configuration = configuration;
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

    // Respuesta siempre genérica en el Controller (200 exista o no el email) para
    // no permitir enumerar usuarios registrados — acá simplemente no se hace nada
    // si el usuario no existe o está inactivo, sin lanzar excepción.
    public async Task ForgotPasswordAsync(ForgotPasswordRequestDto request)
    {
        var user = await _users.GetByEmailAsync(request.Email);

        if (user is null || !user.Active)
        {
            return;
        }

        await _resetTokens.InvalidatePreviousAsync(user.Id);

        var rawToken = GenerateRawToken();

        _resetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = HashToken(rawToken),
            ExpiresAt = DateTimeOffset.UtcNow.Add(ResetTokenLifetime),
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await _resetTokens.SaveChangesAsync();

        var frontendUrl = _configuration["App:FrontendUrl"]
            ?? throw new InvalidOperationException("Falta configurar App:FrontendUrl.");
        var resetLink = $"{frontendUrl}/reset-password?token={rawToken}";

        await _emailSender.SendAsync(
            user.Email,
            "Recuperar contraseña — Sistema de Inventario",
            $"""
            <p>Hola {user.Name},</p>
            <p>Solicitaste restablecer tu contraseña. Este enlace vence en 30 minutos y solo se puede usar una vez:</p>
            <p><a href="{resetLink}">{resetLink}</a></p>
            <p>Si no fuiste vos, ignorá este correo — tu contraseña sigue siendo la misma.</p>
            """);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequestDto request)
    {
        var tokenHash = HashToken(request.Token);
        var resetToken = await _resetTokens.GetValidByTokenHashAsync(tokenHash)
            ?? throw new DomainException("El enlace de recuperación no es válido o ha expirado.");

        // resetToken.User ya viene trackeado por el Include de GetValidByTokenHashAsync,
        // así que alcanza con un único SaveChangesAsync (mismo criterio de atomicidad
        // que RN-CRIT-04 en InventoryService: un solo commit para los dos cambios).
        resetToken.User.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        resetToken.UsedAt = DateTimeOffset.UtcNow;

        await _resetTokens.SaveChangesAsync();
    }

    private static string GenerateRawToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
}
