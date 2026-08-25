namespace Inventory.Modules.Auth.Dtos;

public record UserDto(
    long Id,
    string Name,
    string Email,
    long RoleId,
    string RoleCode,
    string RoleName,
    long? BranchId,
    string? BranchName,
    bool Active,
    DateTimeOffset CreatedAt
);
