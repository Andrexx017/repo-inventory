using Inventory.Modules.Auth;
using Inventory.Modules.Transfers.Dtos;
using Inventory.Modules.Transfers.Services;
using Inventory.Shared.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Transfers.Controllers;

// Según el PDF (sección 3.4 y 6.2): "solicita transferencias" y la preparación
// del envío son responsabilidad explícita del Operador de inventario (más
// general_admin, RF-04) — el Gerente NO aparece en Create/Prepare/Ship, su
// "aprueba transferencias" mapea a confirmar RECEPCIÓN (RF-23/24, ver método
// Receive). Por eso el [Authorize] de clase (que habilita el GET a los tres
// roles, igual criterio de lectura abierta que Inventario/Catálogo) se acota
// distinto por método: Create/Prepare/Ship a Operador+Admin, Receive a
// Gerente+Admin (se combinan con AND con el de la clase).
[ApiController]
[Route("api/transfers")]
[Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.BranchManager + "," + RoleCodes.InventoryOperator)]
public class TransfersController : ControllerBase
{
    private readonly ITransferService _transferService;
    private readonly IAuthorizationService _authorizationService;

    public TransfersController(ITransferService transferService, IAuthorizationService authorizationService)
    {
        _transferService = transferService;
        _authorizationService = authorizationService;
    }

    // RF-20: la sucursal DESTINO solicita — branchId en la ruta es esa sucursal
    // destino, SameBranch exige que quien pide la transferencia opere esa sucursal
    // (o sea general_admin, exento por no tener claim de sucursal).
    [HttpPost("{destinationBranchId:long}")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.InventoryOperator)]
    public async Task<ActionResult<TransferDto>> Create(long destinationBranchId, CreateTransferDto request)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, destinationBranchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var transfer = await _transferService.CreateAsync(destinationBranchId, request, User.GetUserId());
        return Ok(transfer);
    }

    // Solo lectura: una sucursal ve tanto lo que solicitó como lo que le piden
    // despachar, por eso no se restringe a "solo origen" o "solo destino".
    // sortBy (RF-26: priority/cost/time) y activeOnly (RF-27) son ambos opcionales.
    [HttpGet("{branchId:long}")]
    public async Task<ActionResult<IReadOnlyList<TransferDto>>> GetByBranch(
        long branchId, [FromQuery] string? sortBy = null, [FromQuery] bool activeOnly = false)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _transferService.GetByBranchAsync(branchId, sortBy, activeOnly));
    }

    [HttpGet("{branchId:long}/{id:long}")]
    public async Task<ActionResult<TransferDto>> GetById(long branchId, long id)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var transfer = await _transferService.GetByIdAsync(id);
        // branchId de la ruta debe ser origen O destino de la transferencia —
        // sin esto, cualquiera con acceso a SU sucursal podría ver el detalle
        // de una transferencia ajena adivinando el id.
        return transfer is null || (transfer.OriginBranchId != branchId && transfer.DestinationBranchId != branchId)
            ? NotFound()
            : Ok(transfer);
    }

    // RF-21: la sucursal ORIGEN confirma/ajusta la cantidad a enviar.
    [HttpPut("{originBranchId:long}/{id:long}/prepare")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.InventoryOperator)]
    public async Task<ActionResult<TransferDto>> Prepare(long originBranchId, long id, PrepareTransferDto request)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, originBranchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var transfer = await _transferService.PrepareAsync(originBranchId, id, request, User.GetUserId());
        return Ok(transfer);
    }

    // RF-22: la sucursal ORIGEN despacha físicamente la transferencia (transportista +
    // fecha estimada de llegada), momento en el que recién se descuenta su inventario.
    [HttpPut("{originBranchId:long}/{id:long}/ship")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.InventoryOperator)]
    public async Task<ActionResult<TransferDto>> Ship(long originBranchId, long id, ShipTransferDto request)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, originBranchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var transfer = await _transferService.ShipAsync(originBranchId, id, request, User.GetUserId());
        return Ok(transfer);
    }

    // RF-23/RF-24: la sucursal DESTINO confirma la recepción (completa o con
    // faltante). A diferencia de Create/Prepare/Ship, acá el rol autorizado es
    // el Gerente de sucursal, no el Operador — es el "aprueba transferencias"
    // del PDF (sección 3.4/6.2) mapeado a este paso concreto.
    [HttpPut("{destinationBranchId:long}/{id:long}/receive")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.BranchManager)]
    public async Task<ActionResult<TransferDto>> Receive(long destinationBranchId, long id, ReceiveTransferDto request)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, destinationBranchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var transfer = await _transferService.ReceiveAsync(destinationBranchId, id, request, User.GetUserId());
        return Ok(transfer);
    }

    // RF-28: reporte de cumplimiento logístico GLOBAL, agrupado por ruta —
    // UC-07. Solo Admin: visibilidad entre sucursales, mismo criterio que RF-33.
    [HttpGet("reports/compliance")]
    [Authorize(Roles = RoleCodes.GeneralAdmin)]
    public async Task<ActionResult<IReadOnlyList<RouteComplianceDto>>> GetGlobalComplianceReport()
    {
        return Ok(await _transferService.GetComplianceReportAsync(null));
    }

    // RF-28: reporte de cumplimiento logístico de UNA sucursal, agrupado por
    // ruta — UC-13 (Gerente/Operador consultando su propia sucursal).
    [HttpGet("reports/compliance/{branchId:long}")]
    public async Task<ActionResult<IReadOnlyList<RouteComplianceDto>>> GetBranchComplianceReport(long branchId)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _transferService.GetComplianceReportAsync(branchId));
    }
}
