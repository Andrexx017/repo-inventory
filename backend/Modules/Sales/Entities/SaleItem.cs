using Inventory.Modules.Catalog.Entities;

namespace Inventory.Modules.Sales.Entities;

public class SaleItem
{
    public long Id { get; set; }
    public long SaleId { get; set; }
    public Sale Sale { get; set; } = null!;
    public long ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPct { get; set; }

    // GENERATED ALWAYS AS (...) STORED en Postgres (01-schema.sql:295-296) — mismo
    // patrón que PurchaseOrderItem.Subtotal, nunca se asigna desde C#.
    public decimal Subtotal { get; set; }
}
