using Inventory.Modules.Auth.Entities;
using Inventory.Modules.Catalog.Entities;

namespace Inventory.Modules.Inventory.Entities;

// Mapea la tabla stock_alerts (database/init/01-schema.sql), creada desde el
// commit 5 pensando en RF-09 (stock mínimo) y RF-34 (alertas por arriba/abajo,
// "adicional"). Esta primera implementación solo dispara alert_type = 'low_stock'
// (RF-09) — el CHECK de la BD ya acepta 'high_stock' también, para cuando se
// aborde RF-34, sin tener que tocar el esquema de nuevo.
public class StockAlert
{
    public long Id { get; set; }
    public long BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public long ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string AlertType { get; set; } = null!;
    public decimal QuantityAtTrigger { get; set; }
    public decimal ThresholdValue { get; set; }
    public string Status { get; set; } = "pending";
    public DateTimeOffset TriggeredAt { get; set; }
    public long? ResolvedBy { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset? NotifiedAt { get; set; }
}
