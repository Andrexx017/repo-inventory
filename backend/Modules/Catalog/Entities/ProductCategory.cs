namespace Inventory.Modules.Catalog.Entities;

public class ProductCategory
{
    public long Id { get; set; }
    public string Name { get ; set; }
    public string? Description { get; set; }

    public ICollection<Product> Products { get; set; } = new List<Product>();
}