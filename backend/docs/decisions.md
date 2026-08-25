# Decisiones Técnicas — Backend

## Lenguaje y framework: .NET 10 / ASP.NET Core Web API

**Contexto:** el backend debe centralizar toda la lógica de negocio (validaciones, reglas de transferencia entre sucursales, cálculo de costo promedio ponderado, generación de reportes) y exponerla exclusivamente vía una API bien definida, sin lógica de negocio en el cliente.

**Decisión:** .NET 10 con ASP.NET Core Web API (`Microsoft.NET.Sdk.Web`), `Nullable` e `ImplicitUsings` habilitados.

**Justificación:**
- Tipado estático fuerte (C# + `Nullable enable`) reduce errores silenciosos en un dominio con reglas de negocio sensibles: costeo, stock, trazabilidad de movimientos.
- Soporte nativo de OpenAPI (`Microsoft.AspNetCore.OpenApi`) permite generar documentación de la API automáticamente, alineado con el requisito de comunicación por API bien definida y documentada.
- Rendimiento y consumo de memoria competitivos frente a alternativas empresariales equivalentes (Java/Spring, Node/NestJS), relevante para un sistema que debe sincronizar inventario entre sucursales en near-real-time.
- Ecosistema maduro para lo que exige el dominio: EF Core (transacciones, migraciones), autenticación/autorización integrada (Identity, JWT bearer), y buen soporte para los patrones de diseño que el proyecto pide poder justificar (Repository, CQRS).
- Imágenes oficiales ligeras (`mcr.microsoft.com/dotnet/aspnet`), coherente con el requisito de que todo el proyecto corra vía Docker Compose con un solo comando.

**Alternativas consideradas:**
- Node.js/NestJS — descartado por preferir un runtime con mejor rendimiento en operaciones de cálculo (costeo, agregaciones para dashboard) y tipado estático "de fábrica" sin depender de disciplina adicional de TypeScript.
- Java/Spring Boot — descartado por mayor verbosidad y arranque más lento, sin aportar ventajas relevantes para el alcance del proyecto.

**Consecuencias:** requiere imagen base .NET SDK (build) + runtime (ejecución) en el Dockerfile del backend; el equipo trabaja con convenciones de ASP.NET Core (controllers o minimal APIs, inyección de dependencias nativa).

---

## Autenticación y autorización: JWT Bearer + roles/sucursal como claims

**Contexto:** el sistema exige 3 roles con permisos distintos (Administrador general, Gerente de sucursal, Operador de inventario — sección 6.2) y trazabilidad completa de cada movimiento con su responsable (sección 3.1). El esquema de base de datos ya modela esto en `users` (`role_id` FK a `roles`, `branch_id` FK a `branches`, `password_hash`), por lo que la estrategia de auth debe apoyarse en esas columnas sin rediseñar el modelo de datos.

**Decisión:** autenticación basada en **JWT (JSON Web Token)** vía `Microsoft.AspNetCore.Authentication.JwtBearer`, sin usar ASP.NET Core Identity completo (se mantienen las tablas propias `users`/`roles`/`branches` ya existentes). El flujo es:
- `POST /api/auth/login` valida `email` + password contra `password_hash` (hasheado con el `PasswordHasher<T>` nativo de ASP.NET Core — ver nota de implementación abajo) y, si es válido, emite un JWT firmado con: `sub` (id de usuario), `role` (código de `roles.code`) y un claim custom `branch_id`.
- Cada request protegido llega con `Authorization: Bearer <token>`; el middleware de JWT Bearer valida la firma y expiración sin consultar la base de datos.
- Autorización por rol con `[Authorize(Roles = "general_admin")]` (o combinaciones) en los endpoints.
- Autorización por sucursal (ej. un Gerente solo ve/opera su propia sucursal) mediante una `AuthorizationPolicy`/`IAuthorizationHandler` custom que compara el claim `branch_id` del token contra el recurso solicitado — el `general_admin` queda exento por tener `branch_id` nulo.

**Justificación:**
- El frontend es una SPA de React separada del backend (posiblemente en otro origen/puerto en desarrollo); JWT es el patrón estándar para este caso, frente a cookies de sesión que suponen más fricción de CORS y estado compartido en el servidor.
- Es *stateless*: el backend no necesita guardar sesiones en memoria ni en BD, lo cual encaja con el requisito de que el sistema sincronice inventario entre sucursales sin depender de afinidad de sesión a una instancia concreta.
- Los claims `role` y `branch_id` evitan una consulta extra a la base de datos en cada request solo para saber "quién es y de qué sucursal" — el dato viaja firmado en el propio token.
- ASP.NET Core tiene soporte nativo y bien documentado para JWT Bearer + políticas de autorización, sin necesitar el peso completo de ASP.NET Core Identity (que trae su propio esquema de tablas, redundante con `users`/`roles` ya modelados en `01-schema.sql`).

**Alternativas consideradas:**
- Cookies de sesión con estado en servidor — descartado por requerir estado compartido entre instancias del backend si se escala horizontalmente, y por más fricción de configuración CORS/credentials con un frontend en otro origen.
- ASP.NET Core Identity completo — descartado por duplicar lo que ya existe en el esquema propio (`users`, `roles`) y añadir complejidad (su propio modelo de tablas) sin necesidad real para el alcance de la prueba.

**Consecuencias:**
- Requiere paquete `Microsoft.AspNetCore.Authentication.JwtBearer` para el middleware de JWT.
- La clave de firma (`Jwt:Key`), `Issuer`, `Audience` y tiempo de expiración se configuran vía `appsettings` + variables de entorno (`.env`), nunca hardcodeadas ni versionadas en texto plano.
- Revocar un token antes de que expire no es inmediato (limitación conocida de JWT stateless); se mitiga usando tiempos de expiración cortos (ej. 2 horas) — no se implementa refresh token por estar fuera del alcance mínimo exigido, pero queda anotado como mejora futura.

**Nota de implementación (hashing de contraseñas): `PasswordHasher<T>` en vez de BCrypt.**
Al implementar `Infrastructure/Auth/PasswordHasher.cs` se optó por el `PasswordHasher<T>` que ya trae `Microsoft.AspNetCore.Identity` (PBKDF2 + HMACSHA256, salt aleatorio de 128 bits) en vez de agregar `BCrypt.Net-Next` como se planteaba originalmente arriba. Razones: (1) cero dependencias nuevas — la clase ya viene con el framework compartido de ASP.NET Core, sin paquete NuGet adicional; (2) es el mismo algoritmo que usa internamente la propia ASP.NET Core Identity, un estándar ya vetado por Microsoft, no una elección improvisada; (3) el proyecto ya había descartado usar Identity *completo* por duplicar el esquema de tablas — usar su utilitario de hashing por separado no contradice esa decisión, porque no trae tablas ni `UserManager`, solo la función `HashPassword`/`VerifyHashedPassword`. No se descarta BCrypt por ser peor, sino porque no aporta nada adicional que el proyecto necesite y sí agrega una dependencia externa evitable.

---

## Sincronización entre sucursales (consecuencia de la base de datos central)

**Contexto:** la decisión de arquitectura de sincronización (base de datos central única) queda documentada y justificada en `database/docs/decisions.md`. Aquí solo se registra su consecuencia directa sobre el backend.

**Decisión:** el backend no implementa ningún mecanismo propio de sincronización entre sucursales (sin colas, sin eventos de dominio entre servicios, sin jobs de reconciliación). Las operaciones que afectan a más de una sucursal (ej. confirmar una transferencia) se implementan como una única transacción de EF Core (`DbContext` con transacción explícita cuando la operación toca más de una tabla o más de una sucursal), apoyándose en las garantías ACID de Postgres.

**Consecuencia:** simplifica considerablemente el diseño de los módulos de Inventario y Transferencias — no hay que diseñar reintentos, resolución de conflictos ni consistencia eventual, solo transacciones bien delimitadas y manejo de errores estándar de base de datos.

---

## Patrones de diseño del backend

**Contexto:** RNF-08 (`requirements/documento-requisitos.md`) exige que el backend separe claramente las responsabilidades de negocio de las de acceso a datos, dejando explícitamente "patrón(es) de diseño a definir y justificar" como decisión de Fase 1. Las reglas de negocio críticas ya documentadas en `backend/docs/reglas-negocio-criticas.md` (validación de stock antes de vender, atomicidad de movimiento+inventario, cálculo de totales agregados, atomicidad de recepción de transferencias) marcan qué necesita resolver esa separación en la práctica.

**Decisión:** arquitectura en capas (Controllers → Services → Repositories → `DbContext`/PostgreSQL) con los siguientes patrones:

- **Repository Pattern, uno por agregado** (`IProductRepository`, `IInventoryRepository`, `ITransferRepository`, etc.), no un `Repository<T>` genérico. Cada repositorio expone solo los métodos que su dominio necesita (ej. `GetStockDisponibleAsync(branchId, productId)`), evitando que consultas específicas terminen filtrándose hacia Services o Controllers.
- **Unit of Work vía `DbContext` de EF Core**, sin una clase `UnitOfWork` adicional: `DbContext` ya agrupa los cambios de un mismo `SaveChangesAsync()` en una sola operación atómica. Se usa una transacción explícita (`BeginTransactionAsync`) solo cuando una operación de negocio requiere más de un `SaveChangesAsync` en secuencia (ej. recepción de una orden de compra con múltiples líneas).
- **Service Layer (Application Services)**, uno por módulo funcional (`VentaService`, `TransferenciaService`, `CompraService`, etc.) — aquí se implementan y se hacen cumplir las reglas de `reglas-negocio-criticas.md`; los Controllers quedan delgados (solo reciben el request, delegan al Service, devuelven la respuesta).
- **DTOs** de request/response por endpoint, para no exponer directamente las entidades de EF Core ni acoplar el contrato de la API al esquema de base de datos.
- **Dependency Injection** nativa de ASP.NET Core (`AddScoped<IInterfaz, Implementación>`) para Services y Repositories, habilitando pruebas unitarias con dobles simulados.
- **Strategy Pattern**, acotado al caso que lo justifica: exportación de reportes (RF-35). Una interfaz `IReportExporter` con implementaciones `PdfReportExporter` y `ExcelReportExporter`, seleccionada en tiempo de ejecución según el formato pedido.

**Justificación:** cada patrón resuelve un problema concreto ya identificado en este proyecto (no se adoptan "porque son buena práctica" en abstracto): Repository por agregado + DI habilitan pruebas unitarias de la lógica de negocio sin depender de PostgreSQL; Unit of Work vía `DbContext` cubre RNF-07 (atomicidad) sin reinventar algo que EF Core ya resuelve; Service Layer es el único lugar donde vive cada regla de `reglas-negocio-criticas.md`, evitando que se dupliquen o se salten (RNF-01: ninguna regla de negocio solo en el frontend); DTOs desacoplan el contrato de API del modelo de datos; Strategy resuelve limpiamente los dos formatos de reporte sin condicionales anidados.

**Alternativas consideradas:**
- **CQRS (con o sin MediatR)** — descartado: añade una capa de indirección real (comandos, queries, handlers separados) que no se justifica para una API CRUD-con-reglas de tamaño moderado sobre una única base de datos, dado el plazo de la prueba (RN-01).
- **DDD táctico completo** (Aggregates, Value Objects, Domain Events, entidades ricas) — descartado por la misma razón de tiempo; es el siguiente nivel razonable después de Service Layer, pero excede lo que RNF-08 exige justificar para esta entrega.
- **`Repository<T>` genérico único** — descartado: en la práctica no ahorra código real frente a un repositorio por agregado, y termina escondiendo consultas específicas de un módulo en un lugar que no les corresponde.

**Consecuencias:** cada módulo funcional (Autenticación, Inventario, Compras, Ventas, Transferencias, Dashboard) sigue la misma estructura de carpetas: `Controllers/`, `Services/` (+ interfaz), `Repositories/` (+ interfaz), `Dtos/`. Las pruebas unitarias de Services pueden mockear `IXxxRepository` sin necesitar PostgreSQL levantado; las pruebas de integración de Repositories sí requieren la base de datos (vía el propio Docker Compose o un contenedor de pruebas).

---

## Convención de carpetas del backend — Screaming Architecture

**Contexto:** con los patrones de diseño ya decididos (arriba), faltaba definir cómo se organizan físicamente en carpetas. El scaffold por defecto de ASP.NET Core agrupa por capa técnica (`Controllers/`, `Services/`, `Models/` a nivel raíz), lo que hace que la estructura del proyecto "grite" el framework en vez de gritar el dominio (Screaming Architecture, Robert C. Martin).

**Decisión:** `backend/` se organiza en tres carpetas de primer nivel:

- **`Modules/`** — un subdirectorio por módulo funcional, cada uno con sus propias `Controllers/`, `Services/`, `Repositories/`, `Dtos/` y `Entities/` (las clases de EF Core que mapean sus tablas): `Auth`, `Catalog`, `Inventory`, `Purchases`, `Sales`, `Transfers`, `Dashboard`, `Reports`.
- **`Shared/`** — código transversal sin tabla propia: `Entities/` (clase base de entidad), `Exceptions/` (`DomainException`), `Extensions/`, `Middleware/` (manejo global de errores).
- **`Infrastructure/`** — detalles técnicos, no reglas de negocio: `Persistence/` (`DbContext` y `Configurations/` de EF Core — sin `Migrations/`, ver nota abajo), `Auth/` (generación/validación de JWT, hashing), `Email/` (notificación de `stock_alerts.notified_at`).

**EF Core en modo Database First, sin Migrations propias:** el esquema sigue siendo dueño exclusivo de `database/init/*.sql` (decisión ya tomada en `database/docs/decisions.md`, sección "Motor: PostgreSQL 18"). EF Core solo mapea las tablas ya creadas — las clases en `Entities/` de cada módulo y las `IEntityTypeConfiguration<T>` en `Infrastructure/Persistence/Configurations/` se escriben a mano para que coincidan con el schema existente. No se corre `dotnet ef migrations add`: tener dos mecanismos generando el esquema (scripts SQL + EF Core Migrations) crearía dos fuentes de verdad que pueden desincronizarse entre sí.

Dos módulos no tienen `Repositories/` ni `Entities/` propias porque no tienen tablas propias — solo consultan datos de otros módulos inyectando sus repositorios:
- **`Dashboard`** — KPIs de solo lectura cross-módulo (sección 3.6).
- **`Reports`** — funcionalidad adicional de reportes exportables (RF-35); acá vive el `Services/Exporters/` con `IReportExporter`/`PdfReportExporter`/`ExcelReportExporter` (Strategy Pattern, ya decidido arriba).

**`Transfers` absorbe Logística** (en vez de un módulo `Logistics` separado): el esquema no tiene tablas propias para logística — `route_priority`, `carrier`, `shipping_cost`, fechas estimadas/reales de envío y llegada viven todas en `transfers` (`database/init/01-schema.sql`). Separarlas en dos módulos duplicaría acceso a las mismas tablas sin un límite de responsabilidad real entre ambos.

**Justificación:** agrupar por módulo de negocio (vertical) en vez de por capa técnica (horizontal) hace que el propio árbol de carpetas comunique qué hace el sistema, facilita ubicar todo el código de un módulo en un solo lugar al implementarlo (Fase 4 avanza módulo por módulo), y limita el radio de impacto de un cambio a la carpeta de ese módulo. No contradice los patrones ya decididos — es la forma de organizarlos físicamente, no un patrón adicional.

**Alternativas consideradas:**
- Mantener `Controllers/`, `Services/`, `Repositories/` como carpetas de primer nivel (organización por capa) — descartado: con 8 módulos, cada carpeta técnica terminaría con archivos de todos los módulos mezclados, dificultando ubicar el código de uno solo.
- Módulo `Logistics` separado de `Transfers` — descartado por la razón de arriba (no hay tablas propias que lo justifiquen).

**Consecuencias:** al implementar cada módulo en la Fase 4, el trabajo queda contenido en `Modules/<Módulo>/` casi en su totalidad; solo el `DbContext` (`Infrastructure/Persistence/`) necesita conocer las entidades de todos los módulos para registrarlas.

---

## Cadena de conexión local: `appsettings.Development.json` en vez de User Secrets

**Contexto:** ASP.NET Core recomienda por defecto guardar secretos de desarrollo con **.NET User Secrets** (`dotnet user-secrets`), que los escribe fuera del repo, en un archivo del perfil de Windows (`%APPDATA%\Microsoft\UserSecrets\<guid>\secrets.json`). Es la opción más segura por defecto, pero tiene dos costos para este proyecto puntual: (1) es invisible dentro de la carpeta del proyecto — para mostrarla en la sustentación hay que correr un comando aparte (`dotnet user-secrets list`) en vez de simplemente abrir un archivo; (2) es específica de la máquina — si alguien clona el repo (evaluador incluido) y corre el backend en local sin Docker, no hereda los secretos y la conexión falla sin más contexto que ese.

**Decisión:** el connection string local vive en `backend/appsettings.Development.json`, **dentro del proyecto**, pero ese archivo específico se excluye de git (`.gitignore`) y se commitea en su lugar `backend/appsettings.Development.json.example` como plantilla sin contraseña real — el mismo patrón que ya usa el proyecto con `.env`/`.env.example` a nivel raíz.

**Justificación:**
- Queda físicamente en la carpeta del proyecto, visible y fácil de abrir para explicar en la sustentación — a diferencia de User Secrets, que exige un comando de terminal para inspeccionarse.
- La contraseña real nunca llega al repositorio: mismo nivel de seguridad que ya se aplicó en `docker-compose.yml` (variables de `.env`, no texto plano versionado).
- Quien clona el repo encuentra el `.example`, entiende qué crear, y usa la misma contraseña que ya tiene en su propio `.env` para levantar Postgres — no hay una segunda fuente de verdad para la contraseña, solo dos archivos locales (`.env` y `appsettings.Development.json`) que deben coincidir.
- Docker sigue sin cambios: el backend en contenedor sigue leyendo `ConnectionStrings__Default` como variable de entorno desde `docker-compose.yml` (`Host=postgres`), un mecanismo totalmente independiente de `appsettings.Development.json` (que solo aplica cuando se corre el backend suelto en local, fuera de Docker).

**Alternativas consideradas:**
- **.NET User Secrets** (enfoque inicial) — descartado por los motivos de contexto: más seguro en abstracto, pero peor para mostrar y para portabilidad entre máquinas en el contexto de una prueba técnica evaluada.
- **Contraseña commiteada tal cual en `appsettings.Development.json`** — descartado: repetiría el mismo antipatrón de contraseña en texto plano en un archivo versionado que ya se corrigió en `docker-compose.yml`.

**Consecuencias:** al clonar el repo por primera vez hay que crear `backend/appsettings.Development.json` a partir de `.example` (mismo paso que ya existe para `.env`) antes de poder correr el backend fuera de Docker — documentar este paso en el README raíz (Fase 7).

---

## Mapeo EF Core: `EFCore.NamingConventions` (snake_case automático)

**Contexto:** el esquema de Postgres usa `snake_case` para tablas y columnas (`password_hash`, `created_at`, `branch_id`...), pero la convención de C#/EF Core es `PascalCase`. Siendo Database First y con 22 tablas por mapear a lo largo de la Fase 4, escribir `.HasColumnName("...")` a mano en cada propiedad de cada `IEntityTypeConfiguration<T>` es trabajo repetitivo y una fuente fácil de errores de tipeo silenciosos (un nombre de columna mal escrito no falla en compilación, falla en runtime contra Postgres).

**Decisión:** paquete `EFCore.NamingConventions`, activado una sola vez en `Program.cs` (`.UseSnakeCaseNamingConvention()` encadenado a `UseNpgsql(...)`). Convierte automáticamente `PasswordHash` → `password_hash`, `BranchId` → `branch_id`, y el nombre de cada `DbSet<T>` a su tabla en `snake_case` — sin tocar una sola `IEntityTypeConfiguration<T>` para esto.

**Justificación:** elimina un mapeo manual repetitivo en las ~22 tablas que quedan por conectar, reduce el riesgo de typos en nombres de columna, y no reemplaza ni contradice el resto de la configuración manual (relaciones FK, `ToTable`, etc. siguen siendo explícitas donde EF Core no puede inferirlas solo).

**Alternativas consideradas:**
- `.HasColumnName("...")` manual en cada propiedad — descartado por volumen de trabajo repetitivo sin beneficio real frente a la convención automática.

---

## Contenedorización del backend

**Decisión:** el backend se empaqueta como imagen Docker independiente, orquestada junto a `postgres` y el frontend en `docker-compose.yml`.

**Justificación:** cumple el requisito obligatorio de levantar todo el proyecto con `docker compose up`, sin configuración manual del entorno local, y aísla el runtime de .NET del resto de servicios.

**Pendiente:** el `Dockerfile` de la raíz está aún vacío y `docker-compose.yml` todavía no define el servicio del backend — falta documentar aquí la estrategia de build (single-stage vs. multi-stage) cuando se implemente.
