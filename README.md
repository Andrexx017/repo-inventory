# repo-inventory

Sistema de gestión de inventario multi-sucursal con sincronización en tiempo real, transferencias entre nodos, compras, ventas, alertas de stock y dashboards analíticos. Prueba técnica desarrollada para **OptiPlant Consultores**.

Backend en .NET/C# (API REST), frontend en React + Vite, base de datos PostgreSQL, todo orquestado con Docker Compose.

## Tabla de contenidos

- [Descripción](#descripción)
- [Instalación](#instalación)
- [Arquitectura](#arquitectura)
- [Módulos implementados](#módulos-implementados)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Diagramas](#diagramas)
- [Uso de IA en el desarrollo](#uso-de-ia-en-el-desarrollo)
- [Documentación adicional](#documentación-adicional)

## Descripción

El sistema administra el inventario de una red de sucursales que comparten información en tiempo real: cada sucursal puede consultar el stock de las demás, solicitar y recibir transferencias de producto, registrar compras a proveedores y ventas a clientes, y monitorear el estado general de la operación desde un dashboard comparativo.

Tres roles cubren el flujo completo:

| Rol | Alcance |
|---|---|
| **Administrador general** (`general_admin`) | Gestión de usuarios, sucursales y roles; visibilidad total sobre todas las sucursales. |
| **Gerente de sucursal** (`branch_manager`) | Supervisa su propia sucursal, aprueba transferencias/compras, consulta reportes. |
| **Operador de inventario** (`inventory_operator`) | Trabajo operativo diario: ingresos/retiros de stock, ventas, compras, solicitudes de transferencia. |

Funcionalidades adicionales implementadas (sección 4 de la prueba técnica): **alertas inteligentes de stock** (umbral mínimo/máximo, notificación opcional por correo) y **reportes exportables** (PDF/Excel de movimientos, ventas o transferencias por rango de fechas).

El detalle completo de requisitos funcionales/no funcionales, restricciones y supuestos vive en [`requirements/documento-requisitos.md`](requirements/documento-requisitos.md); los casos de uso por actor, en [`requirements/casos-de-uso.md`](requirements/casos-de-uso.md).

## Instalación

### Requisitos

- [Docker](https://www.docker.com/) y Docker Compose (todo el sistema se levanta con un solo comando, sin instalar .NET, Node ni Postgres localmente).

### Pasos

1. **Clonar el repositorio.**

2. **Crear el archivo de variables de entorno** a partir de la plantilla:

   ```bash
   cp .env.example .env
   ```

   Completar en `.env`:
   - `POSTGRES_PASSWORD` — contraseña de la base de datos.
   - `JWT_KEY` — clave simétrica para firmar los tokens (ej. `openssl rand -base64 48`).
   - `SMTP_USER` / `SMTP_PASSWORD` — cuenta de Gmail (con contraseña de aplicación) usada para el correo de "recuperar contraseña" y las notificaciones de alertas de stock. Opcional: sin estos valores el sistema funciona igual, solo no se envían correos.
   - `VITE_API_URL` ya viene con el valor por defecto (`http://localhost:5107`).

3. **Levantar todo el sistema:**

   ```bash
   docker compose up -d --build
   ```

   Esto construye y levanta tres contenedores: `postgres` (con el esquema y los datos de prueba de `database/init/` ya cargados en el primer arranque), `backend` y `frontend`.

4. **Acceder:**
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - API / documentación OpenAPI (Scalar): [http://localhost:5107/scalar](http://localhost:5107/scalar)

   Usuarios de prueba (uno por rol, contraseña documentada en el encabezado de [`database/init/03-seed.sql`](database/init/03-seed.sql)).

### Ejecución fuera de Docker (opcional, solo backend)

Para correr el backend suelto contra el Postgres del contenedor (útil en desarrollo):

```bash
cp backend/appsettings.Development.json.example backend/appsettings.Development.json
```

y completar ahí el mismo `Password` y `Jwt:Key` que en `.env` — ver la decisión documentada en [`backend/docs/decisions.md`](backend/docs/decisions.md#cadena-de-conexión-local-appsettingsdevelopmentjson-en-vez-de-user-secrets).

> **Nota:** si el volumen `postgres_data` ya existía de un arranque anterior, los scripts de `database/init/` no se re-ejecutan solos (comportamiento de la imagen oficial de Postgres) — hay que recrear el volumen o aplicar el script nuevo a mano.

## Arquitectura

Tres capas separadas (frontend / backend / base de datos), cada una en su propio contenedor Docker, comunicadas exclusivamente por API REST — ninguna regla de negocio vive en el cliente.

```
┌─────────────────────┐        HTTPS/REST        ┌──────────────────────┐        SQL         ┌──────────────────┐
│  frontend (Nginx)   │ ───────────────────────▶ │  backend (.NET API)  │ ─────────────────▶ │  postgres (18)    │
│  React 19 + Vite    │ ◀─────────────────────── │  ASP.NET Core        │ ◀───────────────── │  base central     │
│  puerto 5173        │      JSON + JWT Bearer    │  puerto 5107→8080    │   Npgsql/EF Core    │  puerto 5432      │
└─────────────────────┘                           └──────────────────────┘                     └──────────────────┘
```

Ver el diagrama completo de contenedores en [`diagrams/DiagramaDeArquitecturaDeContenedores.drawio.png`](diagrams/DiagramaDeArquitecturaDeContenedores.drawio.png).

### Backend — arquitectura en capas

`Controllers → Services → Repositories → DbContext (PostgreSQL)`, organizado con **Screaming Architecture** (carpetas por módulo de negocio, no por capa técnica):

```
backend/
├── Modules/            # un subdirectorio por módulo funcional
│   └── <Módulo>/
│       ├── Controllers/
│       ├── Services/       # reglas de negocio (Service Layer)
│       ├── Repositories/   # uno por agregado (Repository Pattern)
│       ├── Dtos/
│       └── Entities/       # mapeo EF Core (Database First)
├── Shared/              # DomainException, middleware global de errores, extensiones
└── Infrastructure/      # DbContext + Configurations, JWT, hashing, email (MailKit)
```

Patrones aplicados: Repository por agregado, Unit of Work vía `DbContext` (transacción explícita solo cuando una operación requiere más de un `SaveChangesAsync`), Service Layer, DTOs de request/response, Dependency Injection nativa, y Strategy Pattern para exportación de reportes (`IReportExporter` → `PdfReportExporter`/`ExcelReportExporter`).

### Frontend — mismo criterio, espejo del backend

```
frontend/src/
├── modules/<módulo>/
│   ├── api/       # llamadas HTTP (equivalente a Repository)
│   ├── hooks/     # estado + lógica de pantalla (equivalente a Service)
│   └── pages/     # JSX puro que consume el hook
├── shared/        # apiClient.js centralizado, guards de ruteo (RequireAuth/RequireRole)
└── pages/Home.jsx # shell/landing de la SPA, fuera de cualquier módulo
```

### Sincronización entre sucursales

No hay una base de datos por sucursal ni mecanismo de réplica/mensajería: **una única instancia de PostgreSQL**, donde cada fila relevante se identifica con `branch_id`. La consistencia entre sucursales queda garantizada por las propiedades ACID de Postgres — es tiempo real por diseño, no por infraestructura adicional. Detalle y alternativas descartadas en [`database/docs/decisions.md`](database/docs/decisions.md#sincronización-de-inventario-entre-sucursales-base-de-datos-central-única).

### Autenticación

JWT Bearer (`Microsoft.AspNetCore.Authentication.JwtBearer`), stateless, con claims `role` y `branch_id`. Autorización por rol (`[Authorize(Roles = ...)]`) y por sucursal (`IAuthorizationHandler` custom). El frontend guarda el token en memoria (Context de React, no `localStorage`) para reducir superficie de robo por XSS.

## Módulos implementados

Los 8 módulos del dominio, con backend y frontend completos:

| Módulo | Backend | Frontend | Cubre |
|---|:---:|:---:|---|
| **Auth** | ✅ | ✅ | Login, recuperación de contraseña por email, gestión de usuarios, sucursales y roles |
| **Catalog** | ✅ | ✅ | Productos, categorías, unidades de medida — CRUD completo, listado paginado y filtrado |
| **Inventory** | ✅ | ✅ | Existencias por sucursal, ingresos/retiros, historial de movimientos, umbrales min/max con alertas |
| **Purchases** | ✅ | ✅ | Proveedores, órdenes de compra (crear/aprobar/cancelar), recepción con actualización automática de inventario |
| **Sales** | ✅ | ✅ | Registro de venta con precio resuelto por el servidor, validación de stock, listas de precio |
| **Transfers** | ✅ | ✅ | Ciclo completo de transferencia entre sucursales (solicitar → preparar → despachar → recibir) + logística (prioridad de ruta, transportista, cumplimiento estimado vs. real) |
| **Dashboard** | ✅ | ✅ | KPIs cross-módulo: ventas del mes, rotación de inventario, transferencias activas, stock próximo a agotarse, comparativa entre sucursales (solo Administrador general) |
| **Reports** | ✅ | ✅ | Exportación a PDF/Excel de movimientos, ventas o transferencias por rango de fechas (QuestPDF / ClosedXML) |

`Dashboard` y `Reports` no tienen tablas propias: componen datos de los demás módulos inyectando sus repositorios/servicios. `Transfers` absorbe también la funcionalidad de **Logística**, porque el esquema no tiene tablas separadas para eso.

El historial detallado de cada commit (qué se implementó, en qué archivo, y por qué) está en [`RUTA.md`](RUTA.md).

## Decisiones de diseño

Las decisiones técnicas se documentan con contexto, justificación, alternativas descartadas y consecuencias, por capa:

- [`database/docs/decisions.md`](database/docs/decisions.md) — motor (PostgreSQL 18), sincronización entre sucursales vía base central única, roles como tabla propia, convención maestra/cabecera/detalle, alertas inteligentes de stock, datos de prueba, recuperación de contraseña.
- [`backend/docs/decisions.md`](backend/docs/decisions.md) — .NET 10/ASP.NET Core, autenticación JWT, patrones de diseño (Repository, Service Layer, Strategy), Screaming Architecture, EF Core Database First + `EFCore.NamingConventions`, envío de correo (MailKit + Gmail SMTP), exportación de reportes (QuestPDF/ClosedXML).
- [`frontend/docs/decisions.md`](frontend/docs/decisions.md) — React 19 + Vite, token JWT en memoria (no `localStorage`), Screaming Architecture espejo del backend (`api/`/`hooks/`/`pages/`).
- [`backend/docs/reglas-negocio-criticas.md`](backend/docs/reglas-negocio-criticas.md) — reglas críticas (validación de stock antes de vender, atomicidad movimiento+inventario, atomicidad de recepción de transferencias, cálculo de totales agregados) y dónde se hacen cumplir.

Resumen de las decisiones arquitectónicas más relevantes:

- **Base de datos central única** en vez de una por sucursal con sincronización por eventos/colas — evita la complejidad de un sistema distribuido sin aportar valor real para el alcance de la prueba.
- **JWT stateless** en vez de cookies de sesión con estado en servidor — coherente con RNF-04 (backend sin sesión en memoria, escalable horizontalmente).
- **Arquitectura en capas + Repository por agregado + Service Layer**, en vez de CQRS o DDD táctico completo — resuelve RNF-08 sin la indirección adicional que no se justifica para el tamaño del proyecto ni el plazo disponible.
- **Screaming Architecture** (carpetas por módulo de negocio) en ambos lados del stack, en vez de organización por capa técnica — el árbol de carpetas comunica el dominio, y un mismo módulo se ubica completo en backend y frontend con trazabilidad 1 a 1.
- **`appsettings.Development.json` en vez de .NET User Secrets** para el connection string local — visible dentro del proyecto (útil para sustentación), sin comprometer la contraseña real en git.

## Diagramas

| Diagrama | Archivo |
|---|---|
| Entidad-Relación (DER) | [`diagrams/DER.png`](diagrams/DER.png) |
| Casos de uso | [`diagrams/DiagramaCasoDeUso.drawio.png`](diagrams/DiagramaCasoDeUso.drawio.png) |
| Arquitectura de contenedores | [`diagrams/DiagramaDeArquitecturaDeContenedores.drawio.png`](diagrams/DiagramaDeArquitecturaDeContenedores.drawio.png) |
| Secuencia — Registrar venta | [`diagrams/RegistrarVenta.png`](diagrams/RegistrarVenta.png) |
| Secuencia — Transferencia entre sucursales | [`diagrams/Transferencia.png`](diagrams/Transferencia.png) |

El modelo entidad-relación también está versionado como DBML (fuente editable del DER) en [`database/docs/diagram.dbml`](database/docs/diagram.dbml).

## Uso de IA en el desarrollo

Cumpliendo RN-04 (`requirements/documento-requisitos.md`): el proyecto se construyó de punta a punta en sesiones de conversación con **Claude Code**, dirigidas por el estudiante. No es una estimación reconstruida de memoria — el historial completo de esas sesiones queda como evidencia local y es la fuente de los ejemplos documentados. `RUTA.md` y `SUSTENTACION.md` son en sí mismos el subproducto de ese proceso: se actualizaron en cada commit, a pedido explícito, como bitácora y como material de estudio para la sustentación.

El detalle completo — herramientas usadas por etapa, ejemplos de prompts reales con su resultado, evaluación crítica (qué aportó, qué se ajustó manualmente, dónde no fue útil) y la estimación del % de código/documentación generado con asistencia de IA — está en [`requirements/uso-de-ia.md`](requirements/uso-de-ia.md).

## Documentación adicional

- [`requirements/documento-requisitos.md`](requirements/documento-requisitos.md) — requisitos funcionales, no funcionales, restricciones y supuestos.
- [`requirements/casos-de-uso.md`](requirements/casos-de-uso.md) — actores, matriz actor×módulo, casos de uso detallados.
- [`requirements/historias-de-usuario.md`](requirements/historias-de-usuario.md) — historias de usuario.
- [`requirements/uso-de-ia.md`](requirements/uso-de-ia.md) — herramientas de IA usadas por etapa, ejemplos de prompts, evaluación crítica y % estimado de asistencia.
- [`requirements/analisis-requerimientos.md`](requirements/analisis-requerimientos.md) — análisis previo de requerimientos.
- [`RUTA.md`](RUTA.md) — bitácora cronológica de cada commit del proyecto.
- [`SUSTENTACION.md`](SUSTENTACION.md) — preguntas y respuestas de preparación para la sustentación.
