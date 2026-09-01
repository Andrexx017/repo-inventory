using Inventory.Modules.Auth;
using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Catalog.Controllers;

// [Authorize] simple (no restringido a un rol) en el GET porque cualquier usuario
// autenticado puede necesitarla para un <select> (ej. al asociar una unidad
// alternativa a un producto, RF-10). Crear unidades nuevas sí queda restringido
// a GeneralAdmin, mismo criterio que gestionar el catálogo (RF-10, ProductsController).
[ApiController]
[Route("api/units-of-measure")]
[Authorize]
public class UnitsOfMeasureController : ControllerBase
{
    private readonly IUnitOfMeasureService _unitService;

    public UnitsOfMeasureController(IUnitOfMeasureService unitService)
    {
        _unitService = unitService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UnitOfMeasureDto>>> GetAll() =>
        Ok(await _unitService.GetAllAsync());

    [HttpPost]
    [Authorize(Roles = RoleCodes.GeneralAdmin)]
    public async Task<ActionResult<UnitOfMeasureDto>> Create(CreateUnitOfMeasureDto request)
    {
        var unit = await _unitService.CreateAsync(request);
        return Ok(unit);
    }
}
