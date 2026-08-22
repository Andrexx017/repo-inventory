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
- `POST /api/auth/login` valida `email` + password contra `password_hash` (hasheado con BCrypt) y, si es válido, emite un JWT firmado con: `sub` (id de usuario), `role` (código de `roles.code`) y un claim custom `branch_id`.
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
- Requiere paquete `Microsoft.AspNetCore.Authentication.JwtBearer` y `BCrypt.Net-Next` (o equivalente) para hashing de password.
- La clave de firma (`Jwt:Key`), `Issuer`, `Audience` y tiempo de expiración se configuran vía `appsettings` + variables de entorno (`.env`), nunca hardcodeadas ni versionadas en texto plano.
- Revocar un token antes de que expire no es inmediato (limitación conocida de JWT stateless); se mitiga usando tiempos de expiración cortos (ej. 2 horas) — no se implementa refresh token por estar fuera del alcance mínimo exigido, pero queda anotado como mejora futura.

---

## Contenedorización del backend

**Decisión:** el backend se empaqueta como imagen Docker independiente, orquestada junto a `postgres` y el frontend en `docker-compose.yml`.

**Justificación:** cumple el requisito obligatorio de levantar todo el proyecto con `docker compose up`, sin configuración manual del entorno local, y aísla el runtime de .NET del resto de servicios.

**Pendiente:** el `Dockerfile` de la raíz está aún vacío y `docker-compose.yml` todavía no define el servicio del backend — falta documentar aquí la estrategia de build (single-stage vs. multi-stage) cuando se implemente.
