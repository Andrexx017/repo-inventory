using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Entities;
using Inventory.Modules.Catalog.Repositories;

namespace Inventory.Modules.Catalog.Services;

public class UnitOfMeasureService : IUnitOfMeasureService
{
    private readonly IUnitOfMeasureRepository _units;

    public UnitOfMeasureService(IUnitOfMeasureRepository units)
    {
        _units = units;
    }

    public async Task<IReadOnlyList<UnitOfMeasureDto>> GetAllAsync()
    {
        var units = await _units.GetAllAsync();
        return units.Select(ToDto).ToList();
    }

    private static UnitOfMeasureDto ToDto(UnitOfMeasure unit) => new(unit.Id, unit.Name, unit.Abbreviation);
}
