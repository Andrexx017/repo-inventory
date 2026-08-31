using Inventory.Modules.Inventory.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class StockAlertConfiguration : IEntityTypeConfiguration<StockAlert>
{
    public void Configure(EntityTypeBuilder<StockAlert> builder)
    {
        builder.ToTable("stock_alerts");
        builder.HasKey(a => a.Id);

        // Mismo criterio que InventoryItem/InventoryMovement: Restrict, no Cascade —
        // una sucursal o producto con alertas registradas no se puede borrar en duro,
        // solo desactivar (active = false), para no perder el historial de alertas.
        builder.HasOne(a => a.Branch)
            .WithMany()
            .HasForeignKey(a => a.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Product)
            .WithMany()
            .HasForeignKey(a => a.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // resolved_by no tiene navegación a User, igual que responsible_user_id en
        // InventoryMovementConfiguration: queda como columna simple mapeada por
        // convención (snake_case vía EFCore.NamingConventions), la FK real ya existe
        // en la tabla (Database First) y no hace falta modelarla como relación de EF
        // para las consultas que este módulo necesita.
    }
}
