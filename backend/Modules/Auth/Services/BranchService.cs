using Inventory.Modules.Auth.Dtos;
using Inventory.Modules.Auth.Entities;
using Inventory.Modules.Auth.Repositories;
using Inventory.Shared.Exceptions;

namespace Inventory.Modules.Auth.Services;

public class BranchService : IBranchService
{
    private readonly IBranchRepository _branches;

    public BranchService(IBranchRepository branches)
    {
        _branches = branches;
    }

    public async Task<IReadOnlyList<BranchDto>> GetAllAsync()
    {
        var branches = await _branches.GetAllAsync();
        return branches.Select(ToDto).ToList();
    }

    public async Task<BranchDto?> GetByIdAsync(long id)
    {
        var branch = await _branches.GetByIdAsync(id);
        return branch is null ? null : ToDto(branch);
    }

    public async Task<BranchDto> CreateAsync(CreateBranchDto request)
    {
        if (await _branches.GetByCodeAsync(request.Code) is not null)
        {
            throw new ConflictException($"Ya existe una sucursal con el código '{request.Code}'.");
        }

        var branch = new Branch
        {
            Code = request.Code,
            Name = request.Name,
            Address = request.Address,
            City = request.City,
            Phone = request.Phone,
            Active = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await _branches.AddAsync(branch);
        return ToDto(branch);
    }

    public async Task<BranchDto?> UpdateAsync(long id, UpdateBranchDto request)
    {
        var branch = await _branches.GetByIdAsync(id);
        if (branch is null)
        {
            return null;
        }

        branch.Name = request.Name;
        branch.Address = request.Address;
        branch.City = request.City;
        branch.Phone = request.Phone;
        branch.Active = request.Active;

        await _branches.UpdateAsync(branch);
        return ToDto(branch);
    }

    private static BranchDto ToDto(Branch branch) =>
        new(branch.Id, branch.Code, branch.Name, branch.Address, branch.City, branch.Phone, branch.Active, branch.CreatedAt);
}
