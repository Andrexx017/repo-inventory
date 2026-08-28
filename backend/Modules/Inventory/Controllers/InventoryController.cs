using Inventory.Modules.Inventory.Dtos;
using Inventory.Modules.Inventory.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Inventory.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet("{branchId:long}")]
    public async Task<ActionResult<IReadOnlyList<InventoryItemDto>>> GetByBranch(long branchId) =>
        Ok(await _inventoryService.GetByBranchAsync(branchId));
}