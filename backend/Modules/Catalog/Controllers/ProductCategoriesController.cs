using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Modules.Catalog.Controllers;

// Catálogo de referencia de solo lectura, mismo criterio que UnitsOfMeasureController:
// cualquier usuario autenticado puede necesitarlo para el <select> de categoría
// al crear/editar un producto.
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
}
