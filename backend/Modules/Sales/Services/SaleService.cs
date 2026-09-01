using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Modules.Inventory.Entities;
using Inventory.Modules.Inventory.Repositories;
using Inventory.Modules.Inventory.Services;
using Inventory.Modules.Sales.Dtos;
using Inventory.Modules.Sales.Entities;
using Inventory.Modules.Sales.Repositories;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Sales.Services;

public class SaleService : ISaleService
{
    private readonly ISaleRepository _sales;
    private readonly IPriceListRepository _priceLists;
    private readonly IBranchRepository _branches;
    private readonly IProductRepository _products;
    private readonly IUserRepository _users;
    private readonly IInventoryRepository _inventory;
    private readonly IInventoryService _inventoryService;

    public SaleService(
        ISaleRepository sales,
        IPriceListRepository priceLists,
        IBranchRepository branches,
        IProductRepository products,
        IUserRepository users,
        IInventoryRepository inventory,
        IInventoryService inventoryService)
    {
        _sales = sales;
        _priceLists = priceLists;
        _branches = branches;
        _products = products;
        _users = users;
        _inventory = inventory;
        _inventoryService = inventoryService;
    }

    public async Task<SaleDto> CreateAsync(long branchId, CreateSaleDto request, long sellerId)
    {
        var branch = await _branches.GetByIdAsync(branchId)
            ?? throw new DomainException($"La sucursal {branchId} no existe.");

        // RF-18: si se indica una lista, tiene que existir, estar activa y —
        // si tiene fechas de vigencia— estar dentro de rango hoy.
        PriceList? priceList = null;
        if (request.PriceListId is not null)
        {
            priceList = await _priceLists.GetByIdAsync(request.PriceListId.Value)
                ?? throw new DomainException($"La lista de precios {request.PriceListId} no existe.");

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var isValid = priceList.Active
                && (priceList.StartDate is null || today >= priceList.StartDate)
                && (priceList.EndDate is null || today <= priceList.EndDate);

            if (!isValid)
            {
                throw new DomainException($"La lista de precios '{priceList.Name}' no está vigente.");
            }
        }

        var saleItems = new List<SaleItem>();
        var stockUpdates = new List<(InventoryItem Item, decimal Quantity)>();
        var reservedByProduct = new Dictionary<long, decimal>();

        decimal subtotal = 0;
        decimal total = 0;

        foreach (var line in request.Items)
        {
            if (line.Quantity <= 0)
            {
                throw new DomainException("La cantidad de cada línea debe ser mayor a cero.");
            }

            if (line.DiscountPct is < 0 or > 100)
            {
                throw new DomainException("El descuento debe estar entre 0 y 100.");
            }

            var product = await _products.GetByIdAsync(line.ProductId)
                ?? throw new DomainException($"El producto {line.ProductId} no existe.");

            // RF-18: el precio nunca lo manda el cliente — sale de la lista de
            // precios indicada, o del precio de referencia del catálogo si no
            // se indicó ninguna lista.
            decimal unitPrice;
            if (priceList is not null)
            {
                unitPrice = await _priceLists.GetPriceAsync(priceList.Id, product.Id)
                    ?? throw new DomainException(
                        $"'{product.Name}' no tiene precio en la lista '{priceList.Name}'.");
            }
            else
            {
                unitPrice = product.ReferencePrice
                    ?? throw new DomainException(
                        $"'{product.Name}' no tiene precio de referencia; use una lista de precios.");
            }

            // RF-17 (RN-CRIT-03 aplicada acá): valida ANTES de confirmar, restando
            // lo que ya reservaron líneas anteriores del MISMO producto en esta
            // misma venta — si no, dos líneas del mismo producto podrían pasar la
            // validación por separado y sumar más de lo que hay en stock.
            var item = await _inventory.GetItemAsync(branchId, product.Id);
            var alreadyReserved = reservedByProduct.GetValueOrDefault(product.Id);
            var available = (item?.CurrentQuantity ?? 0) - alreadyReserved;

            if (item is null || available < line.Quantity)
            {
                throw new DomainException(
                    $"Stock insuficiente de '{product.Name}': hay {available} unidades disponibles " +
                    $"y se intentan vender {line.Quantity}.");
            }

            reservedByProduct[product.Id] = alreadyReserved + line.Quantity;

            var (gross, net) = CalculateLineAmounts(line.Quantity, unitPrice, line.DiscountPct);
            subtotal += gross;
            total += net;

            saleItems.Add(new SaleItem
            {
                ProductId = product.Id,
                Product = product,
                Quantity = line.Quantity,
                UnitPrice = unitPrice,
                DiscountPct = line.DiscountPct,
            });

            stockUpdates.Add((item, line.Quantity));
        }

        var sale = new Sale
        {
            SaleNumber = await GenerateSaleNumberAsync(),
            BranchId = branchId,
            Branch = branch,
            PriceListId = priceList?.Id,
            PriceList = priceList,
            SellerId = sellerId,
            CustomerName = request.CustomerName,
            SaleDate = DateTimeOffset.UtcNow,
            Subtotal = subtotal,
            TotalDiscount = subtotal - total,
            Total = total,
            Status = "confirmed",
            CreatedAt = DateTimeOffset.UtcNow,
            Items = saleItems,
        };

        // Dos SaveChanges en una misma transacción explícita (mecanismo reservado
        // para esto en backend/docs/decisions.md): el primero asigna sale.Id
        // (autogenerado por Postgres), que recién existe después de guardar y que
        // el movimiento de inventario necesita para poder referenciar el
        // documento real (reference_type='sale', reference_id=sale.Id).
        await using var transaction = await _sales.BeginTransactionAsync();

        _sales.Add(sale);
        await _sales.SaveChangesAsync();

        foreach (var (item, quantity) in stockUpdates)
        {
            item.CurrentQuantity -= quantity;
            item.UpdatedAt = DateTimeOffset.UtcNow;

            _inventory.AddMovement(new InventoryMovement
            {
                BranchId = branchId,
                ProductId = item.ProductId,
                MovementType = "sale_out",
                Quantity = quantity,
                UnitCost = null,
                Reason = $"Venta {sale.SaleNumber}",
                ResponsibleUserId = sellerId,
                ReferenceType = "sale",
                ReferenceId = sale.Id,
                MovementDate = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow,
            });

            // RF-09: una venta es, en la práctica, la forma más común de cruzar
            // el stock mínimo — reusa la misma lógica de alerta/auto-resolución
            // que ya usan los retiros manuales, en vez de duplicarla acá.
            await _inventoryService.CheckStockAlertsAsync(item, sellerId);
        }

        await _inventory.SaveChangesAsync();
        await transaction.CommitAsync();

        var seller = await _users.GetByIdAsync(sellerId);
        return ToDto(sale, seller?.Name ?? $"Usuario #{sellerId}");
    }

    public async Task<IReadOnlyList<SaleDto>> GetByBranchAsync(long branchId)
    {
        var sales = await _sales.GetByBranchAsync(branchId);
        return sales.Select(s => ToDto(s, s.Seller.Name)).ToList();
    }

    public async Task<SaleDto?> GetByIdAsync(long id)
    {
        var sale = await _sales.GetByIdAsync(id);
        return sale is null ? null : ToDto(sale, sale.Seller.Name);
    }

    // Simple y suficiente para el alcance de la prueba, mismo criterio y misma
    // limitación conocida que PurchaseOrderService.GenerateOrderNumberAsync
    // (no protege contra dos creaciones concurrentes leyendo el mismo count).
    private async Task<string> GenerateSaleNumberAsync()
    {
        var count = await _sales.CountAsync();
        return $"VTA-{count + 1:D6}";
    }

    // Misma fórmula que PurchaseOrderService.CalculateLineAmounts — se duplica
    // (no se extrae a un helper compartido) porque son dos módulos distintos con
    // dos entidades de línea distintas (PurchaseOrderItem/SaleItem); extraerla
    // hoy sería una abstracción para un solo llamador real por lado, sin ningún
    // caso de uso que la necesite compartida todavía.
    private static (decimal Gross, decimal Net) CalculateLineAmounts(
        decimal quantity, decimal unitPrice, decimal discountPct)
    {
        var gross = Math.Round(quantity * unitPrice, 2, MidpointRounding.AwayFromZero);
        var net = Math.Round(quantity * unitPrice * (1 - discountPct / 100m), 2, MidpointRounding.AwayFromZero);
        return (gross, net);
    }

    private static SaleDto ToDto(Sale sale, string sellerName) => new(
        sale.Id,
        sale.SaleNumber,
        sale.BranchId,
        sale.Branch.Name,
        sale.PriceListId,
        sale.PriceList?.Name,
        sale.SellerId,
        sellerName,
        sale.CustomerName,
        sale.SaleDate,
        sale.Subtotal,
        sale.TotalDiscount,
        sale.Total,
        sale.Status,
        sale.CreatedAt,
        sale.Items.Select(ToItemDto).ToList()
    );

    private static SaleItemDto ToItemDto(SaleItem item) => new(
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
