namespace Inventory.Modules.Catalog.Entities;

public class ProductUnit
{
    public long Id { get; set; }
    public long ProductId { get; set; }
    public long UnitId { get; set; }
    public decimal ConversionFactor { get; set; }
    public bool IsPurchaseUnit { get; set; }
    public bool IsSaleUnit { get; set; }

    public UnitOfMeasure Unit { get; set; } = null!;
}