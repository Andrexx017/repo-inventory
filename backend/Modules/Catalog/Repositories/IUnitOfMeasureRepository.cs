using Inventory.Modules.Catalog.Entities;

namespace Inventory.Modules.Catalog.Repositories;

public interface IUnitOfMeasureRepository
{
    Task<IReadOnlyList<UnitOfMeasure>> GetAllAsync();
    Task<UnitOfMeasure?> GetByIdAsync(long id);
}
