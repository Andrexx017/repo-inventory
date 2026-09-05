using Inventory.Modules.Auth.Entities;
using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Catalog.Entities;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Modules.Purchases.Dtos;
using Inventory.Modules.Purchases.Entities;
using Inventory.Modules.Purchases.Repositories;
using Inventory.Modules.Purchases.Services;
using Moq;

namespace Inventory.Tests.Modules.Purchases;

public class PurchaseOrderServiceTests
{
    // RN-CRIT-02: el subtotal/descuento/total de la cabecera deben reflejar
    // exactamente la suma de las líneas — Postgres no puede garantizarlo porque
    // no soporta columnas GENERATED que agreguen datos de otra tabla.
    [Fact]
    public async Task CreateAsync_TotalesCoincidenConSumaDeLineas()
    {
        // Arrange
        var branch = new Branch { Id = 1, Name = "Sucursal Principal" };
        var supplier = new Supplier { Id = 1, Name = "Proveedor Test" };
        var productA = new Product { Id = 10, Sku = "SKU-A", Name = "Producto A" };
        var productB = new Product { Id = 20, Sku = "SKU-B", Name = "Producto B" };

        var branchesMock = new Mock<IBranchRepository>();
        branchesMock.Setup(b => b.GetByIdAsync(branch.Id)).ReturnsAsync(branch);

        var suppliersMock = new Mock<ISupplierRepository>();
        suppliersMock.Setup(s => s.GetByIdAsync(supplier.Id)).ReturnsAsync(supplier);

        var productsMock = new Mock<IProductRepository>();
        productsMock.Setup(p => p.GetByIdAsync(productA.Id)).ReturnsAsync(productA);
        productsMock.Setup(p => p.GetByIdAsync(productB.Id)).ReturnsAsync(productB);

        var purchaseOrdersMock = new Mock<IPurchaseOrderRepository>();
        purchaseOrdersMock.Setup(o => o.CountAsync()).ReturnsAsync(0);

        var service = new PurchaseOrderService(
            purchaseOrdersMock.Object,
            suppliersMock.Object,
            branchesMock.Object,
            productsMock.Object);

        // Línea 1: 10 x $50.00, sin descuento -> gross = net = 500.00
        // Línea 2: 3 x $20.00, 10% descuento -> gross = 60.00, net = 54.00
        var request = new CreatePurchaseOrderDto(
            SupplierId: supplier.Id,
            PaymentTermDays: 30,
            Items: new List<CreatePurchaseOrderItemDto>
            {
                new CreatePurchaseOrderItemDto(ProductId: productA.Id, Quantity: 10, UnitPrice: 50m, DiscountPct: 0),
                new CreatePurchaseOrderItemDto(ProductId: productB.Id, Quantity: 3, UnitPrice: 20m, DiscountPct: 10),
            });

        // Act
        var result = await service.CreateAsync(branch.Id, request, createdByUserId: 999);

        // Assert
        Assert.Equal(560.00m, result.Subtotal);       // 500.00 + 60.00
        Assert.Equal(6.00m, result.TotalDiscount);     // 0 + (60.00 - 54.00)
        Assert.Equal(554.00m, result.Total);           // 500.00 + 54.00
    }
}
