namespace Inventory.Modules.Transfers.Entities;

public class TransferEvent
{
    public long Id { get; set; }
    public long TransferId { get; set; }
    public Transfer Transfer { get; set; } = null!;
    public string Status { get; set; } = null!;
    public DateTimeOffset EventDate { get; set; }
    public string? Notes { get; set; }
    public long RecordedBy { get; set; }
}
