using Inventory.Modules.Sales.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class SaleItemConfiguration : IEntityTypeConfiguration<SaleItem>
{
    public void Configure(EntityTypeBuilder<SaleItem> builder)
    {
        builder.ToTable("sale_items");
        builder.HasKey(i => i.Id);

        // Columna GENERATED de Postgres (01-schema.sql:295-296) — mismo mapeo que
        // PurchaseOrderItemConfiguration.Subtotal.
        builder.Property(i => i.Subtotal).ValueGeneratedOnAddOrUpdate();

        builder.HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
