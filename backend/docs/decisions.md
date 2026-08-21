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

## Contenedorización del backend

**Decisión:** el backend se empaqueta como imagen Docker independiente, orquestada junto a `postgres` y el frontend en `docker-compose.yml`.

**Justificación:** cumple el requisito obligatorio de levantar todo el proyecto con `docker compose up`, sin configuración manual del entorno local, y aísla el runtime de .NET del resto de servicios.

**Pendiente:** el `Dockerfile` de la raíz está aún vacío y `docker-compose.yml` todavía no define el servicio del backend — falta documentar aquí la estrategia de build (single-stage vs. multi-stage) cuando se implemente.
