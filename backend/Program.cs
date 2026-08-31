using System.Text;
using Inventory.Infrastructure.Auth;
using Inventory.Infrastructure.Persistence;
using Inventory.Modules.Auth.Repositories;
using Inventory.Modules.Auth.Services;
using Inventory.Modules.Catalog.Repositories;
using Inventory.Modules.Catalog.Services;
using Inventory.Modules.Inventory.Repositories;
using Inventory.Modules.Inventory.Services;
using Inventory.Modules.Purchases.Repositories;
using Inventory.Modules.Purchases.Services;
using Inventory.Shared.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Frontend Vite (localhost:5173) consume la API vía fetch — sin CORS el navegador
// bloquea el request aunque la respuesta sea correcta.
const string FrontendCorsPolicy = "Frontend";

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
//conexion con la base de datos
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
        .UseSnakeCaseNamingConvention());

builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<ITokenGenerator, JwtTokenGenerator>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IBranchRepository, BranchRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IBranchService, BranchService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IUnitOfMeasureRepository, UnitOfMeasureRepository>();
builder.Services.AddScoped<IUnitOfMeasureService, UnitOfMeasureService>();
builder.Services.AddScoped<IInventoryRepository, InventoryRepository>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<ISupplierRepository, SupplierRepository>();
builder.Services.AddScoped<ISupplierService, SupplierService>();
builder.Services.AddScoped<IPurchaseOrderRepository, PurchaseOrderRepository>();
builder.Services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
builder.Services.AddScoped<IPurchaseReceiptRepository, PurchaseReceiptRepository>();
builder.Services.AddScoped<IPurchaseReceiptService, PurchaseReceiptService>();

builder.Services.AddSingleton<IAuthorizationHandler, BranchAccessHandler>();

// JWT Bearer: Issuer/Audience/ExpireMinutes en appsettings (no sensibles);
// Jwt:Key vive fuera del repo (appsettings.Development.json / Jwt__Key en
// docker-compose vía .env) — ver backend/docs/decisions.md (Autenticación).
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"]
    ?? throw new InvalidOperationException("Falta configurar Jwt:Key (ver appsettings.Development.json.example).");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero,
        };
    });

// "SameBranch": autorización por recurso para que un Gerente/Operador solo
// opere su propia sucursal (RF-04) — ver Infrastructure/Auth/BranchAccessHandler.cs.
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("SameBranch", policy => policy.Requirements.Add(new BranchAccessRequirement()));

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

// Documentación interactiva (Scalar sobre el OpenAPI nativo) — disponible siempre,
// no solo en Development, para poder demostrar la API corriendo vía Docker.
app.MapOpenApi();
app.MapScalarApiReference();

app.UseHttpsRedirection();

app.UseCors(FrontendCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
