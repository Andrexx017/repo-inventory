using Inventory.Modules.Catalog.Dtos;
using Inventory.Modules.Catalog.Entities;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Shared.Exceptions;

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

    public async Task<UnitOfMeasureDto> CreateAsync(CreateUnitOfMeasureDto request)
    {
        if (await _units.GetByNameAsync(request.Name) is not null)
        {
            throw new ConflictException($"Ya existe una unidad de medida con el nombre '{request.Name}'.");
        }

        if (await _units.GetByAbbreviationAsync(request.Abbreviation) is not null)
        {
            throw new ConflictException($"Ya existe una unidad de medida con la abreviatura '{request.Abbreviation}'.");
        }

        var unit = new UnitOfMeasure
        {
            Name = request.Name,
            Abbreviation = request.Abbreviation,
        };

        await _units.AddAsync(unit);
        return ToDto(unit);
    }

    private static UnitOfMeasureDto ToDto(UnitOfMeasure unit) => new(unit.Id, unit.Name, unit.Abbreviation);
}
