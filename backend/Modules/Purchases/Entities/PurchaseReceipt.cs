namespace Inventory.Modules.Purchases.Entities;

public class PurchaseReceipt
{
    public long Id { get; set; }
    public long PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public DateTimeOffset ReceiptDate { get; set; }
    public long ReceivedBy { get; set; }
    public bool IsComplete { get; set; }
    public string? Notes { get; set; }

    public ICollection<PurchaseReceiptItem> Items { get; set; } = new List<PurchaseReceiptItem>();
}
