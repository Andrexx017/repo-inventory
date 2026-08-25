using Inventory.Modules.Auth.Dtos;
using Inventory.Modules.Auth.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Auth.Controllers;

// RF-02: crear, editar y desactivar usuarios — solo Administrador general.
[ApiController]
[Route("api/users")]
[Authorize(Roles = RoleCodes.GeneralAdmin)]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll() =>
        Ok(await _userService.GetAllAsync());

    [HttpGet("{id:long}")]
    public async Task<ActionResult<UserDto>> GetById(long id)
    {
        var user = await _userService.GetByIdAsync(id);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(CreateUserDto request)
    {
        var user = await _userService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<UserDto>> Update(long id, UpdateUserDto request)
    {
        var user = await _userService.UpdateAsync(id, request);
        return user is null ? NotFound() : Ok(user);
    }
}
