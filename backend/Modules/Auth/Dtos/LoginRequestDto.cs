using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Auth.Dtos;

public record LoginRequestDto(
    [Required, EmailAddress] string Email,
    [Required] string Password
);
