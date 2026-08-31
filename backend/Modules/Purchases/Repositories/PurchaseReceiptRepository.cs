using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Purchases.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Modules.Purchases.Repositories;

public class PurchaseReceiptRepository : IPurchaseReceiptRepository
{
    private readonly AppDbContext _db;

    public PurchaseReceiptRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<PurchaseReceiptItem>> GetReceiptItemsByOrderAsync(long purchaseOrderId) =>
        await _db.PurchaseReceiptItems
            .Where(ri => ri.Receipt.PurchaseOrderId == purchaseOrderId)
            .ToListAsync();

    public async Task<IReadOnlyList<PurchaseReceipt>> GetByOrderAsync(long purchaseOrderId) =>
        await _db.PurchaseReceipts
            .Where(r => r.PurchaseOrderId == purchaseOrderId)
            .Include(r => r.Items).ThenInclude(i => i.PurchaseOrderItem).ThenInclude(poi => poi.Product)
            .OrderByDescending(r => r.ReceiptDate)
            .ToListAsync();

    public void Add(PurchaseReceipt receipt) => _db.PurchaseReceipts.Add(receipt);

    // Comparte el mismo AppDbContext scoped que IInventoryRepository/IPurchaseOrderRepository
    // dentro del mismo request — un solo SaveChangesAsync (sin importar desde qué
    // repositorio se invoque) confirma TODOS los cambios pendientes juntos
    // (RN-CRIT-04): la recepción, el/los InventoryItem, el InventoryMovement y el
    // nuevo Status de la PurchaseOrder.
    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
