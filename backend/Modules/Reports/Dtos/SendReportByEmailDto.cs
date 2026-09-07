using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Reports.Dtos;

// Envío manual e inmediato (botón "Enviar por correo ahora") — mismos
// reportType/format/from/to que GET .../export, más los destinatarios.
public record SendReportByEmailDto(
    [Required] string ReportType,
    [Required] string Format,
    [Required] DateTimeOffset From,
    [Required] DateTimeOffset To,
    [Required][MinLength(1)] List<string> RecipientEmails
);
