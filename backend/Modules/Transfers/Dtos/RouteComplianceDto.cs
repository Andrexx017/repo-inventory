namespace Inventory.Modules.Transfers.Dtos;

// RF-28: una fila por ruta (origen → destino), agregando todas las
// transferencias de esa ruta — es la unidad de "agrupable por ruta" del RF;
// "agrupable por sucursal" se resuelve filtrando antes de agrupar (ver
// TransferService.GetComplianceReportAsync).
public record RouteComplianceDto(
    long OriginBranchId,
    string OriginBranchName,
    long DestinationBranchId,
    string DestinationBranchName,
    int TotalTransfers,
    int ReceivedTransfers,
    int OnTimeCount,
    int DelayedCount,
    int ShortageCount,
    double? AverageDelayDays
);
