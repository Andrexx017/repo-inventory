using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Auth.Dtos;

public record ForgotPasswordRequestDto(
    [Required, EmailAddress] string Email
);
