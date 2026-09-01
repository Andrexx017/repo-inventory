using Inventory.Modules.Transfers.Dtos;

namespace Inventory.Modules.Dashboard.Dtos;

// RF-31: estado de las transferencias activas y su impacto en el inventario.
// "Impacto" se acota a lo que va a ENTRAR a esta sucursal como destino y todavía
// no está en su stock actual — no cubre el lado de reservas de salida (ver
// SUSTENTACION.md, decisión de alcance).
public record ActiveTransfersDto(
    long BranchId,
    string BranchName,
    IReadOnlyList<TransferDto> ActiveTransfers,
    IReadOnlyList<TransferInventoryImpactDto> InventoryImpact
);
