using Inventory.Modules.Catalog.Entities;

namespace Inventory.Modules.Sales.Entities;

public class PriceListItem
{
    public long Id { get; set; }
    public long PriceListId { get; set; }
    public PriceList PriceList { get; set; } = null!;
    public long ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Price { get; set; }
}
