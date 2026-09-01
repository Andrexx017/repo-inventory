using System.ComponentModel.DataAnnotations;

namespace Inventory.Modules.Transfers.Dtos;

// Treatment es obligatorio solo si hay faltante (ver TransferService.ReceiveAsync);
// por eso no lleva [Required] acá — la regla depende del resultado de las líneas,
// no se puede expresar como validación de forma del DTO.
public record ReceiveTransferDto(
    [Required][MinLength(1)] List<ReceiveTransferItemDto> Items,
    string? Treatment,
    string? Notes
);
