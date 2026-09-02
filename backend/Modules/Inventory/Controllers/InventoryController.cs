using Inventory.Modules.Auth;
using Inventory.Modules.Inventory.Dtos;
using Inventory.Modules.Inventory.Services;
using Inventory.Shared.Dtos;
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

    // Para la pantalla de Existencias — paginado y filtrable (búsqueda por
    // SKU/nombre, categoría, estado de stock ok/bajo/critico). GetByBranch
    // (arriba) sigue sin paginar porque la campana y el Home lo usan para
    // cruzar alertas por productId, no solo para pintar una tabla.
    [HttpGet("{branchId:long}/paged")]
    public async Task<ActionResult<PagedResult<InventoryItemDto>>> GetPagedByBranch(
        long branchId, [FromQuery] string? search, [FromQuery] long? categoryId, [FromQuery] string? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25) =>
        Ok(await _inventoryService.GetPagedByBranchAsync(branchId, search, categoryId, status, page, pageSize));

    // UC14 del diagrama de casos de uso: registrar ingreso es exclusivo de
    // Operador de inventario (+ Admin, RF-04) — el Gerente no lo tiene.
    [HttpPost("{branchId:long}/movements")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.InventoryOperator)]
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

    // UC15 del diagrama de casos de uso: registrar retiro, mismo criterio que
    // RegisterIncoming (Operador + Admin, sin Gerente).
    [HttpPost("{branchId:long}/movements/outgoing")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.InventoryOperator)]
    public async Task<ActionResult<InventoryMovementDto>> RegisterOutgoing(
        long branchId, CreateInventoryMovementDto request)
    {
        // Mismo control de acceso que el ingreso: solo puede operar sobre
        // el inventario de su propia sucursal (política SameBranch).
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var movement = await _inventoryService.RegisterOutgoingMovementAsync(branchId, request, User.GetUserId());
        return Ok(movement);
    }

    // RF-11: historial auditable. [Authorize] simple, igual que GetByBranch — es
    // consulta de solo lectura, no movimiento de stock, así que no aplica SameBranch
    // (mismo criterio que RF-06: "consultar inventario de cualquier sucursal, solo lectura").
    // ?productId= es opcional (query string, porque no forma parte de la ruta) para
    // ver la trazabilidad completa de un solo producto en vez de toda la sucursal.
    // page/pageSize paginan el historial (RF-11 no exige verlo completo de una sola vez,
    // solo que sea consultable) — defaults cubren el caso más común sin que el cliente
    // tenga que mandarlos siempre. from/to (opcionales) filtran por rango de fechas
    // sobre MovementDate.
    [HttpGet("{branchId:long}/movements")]
    public async Task<ActionResult<PagedResult<InventoryMovementDto>>> GetMovements(
        long branchId, [FromQuery] long? productId, [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25) =>
        Ok(await _inventoryService.GetMovementsAsync(branchId, productId, from, to, page, pageSize));

    // RF-09: definir stock mínimo/máximo. Sí exige SameBranch (a diferencia del GET
    // de arriba) porque acá se está escribiendo sobre el inventario de una sucursal
    // puntual — mismo control de acceso que RegisterIncoming/RegisterOutgoing.
    [HttpPut("{branchId:long}/items/{productId:long}/thresholds")]
    public async Task<ActionResult<InventoryItemDto>> SetThresholds(
        long branchId, long productId, UpdateInventoryThresholdsDto request)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var item = await _inventoryService.SetThresholdsAsync(branchId, productId, request, User.GetUserId());
        return Ok(item);
    }

    // RF-09/RF-34: listar alertas de stock (bajo y alto) de una sucursal. Solo
    // lectura, mismo criterio de acceso que GetByBranch/GetMovements (sin SameBranch).
    [HttpGet("{branchId:long}/alerts")]
    public async Task<ActionResult<IReadOnlyList<StockAlertDto>>> GetAlerts(long branchId) =>
        Ok(await _inventoryService.GetAlertsAsync(branchId));

    // RF-34: marcar una alerta como resuelta a mano. Sí exige SameBranch (a
    // diferencia del GET de arriba) porque acá se está escribiendo sobre una
    // alerta de una sucursal puntual — mismo criterio que SetThresholds.
    [HttpPut("{branchId:long}/alerts/{alertId:long}/resolve")]
    public async Task<ActionResult<StockAlertDto>> ResolveAlert(long branchId, long alertId)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var alert = await _inventoryService.ResolveAlertAsync(branchId, alertId, User.GetUserId());
        return Ok(alert);
    }
}