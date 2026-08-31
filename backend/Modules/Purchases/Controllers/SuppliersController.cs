using Inventory.Modules.Auth;
using Inventory.Modules.Purchases.Dtos;
using Inventory.Modules.Purchases.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Purchases.Controllers;

// A diferencia de ProductsController ([Authorize] simple, abierto a cualquier rol),
// Compras es de branch_manager (aprueba/consulta) e inventory_operator (registra) —
// más general_admin, que según RF-04 ("el Administrador general tiene visibilidad
// y permisos totales") no puede quedar afuera de ningún módulo del sistema.
[ApiController]
[Route("api/suppliers")]
[Authorize(Roles = RoleCodes.GeneralAdmin + "," + RoleCodes.BranchManager + "," + RoleCodes.InventoryOperator)]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _supplierService;

    public SuppliersController(ISupplierService supplierService)
    {
        _supplierService = supplierService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SupplierDto>>> GetAll() =>
        Ok(await _supplierService.GetAllAsync());

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SupplierDto>> GetById(long id)
    {
        var supplier = await _supplierService.GetByIdAsync(id);
        return supplier is null ? NotFound() : Ok(supplier);
    }
}
