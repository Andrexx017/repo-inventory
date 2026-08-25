namespace Inventory.Modules.Auth.Dtos;

public record BranchDto(
    long Id,
    string Code,
    string Name,
    string? Address,
    string? City,
    string? Phone,
    bool Active,
    DateTimeOffset CreatedAt
);
