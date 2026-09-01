using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Catalog.Dtos;

public record CreateProductDto(
    [Required, MaxLength(50)] string Sku,
    [Required, MaxLength(200)] string Name,
    string? Description,
    long? CategoryId,
    [Required] long BaseUnitId,
    [Range(0, double.MaxValue)] decimal? ReferencePrice
);
