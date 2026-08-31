using Inventory.Modules.Sales.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class SaleConfiguration : IEntityTypeConfiguration<Sale>
{
    public void Configure(EntityTypeBuilder<Sale> builder)
    {
        builder.ToTable("sales");
        builder.HasKey(s => s.Id);
        builder.HasIndex(s => s.SaleNumber).IsUnique();

        builder.HasOne(s => s.Branch)
            .WithMany()
            .HasForeignKey(s => s.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        // Restrict, no SetNull: si una lista de precio se usó en una venta ya
        // confirmada, no debería poder borrarse y dejar la venta "huérfana" —
        // mismo criterio que el resto de FKs hacia catálogos de este proyecto.
        builder.HasOne(s => s.PriceList)
            .WithMany()
            .HasForeignKey(s => s.PriceListId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Seller)
            .WithMany()
            .HasForeignKey(s => s.SellerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Items)
            .WithOne(i => i.Sale)
            .HasForeignKey(i => i.SaleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
