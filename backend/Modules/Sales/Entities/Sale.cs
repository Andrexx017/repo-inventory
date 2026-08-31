using Inventory.Modules.Auth.Entities;

namespace Inventory.Modules.Sales.Entities;

public class Sale
{
    public long Id { get; set; }
    public string SaleNumber { get; set; } = null!;
    public long BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public long? PriceListId { get; set; }
    public PriceList? PriceList { get; set; }
    public long SellerId { get; set; }
    public User Seller { get; set; } = null!;
    public string? CustomerName { get; set; }
    public DateTimeOffset SaleDate { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();
}
