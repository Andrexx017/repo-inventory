using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Auth.Dtos;

// Password es opcional: si viene null/vacío, no se toca el hash existente.
public record UpdateUserDto(
    [Required, MaxLength(150)] string Name,
    [Required, EmailAddress, MaxLength(150)] string Email,
    [Required] long RoleId,
    long? BranchId,
    bool Active,
    [MinLength(8)] string? Password
);
