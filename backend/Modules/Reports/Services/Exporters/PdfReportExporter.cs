using Inventory.Modules.Reports.Dtos;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Inventory.Modules.Reports.Services.Exporters;

// QuestPDF (backend/docs/decisions.md): API fluida/declarativa (Document.Create),
// sin depender de coordenadas absolutas como las librerías de PDF de más bajo
// nivel — alcanza para una tabla con encabezado, sin necesitar maquetación
// compleja. Licencia Community (gratuita para este uso, ver Program.cs donde se
// fija QuestPDF.Settings.License una sola vez al arrancar).
public class PdfReportExporter : IReportExporter
{
    public string Format => "pdf";
    public string ContentType => "application/pdf";
    public string FileExtension => "pdf";

    public byte[] Export(ReportTable table)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(30);
                page.Size(PageSizes.A4.Landscape());

                page.Header().Text(table.Title).FontSize(14).Bold();

                page.Content().PaddingTop(10).Table(t =>
                {
                    t.ColumnsDefinition(columns =>
                    {
                        foreach (var _ in table.Columns)
                        {
                            columns.RelativeColumn();
                        }
                    });

                    t.Header(header =>
                    {
                        foreach (var column in table.Columns)
                        {
                            header.Cell().Element(HeaderCellStyle).Text(column).Bold();
                        }
                    });

                    foreach (var row in table.Rows)
                    {
                        foreach (var cell in row)
                        {
                            t.Cell().Element(CellStyle).Text(cell);
                        }
                    }
                });

                page.Footer().AlignCenter().Text(footer =>
                {
                    footer.CurrentPageNumber();
                    footer.Span(" / ");
                    footer.TotalPages();
                });
            });
        });

        return document.GeneratePdf();

        static QuestPDF.Infrastructure.IContainer HeaderCellStyle(QuestPDF.Infrastructure.IContainer c) =>
            c.Background(Colors.Grey.Lighten3).Border(1).BorderColor(Colors.Grey.Lighten1).Padding(4);

        static QuestPDF.Infrastructure.IContainer CellStyle(QuestPDF.Infrastructure.IContainer c) =>
            c.Border(1).BorderColor(Colors.Grey.Lighten2).Padding(4);
    }
}
