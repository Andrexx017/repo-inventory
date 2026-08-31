using Inventory.Modules.Purchases.Entities;

namespace Inventory.Modules.Purchases.Repositories;

public interface IPurchaseReceiptRepository
{
    // Todas las líneas de recepción ya registradas para una orden, sin importar
    // en qué recepción (puede haber varias parciales) — el Service las suma por
    // purchase_order_item_id para saber cuánto queda pendiente de cada línea.
    Task<IReadOnlyList<PurchaseReceiptItem>> GetReceiptItemsByOrderAsync(long purchaseOrderId);

    Task<IReadOnlyList<PurchaseReceipt>> GetByOrderAsync(long purchaseOrderId);

    void Add(PurchaseReceipt receipt);
    Task SaveChangesAsync();
}
