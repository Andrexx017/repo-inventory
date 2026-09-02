namespace Inventory.Shared.Dtos;

// Resultado paginado genérico para listados que pueden crecer sin límite
// (historiales/auditoría). TotalCount es el total de la consulta sin paginar,
// para que el cliente pueda calcular cuántas páginas hay.
public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);
