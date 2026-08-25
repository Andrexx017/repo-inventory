namespace Inventory.Modules.Auth.Entities;

public class Branch
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Phone { get; set; }
    public bool Active { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
}
