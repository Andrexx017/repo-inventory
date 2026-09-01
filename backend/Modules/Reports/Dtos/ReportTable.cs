namespace Inventory.Modules.Reports.Dtos;

// Modelo genérico "tabla con título" que entienden los dos exporters (Strategy,
// backend/docs/decisions.md) — evita que PdfReportExporter/ExcelReportExporter
// necesiten conocer si las filas vienen de movimientos, ventas o transferencias.
public record ReportTable(
    string Title,
    IReadOnlyList<string> Columns,
    IReadOnlyList<IReadOnlyList<string>> Rows
);
