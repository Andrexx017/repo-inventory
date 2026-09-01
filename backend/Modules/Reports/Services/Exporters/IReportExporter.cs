using Inventory.Modules.Reports.Dtos;

namespace Inventory.Modules.Reports.Services.Exporters;

// Strategy Pattern (backend/docs/decisions.md, "Patrones de diseño del backend"):
// una implementación por formato, seleccionada en tiempo de ejecución por
// ReportService según el "format" pedido — sin un switch de formatos desperdigado
// por el código.
public interface IReportExporter
{
    // "pdf" | "excel" — clave con la que ReportService arma el diccionario de
    // exporters disponibles (ver ReportService, inyecta IEnumerable<IReportExporter>).
    string Format { get; }
    string ContentType { get; }
    string FileExtension { get; }

    byte[] Export(ReportTable table);
}
