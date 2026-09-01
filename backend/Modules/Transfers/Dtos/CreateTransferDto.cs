using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Transfers.Dtos;

// DestinationBranchId sale de la ruta (POST /api/transfers/{destinationBranchId}),
// no del body — mismo criterio que CreateInventoryMovementDto/CreatePurchaseOrderDto.
public record CreateTransferDto(
    [Required] long OriginBranchId,
    string? Urgency,
    [Required][MinLength(1)] List<CreateTransferItemDto> Items
);
