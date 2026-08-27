using Inventory.Modules.Catalog.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class ProductUnitConfiguration : IEntityTypeConfiguration<ProductUnit>
{
    public void Configure(EntityTypeBuilder<ProductUnit> builder)
    {
        builder.ToTable("product_units");
        builder.HasKey(pu => pu.Id);

        builder.HasOne(pu => pu.Unit)
            .WithMany()
            .HasForeignKey(pu => pu.UnitId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}