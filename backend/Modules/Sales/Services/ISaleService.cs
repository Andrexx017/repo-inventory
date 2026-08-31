using Inventory.Modules.Sales.Dtos;

namespace Inventory.Modules.Sales.Services;

public interface ISaleService
{
    Task<SaleDto> CreateAsync(long branchId, CreateSaleDto request, long sellerId);
    Task<IReadOnlyList<SaleDto>> GetByBranchAsync(long branchId);
    Task<SaleDto?> GetByIdAsync(long id);
}
