using Inventory.Modules.Auth.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Persistence;

// Database First: el esquema es dueño de database/init/*.sql (ver database/docs/decisions.md).
// Este DbContext solo mapea tablas ya existentes — nunca genera migraciones propias.
// Los DbSet<T> se agregan acá a medida que cada módulo define sus Entities.
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
