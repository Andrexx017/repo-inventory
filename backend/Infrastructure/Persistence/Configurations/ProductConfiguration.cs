using Inventory.Modules.Catalog.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products");
        builder.HasKey(p => p.Id);

        builder.HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.BaseUnit)
            .WithMany()
            .HasForeignKey(p => p.BaseUnitId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(p => p.ProductUnits)
            .WithOne()
            .HasForeignKey(pu => pu.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}