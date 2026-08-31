using Inventory.Modules.Purchases.Dtos;

namespace Inventory.Modules.Purchases.Services;

public interface ISupplierService
{
    Task<IReadOnlyList<SupplierDto>> GetAllAsync();
    Task<SupplierDto?> GetByIdAsync(long id);
}
