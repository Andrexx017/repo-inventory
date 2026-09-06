using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Modules.Purchases.Dtos;
using Inventory.Modules.Purchases.Entities;
using Inventory.Modules.Purchases.Repositories;
using Inventory.Shared.Dtos;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Purchases.Services;

public class PurchaseOrderService : IPurchaseOrderService
{
    // Estados desde los que ya no tiene sentido cancelar (RF-13 ya empezó a mover
    // inventario sobre esta orden, o ya se canceló antes).
    private static readonly HashSet<string> NonCancellableStatuses =
        ["partially_received", "fully_received", "cancelled"];

    private readonly IPurchaseOrderRepository _purchaseOrders;
    private readonly ISupplierRepository _suppliers;
    private readonly IBranchRepository _branches;
    private readonly IProductRepository _products;

    public PurchaseOrderService(
        IPurchaseOrderRepository purchaseOrders,
        ISupplierRepository suppliers,
        IBranchRepository branches,
        IProductRepository products)
    {
        _purchaseOrders = purchaseOrders;
        _suppliers = suppliers;
        _branches = branches;
        _products = products;
    }

    public async Task<PurchaseOrderDto> CreateAsync(long branchId, CreatePurchaseOrderDto request, long createdByUserId)
    {
        if (request.Items.Count == 0)
        {
            throw new DomainException("La orden de compra debe tener al menos una línea.");
        }

        if (request.PaymentTermDays is < 0)
        {
            throw new DomainException("El plazo de pago no puede ser negativo.");
        }

        var branch = await _branches.GetByIdAsync(branchId)
            ?? throw new DomainException($"La sucursal {branchId} no existe.");

        var supplier = await _suppliers.GetByIdAsync(request.SupplierId)
            ?? throw new DomainException($"El proveedor {request.SupplierId} no existe.");

        var items = new List<PurchaseOrderItem>();

        // RN-CRIT-02: subtotal/total_discount/total de la cabecera se calculan acá,
        // sumando línea por línea, en la misma operación que crea las líneas —
        // nunca se le pide ese cálculo al frontend.
        decimal subtotal = 0;
        decimal total = 0;

        foreach (var line in request.Items)
        {
            if (line.Quantity <= 0)
            {
                throw new DomainException("La cantidad de cada línea debe ser mayor a cero.");
            }

            if (line.UnitPrice < 0)
            {
                throw new DomainException("El precio unitario no puede ser negativo.");
            }

            if (line.DiscountPct is < 0 or > 100)
            {
                throw new DomainException("El descuento debe estar entre 0 y 100.");
            }

            var product = await _products.GetByIdAsync(line.ProductId)
                ?? throw new DomainException($"El producto {line.ProductId} no existe.");

            var (gross, net) = CalculateLineAmounts(line.Quantity, line.UnitPrice, line.DiscountPct);
            subtotal += gross;
            total += net;

            items.Add(new PurchaseOrderItem
            {
                ProductId = line.ProductId,
                Product = product,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                DiscountPct = line.DiscountPct,
            });
        }

        var order = new PurchaseOrder
        {
            OrderNumber = await GenerateOrderNumberAsync(),
            SupplierId = request.SupplierId,
            Supplier = supplier,
            BranchId = branchId,
            Branch = branch,
            // Sin aprobación previa a propósito: el Operador de inventario no
            // necesita el visto bueno del Gerente para generar una orden de
            // compra — nace directo en 'confirmed', lista para recibir.
            Status = "confirmed",
            OrderDate = DateTimeOffset.UtcNow,
            PaymentTermDays = request.PaymentTermDays,
            Subtotal = subtotal,
            TotalDiscount = subtotal - total,
            Total = total,
            CreatedBy = createdByUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            Items = items,
        };

        _purchaseOrders.Add(order);
        await _purchaseOrders.SaveChangesAsync();

        return ToDto(order);
    }

    // RF-14: histórico filtrable por proveedor y/o producto — ambos parámetros
    // opcionales, se combinan con AND si vienen los dos.
    public async Task<PagedResult<PurchaseOrderDto>> GetByBranchAsync(
        long branchId, long? supplierId, long? productId, DateTimeOffset? from, DateTimeOffset? to,
        int page, int pageSize)
    {
        var result = await _purchaseOrders.GetByBranchAsync(branchId, supplierId, productId, from, to, page, pageSize);
        var items = result.Items.Select(ToDto).ToList();
        return new PagedResult<PurchaseOrderDto>(items, result.TotalCount, result.Page, result.PageSize);
    }

    public async Task<PurchaseOrderDto?> GetByIdAsync(long id)
    {
        var order = await _purchaseOrders.GetByIdAsync(id);
        return order is null ? null : ToDto(order);
    }

    public Task<PurchaseOrdersKpiDto> GetKpiSummaryAsync(long branchId) => _purchaseOrders.GetKpiSummaryAsync(branchId);

    public async Task<PurchaseOrderDto> CancelAsync(long id, long actingUserId)
    {
        var order = await _purchaseOrders.GetByIdAsync(id)
            ?? throw new DomainException($"La orden de compra {id} no existe.");

        if (NonCancellableStatuses.Contains(order.Status))
        {
            throw new DomainException($"No se puede cancelar una orden en estado '{order.Status}'.");
        }

        order.Status = "cancelled";
        order.DecidedBy = actingUserId;
        order.DecidedAt = DateTimeOffset.UtcNow;
        await _purchaseOrders.SaveChangesAsync();

        return ToDto(order);
    }

    // Simple y suficiente para el alcance de la prueba: cuenta cuántas órdenes
    // existen y arma el consecutivo siguiente. No protege contra dos creaciones
    // concurrentes que lean el mismo count (el UNIQUE de order_number lo rechazaría
    // con un 500 crudo en ese caso extremo) — aceptado a propósito, mismo criterio
    // que otras simplificaciones documentadas (ver SUSTENTACION.md, sección 2.16).
    private async Task<string> GenerateOrderNumberAsync()
    {
        var count = await _purchaseOrders.CountAsync();
        return $"OC-{count + 1:D6}";
    }

    // Replica exactamente la fórmula GENERATED de purchase_order_items.subtotal
    // (01-schema.sql:224-225: round(quantity * unit_price * (1 - discount_pct/100), 2))
    // para poder sumar el total de la cabecera ANTES de guardar, sin esperar a que
    // Postgres calcule la columna. "Gross" (sin descuento) y "Net" (con descuento)
    // se redondean cada uno por separado a 2 decimales — igual que round() de
    // Postgres, que redondea 0.5 siempre hacia arriba (AwayFromZero), no al par
    // más cercano como hace Math.Round por defecto en .NET.
    private static (decimal Gross, decimal Net) CalculateLineAmounts(
        decimal quantity, decimal unitPrice, decimal discountPct)
    {
        var gross = Math.Round(quantity * unitPrice, 2, MidpointRounding.AwayFromZero);
        var net = Math.Round(quantity * unitPrice * (1 - discountPct / 100m), 2, MidpointRounding.AwayFromZero);
        return (gross, net);
    }

    private static PurchaseOrderDto ToDto(PurchaseOrder order) => new(
        order.Id,
        order.OrderNumber,
        order.SupplierId,
        order.Supplier.Name,
        order.BranchId,
        order.Branch.Name,
        order.Status,
        order.OrderDate,
        order.PaymentTermDays,
        order.Subtotal,
        order.TotalDiscount,
        order.Total,
        order.CreatedBy,
        order.DecidedBy,
        order.DecidedAt,
        order.CreatedAt,
        order.Items.Select(ToItemDto).ToList()
    );

    private static PurchaseOrderItemDto ToItemDto(PurchaseOrderItem item) => new(
        item.Id,
        item.ProductId,
        item.Product.Sku,
        item.Product.Name,
        item.Quantity,
        item.UnitPrice,
        item.DiscountPct,
        item.Subtotal
    );
}
