using Inventory.Modules.Inventory.Entities;
using Inventory.Modules.Inventory.Repositories;
using Inventory.Modules.Inventory.Services;
using Inventory.Modules.Purchases.Dtos;
using Inventory.Modules.Purchases.Entities;
using Inventory.Modules.Purchases.Repositories;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Purchases.Services;

public class PurchaseReceiptService : IPurchaseReceiptService
{
    // Solo se puede recibir mercancía de una orden ya aprobada (RF-13 depende de
    // RF-12: primero se aprueba, después se recibe) — 'partially_received' se
    // agrega porque una orden puede recibirse en más de una entrega.
    private static readonly HashSet<string> ReceivableStatuses = ["confirmed", "partially_received"];

    private readonly IPurchaseOrderRepository _purchaseOrders;
    private readonly IPurchaseReceiptRepository _purchaseReceipts;
    private readonly IInventoryRepository _inventory;
    private readonly IInventoryService _inventoryService;

    public PurchaseReceiptService(
        IPurchaseOrderRepository purchaseOrders,
        IPurchaseReceiptRepository purchaseReceipts,
        IInventoryRepository inventory,
        IInventoryService inventoryService)
    {
        _purchaseOrders = purchaseOrders;
        _purchaseReceipts = purchaseReceipts;
        _inventory = inventory;
        _inventoryService = inventoryService;
    }

    public async Task<PurchaseReceiptDto> CreateAsync(
        long branchId, long purchaseOrderId, CreatePurchaseReceiptDto request, long receivedByUserId)
    {
        var order = await _purchaseOrders.GetByIdAsync(purchaseOrderId)
            ?? throw new DomainException($"La orden de compra {purchaseOrderId} no existe.");

        if (order.BranchId != branchId)
        {
            throw new DomainException($"La orden de compra {purchaseOrderId} no pertenece a la sucursal {branchId}.");
        }

        if (!ReceivableStatuses.Contains(order.Status))
        {
            throw new DomainException(
                $"Solo se puede recibir una orden 'confirmed' o 'partially_received' (estado actual: '{order.Status}').");
        }

        // Recepciones anteriores (puede haber varias parciales) sumadas por línea,
        // para saber cuánto queda pendiente de cada una — RN-CRIT análogo a
        // RN-CRIT-05 (una transferencia no puede recibir más de lo despachado):
        // acá una orden no puede recibir más de lo pedido.
        var previousReceiptItems = await _purchaseReceipts.GetReceiptItemsByOrderAsync(purchaseOrderId);
        var alreadyReceivedByOrderItem = previousReceiptItems
            .GroupBy(ri => ri.PurchaseOrderItemId)
            .ToDictionary(g => g.Key, g => g.Sum(ri => ri.ReceivedQuantity));

        var receiptItems = new List<PurchaseReceiptItem>();
        var receivedNowByOrderItem = new Dictionary<long, decimal>();

        foreach (var line in request.Items)
        {
            if (line.ReceivedQuantity <= 0)
            {
                throw new DomainException("La cantidad recibida debe ser mayor a cero.");
            }

            var orderItem = order.Items.FirstOrDefault(i => i.Id == line.PurchaseOrderItemId)
                ?? throw new DomainException(
                    $"La línea {line.PurchaseOrderItemId} no pertenece a la orden de compra {purchaseOrderId}.");

            var alreadyReceived = alreadyReceivedByOrderItem.GetValueOrDefault(orderItem.Id);
            var pending = orderItem.Quantity - alreadyReceived;

            if (line.ReceivedQuantity > pending)
            {
                throw new DomainException(
                    $"No se puede recibir más de lo pendiente para '{orderItem.Product.Name}': " +
                    $"pendiente {pending}, se intenta recibir {line.ReceivedQuantity}.");
            }

            receiptItems.Add(new PurchaseReceiptItem
            {
                PurchaseOrderItemId = orderItem.Id,
                PurchaseOrderItem = orderItem,
                ReceivedQuantity = line.ReceivedQuantity,
            });

            receivedNowByOrderItem[orderItem.Id] = line.ReceivedQuantity;

            // RF-13: actualizar inventario automáticamente al confirmar la
            // recepción — mismo patrón get-or-create que RegisterIncomingMovementAsync.
            var item = await _inventory.GetItemAsync(branchId, orderItem.ProductId);
            if (item is null)
            {
                item = new InventoryItem
                {
                    BranchId = branchId,
                    ProductId = orderItem.ProductId,
                    Branch = order.Branch,
                    Product = orderItem.Product,
                    CurrentQuantity = 0,
                    WeightedAverageCost = 0,
                };
                _inventory.AddItem(item);
            }

            // RF-15: costo promedio ponderado = (stock actual × costo actual +
            // cantidad recibida × precio de la línea) / stock total resultante.
            // El costo sale de purchase_order_items.UnitPrice (lo pactado con el
            // proveedor), nunca de un valor que mande el cliente en este endpoint.
            var newQuantity = item.CurrentQuantity + line.ReceivedQuantity;
            item.WeightedAverageCost = Math.Round(
                (item.CurrentQuantity * item.WeightedAverageCost + line.ReceivedQuantity * orderItem.UnitPrice) / newQuantity,
                4, MidpointRounding.AwayFromZero);
            item.CurrentQuantity = newQuantity;
            item.UpdatedAt = DateTimeOffset.UtcNow;

            // RF-09/RF-34: a diferencia de RegisterIncomingMovementAsync, esta
            // recepción escribe CurrentQuantity directo sobre el item (no pasa por
            // InventoryService) — sin este chequeo, una alerta de stock bajo que
            // esta recepción resuelve se queda 'pending' para siempre en la campana.
            await _inventoryService.CheckStockAlertsAsync(item, receivedByUserId);

            _inventory.AddMovement(new InventoryMovement
            {
                BranchId = branchId,
                ProductId = orderItem.ProductId,
                MovementType = "purchase_in",
                Quantity = line.ReceivedQuantity,
                UnitCost = orderItem.UnitPrice,
                Reason = $"Recepción de la orden de compra {order.OrderNumber}",
                ResponsibleUserId = receivedByUserId,
                ReferenceType = "purchase_order",
                ReferenceId = order.Id,
                MovementDate = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        }

        // ¿La orden queda completa? Todas las líneas (no solo las de esta
        // recepción) deben quedar con lo recibido total >= lo pedido.
        var isOrderComplete = order.Items.All(oi =>
        {
            var totalReceived = alreadyReceivedByOrderItem.GetValueOrDefault(oi.Id)
                + receivedNowByOrderItem.GetValueOrDefault(oi.Id);
            return totalReceived >= oi.Quantity;
        });

        order.Status = isOrderComplete ? "fully_received" : "partially_received";

        var receipt = new PurchaseReceipt
        {
            PurchaseOrderId = order.Id,
            PurchaseOrder = order,
            ReceiptDate = DateTimeOffset.UtcNow,
            ReceivedBy = receivedByUserId,
            IsComplete = isOrderComplete,
            Notes = request.Notes,
            Items = receiptItems,
        };

        _purchaseReceipts.Add(receipt);

        // RN-CRIT-04: la recepción, cada InventoryItem/InventoryMovement y el
        // nuevo Status de la orden viajan en el mismo SaveChanges — o se guarda
        // todo, o no se guarda nada.
        await _purchaseReceipts.SaveChangesAsync();

        return ToDto(receipt);
    }

    public async Task<IReadOnlyList<PurchaseReceiptDto>> GetByOrderAsync(long branchId, long purchaseOrderId)
    {
        var order = await _purchaseOrders.GetByIdAsync(purchaseOrderId)
            ?? throw new DomainException($"La orden de compra {purchaseOrderId} no existe.");

        if (order.BranchId != branchId)
        {
            throw new DomainException($"La orden de compra {purchaseOrderId} no pertenece a la sucursal {branchId}.");
        }

        var receipts = await _purchaseReceipts.GetByOrderAsync(purchaseOrderId);
        return receipts.Select(ToDto).ToList();
    }

    private static PurchaseReceiptDto ToDto(PurchaseReceipt receipt) => new(
        receipt.Id,
        receipt.PurchaseOrderId,
        receipt.ReceiptDate,
        receipt.ReceivedBy,
        receipt.IsComplete,
        receipt.Notes,
        receipt.Items.Select(ToItemDto).ToList()
    );

    private static PurchaseReceiptItemDto ToItemDto(PurchaseReceiptItem item) => new(
        item.Id,
        item.PurchaseOrderItemId,
        item.PurchaseOrderItem.ProductId,
        item.PurchaseOrderItem.Product.Sku,
        item.PurchaseOrderItem.Product.Name,
        item.ReceivedQuantity
    );
}
