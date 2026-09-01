using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Auth.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Auth.Repositories;

public class PasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly AppDbContext _db;

    public PasswordResetTokenRepository(AppDbContext db)
    {
        _db = db;
    }

    public void Add(PasswordResetToken token) =>
        _db.PasswordResetTokens.Add(token);

    public Task<PasswordResetToken?> GetValidByTokenHashAsync(string tokenHash) =>
        _db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t =>
                t.TokenHash == tokenHash &&
                t.UsedAt == null &&
                t.ExpiresAt > DateTimeOffset.UtcNow);

    // Evita que queden varios links "vivos" si el usuario pide el reset más de
    // una vez: no los borra (trazabilidad), los marca usados de una.
    public async Task InvalidatePreviousAsync(long userId)
    {
        var pending = await _db.PasswordResetTokens
            .Where(t => t.UserId == userId && t.UsedAt == null)
            .ToListAsync();

        foreach (var token in pending)
        {
            token.UsedAt = DateTimeOffset.UtcNow;
        }
    }

    public Task SaveChangesAsync() =>
        _db.SaveChangesAsync();
}
