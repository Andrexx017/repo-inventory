using Inventory.Modules.Auth;
using Inventory.Modules.Sales.Dtos;
using Inventory.Modules.Sales.Services;
using Inventory.Shared.Dtos;
using Inventory.Shared.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Sales.Controllers;

[ApiController]
[Route("api/sales")]
[Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.BranchManager + "," + RoleCodes.InventoryOperator)]
public class SalesController : ControllerBase
{
    private readonly ISaleService _saleService;
    private readonly IAuthorizationService _authorizationService;

    public SalesController(ISaleService saleService, IAuthorizationService authorizationService)
    {
        _saleService = saleService;
        _authorizationService = authorizationService;
    }

    // UC-18: el Operador de inventario registra la venta (más general_admin,
    // RF-04), sobre su propia sucursal (SameBranch), igual criterio que Create
    // en PurchaseOrdersController.
    [HttpPost("{branchId:long}")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.InventoryOperator)]
    public async Task<ActionResult<SaleDto>> Create(long branchId, CreateSaleDto request)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var sale = await _saleService.CreateAsync(branchId, request, User.GetUserId());
        return Ok(sale);
    }

    // page/pageSize paginan el historial de ventas — mismo criterio que
    // GetMovements en InventoryController. from/to (opcionales) filtran por
    // rango de fechas sobre SaleDate.
    [HttpGet("{branchId:long}")]
    public async Task<ActionResult<PagedResult<SaleDto>>> GetByBranch(
        long branchId, [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _saleService.GetByBranchAsync(branchId, from, to, page, pageSize));
    }

    // Indicadores del encabezado (ventas de hoy, total del mes, producto top) —
    // separados de GetByBranch para no perder el beneficio de paginar la lista.
    [HttpGet("{branchId:long}/kpi-summary")]
    public async Task<ActionResult<SalesKpiDto>> GetKpiSummary(long branchId)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _saleService.GetKpiSummaryAsync(branchId));
    }

    // RF-19: el "comprobante" consultable posteriormente — detalle completo
    // de una venta con sus líneas.
    [HttpGet("{branchId:long}/{id:long}")]
    public async Task<ActionResult<SaleDto>> GetById(long branchId, long id)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var sale = await _saleService.GetByIdAsync(id);
        return sale is null || sale.BranchId != branchId ? NotFound() : Ok(sale);
    }
}
