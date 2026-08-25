namespace Inventory.Modules.Auth.Entities;

public class User
{
    public long Id { get; set; }
    public long? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public long RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public bool Active { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
