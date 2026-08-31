namespace Inventory.Modules.Sales.Entities;

public class PriceList
{
    public long Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public bool Active { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    public ICollection<PriceListItem> Items { get; set; } = new List<PriceListItem>();
}
