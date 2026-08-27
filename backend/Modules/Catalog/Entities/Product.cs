namespace Inventory.Modules.Catalog.Entities;

public class Product
{
    public long Id { get; set; }
    public string Sku { get; set; } = null!;//stok keeping unit
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public long? CategoryId { get; set; }
    public long BaseUnitId { get; set; }
    public decimal? ReferencePrice { get; set; }
    public bool Active { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ProductCategory? Category { get; set; }
    public UnitOfMeasure BaseUnit { get; set; } = null!;
    public ICollection<ProductUnit> ProductUnits { get; set; } = new List<ProductUnit>();

}