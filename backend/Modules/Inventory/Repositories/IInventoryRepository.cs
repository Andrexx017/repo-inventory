using Inventory.Modules.Inventory.Entities;

namespace Inventory.Modules.Inventory.Repositories;

public interface IInventoryRepository
{
    Task<IReadOnlyList<InventoryItem>> GetByBranchAsync(long branchId);

    Task<InventoryItem?> GetItemAsync(long branchId, long productId);
    void AddItem(InventoryItem item);
    void AddMovement(InventoryMovement movement);
    Task SaveChangesAsync();
}