using Inventory.Modules.Auth.Entities;

namespace Inventory.Modules.Auth.Repositories;

public interface IPasswordResetTokenRepository
{
    void Add(PasswordResetToken token);
    Task<PasswordResetToken?> GetValidByTokenHashAsync(string tokenHash);
    Task InvalidatePreviousAsync(long userId);
    Task SaveChangesAsync();
}
