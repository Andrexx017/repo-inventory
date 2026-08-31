using Inventory.Modules.Purchases.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class PurchaseOrderItemConfiguration : IEntityTypeConfiguration<PurchaseOrderItem>
{
    public void Configure(EntityTypeBuilder<PurchaseOrderItem> builder)
    {
        builder.ToTable("purchase_order_items");
        builder.HasKey(i => i.Id);

        // subtotal es GENERATED ALWAYS AS (...) STORED en la BD (01-schema.sql:224-225):
        // EF Core no debe mandarla en el INSERT, y tiene que releerla después de guardar
        // para que el objeto en memoria refleje el valor real calculado por Postgres.
        builder.Property(i => i.Subtotal).ValueGeneratedOnAddOrUpdate();

        builder.HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
