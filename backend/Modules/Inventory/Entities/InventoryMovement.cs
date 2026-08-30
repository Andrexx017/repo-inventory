using Inventory.Modules.Auth.Entities;
using Inventory.Modules.Catalog.Entities;

namespace Inventory.Modules.Inventory.Entities;

public class InventoryMovement
{
    public long Id { get; set; }
    public long BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public long ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string MovementType { get; set; } = null!;
    public decimal Quantity { get; set; }
    public decimal? UnitCost { get; set; }
    public string Reason { get; set; } = null!;
    public long ResponsibleUserId { get; set; }
    public string? ReferenceType { get; set; }
    public long? ReferenceId { get; set; }
    public DateTimeOffset MovementDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}