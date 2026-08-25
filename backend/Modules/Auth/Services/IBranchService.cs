using Inventory.Modules.Auth.Dtos;

namespace Inventory.Modules.Auth.Services;

public interface IBranchService
{
    Task<IReadOnlyList<BranchDto>> GetAllAsync();
    Task<BranchDto?> GetByIdAsync(long id);
    Task<BranchDto> CreateAsync(CreateBranchDto request);
    Task<BranchDto?> UpdateAsync(long id, UpdateBranchDto request);
}
