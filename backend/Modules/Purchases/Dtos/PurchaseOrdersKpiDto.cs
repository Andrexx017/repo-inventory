namespace Inventory.Modules.Purchases.Dtos;

// Indicadores del encabezado de la pantalla de Compras — calculados con
// agregados en la base de datos, mismo criterio que SalesKpiDto (no traer
// todas las órdenes solo para contarlas/sumarlas).
public record PurchaseOrdersKpiDto(
    int ActiveOrders,
    int PendingApproval,
    int PendingReceipts,
    decimal MonthValue
);
