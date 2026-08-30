using Inventory.Modules.Inventory.Dtos;

namespace Inventory.Modules.Inventory.Services;

public interface IInventoryService
{
    Task<IReadOnlyList<InventoryItemDto>> GetByBranchAsync(long branchId);
    Task<InventoryMovementDto> RegisterIncomingMovementAsync(
        long branchId, CreateInventoryMovementDto request, long responsibleUserId);
}