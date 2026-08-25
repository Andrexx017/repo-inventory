namespace Inventory.Modules.Auth;

// Códigos fijos de la tabla roles (database/init/01-schema.sql) — conjunto cerrado,
// section 6.2 del análisis. Se usan en [Authorize(Roles = "...")] (requiere const)
// y en las validaciones de UserService.
public static class RoleCodes
{
    public const string GeneralAdmin = "general_admin";
    public const string BranchManager = "branch_manager";
    public const string InventoryOperator = "inventory_operator";
}
