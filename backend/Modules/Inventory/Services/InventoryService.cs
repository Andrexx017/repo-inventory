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

        await _inventory.SaveChangesAsync();

        return new InventoryMovementDto(
            movement.Id,
            branchId,
            item.Branch.Name,
            request.ProductId,
            item.Product.Sku,
            item.Product.Name,
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
    }

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