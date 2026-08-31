using Inventory.Modules.Purchases.Entities;

namespace Inventory.Modules.Purchases.Repositories;

public interface ISupplierRepository
{
    Task<IReadOnlyList<Supplier>> GetAllAsync();
    Task<Supplier?> GetByIdAsync(long id);
}
