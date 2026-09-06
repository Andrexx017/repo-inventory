using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Sales.Dtos;

// Sin Active a propósito: nace siempre activa, igual que CreateBranchDto no
// acepta ese campo (nace activo por default del lado del servidor).
public record CreatePriceListDto(
    [Required][MaxLength(100)] string Name,
    string? Description,
    DateOnly? StartDate,
    DateOnly? EndDate
);
