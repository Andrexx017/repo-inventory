namespace Inventory.Modules.Sales.Dtos;

// Indicadores del encabezado de la pantalla de Ventas — se calculan con
// agregados en la base de datos (no trayendo todas las ventas al servidor)
// para no perder el beneficio de paginar GetByBranchAsync.
public record SalesKpiDto(
    int SalesToday,
    decimal UnitsToday,
    int SalesThisMonth,
    decimal MonthTotal,
    string? TopProductName,
    decimal TopProductUnits
);
