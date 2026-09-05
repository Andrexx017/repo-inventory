using Inventory.Infrastructure.Auth;
using Inventory.Modules.Auth;
using Inventory.Modules.Auth.Dtos;
using Inventory.Modules.Auth.Entities;
using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Auth.Services;
using Inventory.Shared.Exceptions;
using Moq;

namespace Inventory.Tests.Modules.Auth;

public class UserServiceTests
{
    // RN-CRIT-01: solo el Administrador general puede quedar sin sucursal
    // asignada. La BD no puede validarlo sola porque requiere leer roles.Code,
    // una tabla distinta a la de users.
    [Fact]
    public async Task CreateAsync_RolNoAdminSinSucursal_LanzaDomainException()
    {
        // Arrange
        var role = new Role { Id = 2, Code = RoleCodes.BranchManager, Name = "Gerente de sucursal" };

        var usersMock = new Mock<IUserRepository>();
        usersMock.Setup(u => u.GetByEmailAsync(It.IsAny<string>())).ReturnsAsync((User?)null);

        var rolesMock = new Mock<IRoleRepository>();
        rolesMock.Setup(r => r.GetByIdAsync(role.Id)).ReturnsAsync(role);

        var service = new UserService(
            usersMock.Object,
            rolesMock.Object,
            Mock.Of<IBranchRepository>(),
            Mock.Of<IPasswordHasher>());

        var request = new CreateUserDto(
            Name: "Gerente Test",
            Email: "gerente@test.com",
            Password: "password123",
            RoleId: role.Id,
            BranchId: null); // rol no-admin sin sucursal: debe rechazarse

        // Act + Assert
        await Assert.ThrowsAsync<DomainException>(() => service.CreateAsync(request));
    }

    // Caso simétrico: el Administrador general SÍ debe rechazarse si se le
    // intenta asignar una sucursal.
    [Fact]
    public async Task CreateAsync_AdminGeneralConSucursal_LanzaDomainException()
    {
        // Arrange
        var role = new Role { Id = 1, Code = RoleCodes.GeneralAdmin, Name = "Administrador general" };
        var branch = new Branch { Id = 1, Name = "Sucursal Principal" };

        var usersMock = new Mock<IUserRepository>();
        usersMock.Setup(u => u.GetByEmailAsync(It.IsAny<string>())).ReturnsAsync((User?)null);

        var rolesMock = new Mock<IRoleRepository>();
        rolesMock.Setup(r => r.GetByIdAsync(role.Id)).ReturnsAsync(role);

        var service = new UserService(
            usersMock.Object,
            rolesMock.Object,
            Mock.Of<IBranchRepository>(),
            Mock.Of<IPasswordHasher>());

        var request = new CreateUserDto(
            Name: "Admin Test",
            Email: "admin@test.com",
            Password: "password123",
            RoleId: role.Id,
            BranchId: branch.Id); // admin general con sucursal: debe rechazarse

        // Act + Assert
        await Assert.ThrowsAsync<DomainException>(() => service.CreateAsync(request));
    }
}
