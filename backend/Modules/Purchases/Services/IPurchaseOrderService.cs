using Inventory.Modules.Purchases.Dtos;

namespace Inventory.Modules.Purchases.Services;

public interface IPurchaseOrderService
{
    Task<PurchaseOrderDto> CreateAsync(long branchId, CreatePurchaseOrderDto request, long createdByUserId);
    Task<IReadOnlyList<PurchaseOrderDto>> GetByBranchAsync(long branchId, long? supplierId, long? productId);
    Task<PurchaseOrderDto?> GetByIdAsync(long id);
    Task<PurchaseOrderDto> ApproveAsync(long id);
    Task<PurchaseOrderDto> CancelAsync(long id);
}
