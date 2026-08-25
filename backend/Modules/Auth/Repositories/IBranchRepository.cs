using Inventory.Modules.Auth.Entities;

namespace Inventory.Modules.Auth.Repositories;

public interface IBranchRepository
{
    Task<IReadOnlyList<Branch>> GetAllAsync();
    Task<Branch?> GetByIdAsync(long id);
    Task<Branch?> GetByCodeAsync(string code);
    Task AddAsync(Branch branch);
    Task UpdateAsync(Branch branch);
}
