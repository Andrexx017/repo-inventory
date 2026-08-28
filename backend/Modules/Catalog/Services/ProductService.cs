using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Entities;
using Inventory.Modules.Catalog.Repositories;

namespace Inventory.Modules.Catalog.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _products;

    public ProductService(IProductRepository products)
    {
        _products = products;
    }

    public async Task<IReadOnlyList<ProductDto>> GetAllAsync()
    {
        var products = await _products.GetAllAsync();
        return products.Select(ToDto).ToList();
    }

    public async Task<ProductDto?> GetByIdAsync(long id)
    {
        var product = await _products.GetByIdAsync(id);
        return product is null ? null : ToDto(product);
    }

    private static ProductDto ToDto(Product product) => new(
        product.Id,
        product.Sku,
        product.Name,
        product.Description,
        product.CategoryId,
        product.Category?.Name,
        product.BaseUnitId,
        product.BaseUnit.Name,
        product.BaseUnit.Abbreviation,
        product.ReferencePrice,
        product.Active,
        product.CreatedAt,
        product.ProductUnits.Select(ToUnitDto).ToList()
    );

    private static ProductUnitDto ToUnitDto(ProductUnit productUnit) => new(
        productUnit.UnitId,
        productUnit.Unit.Name,
        productUnit.Unit.Abbreviation,
        productUnit.ConversionFactor,
        productUnit.IsPurchaseUnit,
        productUnit.IsSaleUnit
    );
}
