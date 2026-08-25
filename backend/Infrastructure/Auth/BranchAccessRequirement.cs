using Microsoft.AspNetCore.Authorization;

namespace Inventory.Infrastructure.Auth;

// Requisito de autorización basada en recurso: el usuario solo puede operar
// sobre la sucursal indicada por el recurso (long branchId), salvo que su token
// no traiga claim branch_id (general_admin, sin sucursal — RF-04).
// Uso en un Controller de negocio (Inventario, Transferencias, etc.):
//   var result = await _authorizationService.AuthorizeAsync(User, resourceBranchId, "SameBranch");
//   if (!result.Succeeded) return Forbid();
public class BranchAccessRequirement : IAuthorizationRequirement
{
}
