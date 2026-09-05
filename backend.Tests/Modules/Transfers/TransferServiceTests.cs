using Inventory.Modules.Auth.Entities;
using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Catalog.Entities;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Modules.Inventory.Entities;
using Inventory.Modules.Inventory.Repositories;
using Inventory.Modules.Inventory.Services;
using Inventory.Modules.Transfers.Dtos;
using Inventory.Modules.Transfers.Entities;
using Inventory.Modules.Transfers.Repositories;
using Inventory.Modules.Transfers.Services;
using Inventory.Shared.Exceptions;
using Moq;

namespace Inventory.Tests.Modules.Transfers;

public class TransferServiceTests
{
    [Fact]
    public async Task ReceiveAsync_ReceivedMayorQueShipped_LanzaDomainException()
    {
        // Arrange
        var destinationBranch = new Branch { Id = 2, Name = "Sucursal Destino" };
        var originBranch = new Branch { Id = 1, Name = "Sucursal Origen" };
        var product = new Product { Id = 10, Sku = "SKU-1", Name = "Producto Test" };

        var transfer = new Transfer
        {
            Id = 100,
            TransferNumber = "TR-000100",
            OriginBranchId = originBranch.Id,
            OriginBranch = originBranch,
            DestinationBranchId = destinationBranch.Id,
            DestinationBranch = destinationBranch,
            Status = "in_transit",
            Urgency = "medium",
            Items = new List<TransferItem>
            {
                new TransferItem
                {
                    Id = 1,
                    ProductId = product.Id,
                    Product = product,
                    RequestedQuantity = 10,
                    ShippedQuantity = 5,
                    ReceivedQuantity = 0,
                },
            },
        };

        var transfersMock = new Mock<ITransferRepository>();
        transfersMock.Setup(t => t.GetByIdAsync(transfer.Id)).ReturnsAsync(transfer);

        var service = new TransferService(
            transfersMock.Object,
            Mock.Of<IBranchRepository>(),
            Mock.Of<IProductRepository>(),
            Mock.Of<IInventoryRepository>(),
            Mock.Of<IInventoryService>());

        var request = new ReceiveTransferDto(
            Items: new List<ReceiveTransferItemDto>
            {
                new ReceiveTransferItemDto(TransferItemId: 1, ReceivedQuantity: 8), // > 5 despachado
            },
            Treatment: null,
            Notes: null);

        // Act + Assert
        await Assert.ThrowsAsync<DomainException>(
            () => service.ReceiveAsync(destinationBranch.Id, transfer.Id, request, actingUserId: 999));
    }

    // RN-CRIT-03 aplicado a transferencias: PrepareAsync (RF-21) debe revisar el
    // stock real de la sucursal de origen antes de confirmar cuánto se va a
    // despachar — no basta con que la cantidad no supere lo solicitado.
    [Fact]
    public async Task PrepareAsync_ShippedMayorQueStockDisponible_LanzaDomainException()
    {
        // Arrange
        var destinationBranch = new Branch { Id = 2, Name = "Sucursal Destino" };
        var originBranch = new Branch { Id = 1, Name = "Sucursal Origen" };
        var product = new Product { Id = 10, Sku = "SKU-1", Name = "Producto Test" };

        var transfer = new Transfer
        {
            Id = 200,
            TransferNumber = "TR-000200",
            OriginBranchId = originBranch.Id,
            OriginBranch = originBranch,
            DestinationBranchId = destinationBranch.Id,
            DestinationBranch = destinationBranch,
            Status = "requested",
            Urgency = "medium",
            ApprovedBy = 1,
            ApprovedAt = DateTimeOffset.UtcNow, // ya aprobada por el destino: requisito previo de PrepareAsync
            Items = new List<TransferItem>
            {
                new TransferItem
                {
                    Id = 1,
                    ProductId = product.Id,
                    Product = product,
                    RequestedQuantity = 10,
                    ShippedQuantity = 0,
                    ReceivedQuantity = 0,
                },
            },
        };

        var stockEnOrigen = new InventoryItem
        {
            BranchId = originBranch.Id,
            ProductId = product.Id,
            CurrentQuantity = 3, // solo hay 3 unidades disponibles en origen
        };

        var transfersMock = new Mock<ITransferRepository>();
        transfersMock.Setup(t => t.GetByIdAsync(transfer.Id)).ReturnsAsync(transfer);

        var inventoryMock = new Mock<IInventoryRepository>();
        inventoryMock.Setup(i => i.GetItemAsync(originBranch.Id, product.Id)).ReturnsAsync(stockEnOrigen);

        var service = new TransferService(
            transfersMock.Object,
            Mock.Of<IBranchRepository>(),
            Mock.Of<IProductRepository>(),
            inventoryMock.Object,
            Mock.Of<IInventoryService>());

        var request = new PrepareTransferDto(
            Notes: null,
            Items: new List<PrepareTransferItemDto>
            {
                new PrepareTransferItemDto(TransferItemId: 1, ShippedQuantity: 5), // > 3 disponibles
            });

        // Act + Assert
        await Assert.ThrowsAsync<DomainException>(
            () => service.PrepareAsync(originBranch.Id, transfer.Id, request, actingUserId: 999));
    }
}
