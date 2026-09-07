using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Catalog.Dtos;

public record CreateProductCategoryDto(
    [Required, MaxLength(100)] string Name,
    string? Description
);
