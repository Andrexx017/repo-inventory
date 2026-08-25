namespace Inventory.Infrastructure.Auth;

public interface ITokenGenerator
{
    string GenerateToken(long userId, string role, long? branchId);
}
