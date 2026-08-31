using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Catalog.Controllers;

// Mismo criterio que RolesController: catálogo de referencia cerrado, solo
// lectura. [Authorize] simple (no restringido a un rol) porque cualquier usuario
// autenticado puede necesitarla para un <select> (ej. al asociar una unidad
// alternativa a un producto, RF-10).
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
}
