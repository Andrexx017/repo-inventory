using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Catalog.Dtos;

public record CreateUnitOfMeasureDto(
    [Required, MaxLength(50)] string Name,
    [Required, MaxLength(10)] string Abbreviation
);
