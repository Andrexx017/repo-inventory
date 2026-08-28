using Inventory.Modules.Inventory.Entities;

namespace Inventory.Modules.Inventory.Repositories;

public interface IInventoryRepository
{
    Task<IReadOnlyList<InventoryItem>> GetByBranchAsync(long branchId);
}
