using Microsoft.AspNetCore.Authorization;

namespace Inventory.Infrastructure.Auth;

public class BranchAccessHandler : AuthorizationHandler<BranchAccessRequirement, long>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, BranchAccessRequirement requirement, long resourceBranchId)
    {
        var branchClaim = context.User.FindFirst(AuthClaimTypes.BranchId)?.Value;

        // Sin claim branch_id = general_admin, exento (RF-04: visibilidad y permisos totales).
        if (branchClaim is null)
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        if (long.TryParse(branchClaim, out var userBranchId) && userBranchId == resourceBranchId)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
