using Inventory.Modules.Inventory.Dtos;
using Inventory.Modules.Inventory.Entities;
using Inventory.Modules.Inventory.Repositories;

namespace Inventory.Modules.Inventory.Services;

public class InventoryService : IInventoryService
{
    private readonly IInventoryRepository _inventory;

    public InventoryService(IInventoryRepository inventory)
    {
        _inventory = inventory;
    }

    public async Task<IReadOnlyList<InventoryItemDto>> GetByBranchAsync(long branchId)
    {
        var items = await _inventory.GetByBranchAsync(branchId);
        return items.Select(ToDto).ToList();
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