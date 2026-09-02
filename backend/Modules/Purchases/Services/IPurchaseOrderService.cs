using Inventory.Modules.Purchases.Dtos;
using Inventory.Shared.Dtos;

namespace Inventory.Modules.Purchases.Services;

public interface IPurchaseOrderService
{
    Task<PurchaseOrderDto> CreateAsync(long branchId, CreatePurchaseOrderDto request, long createdByUserId);
    Task<PagedResult<PurchaseOrderDto>> GetByBranchAsync(
        long branchId, long? supplierId, long? productId, DateTimeOffset? from, DateTimeOffset? to,
        int page, int pageSize);
    Task<PurchaseOrderDto?> GetByIdAsync(long id);
    Task<PurchaseOrdersKpiDto> GetKpiSummaryAsync(long branchId);
    Task<PurchaseOrderDto> ApproveAsync(long id);
    Task<PurchaseOrderDto> CancelAsync(long id);
}
