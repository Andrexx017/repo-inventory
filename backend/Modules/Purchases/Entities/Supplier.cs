namespace Inventory.Modules.Purchases.Entities;

public class Supplier
{
    public long Id { get; set; }
    public string Name { get; set; } = null!;
    public string? TaxId { get; set; }
    public string? ContactName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public bool Active { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
