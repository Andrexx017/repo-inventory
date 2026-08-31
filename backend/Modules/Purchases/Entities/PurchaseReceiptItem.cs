namespace Inventory.Modules.Purchases.Entities;

public class PurchaseReceiptItem
{
    public long Id { get; set; }
    public long ReceiptId { get; set; }
    public PurchaseReceipt Receipt { get; set; } = null!;
    public long PurchaseOrderItemId { get; set; }
    public PurchaseOrderItem PurchaseOrderItem { get; set; } = null!;
    public decimal ReceivedQuantity { get; set; }
}
