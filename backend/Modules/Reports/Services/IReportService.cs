namespace Inventory.Modules.Reports.Services;

public interface IReportService
{
    // RF-35: exporta movimientos de inventario, ventas o transferencias de una
    // sucursal en un rango de fechas. reportType: "inventory-movements" |
    // "sales" | "transfers". format: "pdf" | "excel" (clave de IReportExporter).
    Task<(byte[] Content, string ContentType, string FileName)> ExportAsync(
        long branchId, string reportType, string format, DateTimeOffset from, DateTimeOffset to);
}
