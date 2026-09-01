namespace Inventory.Modules.Dashboard.Dtos;

// RF-29: volumen de ventas del mes en curso comparado con meses anteriores.
public record SalesSummaryDto(
    long BranchId,
    string BranchName,
    decimal CurrentMonthTotal,
    int CurrentMonthCount,
    decimal PreviousMonthTotal,
    // Null si el mes anterior no tuvo ventas (división por cero evitada a propósito,
    // no tiene sentido expresar "creció infinito" desde una base de 0).
    decimal? PercentChangeVsPreviousMonth,
    // Últimos 6 meses (incluye el actual), orden ascendente — pensado para graficar
    // directo sin que el frontend tenga que reordenar.
    IReadOnlyList<MonthlySalesDto> MonthlyHistory
);
