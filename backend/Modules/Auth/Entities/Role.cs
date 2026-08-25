namespace Inventory.Modules.Auth.Entities;

public class Role
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
}
