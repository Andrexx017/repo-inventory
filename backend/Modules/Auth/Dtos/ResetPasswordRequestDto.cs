using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Auth.Dtos;

public record ResetPasswordRequestDto(
    [Required] string Token,
    [Required, MinLength(8)] string NewPassword
);
