using Inventory.Modules.Auth;
using Inventory.Modules.Transfers.Dtos;
using Inventory.Modules.Transfers.Services;
using Inventory.Shared.Dtos;
using Inventory.Shared.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Transfers.Controllers;

// Alineado con el diagrama de casos de uso (diagrams/DiagramaCasoDeUso.drawio.png),
// con un ajuste sobre UC20: Solicitar transferencia (UC19) es de Operador+Gerente+Admin;
// Preparar/despachar (UC20) es de Operador+Gerente+Admin de la sucursal ORIGEN — se
// abrió a Gerente porque una sucursal puede no tener un Operador de inventario propio,
// y en ese caso solo el Admin podía avanzar el flujo de salida; Confirmar recepción
// (UC11) es de Gerente+Operador+Admin. El [Authorize] de clase habilita el GET a los
// tres roles (igual criterio de lectura abierta que Inventario/Catálogo); cada método
// de escritura se acota aparte y se combina con AND con el de la clase.
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
    // (o sea general_admin, exento por no tener claim de sucursal). UC19 del
    // diagrama de casos de uso: Operador, Gerente y Admin pueden solicitar.
    [HttpPost("{destinationBranchId:long}")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.InventoryOperator + "," + RoleCodes.BranchManager)]
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
    // statuses (CSV, ej. "requested,preparing") filtra por las pestañas del
    // frontend. from/to filtran por rango de fechas sobre RequestDate.
    // page/pageSize paginan, igual criterio que GetMovements.
    [HttpGet("{branchId:long}")]
    public async Task<ActionResult<PagedResult<TransferDto>>> GetByBranch(
        long branchId, [FromQuery] string? sortBy = null, [FromQuery] bool activeOnly = false,
        [FromQuery] string? statuses = null, [FromQuery] DateTimeOffset? from = null, [FromQuery] DateTimeOffset? to = null,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var statusList = string.IsNullOrWhiteSpace(statuses)
            ? null
            : statuses.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return Ok(await _transferService.GetByBranchAsync(branchId, sortBy, activeOnly, statusList, from, to, page, pageSize));
    }

    // Indicadores del encabezado (en tránsito/pendientes/recibidas del mes/
    // retraso promedio) — separados de GetByBranch para no perder el beneficio
    // de paginar la lista.
    [HttpGet("{branchId:long}/kpi-summary")]
    public async Task<ActionResult<TransfersKpiDto>> GetKpiSummary(long branchId)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _transferService.GetKpiSummaryAsync(branchId));
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

    // El Gerente de la sucursal DESTINO (+Admin) aprueba la solicitud que hizo
    // su propio Operador — recién ahí la sucursal origen puede prepararla.
    // El Operador queda afuera a propósito, mismo criterio que Approve en
    // PurchaseOrdersController.
    [HttpPost("{destinationBranchId:long}/{id:long}/approve")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.BranchManager)]
    public async Task<ActionResult<TransferDto>> Approve(long destinationBranchId, long id)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, destinationBranchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var transfer = await _transferService.ApproveAsync(destinationBranchId, id, User.GetUserId());
        return Ok(transfer);
    }

    // Denegar/cancelar: a diferencia de Aprobar/Preparar (un solo lado), acá
    // puede actuar tanto origen como destino — el Service valida que branchId
    // sea una de las dos partes. El [Authorize] de clase ya habilita los 3
    // roles porque "cancelar" en preparación es tarea operativa del origen
    // (mismos roles que Preparar/Despachar); pero "denegar" una solicitud
    // TODAVÍA SIN APROBAR, visto desde el destino, es el rechazo simétrico de
    // Aprobar — mismo rol (Gerente+Admin), el Operador queda afuera. Esa
    // combinación puntual (destino + sin aprobar) no se puede expresar con un
    // [Authorize(Roles=...)] fijo porque depende del estado real de la
    // transferencia, así que se verifica a mano acá.
    [HttpPost("{branchId:long}/{id:long}/cancel")]
    public async Task<ActionResult<TransferDto>> Cancel(long branchId, long id)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var existing = await _transferService.GetByIdAsync(id);
        var isDenyingUnapprovedRequest = existing is not null
            && existing.Status == "requested"
            && existing.ApprovedAt is null
            && existing.DestinationBranchId == branchId;

        if (isDenyingUnapprovedRequest && !User.IsInRole(RoleCodes.GeneralAdmin) && !User.IsInRole(RoleCodes.BranchManager))
        {
            return Forbid();
        }

        var transfer = await _transferService.CancelAsync(branchId, id, User.GetUserId());
        return Ok(transfer);
    }

    // RF-21: la sucursal ORIGEN confirma/ajusta la cantidad a enviar.
    [HttpPut("{originBranchId:long}/{id:long}/prepare")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.InventoryOperator + "," + RoleCodes.BranchManager)]
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
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.InventoryOperator + "," + RoleCodes.BranchManager)]
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
    // faltante) — ajustado a pedido explícito del usuario: el Operador queda
    // afuera, solo Gerente (+Admin) confirma la recepción (antes incluía
    // también al Operador, por UC11 del diagrama de casos de uso original).
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
    // ruta — UC13 del diagrama de casos de uso: solo Gerente (+Admin) consulta
    // el de su propia sucursal, el Operador no tiene este caso de uso.
    [HttpGet("reports/compliance/{branchId:long}")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.BranchManager)]
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
