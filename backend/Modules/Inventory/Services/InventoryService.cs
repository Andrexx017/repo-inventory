using Inventory.Infrastructure.Email;
using Inventory.Modules.Auth;
using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Modules.Inventory.Dtos;
using Inventory.Modules.Inventory.Entities;
using Inventory.Modules.Inventory.Repositories;
using Inventory.Shared.Dtos;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Inventory.Services;

public class InventoryService : IInventoryService
{
    private static readonly HashSet<string> AllowedIncomingTypes =
        ["purchase_in", "return_in", "adjustment_in"];

    private readonly IInventoryRepository _inventory;
    private readonly IBranchRepository _branches;
    private readonly IProductRepository _products;
    private readonly IUserRepository _users;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;

    public InventoryService(
        IInventoryRepository inventory,
        IBranchRepository branches,
        IProductRepository products,
        IUserRepository users,
        IEmailSender emailSender,
        IConfiguration configuration)
    {
        _inventory = inventory;
        _branches = branches;
        _products = products;
        _users = users;
        _emailSender = emailSender;
        _configuration = configuration;
    }

    public async Task<IReadOnlyList<InventoryItemDto>> GetByBranchAsync(long branchId)
    {
        var items = await _inventory.GetByBranchAsync(branchId);
        return items.Select(ToDto).ToList();
    }

    public async Task<PagedResult<InventoryItemDto>> GetPagedByBranchAsync(
        long branchId, string? search, long? categoryId, string? status, int page, int pageSize)
    {
        var result = await _inventory.GetPagedByBranchAsync(branchId, search, categoryId, status, page, pageSize);
        var items = result.Items.Select(ToDto).ToList();
        return new PagedResult<InventoryItemDto>(items, result.TotalCount, result.Page, result.PageSize);
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
        await CheckStockAlertsAsync(item, responsibleUserId);

        await _inventory.SaveChangesAsync();

        var responsibleUser = await _users.GetByIdAsync(responsibleUserId);
        return ToMovementDto(movement, item, responsibleUser?.Name ?? $"Usuario #{responsibleUserId}");
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
        await CheckStockAlertsAsync(item, responsibleUserId);

        // RN-CRIT-04: el UPDATE de stock (arriba), el INSERT del movimiento y el
        // INSERT de la alerta (si se disparó) viajan en el mismo SaveChanges → o se
        // guardan los tres, o ninguno.
        await _inventory.SaveChangesAsync();

        var responsibleUser = await _users.GetByIdAsync(responsibleUserId);
        return ToMovementDto(movement, item, responsibleUser?.Name ?? $"Usuario #{responsibleUserId}");
    }

    // RF-11: historial de movimientos, ya ordenado del más reciente al más antiguo
    // por el repositorio. No hay ningún endpoint de escritura sobre este resultado
    // (ni PUT ni DELETE en el Controller) — la inmutabilidad que pide RF-11 es una
    // propiedad de lo que el módulo NO expone, no de una regla adicional que validar.
    public async Task<PagedResult<InventoryMovementDto>> GetMovementsAsync(
        long branchId, long? productId, DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize)
    {
        var result = await _inventory.GetMovementsByBranchAsync(branchId, productId, from, to, page, pageSize);
        var items = result.Items
            .Select(m => ToMovementDto(m, m.Branch, m.Product, m.ResponsibleUser.Name))
            .ToList();
        return new PagedResult<InventoryMovementDto>(items, result.TotalCount, result.Page, result.PageSize);
    }

    public async Task<InventoryItemDto> SetThresholdsAsync(
        long branchId, long productId, UpdateInventoryThresholdsDto request, long userId)
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
        await CheckStockAlertsAsync(item, userId);

        await _inventory.SaveChangesAsync();

        return ToDto(item);
    }

    public async Task<IReadOnlyList<StockAlertDto>> GetAlertsAsync(long branchId)
    {
        var alerts = await _inventory.GetAlertsByBranchAsync(branchId);
        return alerts.Select(ToAlertDto).ToList();
    }

    // RF-34: revisa AMBOS umbrales ("por arriba o por abajo") en vez de solo el
    // mínimo (así se llamaba CheckLowStockAlertAsync en RF-09) — cada umbral se
    // delega al mismo helper genérico, que ya sabía crear/auto-resolver una
    // alerta por tipo desde RF-09.
    public async Task CheckStockAlertsAsync(InventoryItem item, long actingUserId)
    {
        // MinimumStock/MaximumStock en 0 o null significan "sin umbral
        // configurado" — no tiene sentido alertar "stock bajo cero" ni "por
        // arriba de cero".
        var isLow = item.MinimumStock > 0 && item.CurrentQuantity <= item.MinimumStock;
        await CheckThresholdAlertAsync(item, actingUserId, "low_stock", isLow, item.MinimumStock);

        var isHigh = item.MaximumStock is { } max && max > 0 && item.CurrentQuantity >= max;
        await CheckThresholdAlertAsync(item, actingUserId, "high_stock", isHigh, item.MaximumStock ?? 0);
    }

    // Revisa si el stock actual ya cruzó el umbral dado (mínimo o máximo) y, si
    // todavía no hay una alerta 'pending' de ese tipo para ese producto/sucursal,
    // crea una nueva.
    private async Task CheckThresholdAlertAsync(
        InventoryItem item, long actingUserId, string alertType, bool isTriggered, decimal thresholdValue)
    {
        if (!isTriggered)
        {
            // El stock se recuperó dentro del rango normal (o el umbral se quitó):
            // si había una alerta 'pending' para este producto/sucursal/tipo, se
            // resuelve sola acá — pedido explícito para que el sistema no siga
            // mostrando una alerta de un problema que ya no existe. resolved_by
            // queda con el id de quien causó la recuperación (quien registró el
            // movimiento o cambió el umbral) en vez de null: la tabla tiene
            // CHECK (status = 'pending' OR (resolved_by IS NOT NULL AND resolved_at
            // IS NOT NULL)), así que "nadie la resolvió" no es un estado que Postgres
            // permita guardar. Sigue siendo automático (nadie hizo clic en
            // "resolver"), solo que atribuido a la acción que lo causó — distinto
            // de la resolución manual de RF-34 (ver ResolveAlertAsync), donde
            // resolved_by es el usuario que abrió la alerta y la cerró a propósito.
            var recovered = await _inventory.GetPendingAlertAsync(item.BranchId, item.ProductId, alertType);
            if (recovered is not null)
            {
                recovered.Status = "resolved";
                recovered.ResolvedBy = actingUserId;
                recovered.ResolvedAt = DateTimeOffset.UtcNow;
            }

            return;
        }

        var existing = await _inventory.GetPendingAlertAsync(item.BranchId, item.ProductId, alertType);
        if (existing is not null)
        {
            return;
        }

        var alert = new StockAlert
        {
            BranchId = item.BranchId,
            ProductId = item.ProductId,
            AlertType = alertType,
            QuantityAtTrigger = item.CurrentQuantity,
            ThresholdValue = thresholdValue,
            Status = "pending",
            TriggeredAt = DateTimeOffset.UtcNow,
        };
        _inventory.AddAlert(alert);

        await NotifyAlertByEmailAsync(item, alert);
    }

    // RF-34: notificación "opcional" — dos niveles de opcionalidad. (1) Detrás de
    // un flag de configuración (Alerts:NotifyByEmail, default false): no todo
    // entorno de evaluación va a tener SMTP configurado, y esta funcionalidad
    // "adicional" no debe exigirlo. (2) Si falla el envío (SMTP caído, mal
    // configurado), se traga la excepción — un correo de aviso NUNCA debe tumbar
    // el movimiento de inventario que disparó la alerta; ver RNF-07 (atomicidad),
    // que es sobre el stock, no sobre un efecto secundario de notificación.
    private async Task NotifyAlertByEmailAsync(InventoryItem item, StockAlert alert)
    {
        if (!_configuration.GetValue("Alerts:NotifyByEmail", false))
        {
            return;
        }

        var recipients = (await _users.GetAllAsync())
            .Where(u => u.Active && u.BranchId == item.BranchId && u.Role.Code == RoleCodes.BranchManager)
            .ToList();

        if (recipients.Count == 0)
        {
            return;
        }

        var alertLabel = alert.AlertType == "low_stock" ? "stock bajo" : "exceso de stock";

        try
        {
            foreach (var recipient in recipients)
            {
                await _emailSender.SendAsync(
                    recipient.Email,
                    $"Alerta de {alertLabel} — {item.Product.Sku}",
                    $"""
                    <p>Hola {recipient.Name},</p>
                    <p>El producto <strong>{item.Product.Name}</strong> ({item.Product.Sku}) en tu sucursal
                    cruzó el umbral de {alertLabel}: existencia actual {alert.QuantityAtTrigger},
                    umbral configurado {alert.ThresholdValue}.</p>
                    """);
            }

            alert.NotifiedAt = DateTimeOffset.UtcNow;
        }
        catch (Exception)
        {
            // Intencional: ver comentario del método. La alerta ya quedó creada
            // en el change tracker igual, solo NotifiedAt se queda en null.
        }
    }

    // RF-34: marca una alerta como resuelta a mano — a diferencia de la
    // auto-resolución de CheckThresholdAlertAsync (que ocurre "de rebote" cuando
    // el stock se recupera solo), acá el responsable es quien realmente
    // interactuó con la alerta y decide cerrarla.
    public async Task<StockAlertDto> ResolveAlertAsync(long branchId, long alertId, long actingUserId)
    {
        var alert = await _inventory.GetAlertByIdAsync(branchId, alertId)
            ?? throw new DomainException($"La alerta {alertId} no existe en la sucursal {branchId}.");

        if (alert.Status == "resolved")
        {
            throw new DomainException("La alerta ya está resuelta.");
        }

        alert.Status = "resolved";
        alert.ResolvedBy = actingUserId;
        alert.ResolvedAt = DateTimeOffset.UtcNow;

        await _inventory.SaveChangesAsync();

        return ToAlertDto(alert);
    }

    // Único punto donde se arma un InventoryMovementDto — lo usan tanto el ingreso
    // como el retiro (antes estaba duplicado en los dos métodos) y ahora también
    // GetMovementsAsync. branch/product/responsibleUserName llegan por parámetro
    // separado porque GetMovementsAsync no tiene un InventoryItem a mano (viene
    // directo de la consulta de movimientos, que sí trae Branch/Product/
    // ResponsibleUser incluidos) — ver RUTA.md, sección de "Usuario #ID" en la
    // columna Responsable, corregido a pedido explícito del usuario.
    private static InventoryMovementDto ToMovementDto(
        InventoryMovement movement, InventoryItem item, string responsibleUserName) =>
        ToMovementDto(movement, item.Branch, item.Product, responsibleUserName);

    private static InventoryMovementDto ToMovementDto(
        InventoryMovement movement, Auth.Entities.Branch branch, Catalog.Entities.Product product,
        string responsibleUserName) => new(
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
        responsibleUserName,
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