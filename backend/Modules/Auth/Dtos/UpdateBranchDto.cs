using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Auth.Dtos;

public record UpdateBranchDto(
    [Required, MaxLength(150)] string Name,
    string? Address,
    [MaxLength(100)] string? City,
    [MaxLength(30)] string? Phone,
    bool Active
);
