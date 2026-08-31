namespace Inventory.Modules.Purchases.Dtos;

public record SupplierDto(
    long Id,
    string Name,
    string? TaxId,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address);
