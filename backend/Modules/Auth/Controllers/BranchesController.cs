using Inventory.Modules.Auth.Dtos;
using Inventory.Modules.Auth.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Auth.Controllers;

// RF-03: crear, editar y desactivar sucursales — solo Administrador general.
// RF-06: consultar sucursales (solo lectura) es de cualquier rol autenticado —
// el módulo Inventario necesita poder listarlas para su selector de sucursal,
// mismo criterio que ya separa los GET/POST de ProductsController (RF-10).
[ApiController]
[Route("api/branches")]
[Authorize]
public class BranchesController : ControllerBase
{
    private readonly IBranchService _branchService;

    public BranchesController(IBranchService branchService)
    {
        _branchService = branchService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BranchDto>>> GetAll() =>
        Ok(await _branchService.GetAllAsync());

    [HttpGet("{id:long}")]
    public async Task<ActionResult<BranchDto>> GetById(long id)
    {
        var branch = await _branchService.GetByIdAsync(id);
        return branch is null ? NotFound() : Ok(branch);
    }

    [HttpPost]
    [Authorize(Roles = RoleCodes.GeneralAdmin)]
    public async Task<ActionResult<BranchDto>> Create(CreateBranchDto request)
    {
        var branch = await _branchService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = branch.Id }, branch);
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = RoleCodes.GeneralAdmin)]
    public async Task<ActionResult<BranchDto>> Update(long id, UpdateBranchDto request)
    {
        var branch = await _branchService.UpdateAsync(id, request);
        return branch is null ? NotFound() : Ok(branch);
    }
}
