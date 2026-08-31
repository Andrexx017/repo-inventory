using Inventory.Modules.Purchases.Dtos;
using Inventory.Modules.Purchases.Entities;
using Inventory.Modules.Purchases.Repositories;

namespace Inventory.Modules.Purchases.Services;

public class SupplierService : ISupplierService
{
    private readonly ISupplierRepository _suppliers;

    public SupplierService(ISupplierRepository suppliers)
    {
        _suppliers = suppliers;
    }

    public async Task<IReadOnlyList<SupplierDto>> GetAllAsync()
    {
        var suppliers = await _suppliers.GetAllAsync();
        return suppliers.Select(ToDto).ToList();
    }

    public async Task<SupplierDto?> GetByIdAsync(long id)
    {
        var supplier = await _suppliers.GetByIdAsync(id);
        return supplier is null ? null : ToDto(supplier);
    }

    private static SupplierDto ToDto(Supplier supplier) => new(
        supplier.Id,
        supplier.Name,
        supplier.TaxId,
        supplier.ContactName,
        supplier.Phone,
        supplier.Email,
        supplier.Address);
}
