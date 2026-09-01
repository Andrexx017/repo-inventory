using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Catalog.Dtos;

// Sku no es editable (identifica al producto, mismo criterio que Code en Branch).
// Active viaja acá para poder desactivar/reactivar el producto en la misma
// operación de edición, igual que UpdateBranchDto — no hay endpoint DELETE
// aparte en ningún módulo de este repo.
public record UpdateProductDto(
    [Required, MaxLength(200)] string Name,
    string? Description,
    long? CategoryId,
    [Required] long BaseUnitId,
    [Range(0, double.MaxValue)] decimal? ReferencePrice,
    bool Active
);
