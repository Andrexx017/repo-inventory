using Inventory.Modules.Auth;
using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Catalog.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetAll() =>
        Ok(await _productService.GetAllAsync());

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ProductDto>> GetById(long id)
    {
        var product = await _productService.GetByIdAsync(id);
        return product is null ? NotFound() : Ok(product);
    }

    // RF-10: a diferencia de los GET (abiertos a cualquier rol autenticado, RF-05),
    // gestionar el catálogo es exclusivo del Administrador general — mismo criterio
    // que BranchesController/RolesController/UsersController. El [Authorize] simple
    // de la clase sigue exigiendo el token; este atributo de método suma el rol
    // (ASP.NET Core combina varios [Authorize] con AND, no reemplaza al de la clase).
    [HttpPost("{productId:long}/units")]
    [Authorize(Roles = RoleCodes.GeneralAdmin)]
    public async Task<ActionResult<ProductDto>> AddUnit(long productId, CreateProductUnitDto request)
    {
        var product = await _productService.AddUnitAsync(productId, request);
        return Ok(product);
    }
}
