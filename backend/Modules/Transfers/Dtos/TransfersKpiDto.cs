namespace Inventory.Modules.Transfers.Dtos;

// Indicadores del encabezado de la pantalla de Transferencias — calculados con
// agregados en la base de datos, mismo criterio que SalesKpiDto/PurchaseOrdersKpiDto.
public record TransfersKpiDto(
    int InTransit,
    int PendingAction,
    int ReceivedThisMonth,
    int ReceivedWithShortageThisMonth,
    double? AverageDelayDays
);
