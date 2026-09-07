using Inventory.Modules.Auth;
using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Catalog.Controllers;

// El GET es de solo lectura para cualquier usuario autenticado (lo necesita el
// <select> de categoría al crear/editar un producto). Crear categorías nuevas
// queda restringido a GeneralAdmin, mismo criterio que UnitsOfMeasureController.
[ApiController]
[Route("api/product-categories")]
[Authorize]
public class ProductCategoriesController : ControllerBase
{
    private readonly IProductCategoryService _categoryService;

    public ProductCategoriesController(IProductCategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductCategoryDto>>> GetAll() =>
        Ok(await _categoryService.GetAllAsync());

    [HttpPost]
    [Authorize(Roles = RoleCodes.GeneralAdmin)]
    public async Task<ActionResult<ProductCategoryDto>> Create(CreateProductCategoryDto request)
    {
        var category = await _categoryService.CreateAsync(request);
        return Ok(category);
    }
}
