using Inventory.Modules.Inventory.Dtos;
using Inventory.Modules.Inventory.Services;
using Inventory.Shared.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Inventory.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly IAuthorizationService _authorizationService;

    public InventoryController(IInventoryService inventoryService, IAuthorizationService authorizationService)
    {
        _inventoryService = inventoryService;
        _authorizationService = authorizationService;
    }

    [HttpGet("{branchId:long}")]
    public async Task<ActionResult<IReadOnlyList<InventoryItemDto>>> GetByBranch(long branchId) =>
        Ok(await _inventoryService.GetByBranchAsync(branchId));

    [HttpPost("{branchId:long}/movements")]
    public async Task<ActionResult<InventoryMovementDto>> RegisterIncoming(
        long branchId, CreateInventoryMovementDto request)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var movement = await _inventoryService.RegisterIncomingMovementAsync(branchId, request, User.GetUserId());
        return Ok(movement);
    }
}