using Inventory.Modules.Sales.Dtos;
using Inventory.Shared.Dtos;

namespace Inventory.Modules.Sales.Services;

public interface ISaleService
{
    Task<SaleDto> CreateAsync(long branchId, CreateSaleDto request, long sellerId);
    Task<PagedResult<SaleDto>> GetByBranchAsync(
        long branchId, DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize);
    Task<SaleDto?> GetByIdAsync(long id);
    Task<SalesKpiDto> GetKpiSummaryAsync(long branchId);
}
