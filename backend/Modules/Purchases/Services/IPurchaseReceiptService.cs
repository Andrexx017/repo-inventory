using Inventory.Modules.Purchases.Dtos;

namespace Inventory.Modules.Purchases.Services;

public interface IPurchaseReceiptService
{
    Task<PurchaseReceiptDto> CreateAsync(
        long branchId, long purchaseOrderId, CreatePurchaseReceiptDto request, long receivedByUserId);

    Task<IReadOnlyList<PurchaseReceiptDto>> GetByOrderAsync(long branchId, long purchaseOrderId);
}
