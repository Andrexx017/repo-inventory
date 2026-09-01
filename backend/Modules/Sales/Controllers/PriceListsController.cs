using Inventory.Modules.Auth;
using Inventory.Modules.Sales.Dtos;
using Inventory.Modules.Sales.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Sales.Controllers;

// Mismo criterio que SuppliersController: branch_manager (consulta) e
// inventory_operator (registra) necesitan el <select> de listas de precio,
// más general_admin (RF-04: "visibilidad y permisos totales").
[ApiController]
[Route("api/price-lists")]
[Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.BranchManager + "," + RoleCodes.InventoryOperator)]
public class PriceListsController : ControllerBase
{
    private readonly IPriceListService _priceListService;

    public PriceListsController(IPriceListService priceListService)
    {
        _priceListService = priceListService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PriceListDto>>> GetAll() =>
        Ok(await _priceListService.GetAllAsync());

    [HttpGet("{id:long}")]
    public async Task<ActionResult<PriceListDto>> GetById(long id)
    {
        var priceList = await _priceListService.GetByIdAsync(id);
        return priceList is null ? NotFound() : Ok(priceList);
    }
}
