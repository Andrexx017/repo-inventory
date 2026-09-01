using Inventory.Modules.Transfers.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class TransferItemConfiguration : IEntityTypeConfiguration<TransferItem>
{
    public void Configure(EntityTypeBuilder<TransferItem> builder)
    {
        builder.ToTable("transfer_items");
        builder.HasKey(i => i.Id);

        // Columna GENERATED de Postgres (01-schema.sql:336), mismo mapeo que
        // PurchaseOrderItem.Subtotal / SaleItem.Subtotal.
        builder.Property(i => i.Difference).ValueGeneratedOnAddOrUpdate();

        builder.HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
