using Inventory.Modules.Auth.Entities;
using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Catalog.Entities;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Modules.Inventory.Entities;
using Inventory.Modules.Inventory.Repositories;
using Inventory.Modules.Inventory.Services;
using Inventory.Modules.Sales.Dtos;
using Inventory.Modules.Sales.Repositories;
using Inventory.Modules.Sales.Services;
using Inventory.Shared.Exceptions;
using Microsoft.EntityFrameworkCore.Storage;
using Moq;

namespace Inventory.Tests.Modules.Sales;

public class SaleServiceTests
{
    // RN-CRIT-03 / RF-17: no se puede confirmar una venta si no hay stock
    // suficiente del producto en la sucursal — debe rechazarse ANTES de
    // registrar la venta, no depender del CHECK current_quantity >= 0 de la BD.
    [Fact]
    public async Task CreateAsync_StockInsuficiente_LanzaDomainException()
    {
        // Arrange
        var branch = new Branch { Id = 1, Name = "Sucursal Principal" };
        var product = new Product { Id = 10, Sku = "SKU-1", Name = "Producto Test", ReferencePrice = 100m };

        var stock = new InventoryItem
        {
            BranchId = branch.Id,
            ProductId = product.Id,
            CurrentQuantity = 2, // solo hay 2 unidades disponibles
        };

        var branchesMock = new Mock<IBranchRepository>();
        branchesMock.Setup(b => b.GetByIdAsync(branch.Id)).ReturnsAsync(branch);

        var productsMock = new Mock<IProductRepository>();
        productsMock.Setup(p => p.GetByIdAsync(product.Id)).ReturnsAsync(product);

        var inventoryMock = new Mock<IInventoryRepository>();
        inventoryMock.Setup(i => i.GetItemAsync(branch.Id, product.Id)).ReturnsAsync(stock);

        var service = new SaleService(
            Mock.Of<ISaleRepository>(),
            Mock.Of<IPriceListRepository>(),
            branchesMock.Object,
            productsMock.Object,
            Mock.Of<IUserRepository>(),
            inventoryMock.Object,
            Mock.Of<IInventoryService>());

        var request = new CreateSaleDto(
            PriceListId: null, // sin lista de precios: usa el precio de referencia del catálogo
            CustomerName: "Cliente Test",
            Items: new List<CreateSaleItemDto>
            {
                new CreateSaleItemDto(ProductId: product.Id, Quantity: 5, DiscountPct: 0), // > 2 disponibles
            });

        // Act + Assert
        await Assert.ThrowsAsync<DomainException>(
            () => service.CreateAsync(branch.Id, request, sellerId: 999));
    }

    // RN-CRIT-04: el movimiento de inventario y la actualización de
    // current_quantity deben quedar registrados juntos, dentro de la misma
    // transacción — acá se verifica que ambos efectos ocurren en un camino
    // feliz (para la atomicidad real ante un fallo a mitad de camino, ver la
    // prueba de integración pendiente).
    [Fact]
    public async Task CreateAsync_VentaConfirmada_DescuentaStockYRegistraMovimientoJuntos()
    {
        // Arrange
        var branch = new Branch { Id = 1, Name = "Sucursal Principal" };
        var product = new Product { Id = 10, Sku = "SKU-1", Name = "Producto Test", ReferencePrice = 100m };

        var stock = new InventoryItem
        {
            BranchId = branch.Id,
            ProductId = product.Id,
            Product = product,
            CurrentQuantity = 10,
        };

        var branchesMock = new Mock<IBranchRepository>();
        branchesMock.Setup(b => b.GetByIdAsync(branch.Id)).ReturnsAsync(branch);

        var productsMock = new Mock<IProductRepository>();
        productsMock.Setup(p => p.GetByIdAsync(product.Id)).ReturnsAsync(product);

        var inventoryMock = new Mock<IInventoryRepository>();
        inventoryMock.Setup(i => i.GetItemAsync(branch.Id, product.Id)).ReturnsAsync(stock);

        var salesMock = new Mock<ISaleRepository>();
        salesMock.Setup(s => s.CountAsync()).ReturnsAsync(0);
        salesMock.Setup(s => s.BeginTransactionAsync()).ReturnsAsync(Mock.Of<IDbContextTransaction>());

        var service = new SaleService(
            salesMock.Object,
            Mock.Of<IPriceListRepository>(),
            branchesMock.Object,
            productsMock.Object,
            Mock.Of<IUserRepository>(),
            inventoryMock.Object,
            Mock.Of<IInventoryService>());

        // 3 unidades a $100.00 con 10% de descuento -> gross = 300.00, net = 270.00
        var request = new CreateSaleDto(
            PriceListId: null,
            CustomerName: "Cliente Test",
            Items: new List<CreateSaleItemDto>
            {
                new CreateSaleItemDto(ProductId: product.Id, Quantity: 3, DiscountPct: 10),
            });

        // Act
        var result = await service.CreateAsync(branch.Id, request, sellerId: 999);

        // Assert: el total refleja la línea (RN-CRIT-02) y el stock quedó
        // descontado en el mismo objeto que recibió el movimiento (RN-CRIT-04).
        Assert.Equal(270.00m, result.Total);
        Assert.Equal(7m, stock.CurrentQuantity); // 10 - 3

        inventoryMock.Verify(i => i.AddMovement(It.Is<InventoryMovement>(
            m => m.MovementType == "sale_out" && m.Quantity == 3 && m.ProductId == product.Id)), Times.Once);
        inventoryMock.Verify(i => i.SaveChangesAsync(), Times.Once);
        salesMock.Verify(s => s.SaveChangesAsync(), Times.Once);
    }
}
