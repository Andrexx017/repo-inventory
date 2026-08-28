namespace Inventory.Modules.Inventory.Entities;

public class InventoryItem
{
    public long Id { get; set; }
    public long BranchId { get; set; }
    public long ProductId { get; set; }
    public decimal CurrentQuantity { get; set; }
    public decimal MinimumStock { get; set; }
    public decimal? MaximumStock { get; set; }
    public decimal WeightedAverageCost { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Auth.Entities.Branch Branch { get; set; } = null!;
    public Catalog.Entities.Product Product { get; set; } = null!;
}