namespace Inventory.Modules.Auth.Dtos;

public record LoginResponseDto(long Id, string Token, string Name, string Role, long? BranchId);
