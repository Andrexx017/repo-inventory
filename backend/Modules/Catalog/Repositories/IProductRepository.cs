using Inventory.Modules.Catalog.Entities;

namespace Inventory.Modules.Catalog.Repositories;

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> GetAllAsync();
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

