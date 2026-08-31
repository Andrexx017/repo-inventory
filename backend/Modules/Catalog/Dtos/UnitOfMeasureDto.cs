namespace Inventory.Modules.Catalog.Dtos;

// Reference data simple, mismo criterio que RoleDto: solo lectura, sin CRUD propio
// (los 3 registros vienen del seed) — el frontend la usa para poblar el <select>
// de unidad al asociar una unidad alternativa a un producto (RF-10).
public record UnitOfMeasureDto(long Id, string Name, string Abbreviation);
