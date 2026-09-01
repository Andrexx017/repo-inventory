using Inventory.Modules.Auth;
using Inventory.Modules.Dashboard.Dtos;
using Inventory.Modules.Dashboard.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Dashboard.Controllers;

// [Authorize] simple a nivel de clase: los 4 endpoints acotados a branchId usan
// SameBranch (igual criterio que Inventario/Compras/Ventas — cualquier rol
// autenticado puede ver el dashboard de SU propia sucursal). El único endpoint
// sin branchId (RF-33, comparativa entre sucursales) lleva su propia
// restricción de rol, ver más abajo.
[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly IAuthorizationService _authorizationService;

    public DashboardController(IDashboardService dashboardService, IAuthorizationService authorizationService)
    {
        _dashboardService = dashboardService;
        _authorizationService = authorizationService;
    }

    // RF-29: ventas del mes en curso comparadas con meses anteriores.
    [HttpGet("{branchId:long}/sales-summary")]
    public async Task<ActionResult<SalesSummaryDto>> GetSalesSummary(long branchId)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _dashboardService.GetSalesSummaryAsync(branchId));
    }

    // RF-30: rotación de inventario — productos de alta y baja demanda.
    [HttpGet("{branchId:long}/inventory-rotation")]
    public async Task<ActionResult<InventoryRotationDto>> GetInventoryRotation(long branchId)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _dashboardService.GetInventoryRotationAsync(branchId));
    }

    // RF-31: transferencias activas y su impacto en el inventario.
    [HttpGet("{branchId:long}/active-transfers")]
    public async Task<ActionResult<ActiveTransfersDto>> GetActiveTransfers(long branchId)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _dashboardService.GetActiveTransfersAsync(branchId));
    }

    // RF-32: productos próximos a agotarse según su stock mínimo.
    [HttpGet("{branchId:long}/low-stock")]
    public async Task<ActionResult<LowStockIndicatorsDto>> GetLowStockIndicators(long branchId)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _dashboardService.GetLowStockIndicatorsAsync(branchId));
    }

    // RF-33: comparativa de rendimiento entre TODAS las sucursales — visible
    // únicamente para general_admin (RF-33 lo pide textual). Sin branchId en la
    // ruta: no es el dato de una sucursal puntual, y SameBranch no aplica (el
    // admin general es justo el único rol sin sucursal propia).
    [HttpGet("branch-comparison")]
    [Authorize(Roles = RoleCodes.GeneralAdmin)]
    public async Task<ActionResult<BranchComparisonDto>> GetBranchComparison()
    {
        return Ok(await _dashboardService.GetBranchComparisonAsync());
    }
}
