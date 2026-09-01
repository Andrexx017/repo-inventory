using Inventory.Modules.Transfers.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class TransferEventConfiguration : IEntityTypeConfiguration<TransferEvent>
{
    public void Configure(EntityTypeBuilder<TransferEvent> builder)
    {
        builder.ToTable("transfer_events");
        builder.HasKey(e => e.Id);
    }
}
