using Inventory.Modules.Auth.Dtos;
using Inventory.Modules.Auth.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Auth.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize(Roles = RoleCodes.GeneralAdmin)]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;

    public RolesController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoleDto>>> GetAll() =>
        Ok(await _roleService.GetAllAsync());

    [HttpGet("{id:long}")]
    public async Task<ActionResult<RoleDto>> GetById(long id)
    {
        var role = await _roleService.GetByIdAsync(id);
        return role is null ? NotFound() : Ok(role);
    }
}
