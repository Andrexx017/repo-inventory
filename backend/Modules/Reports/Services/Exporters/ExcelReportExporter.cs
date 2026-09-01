using ClosedXML.Excel;
using Inventory.Modules.Reports.Dtos;

namespace Inventory.Modules.Reports.Services.Exporters;

// ClosedXML (backend/docs/decisions.md): envuelve OpenXML SDK con una API de
// más alto nivel (celdas/rangos/estilos) sin tocar XML a mano; MIT, sin
// dependencia de Excel/Office instalado en el servidor (a diferencia de
// Interop, que exige Office real en la máquina que genera el archivo).
public class ExcelReportExporter : IReportExporter
{
    public string Format => "excel";
    public string ContentType => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    public string FileExtension => "xlsx";

    public byte[] Export(ReportTable table)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Reporte");

        worksheet.Cell(1, 1).Value = table.Title;
        worksheet.Cell(1, 1).Style.Font.Bold = true;
        worksheet.Cell(1, 1).Style.Font.FontSize = 14;
        if (table.Columns.Count > 1)
        {
            worksheet.Range(1, 1, 1, table.Columns.Count).Merge();
        }

        const int headerRow = 3;
        for (var col = 0; col < table.Columns.Count; col++)
        {
            var cell = worksheet.Cell(headerRow, col + 1);
            cell.Value = table.Columns[col];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.LightGray;
        }

        for (var rowIndex = 0; rowIndex < table.Rows.Count; rowIndex++)
        {
            var row = table.Rows[rowIndex];
            for (var col = 0; col < row.Count; col++)
            {
                worksheet.Cell(headerRow + 1 + rowIndex, col + 1).Value = row[col];
            }
        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
