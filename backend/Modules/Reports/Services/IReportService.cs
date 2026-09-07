namespace Inventory.Modules.Reports.Services;

public interface IReportService
{
    // RF-35: exporta movimientos de inventario, ventas o transferencias de una
    // sucursal en un rango de fechas. reportType: "inventory-movements" |
    // "sales" | "transfers". format: "pdf" | "excel" (clave de IReportExporter).
    Task<(byte[] Content, string ContentType, string FileName)> ExportAsync(
        long branchId, string reportType, string format, DateTimeOffset from, DateTimeOffset to);

    // Envío manual e inmediato por correo: genera el mismo reporte que
    // ExportAsync y lo manda una sola vez, a demanda. Devuelve la cantidad de
    // destinatarios a los que efectivamente se envió.
    Task<int> SendByEmailAsync(
        long branchId, string reportType, string format, DateTimeOffset from, DateTimeOffset to,
        IReadOnlyList<string> recipientEmails);
}
