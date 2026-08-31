using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Catalog.Dtos;

// RF-10: asociar a un producto una unidad de medida alternativa a su unidad base,
// con el factor por el que hay que multiplicar para convertir a la unidad base
// (ej. 1 "caja" = 12 "unidad" → ConversionFactor = 12).
public record CreateProductUnitDto(
    [Required] long UnitId,
    [Required] [Range(0.000001, double.MaxValue)] decimal ConversionFactor,
    bool IsPurchaseUnit,
    bool IsSaleUnit
);
