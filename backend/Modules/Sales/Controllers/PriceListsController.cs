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

    // Crear una lista nueva (ej. "Temporada Navidad") es una decisión
    // comercial — a pedido explícito del usuario, solo el Admin general
    // puede hacerlo, ni Gerente ni Operador.
    [HttpPost]
    [Authorize(Roles = RoleCodes.GeneralAdmin)]
    public async Task<ActionResult<PriceListDto>> Create(CreatePriceListDto request) =>
        Ok(await _priceListService.CreateAsync(request));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<PriceListDto>> GetById(long id)
    {
        var priceList = await _priceListService.GetByIdAsync(id);
        return priceList is null ? NotFound() : Ok(priceList);
    }

    // Todo el catálogo con su precio en esta lista (null = todavía sin
    // precio) — es lo que alimenta el modal de edición en el frontend.
    [HttpGet("{id:long}/items")]
    public async Task<ActionResult<IReadOnlyList<PriceListItemDto>>> GetItems(long id) =>
        Ok(await _priceListService.GetItemsAsync(id));

    // Cargar/editar precios es una decisión comercial — mismo criterio que
    // ProductsController: solo el Admin general puede escribir, el resto solo
    // lee (para el <select> de la venta y, ahora, para ver el modal).
    [HttpPut("{id:long}/items/{productId:long}")]
    [Authorize(Roles = RoleCodes.GeneralAdmin)]
    public async Task<IActionResult> SetItemPrice(long id, long productId, SetPriceListItemDto request)
    {
        await _priceListService.SetItemPriceAsync(id, productId, request.Price);
        return NoContent();
    }

    [HttpDelete("{id:long}/items/{productId:long}")]
    [Authorize(Roles = RoleCodes.GeneralAdmin)]
    public async Task<IActionResult> RemoveItem(long id, long productId)
    {
        var removed = await _priceListService.RemoveItemAsync(id, productId);
        return removed ? NoContent() : NotFound();
    }
}
