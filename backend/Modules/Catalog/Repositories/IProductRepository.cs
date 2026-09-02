using Inventory.Modules.Catalog.Entities;
using Inventory.Shared.Dtos;

namespace Inventory.Modules.Catalog.Repositories;

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> GetAllAsync();

    // Paginado y filtrable, para la pantalla de gestión del catálogo — ver
    // comentario en ProductRepository.GetPagedAsync sobre por qué GetAllAsync
    // (arriba) sigue existiendo aparte.
    Task<PagedResult<Product>> GetPagedAsync(
        string? search, long? categoryId, long? baseUnitId, bool? active,
        decimal? minPrice, decimal? maxPrice, int page, int pageSize);

    Task<Product?> GetByIdAsync(long id);
    Task<Product?> GetBySkuAsync(string sku);
    Task AddAsync(Product product);
    Task UpdateAsync(Product product);

    // RF-10: agrega una unidad alternativa a un producto. Add+SaveChanges juntos
    // (patrón de BranchRepository.AddAsync) porque es una sola entidad — a
    // diferencia de InventoryRepository, que separa Add de SaveChanges para poder
    // guardar item+movimiento juntos en una misma transacción.
    Task AddProductUnitAsync(ProductUnit productUnit);
}

