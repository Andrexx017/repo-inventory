using Inventory.Modules.Purchases.Entities;

namespace Inventory.Modules.Purchases.Repositories;

public interface IPurchaseOrderRepository
{
    Task<PurchaseOrder?> GetByIdAsync(long id);

    // RF-14: histórico de compras consultable por proveedor y por producto —
    // supplierId/productId son opcionales, mismo criterio que el ?productId=
    // de GetMovementsByBranchAsync en el módulo Inventory.
    Task<IReadOnlyList<PurchaseOrder>> GetByBranchAsync(long branchId, long? supplierId, long? productId);
    Task<int> CountAsync();
    void Add(PurchaseOrder order);
    Task SaveChangesAsync();
}
