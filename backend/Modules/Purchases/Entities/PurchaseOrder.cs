using Inventory.Modules.Auth.Entities;

namespace Inventory.Modules.Purchases.Entities;

public class PurchaseOrder
{
    public long Id { get; set; }
    public string OrderNumber { get; set; } = null!;
    public long SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public long BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public string Status { get; set; } = null!;
    public DateTimeOffset OrderDate { get; set; }
    public int? PaymentTermDays { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal Total { get; set; }
    public long CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
}
