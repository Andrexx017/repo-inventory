using Inventory.Modules.Auth;
using Inventory.Modules.Purchases.Dtos;
using Inventory.Modules.Purchases.Services;
using Inventory.Shared.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Purchases.Controllers;

// Mismo criterio de roles que SuppliersController — branch_manager/inventory_operator
// más general_admin (RF-04: "visibilidad y permisos totales", ver nota ahí). El
// [Authorize] de clase acepta los tres; Create/Approve/CreateReceipt lo acotan más
// (ver abajo), combinándose con AND (comentario ya explicado en ProductsController.cs) —
// por eso esos tres también necesitan sumar GeneralAdmin explícitamente, no alcanza
// con que la clase lo acepte.
[ApiController]
[Route("api/purchase-orders")]
[Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.BranchManager + "," + RoleCodes.InventoryOperator)]
public class PurchaseOrdersController : ControllerBase
{
    private readonly IPurchaseOrderService _purchaseOrderService;
    private readonly IPurchaseReceiptService _purchaseReceiptService;
    private readonly IAuthorizationService _authorizationService;

    public PurchaseOrdersController(
        IPurchaseOrderService purchaseOrderService,
        IPurchaseReceiptService purchaseReceiptService,
        IAuthorizationService authorizationService)
    {
        _purchaseOrderService = purchaseOrderService;
        _purchaseReceiptService = purchaseReceiptService;
        _authorizationService = authorizationService;
    }

    // UC-16: el Operador de inventario registra la orden (más general_admin, RF-04),
    // y solo sobre su propia sucursal (política SameBranch, igual que RegisterIncoming
    // en InventoryController — SameBranch ya deja pasar a general_admin sin sucursal).
    [HttpPost("{branchId:long}")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.InventoryOperator)]
    public async Task<ActionResult<PurchaseOrderDto>> Create(long branchId, CreatePurchaseOrderDto request)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var order = await _purchaseOrderService.CreateAsync(branchId, request, User.GetUserId());
        return Ok(order);
    }

    // RF-14: ?supplierId= y ?productId= son opcionales (query string, no forman
    // parte de la ruta), mismo criterio que ?productId= en InventoryController.GetMovements.
    [HttpGet("{branchId:long}")]
    public async Task<ActionResult<IReadOnlyList<PurchaseOrderDto>>> GetByBranch(
        long branchId, [FromQuery] long? supplierId, [FromQuery] long? productId)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _purchaseOrderService.GetByBranchAsync(branchId, supplierId, productId));
    }

    [HttpGet("{branchId:long}/{id:long}")]
    public async Task<ActionResult<PurchaseOrderDto>> GetById(long branchId, long id)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var order = await _purchaseOrderService.GetByIdAsync(id);
        // También valida que la orden pertenezca a la sucursal de la ruta — sin
        // esto, cualquiera podría ver el detalle de una orden ajena adivinando el id.
        return order is null || order.BranchId != branchId ? NotFound() : Ok(order);
    }

    // UC-09: aprobación del Gerente de sucursal (más general_admin, RF-04).
    [HttpPost("{branchId:long}/{id:long}/approve")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.BranchManager)]
    public async Task<ActionResult<PurchaseOrderDto>> Approve(long branchId, long id)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _purchaseOrderService.ApproveAsync(id));
    }

    [HttpPost("{branchId:long}/{id:long}/cancel")]
    public async Task<ActionResult<PurchaseOrderDto>> Cancel(long branchId, long id)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _purchaseOrderService.CancelAsync(id));
    }

    // UC-17: confirmar recepción de compra — el Operador de inventario (más
    // general_admin, RF-04), sobre su propia sucursal (RF-13: acá se dispara la
    // actualización automática de inventario + costo promedio ponderado, RF-15).
    [HttpPost("{branchId:long}/{id:long}/receipts")]
    [Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.InventoryOperator)]
    public async Task<ActionResult<PurchaseReceiptDto>> CreateReceipt(
        long branchId, long id, CreatePurchaseReceiptDto request)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var receipt = await _purchaseReceiptService.CreateAsync(branchId, id, request, User.GetUserId());
        return Ok(receipt);
    }

    [HttpGet("{branchId:long}/{id:long}/receipts")]
    public async Task<ActionResult<IReadOnlyList<PurchaseReceiptDto>>> GetReceipts(long branchId, long id)
    {
        var authResult = await _authorizationService.AuthorizeAsync(User, branchId, "SameBranch");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        return Ok(await _purchaseReceiptService.GetByOrderAsync(branchId, id));
    }
}
