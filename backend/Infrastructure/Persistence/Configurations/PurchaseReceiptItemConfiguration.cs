using Inventory.Modules.Purchases.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class PurchaseReceiptItemConfiguration : IEntityTypeConfiguration<PurchaseReceiptItem>
{
    public void Configure(EntityTypeBuilder<PurchaseReceiptItem> builder)
    {
        builder.ToTable("purchase_receipt_items");
        builder.HasKey(i => i.Id);

        builder.HasOne(i => i.PurchaseOrderItem)
            .WithMany()
            .HasForeignKey(i => i.PurchaseOrderItemId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
