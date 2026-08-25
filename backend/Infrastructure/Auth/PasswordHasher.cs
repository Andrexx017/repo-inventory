using Microsoft.AspNetCore.Identity;

namespace Inventory.Infrastructure.Auth;

// Envuelve el PasswordHasher<T> que ya trae ASP.NET Core (PBKDF2 + salt aleatorio,
// HMACSHA256), sin traer la Identity completa — decisión ya tomada en
// backend/docs/decisions.md (Autenticación): solo se usa el utilitario de hashing,
// no el esquema de tablas de ASP.NET Core Identity.
public class PasswordHasher : IPasswordHasher
{
    private readonly Microsoft.AspNetCore.Identity.PasswordHasher<object> _hasher = new();

    public string Hash(string password) => _hasher.HashPassword(new object(), password);

    public bool Verify(string hash, string password) =>
        _hasher.VerifyHashedPassword(new object(), hash, password) != PasswordVerificationResult.Failed;
}
