using Inventory.Modules.Catalog.Entities;

namespace Inventory.Modules.Purchases.Entities;

public class PurchaseOrderItem
{
    public long Id { get; set; }
    public long PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public long ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPct { get; set; }

    // Columna GENERATED ALWAYS AS (...) STORED en Postgres (01-schema.sql:224-225):
    // Postgres la calcula sola en cada INSERT, nunca se asigna desde el backend
    // (ver PurchaseOrderItemConfiguration.ValueGeneratedOnAddOrUpdate).
    public decimal Subtotal { get; set; }
}
