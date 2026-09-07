using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Auth.Dtos;

public record CreateBranchDto(
    [Required, MaxLength(6), RegularExpression(@"^[A-Z]{3}-\d{2}$",
        ErrorMessage = "El código debe tener el formato AAA-99 (3 letras, guion y 2 números, ej: BOG-01).")]
    string Code,
    [Required, MaxLength(150)] string Name,
    string? Address,
    [MaxLength(100)] string? City,
    [MaxLength(30)] string? Phone
);
