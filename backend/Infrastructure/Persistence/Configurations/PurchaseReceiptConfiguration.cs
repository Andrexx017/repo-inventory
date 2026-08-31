using Inventory.Modules.Purchases.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class PurchaseReceiptConfiguration : IEntityTypeConfiguration<PurchaseReceipt>
{
    public void Configure(EntityTypeBuilder<PurchaseReceipt> builder)
    {
        builder.ToTable("purchase_receipts");
        builder.HasKey(r => r.Id);

        // Restrict, no Cascade: no tiene sentido de negocio borrar una orden de
        // compra que ya tiene recepciones registradas (perdería la trazabilidad
        // de qué mercancía entró y a qué costo). Mismo criterio que el resto de
        // documentos "cabecera" del proyecto (purchase_orders, sales, transfers).
        builder.HasOne(r => r.PurchaseOrder)
            .WithMany()
            .HasForeignKey(r => r.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(r => r.Items)
            .WithOne(i => i.Receipt)
            .HasForeignKey(i => i.ReceiptId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
