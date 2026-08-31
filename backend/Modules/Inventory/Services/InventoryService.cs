using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Modules.Inventory.Dtos;
using Inventory.Modules.Inventory.Entities;
using Inventory.Modules.Inventory.Repositories;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Inventory.Services;

public class InventoryService : IInventoryService
{
    private static readonly HashSet<string> AllowedIncomingTypes =
        ["purchase_in", "return_in", "adjustment_in"];

    private readonly IInventoryRepository _inventory;
    private readonly IBranchRepository _branches;
    private readonly IProductRepository _products;

    public InventoryService(IInventoryRepository inventory, IBranchRepository branches, IProductRepository products)
    {
        _inventory = inventory;
        _branches = branches;
        _products = products;
    }

    public async Task<IReadOnlyList<InventoryItemDto>> GetByBranchAsync(long branchId)
    {
        var items = await _inventory.GetByBranchAsync(branchId);
        return items.Select(ToDto).ToList();
    }

    public async Task<InventoryMovementDto> RegisterIncomingMovementAsync(
        long branchId, CreateInventoryMovementDto request, long responsibleUserId)
    {
        if (!AllowedIncomingTypes.Contains(request.MovementType))
        {
            throw new DomainException($"Motivo de ingreso inválido: '{request.MovementType}'.");
        }

        if (request.Quantity <= 0)
        {
            throw new DomainException("La cantidad debe ser mayor a cero.");
        }

        var item = await _inventory.GetItemAsync(branchId, request.ProductId);

        if (item is null)
        {
            var branch = await _branches.GetByIdAsync(branchId)
                ?? throw new DomainException($"La sucursal {branchId} no existe.");
            var product = await _products.GetByIdAsync(request.ProductId)
                ?? throw new DomainException($"El producto {request.ProductId} no existe.");

            item = new InventoryItem
            {
                BranchId = branchId,
                ProductId = request.ProductId,
                Branch = branch,
                Product = product,
                CurrentQuantity = 0,
            };
            _inventory.AddItem(item);
        }

        item.CurrentQuantity += request.Quantity;
        item.UpdatedAt = DateTimeOffset.UtcNow;

        var movement = new InventoryMovement
        {
            BranchId = branchId,
            ProductId = request.ProductId,
            MovementType = request.MovementType,
            Quantity = request.Quantity,
            UnitCost = request.UnitCost,
            Reason = request.Reason,
            ResponsibleUserId = responsibleUserId,
            ReferenceType = null,
            ReferenceId = null,
            MovementDate = request.MovementDate,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        _inventory.AddMovement(movement);

        // RF-09: un ingreso también puede "resolver" una situación de stock bajo, pero
        // igual puede seguir cruzando el mínimo si el ingreso fue chico — se revisa
        // siempre, no solo en el retiro. La alerta se agrega al mismo change tracker
        // que el movimiento y el item, así que viaja en el mismo SaveChanges de abajo
        // (RN-CRIT-04: todo o nada).
        await CheckLowStockAlertAsync(item);

        await _inventory.SaveChangesAsync();

        return ToMovementDto(movement, item);
    }

    // Motivos de retiro permitidos por RF-08 (coinciden con el CHECK de la BD, sin transfer_out
    // porque las transferencias son un módulo aparte)
    private static readonly HashSet<string> AllowedOutgoingTypes =
        ["sale_out", "shrinkage_out", "adjustment_out"];

    public async Task<InventoryMovementDto> RegisterOutgoingMovementAsync(
        long branchId, CreateInventoryMovementDto request, long responsibleUserId)
    {
        if (!AllowedOutgoingTypes.Contains(request.MovementType))
        {
            throw new DomainException($"Motivo de retiro inválido: '{request.MovementType}'.");
        }

        if (request.Quantity <= 0)
        {
            throw new DomainException("La cantidad debe ser mayor a cero.");
        }

        // A diferencia del ingreso, acá el item DEBE existir: no se puede retirar
        // stock de un producto que nunca ingresó a esta sucursal.
        var item = await _inventory.GetItemAsync(branchId, request.ProductId)
            ?? throw new DomainException(
                $"El producto {request.ProductId} no tiene stock registrado en la sucursal {branchId}.");

        // RN-CRIT-03 aplicada de forma general: validar ANTES de restar, no confiar
        // solo en el CHECK (current_quantity >= 0) de la base de datos.
        if (item.CurrentQuantity < request.Quantity)
        {
            throw new DomainException(
                $"Stock insuficiente: hay {item.CurrentQuantity} unidades disponibles " +
                $"y se intentan retirar {request.Quantity}.");
        }

        item.CurrentQuantity -= request.Quantity;
        item.UpdatedAt = DateTimeOffset.UtcNow;

        var movement = new InventoryMovement
        {
            BranchId = branchId,
            ProductId = request.ProductId,
            MovementType = request.MovementType,
            Quantity = request.Quantity,
            UnitCost = request.UnitCost,
            Reason = request.Reason,
            ResponsibleUserId = responsibleUserId,
            ReferenceType = null,
            ReferenceId = null,
            MovementDate = request.MovementDate,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        _inventory.AddMovement(movement);

        // RF-09: acá es donde más importa el chequeo — un retiro es justo lo que
        // puede empujar el stock por debajo del mínimo configurado.
        await CheckLowStockAlertAsync(item);

        // RN-CRIT-04: el UPDATE de stock (arriba), el INSERT del movimiento y el
        // INSERT de la alerta (si se disparó) viajan en el mismo SaveChanges → o se
        // guardan los tres, o ninguno.
        await _inventory.SaveChangesAsync();

        return ToMovementDto(movement, item);
    }

    // RF-11: historial de movimientos, ya ordenado del más reciente al más antiguo
    // por el repositorio. No hay ningún endpoint de escritura sobre este resultado
    // (ni PUT ni DELETE en el Controller) — la inmutabilidad que pide RF-11 es una
    // propiedad de lo que el módulo NO expone, no de una regla adicional que validar.
    public async Task<IReadOnlyList<InventoryMovementDto>> GetMovementsAsync(long branchId, long? productId)
    {
        var movements = await _inventory.GetMovementsByBranchAsync(branchId, productId);
        return movements.Select(m => ToMovementDto(m, branch: m.Branch, product: m.Product)).ToList();
    }

    public async Task<InventoryItemDto> SetThresholdsAsync(
        long branchId, long productId, UpdateInventoryThresholdsDto request)
    {
        if (request.MaximumStock is not null && request.MaximumStock < request.MinimumStock)
        {
            // Mismo CHECK que ya tiene la tabla (maximum_stock >= minimum_stock);
            // se repite acá para devolver un 400 con mensaje claro (DomainException)
            // en vez de dejar que Postgres lo rechace con un 500 crudo.
            throw new DomainException("El stock máximo no puede ser menor al stock mínimo.");
        }

        var item = await _inventory.GetItemAsync(branchId, productId);

        if (item is null)
        {
            // Mismo get-or-create que RegisterIncomingMovementAsync: se puede
            // configurar el umbral de un producto antes de que tenga movimientos.
            var branch = await _branches.GetByIdAsync(branchId)
                ?? throw new DomainException($"La sucursal {branchId} no existe.");
            var product = await _products.GetByIdAsync(productId)
                ?? throw new DomainException($"El producto {productId} no existe.");

            item = new InventoryItem
            {
                BranchId = branchId,
                ProductId = productId,
                Branch = branch,
                Product = product,
                CurrentQuantity = 0,
            };
            _inventory.AddItem(item);
        }

        item.MinimumStock = request.MinimumStock;
        item.MaximumStock = request.MaximumStock;
        item.UpdatedAt = DateTimeOffset.UtcNow;

        // Bajar el mínimo a mano puede hacer que el stock actual quede por debajo
        // del nuevo umbral sin que haya habido ningún movimiento — también dispara
        // la alerta acá, no solo en los movimientos.
        await CheckLowStockAlertAsync(item);

        await _inventory.SaveChangesAsync();

        return ToDto(item);
    }

    public async Task<IReadOnlyList<StockAlertDto>> GetAlertsAsync(long branchId)
    {
        var alerts = await _inventory.GetAlertsByBranchAsync(branchId);
        return alerts.Select(ToAlertDto).ToList();
    }

    // Revisa si el stock actual ya cruzó el mínimo configurado y, si todavía no hay
    // una alerta 'pending' para ese producto/sucursal, crea una nueva. MinimumStock
    // en 0 significa "sin umbral configurado" (es el default de la columna) — no
    // tiene sentido alertar "stock bajo cero", así que se excluye a propósito.
    private async Task CheckLowStockAlertAsync(InventoryItem item)
    {
        if (item.MinimumStock <= 0 || item.CurrentQuantity > item.MinimumStock)
        {
            return;
        }

        var existing = await _inventory.GetPendingAlertAsync(item.BranchId, item.ProductId, "low_stock");
        if (existing is not null)
        {
            return;
        }

        _inventory.AddAlert(new StockAlert
        {
            BranchId = item.BranchId,
            ProductId = item.ProductId,
            AlertType = "low_stock",
            QuantityAtTrigger = item.CurrentQuantity,
            ThresholdValue = item.MinimumStock,
            Status = "pending",
            TriggeredAt = DateTimeOffset.UtcNow,
        });
    }

    // Único punto donde se arma un InventoryMovementDto — lo usan tanto el ingreso
    // como el retiro (antes estaba duplicado en los dos métodos) y ahora también
    // GetMovementsAsync. branch/product llegan por parámetro separado porque
    // GetMovementsAsync no tiene un InventoryItem a mano (viene directo de la
    // consulta de movimientos, que sí trae Branch/Product incluidos).
    private static InventoryMovementDto ToMovementDto(InventoryMovement movement, InventoryItem item) =>
        ToMovementDto(movement, item.Branch, item.Product);

    private static InventoryMovementDto ToMovementDto(
        InventoryMovement movement, Auth.Entities.Branch branch, Catalog.Entities.Product product) => new(
        movement.Id,
        movement.BranchId,
        branch.Name,
        movement.ProductId,
        product.Sku,
        product.Name,
        movement.MovementType,
        movement.Quantity,
        movement.UnitCost,
        movement.Reason,
        movement.ResponsibleUserId,
        movement.ReferenceType,
        movement.ReferenceId,
        movement.MovementDate,
        movement.CreatedAt
    );

    private static StockAlertDto ToAlertDto(StockAlert alert) => new(
        alert.Id,
        alert.BranchId,
        alert.Branch.Name,
        alert.ProductId,
        alert.Product.Sku,
        alert.Product.Name,
        alert.AlertType,
        alert.QuantityAtTrigger,
        alert.ThresholdValue,
        alert.Status,
        alert.TriggeredAt,
        alert.ResolvedBy,
        alert.ResolvedAt
    );

    private static InventoryItemDto ToDto(InventoryItem item) => new(
        item.Id,
        item.BranchId,
        item.ProductId,
        item.Product.Sku,
        item.Product.Name,
        item.Product.Category?.Name,
        item.Product.BaseUnit.Name,
        item.Product.BaseUnit.Abbreviation,
        item.CurrentQuantity,
        item.MinimumStock,
        item.MaximumStock,
        item.WeightedAverageCost,
        item.UpdatedAt
    );
}