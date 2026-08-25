using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Auth.Dtos;

public record CreateBranchDto(
    [Required, MaxLength(20)] string Code,
    [Required, MaxLength(150)] string Name,
    string? Address,
    [MaxLength(100)] string? City,
    [MaxLength(30)] string? Phone
);
