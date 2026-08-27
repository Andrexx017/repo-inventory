using Inventory.Modules.Auth.Entities;
using Inventory.Modules.Catalog.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<User> Users => Set<User>();

    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<UnitOfMeasure> UnitsOfMeasure => Set<UnitOfMeasure>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductUnit> ProductUnits => Set<ProductUnit>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
