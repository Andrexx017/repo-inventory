using Inventory.Modules.Transfers.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class TransferConfiguration : IEntityTypeConfiguration<Transfer>
{
    public void Configure(EntityTypeBuilder<Transfer> builder)
    {
        builder.ToTable("transfers");
        builder.HasKey(t => t.Id);
        builder.HasIndex(t => t.TransferNumber).IsUnique();

        // Dos FKs distintas hacia branches en la misma tabla — cada una necesita
        // su propio .WithMany() sin argumento (Branch no tiene una colección de
        // navegación de vuelta, mismo criterio que Branch en PurchaseOrder) para
        // que EF Core no intente resolverlas como una sola relación ambigua.
        builder.HasOne(t => t.OriginBranch)
            .WithMany()
            .HasForeignKey(t => t.OriginBranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.DestinationBranch)
            .WithMany()
            .HasForeignKey(t => t.DestinationBranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(t => t.Items)
            .WithOne(i => i.Transfer)
            .HasForeignKey(i => i.TransferId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(t => t.Events)
            .WithOne(e => e.Transfer)
            .HasForeignKey(e => e.TransferId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
