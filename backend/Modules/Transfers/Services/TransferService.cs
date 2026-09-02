using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Modules.Inventory.Entities;
using Inventory.Modules.Inventory.Repositories;
using Inventory.Modules.Inventory.Services;
using Inventory.Modules.Transfers.Dtos;
using Inventory.Modules.Transfers.Entities;
using Inventory.Modules.Transfers.Repositories;
using Inventory.Shared.Dtos;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Transfers.Services;

public class TransferService : ITransferService
{
    private static readonly HashSet<string> AllowedUrgencies = ["low", "medium", "high"];

    // Mismos valores que el CHECK de transfers.route_priority (01-schema.sql).
    private static readonly HashSet<string> AllowedRoutePriorities = ["low", "medium", "high"];
    private static readonly Dictionary<string, int> RoutePriorityRank = new()
    {
        ["high"] = 0,
        ["medium"] = 1,
        ["low"] = 2,
    };
    private static readonly HashSet<string> AllowedSortKeys = ["priority", "cost", "time"];

    private readonly ITransferRepository _transfers;
    private readonly IBranchRepository _branches;
    private readonly IProductRepository _products;
    private readonly IInventoryRepository _inventory;
    private readonly IInventoryService _inventoryService;

    public TransferService(
        ITransferRepository transfers,
        IBranchRepository branches,
        IProductRepository products,
        IInventoryRepository inventory,
        IInventoryService inventoryService)
    {
        _transfers = transfers;
        _branches = branches;
        _products = products;
        _inventory = inventory;
        _inventoryService = inventoryService;
    }

    public async Task<TransferDto> CreateAsync(
        long destinationBranchId, CreateTransferDto request, long requestedByUserId)
    {
        if (request.OriginBranchId == destinationBranchId)
        {
            // Mismo CHECK que ya tiene la tabla (origin_branch_id <> destination_branch_id);
            // se repite acá para devolver un 400 con mensaje claro en vez de un
            // error crudo de Postgres.
            throw new DomainException("La sucursal de origen no puede ser la misma que la de destino.");
        }

        var destinationBranch = await _branches.GetByIdAsync(destinationBranchId)
            ?? throw new DomainException($"La sucursal {destinationBranchId} no existe.");

        var originBranch = await _branches.GetByIdAsync(request.OriginBranchId)
            ?? throw new DomainException($"La sucursal {request.OriginBranchId} no existe.");

        var urgency = string.IsNullOrWhiteSpace(request.Urgency) ? "medium" : request.Urgency;
        if (!AllowedUrgencies.Contains(urgency))
        {
            throw new DomainException($"Urgencia inválida: '{urgency}'. Valores permitidos: low, medium, high.");
        }

        var items = new List<TransferItem>();

        foreach (var line in request.Items)
        {
            if (line.RequestedQuantity <= 0)
            {
                throw new DomainException("La cantidad solicitada de cada línea debe ser mayor a cero.");
            }

            var product = await _products.GetByIdAsync(line.ProductId)
                ?? throw new DomainException($"El producto {line.ProductId} no existe.");

            items.Add(new TransferItem
            {
                ProductId = product.Id,
                Product = product,
                RequestedQuantity = line.RequestedQuantity,
                ShippedQuantity = 0,
                ReceivedQuantity = 0,
            });
        }

        var transfer = new Transfer
        {
            TransferNumber = await GenerateTransferNumberAsync(),
            OriginBranchId = originBranch.Id,
            OriginBranch = originBranch,
            DestinationBranchId = destinationBranch.Id,
            DestinationBranch = destinationBranch,
            RequestedBy = requestedByUserId,
            Status = "requested",
            Urgency = urgency,
            RequestDate = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow,
            Items = items,
        };

        // El evento inicial se agrega al mismo grafo que la transferencia — EF
        // Core resuelve el FK (TransferEvent.TransferId) por la navegación
        // Event.Transfer al guardar, sin necesitar el Id de antemano (a
        // diferencia de Ventas, acá no hace falta una transacción explícita
        // porque todo nace en el mismo INSERT, no referencia un documento ajeno
        // ya existente).
        transfer.Events.Add(new TransferEvent
        {
            Transfer = transfer,
            Status = "requested",
            EventDate = DateTimeOffset.UtcNow,
            RecordedBy = requestedByUserId,
        });

        _transfers.Add(transfer);
        await _transfers.SaveChangesAsync();

        return ToDto(transfer);
    }

    // Paginado en memoria (Skip/Take sobre la lista ya ordenada) en vez de en la
    // consulta SQL: sortBy=priority ordena por un ranking (RoutePriorityRank)
    // que no vive como columna, así que el orden final solo se puede calcular
    // después de traer los resultados filtrados por sucursal/estado.
    public async Task<PagedResult<TransferDto>> GetByBranchAsync(
        long branchId, string? sortBy, bool activeOnly, IReadOnlyList<string>? statuses,
        DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize)
    {
        if (!string.IsNullOrWhiteSpace(sortBy) && !AllowedSortKeys.Contains(sortBy))
        {
            throw new DomainException(
                $"Criterio de clasificación inválido: '{sortBy}'. Valores permitidos: priority, cost, time.");
        }

        var transfers = await _transfers.GetByBranchAsync(branchId, activeOnly, statuses, from, to);
        var dtos = transfers.Select(ToDto).AsEnumerable();

        // RF-26: clasifica las rutas por prioridad, costo o tiempo estimado de
        // entrega. Sin sortBy, se conserva el orden que ya trae el repositorio
        // (más reciente primero).
        dtos = sortBy switch
        {
            "priority" => dtos.OrderBy(d => d.RoutePriority is not null && RoutePriorityRank.TryGetValue(d.RoutePriority, out var rank)
                ? rank
                : int.MaxValue),
            "cost" => dtos.OrderBy(d => d.ShippingCost ?? decimal.MaxValue),
            "time" => dtos.OrderBy(d => d.EstimatedArrivalDate ?? DateTimeOffset.MaxValue),
            _ => dtos,
        };

        var dtoList = dtos.ToList();
        var pageItems = dtoList.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return new PagedResult<TransferDto>(pageItems, dtoList.Count, page, pageSize);
    }

    public Task<TransfersKpiDto> GetKpiSummaryAsync(long branchId) => _transfers.GetKpiSummaryAsync(branchId);

    public async Task<TransferDto?> GetByIdAsync(long id)
    {
        var transfer = await _transfers.GetByIdAsync(id);
        return transfer is null ? null : ToDto(transfer);
    }

    public async Task<TransferDto> PrepareAsync(
        long originBranchId, long id, PrepareTransferDto request, long actingUserId)
    {
        var transfer = await _transfers.GetByIdAsync(id)
            ?? throw new DomainException($"La transferencia {id} no existe.");

        if (transfer.OriginBranchId != originBranchId)
        {
            throw new DomainException($"La transferencia {id} no tiene como origen la sucursal {originBranchId}.");
        }

        if (transfer.Status != "requested")
        {
            throw new DomainException(
                $"Solo se puede preparar una transferencia en estado 'requested' (estado actual: '{transfer.Status}').");
        }

        // RF-21 exige revisar CADA línea solicitada — una línea sin confirmar
        // quedaría con shipped_quantity en 0 sin que quede claro si fue una
        // decisión (no hay stock) o un olvido, así que se exige cobertura total.
        if (request.Items.Count != transfer.Items.Count)
        {
            throw new DomainException(
                "Debe confirmar la cantidad a enviar de todas las líneas de la transferencia.");
        }

        foreach (var line in request.Items)
        {
            var item = transfer.Items.FirstOrDefault(i => i.Id == line.TransferItemId)
                ?? throw new DomainException(
                    $"La línea {line.TransferItemId} no pertenece a la transferencia {id}.");

            if (line.ShippedQuantity < 0)
            {
                throw new DomainException("La cantidad a enviar no puede ser negativa.");
            }

            if (line.ShippedQuantity > item.RequestedQuantity)
            {
                throw new DomainException(
                    $"No se puede enviar más de lo solicitado para '{item.Product.Name}': " +
                    $"solicitado {item.RequestedQuantity}, se intenta confirmar {line.ShippedQuantity}.");
            }

            // "Revisa disponibilidad" (RF-21): valida contra el stock real de la
            // sucursal origen. Todavía NO descuenta inventario — eso ocurre en
            // el despacho físico (RF-22), que es cuando la mercancía realmente
            // sale del origen.
            var stock = await _inventory.GetItemAsync(originBranchId, item.ProductId);
            var available = stock?.CurrentQuantity ?? 0;

            if (line.ShippedQuantity > available)
            {
                throw new DomainException(
                    $"Stock insuficiente de '{item.Product.Name}' en la sucursal de origen: " +
                    $"hay {available} disponibles y se intenta confirmar el envío de {line.ShippedQuantity}.");
            }

            item.ShippedQuantity = line.ShippedQuantity;
        }

        transfer.Status = "preparing";
        transfer.Events.Add(new TransferEvent
        {
            TransferId = transfer.Id,
            Status = "preparing",
            EventDate = DateTimeOffset.UtcNow,
            Notes = request.Notes,
            RecordedBy = actingUserId,
        });

        await _transfers.SaveChangesAsync();

        return ToDto(transfer);
    }

    public async Task<TransferDto> ShipAsync(
        long originBranchId, long id, ShipTransferDto request, long actingUserId)
    {
        var transfer = await _transfers.GetByIdAsync(id)
            ?? throw new DomainException($"La transferencia {id} no existe.");

        if (transfer.OriginBranchId != originBranchId)
        {
            throw new DomainException($"La transferencia {id} no tiene como origen la sucursal {originBranchId}.");
        }

        if (transfer.Status != "preparing")
        {
            throw new DomainException(
                $"Solo se puede despachar una transferencia en estado 'preparing' (estado actual: '{transfer.Status}').");
        }

        // RF-26: la ruta se clasifica en el momento del despacho, que es cuando
        // se conocen el transportista y el costo real de envío.
        if (!string.IsNullOrWhiteSpace(request.RoutePriority) && !AllowedRoutePriorities.Contains(request.RoutePriority))
        {
            throw new DomainException(
                $"Prioridad de ruta inválida: '{request.RoutePriority}'. Valores permitidos: low, medium, high.");
        }

        if (request.ShippingCost is < 0)
        {
            throw new DomainException("El costo de envío no puede ser negativo.");
        }

        foreach (var item in transfer.Items.Where(i => i.ShippedQuantity > 0))
        {
            var stock = await _inventory.GetItemAsync(originBranchId, item.ProductId)
                ?? throw new DomainException($"No hay stock registrado de '{item.Product.Name}' en la sucursal de origen.");
            stock.CurrentQuantity -= item.ShippedQuantity;
            stock.UpdatedAt = DateTimeOffset.UtcNow;

            _inventory.AddMovement(new InventoryMovement
            {
                BranchId = originBranchId,
                ProductId = item.ProductId,
                MovementType = "transfer_out",
                Quantity = item.ShippedQuantity,
                UnitCost = null,
                Reason = $"Transferencia {transfer.TransferNumber}",
                ResponsibleUserId = actingUserId,
                ReferenceType = "transfer",
                ReferenceId = transfer.Id,
                MovementDate = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow,
            });

            await _inventoryService.CheckStockAlertsAsync(stock, actingUserId);
        }

        transfer.Carrier = request.Carrier;
        transfer.EstimatedArrivalDate = request.EstimatedDeliveryDate;
        transfer.RoutePriority = request.RoutePriority;
        transfer.ShippingCost = request.ShippingCost;
        // "in_transit", no "shipped": es el valor que acepta el CHECK de
        // transfers.status/transfer_events.status en 01-schema.sql, y el mismo
        // que espera ReceiveAsync (RF-23/24) para confirmar la recepción.
        transfer.Status = "in_transit";
        transfer.ActualShipDate = DateTimeOffset.UtcNow;

        transfer.Events.Add(new TransferEvent
        {
            TransferId = transfer.Id,
            Status = "in_transit",
            EventDate = DateTimeOffset.UtcNow,
            Notes = request.Notes,
            RecordedBy = actingUserId,
        });

        await _transfers.SaveChangesAsync();

        return ToDto(transfer);
    }

    // RF-23/RF-24: la sucursal DESTINO confirma cuánto recibió realmente de cada
    // línea. Un solo método cubre ambos requisitos porque, hasta que el destino
    // cuenta la mercancía, no se sabe de antemano si la recepción va a ser
    // completa o parcial — el propio resultado (¿alcanzó lo recibido a lo
    // despachado?) es lo que decide cuál de los dos RF aplica, no una elección
    // previa del usuario.
    private static readonly HashSet<string> AllowedShortageTreatments = ["resend", "adjustment", "claim"];

    public async Task<TransferDto> ReceiveAsync(
        long destinationBranchId, long id, ReceiveTransferDto request, long actingUserId)
    {
        var transfer = await _transfers.GetByIdAsync(id)
            ?? throw new DomainException($"La transferencia {id} no existe.");

        if (transfer.DestinationBranchId != destinationBranchId)
        {
            throw new DomainException(
                $"La transferencia {id} no tiene como destino la sucursal {destinationBranchId}.");
        }

        if (transfer.Status != "in_transit")
        {
            throw new DomainException(
                $"Solo se puede confirmar la recepción de una transferencia en estado 'in_transit' " +
                $"(estado actual: '{transfer.Status}').");
        }

        // Mismo criterio que RF-21 (PrepareAsync): se exige cobertura total de
        // líneas para no dejar una sin confirmar por olvido.
        if (request.Items.Count != transfer.Items.Count)
        {
            throw new DomainException(
                "Debe confirmar la cantidad recibida de todas las líneas de la transferencia.");
        }

        var hasShortage = false;

        foreach (var line in request.Items)
        {
            var item = transfer.Items.FirstOrDefault(i => i.Id == line.TransferItemId)
                ?? throw new DomainException(
                    $"La línea {line.TransferItemId} no pertenece a la transferencia {id}.");

            if (line.ReceivedQuantity < 0)
            {
                throw new DomainException("La cantidad recibida no puede ser negativa.");
            }

            // RN-CRIT-05 (backend/docs/reglas-negocio-criticas.md): lo recibido
            // nunca puede superar lo efectivamente despachado. No es un CHECK de
            // la tabla porque received_quantity pasa por 0 en los pasos
            // intermedios (solicitado → preparado → despachado), donde esa
            // comparación todavía no tendría sentido.
            if (line.ReceivedQuantity > item.ShippedQuantity)
            {
                throw new DomainException(
                    $"No se puede recibir más de lo despachado para '{item.Product.Name}': " +
                    $"despachado {item.ShippedQuantity}, se intenta confirmar {line.ReceivedQuantity}.");
            }

            item.ReceivedQuantity = line.ReceivedQuantity;

            if (item.ReceivedQuantity < item.ShippedQuantity)
            {
                hasShortage = true;
            }

            if (line.ReceivedQuantity > 0)
            {
                // Get-or-create del stock en destino — mismo patrón que
                // InventoryService.RegisterIncomingMovementAsync, pero escrito acá
                // directo porque "transfer_in" queda deliberadamente fuera de
                // AllowedIncomingTypes de ese servicio (es un motivo propio de
                // Transferencias, no un ingreso manual).
                var stock = await _inventory.GetItemAsync(destinationBranchId, item.ProductId);

                if (stock is null)
                {
                    stock = new InventoryItem
                    {
                        BranchId = destinationBranchId,
                        ProductId = item.ProductId,
                        Branch = transfer.DestinationBranch,
                        Product = item.Product,
                        CurrentQuantity = 0,
                    };
                    _inventory.AddItem(stock);
                }

                stock.CurrentQuantity += line.ReceivedQuantity;
                stock.UpdatedAt = DateTimeOffset.UtcNow;

                _inventory.AddMovement(new InventoryMovement
                {
                    BranchId = destinationBranchId,
                    ProductId = item.ProductId,
                    MovementType = "transfer_in",
                    Quantity = line.ReceivedQuantity,
                    UnitCost = null,
                    Reason = $"Transferencia {transfer.TransferNumber}",
                    ResponsibleUserId = actingUserId,
                    ReferenceType = "transfer",
                    ReferenceId = transfer.Id,
                    MovementDate = DateTimeOffset.UtcNow,
                    CreatedAt = DateTimeOffset.UtcNow,
                });

                await _inventoryService.CheckStockAlertsAsync(stock, actingUserId);
            }
        }

        // RF-24: si hubo faltante, el tratamiento es obligatorio; si no lo hubo,
        // no tiene sentido pedirlo (no hay nada que tratar).
        if (hasShortage && string.IsNullOrWhiteSpace(request.Treatment))
        {
            throw new DomainException(
                "Hay una diferencia entre lo despachado y lo recibido: debe indicar un tratamiento " +
                "('resend', 'adjustment' o 'claim').");
        }

        if (!string.IsNullOrWhiteSpace(request.Treatment) && !AllowedShortageTreatments.Contains(request.Treatment))
        {
            throw new DomainException(
                $"Tratamiento inválido: '{request.Treatment}'. Valores permitidos: resend, adjustment, claim.");
        }

        transfer.Status = hasShortage ? "partially_received" : "fully_received";
        transfer.ActualArrivalDate = DateTimeOffset.UtcNow;

        var eventNotes = hasShortage
            ? $"Faltante detectado. Tratamiento: {request.Treatment}."
                + (string.IsNullOrWhiteSpace(request.Notes) ? "" : $" {request.Notes}")
            : request.Notes;

        transfer.Events.Add(new TransferEvent
        {
            TransferId = transfer.Id,
            Status = transfer.Status,
            EventDate = DateTimeOffset.UtcNow,
            Notes = eventNotes,
            RecordedBy = actingUserId,
        });

        await _transfers.SaveChangesAsync();

        return ToDto(transfer);
    }

    // RF-28: agrupa por ruta (origen→destino) — "agrupable por sucursal" se
    // resuelve con el filtro branchId (acota antes de agrupar), y "por ruta" es
    // la clave misma del GroupBy. La agregación es en memoria (no vía SQL)
    // porque el repositorio ya trae todo lo necesario en una sola consulta y el
    // volumen esperado para esta prueba no lo justifica.
    public async Task<IReadOnlyList<RouteComplianceDto>> GetComplianceReportAsync(long? branchId)
    {
        var transfers = await _transfers.GetForComplianceReportAsync(branchId);

        return transfers
            .GroupBy(t => (
                t.OriginBranchId,
                OriginBranchName: t.OriginBranch.Name,
                t.DestinationBranchId,
                DestinationBranchName: t.DestinationBranch.Name))
            .Select(g =>
            {
                // "Cumplida" (a tiempo o no) solo tiene sentido si la transferencia
                // ya llegó y tenía una fecha estimada contra la cual medirse.
                var received = g
                    .Where(t => t.EstimatedArrivalDate is not null && t.ActualArrivalDate is not null)
                    .ToList();

                var delays = received
                    .Select(t => (t.ActualArrivalDate!.Value - t.EstimatedArrivalDate!.Value).TotalDays)
                    .ToList();

                return new RouteComplianceDto(
                    g.Key.OriginBranchId,
                    g.Key.OriginBranchName,
                    g.Key.DestinationBranchId,
                    g.Key.DestinationBranchName,
                    g.Count(),
                    received.Count,
                    delays.Count(d => d <= 0),
                    delays.Count(d => d > 0),
                    g.Count(t => t.Status == "partially_received"),
                    delays.Count > 0 ? delays.Average() : null
                );
            })
            .OrderBy(r => r.OriginBranchName)
            .ThenBy(r => r.DestinationBranchName)
            .ToList();
    }

    // Simple y suficiente para el alcance de la prueba, misma limitación
    // conocida que PurchaseOrderService.GenerateOrderNumberAsync.
    private async Task<string> GenerateTransferNumberAsync()
    {
        var count = await _transfers.CountAsync();
        return $"TR-{count + 1:D6}";
    }

    private static TransferDto ToDto(Transfer transfer) => new(
        transfer.Id,
        transfer.TransferNumber,
        transfer.OriginBranchId,
        transfer.OriginBranch.Name,
        transfer.DestinationBranchId,
        transfer.DestinationBranch.Name,
        transfer.RequestedBy,
        transfer.Status,
        transfer.Urgency,
        transfer.RoutePriority,
        transfer.Carrier,
        transfer.ShippingCost,
        transfer.RequestDate,
        transfer.EstimatedShipDate,
        transfer.ActualShipDate,
        transfer.EstimatedArrivalDate,
        transfer.ActualArrivalDate,
        transfer.EstimatedArrivalDate is { } estimated && transfer.ActualArrivalDate is { } actual
            ? (actual - estimated).TotalDays
            : null,
        transfer.CreatedAt,
        transfer.Items.Select(ToItemDto).ToList()
    );

    private static TransferItemDto ToItemDto(TransferItem item) => new(
        item.Id,
        item.ProductId,
        item.Product.Sku,
        item.Product.Name,
        item.RequestedQuantity,
        item.ShippedQuantity,
        item.ReceivedQuantity,
        item.Difference
    );
}
