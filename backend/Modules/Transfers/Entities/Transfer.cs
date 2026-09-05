using Inventory.Modules.Auth.Entities;

namespace Inventory.Modules.Transfers.Entities;

public class Transfer
{
    public long Id { get; set; }
    public string TransferNumber { get; set; } = null!;
    public long OriginBranchId { get; set; }
    public Branch OriginBranch { get; set; } = null!;
    public long DestinationBranchId { get; set; }
    public Branch DestinationBranch { get; set; } = null!;
    public long RequestedBy { get; set; }
    public long? ApprovedBy { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public string Status { get; set; } = null!;
    public string Urgency { get; set; } = null!;
    public string? RoutePriority { get; set; }
    public string? Carrier { get; set; }
    public decimal? ShippingCost { get; set; }
    public DateTimeOffset RequestDate { get; set; }
    public DateTimeOffset? EstimatedShipDate { get; set; }
    public DateTimeOffset? ActualShipDate { get; set; }
    public DateTimeOffset? EstimatedArrivalDate { get; set; }
    public DateTimeOffset? ActualArrivalDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<TransferItem> Items { get; set; } = new List<TransferItem>();
    public ICollection<TransferEvent> Events { get; set; } = new List<TransferEvent>();
}
