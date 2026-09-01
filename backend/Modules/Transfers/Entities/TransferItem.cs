using Inventory.Modules.Catalog.Entities;

namespace Inventory.Modules.Transfers.Entities;

public class TransferItem
{
    public long Id { get; set; }
    public long TransferId { get; set; }
    public Transfer Transfer { get; set; } = null!;
    public long ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal RequestedQuantity { get; set; }
    public decimal ShippedQuantity { get; set; }
    public decimal ReceivedQuantity { get; set; }

    // GENERATED ALWAYS AS (shipped_quantity - received_quantity) STORED
    // (01-schema.sql:336) — nunca se asigna desde C#, ver TransferItemConfiguration.
    public decimal Difference { get; set; }
}
