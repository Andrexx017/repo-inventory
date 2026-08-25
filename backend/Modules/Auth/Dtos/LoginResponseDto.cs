namespace Inventory.Modules.Auth.Dtos;

public record LoginResponseDto(string Token, string Name, string Role, long? BranchId);
