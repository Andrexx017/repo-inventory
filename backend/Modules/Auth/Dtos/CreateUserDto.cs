using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Auth.Dtos;

// BranchId es obligatorio salvo para el rol Administrador general (RF-02) —
// esa regla se valida en UserService, no acá, porque depende de datos (Role.Code).
public record CreateUserDto(
    [Required, MaxLength(150)] string Name,
    [Required, EmailAddress, MaxLength(150)] string Email,
    [Required, MinLength(8)] string Password,
    [Required] long RoleId,
    long? BranchId
);
