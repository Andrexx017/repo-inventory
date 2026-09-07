using Inventory.Modules.Reports.Dtos;
using Inventory.Modules.Reports.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Reports.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;
    private readonly IAuthorizationService _authorizationService;

    public ReportsController(IReportService reportService, IAuthorizationService authorizationService)
    {
        _reportService = reportService;
        _authorizationService = authorizationService;
    }

    // RF-35: exporta a PDF o Excel los movimientos de inventario, ventas o
    // transferencias de una sucursal en un rango de fechas. SameBranch (mismo
    // criterio que el resto de endpoints de escritura/exportación por sucursal):
    // cualquier rol puede exportar SU sucursal, general_admin cualquiera.
    // type=inventory-movements|sales|transfers, format=pdf|excel.
    [HttpGet("{branchId:long}/export")]
    public async Task<IActionResult> Export(
        long branchId,
        [FromQuery] string type,
        [FromQuery] string format,
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset to)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var (content, contentType, fileName) = await _reportService.ExportAsync(branchId, type, format, from, to);
        return File(content, contentType, fileName);
    }

    // Envío manual e inmediato ("Enviar por correo ahora" en el frontend) —
    // genera el mismo archivo que Export (arriba) y lo manda por correo una
    // sola vez.
    [HttpPost("{branchId:long}/send-now")]
    public async Task<IActionResult> SendNow(long branchId, SendReportByEmailDto request)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var sentCount = await _reportService.SendByEmailAsync(
            branchId, request.ReportType, request.Format, request.From, request.To, request.RecipientEmails);

        return Ok(new { sentCount });
    }
}
