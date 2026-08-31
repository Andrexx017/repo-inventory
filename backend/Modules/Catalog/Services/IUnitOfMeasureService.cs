using Inventory.Modules.Catalog.Dtos;

namespace Inventory.Modules.Catalog.Services;

public interface IUnitOfMeasureService
{
    Task<IReadOnlyList<UnitOfMeasureDto>> GetAllAsync();
}
