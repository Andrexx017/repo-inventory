using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Inventory.Services;
using Inventory.Modules.Reports.Dtos;
using Inventory.Modules.Reports.Services.Exporters;
using Inventory.Modules.Sales.Services;
using Inventory.Modules.Transfers.Services;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Reports.Services;

// Reports no tiene tablas propias (backend/docs/decisions.md, "el requisito se
// resuelve consultando inventory_movements/sales/transfers... no de modelo de
// datos") — compone datos de otros módulos vía sus Services, mismo criterio ya
// usado por Dashboard (ver SUSTENTACION.md, sección 2.24).
public class ReportService : IReportService
{
    private static readonly HashSet<string> AllowedReportTypes = ["inventory-movements", "sales", "transfers"];

    private readonly IBranchRepository _branches;
    private readonly IInventoryService _inventoryService;
    private readonly ISaleService _saleService;
    private readonly ITransferService _transferService;
    private readonly IReadOnlyDictionary<string, IReportExporter> _exporters;

    // IEnumerable<IReportExporter>: ASP.NET Core resuelve TODAS las
    // implementaciones registradas de la interfaz (Program.cs registra
    // PdfReportExporter y ExcelReportExporter por separado) — es lo que
    // materializa el Strategy en tiempo de ejecución, sin un switch acá.
    public ReportService(
        IBranchRepository branches,
        IInventoryService inventoryService,
        ISaleService saleService,
        ITransferService transferService,
        IEnumerable<IReportExporter> exporters)
    {
        _branches = branches;
        _inventoryService = inventoryService;
        _saleService = saleService;
        _transferService = transferService;
        _exporters = exporters.ToDictionary(e => e.Format);
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> ExportAsync(
        long branchId, string reportType, string format, DateTimeOffset from, DateTimeOffset to)
    {
        if (!AllowedReportTypes.Contains(reportType))
        {
            throw new DomainException(
                $"Tipo de reporte inválido: '{reportType}'. Valores permitidos: inventory-movements, sales, transfers.");
        }

        if (!_exporters.TryGetValue(format, out var exporter))
        {
            throw new DomainException($"Formato de exportación inválido: '{format}'. Valores permitidos: pdf, excel.");
        }

        if (to < from)
        {
            throw new DomainException("La fecha 'to' no puede ser anterior a 'from'.");
        }

        var branch = await _branches.GetByIdAsync(branchId)
            ?? throw new DomainException($"La sucursal {branchId} no existe.");

        var table = reportType switch
        {
            "inventory-movements" => await BuildInventoryMovementsTableAsync(branch.Name, branchId, from, to),
            "sales" => await BuildSalesTableAsync(branch.Name, branchId, from, to),
            "transfers" => await BuildTransfersTableAsync(branch.Name, branchId, from, to),
            _ => throw new DomainException($"Tipo de reporte inválido: '{reportType}'."),
        };

        var content = exporter.Export(table);
        var fileName = $"{reportType}_{branch.Code}_{from:yyyyMMdd}-{to:yyyyMMdd}.{exporter.FileExtension}";

        return (content, exporter.ContentType, fileName);
    }

    private async Task<ReportTable> BuildInventoryMovementsTableAsync(
        string branchName, long branchId, DateTimeOffset from, DateTimeOffset to)
    {
        var movements = (await _inventoryService.GetMovementsAsync(branchId, productId: null, from, to, page: 1, pageSize: int.MaxValue))
            .Items;

        string[] columns = ["Fecha", "SKU", "Producto", "Tipo", "Cantidad", "Motivo", "Responsable"];

        var rows = movements
            .Select(m => (IReadOnlyList<string>)new[]
            {
                m.MovementDate.ToString("yyyy-MM-dd HH:mm"),
                m.ProductSku,
                m.ProductName,
                m.MovementType,
                m.Quantity.ToString("0.####"),
                m.Reason,
                m.ResponsibleUserName,
            })
            .ToList();

        return new ReportTable(
            $"Movimientos de inventario — {branchName} ({from:yyyy-MM-dd} a {to:yyyy-MM-dd})", columns, rows);
    }

    private async Task<ReportTable> BuildSalesTableAsync(
        string branchName, long branchId, DateTimeOffset from, DateTimeOffset to)
    {
        var sales = (await _saleService.GetByBranchAsync(branchId))
            .Where(s => s.SaleDate >= from && s.SaleDate <= to)
            .ToList();

        string[] columns = ["Fecha", "N° venta", "Cliente", "Vendedor", "Subtotal", "Descuento", "Total", "Estado"];

        var rows = sales
            .Select(s => (IReadOnlyList<string>)new[]
            {
                s.SaleDate.ToString("yyyy-MM-dd HH:mm"),
                s.SaleNumber,
                s.CustomerName ?? "—",
                s.SellerName,
                s.Subtotal.ToString("0.00"),
                s.TotalDiscount.ToString("0.00"),
                s.Total.ToString("0.00"),
                s.Status,
            })
            .ToList();

        return new ReportTable(
            $"Ventas — {branchName} ({from:yyyy-MM-dd} a {to:yyyy-MM-dd})", columns, rows);
    }

    private async Task<ReportTable> BuildTransfersTableAsync(
        string branchName, long branchId, DateTimeOffset from, DateTimeOffset to)
    {
        // Igual que el resto del módulo Transfers: una sucursal ve tanto lo que
        // solicitó (destino) como lo que le piden despachar (origen).
        var transfers = (await _transferService.GetByBranchAsync(branchId))
            .Where(t => t.RequestDate >= from && t.RequestDate <= to)
            .ToList();

        string[] columns =
            ["N° transferencia", "Origen", "Destino", "Estado", "Urgencia", "Fecha solicitud", "Fecha despacho", "Fecha llegada real"];

        var rows = transfers
            .Select(t => (IReadOnlyList<string>)new[]
            {
                t.TransferNumber,
                t.OriginBranchName,
                t.DestinationBranchName,
                t.Status,
                t.Urgency,
                t.RequestDate.ToString("yyyy-MM-dd"),
                t.ActualShipDate?.ToString("yyyy-MM-dd") ?? "—",
                t.ActualArrivalDate?.ToString("yyyy-MM-dd") ?? "—",
            })
            .ToList();

        return new ReportTable(
            $"Transferencias — {branchName} ({from:yyyy-MM-dd} a {to:yyyy-MM-dd})", columns, rows);
    }
}
