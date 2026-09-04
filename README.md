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

Cumpliendo RN-04 (`requirements/documento-requisitos.md`): el proyecto se construyó de punta a punta en sesiones de conversación con **Claude Code**, dirigidas por el estudiante. No es una estimación reconstruida de memoria — el historial completo de esas sesiones queda como evidencia local (34 transcripciones: 31 en la raíz del proyecto, 2 en `backend/`, 1 en `frontend/`, con 303 mensajes reales de usuario en total) y es la fuente de los ejemplos citados abajo. `RUTA.md` y `SUSTENTACION.md` son en sí mismos el subproducto de ese proceso: se actualizaron en cada commit, a pedido explícito, como bitácora y como material de estudio para la sustentación.

### Herramientas por etapa

| Etapa | Herramienta | Para qué se usó |
|---|---|---|
| Fase 0 — Planeación | Claude Code + Trello (vía MCP) | tablero de tareas creado y actualizado por Claude Code a partir de `requirements/plan-trabajo.md` |
| Fase 1 — Requisitos y arquitectura | Claude Code | análisis del PDF de la prueba técnica, `documento-requisitos.md`, `casos-de-uso.md`, justificación de stack y patrones en los 3 `decisions.md` |
| Fase 2 — Modelo de datos | Claude Code + MCP de PostgreSQL + DBeaver (manual) | diseño de `01-schema.sql`/`02-indexes.sql`/`diagram.dbml`; la carga del SQL contra Postgres se hizo a mano en DBeaver, no vía IA |
| Fase 2 — Diagramas visuales | **draw.io, manual, sin IA** | casos de uso, arquitectura de contenedores y secuencias hechos por el estudiante; Claude Code solo los revisó después para validar que los roles/permisos dibujados coincidieran con los implementados |
| Fase 3 — Contenedorización | Claude Code | `Dockerfile`×2, `docker-compose.yml`, debugging de red interna/CORS/puertos ocupados |
| Fase 4 — Backend | Claude Code | los 8 módulos (`Controllers`/`Services`/`Repositories`/`Dtos`/`Entities`), varias veces con el estudiante escribiendo el código mientras Claude Code daba el plan paso a paso |
| Fase 5 — Frontend | Claude Code | mockups de pantallas, componentes React, hooks, integración con la API |
| Fase 6 — Funcionalidad adicional | Claude Code | alertas inteligentes de stock, exportación de reportes PDF/Excel |
| Fase 7 — Documentación y cierre | Claude Code | este README, `RUTA.md`, `SUSTENTACION.md` y esta misma sección |

### Ejemplos de prompts con resultados

Prompts reales (citados tal como se escribieron, con typos incluidos), no reconstruidos:

**1. Justificación del stack (Fase 1)**
> "voy a usar las siguientes tecnologias .net para el backend, react para frontent con vite, y la database la creare con posgrest. se usara docker para el proyecto. quiero que me des una razon justificable para usar este conjunto de tecnologias y guarda tu respuesta en el archivo 'decisions.md'"

Resultado: la sección "Lenguaje y framework" de [`backend/docs/decisions.md`](backend/docs/decisions.md), su equivalente en `database/docs/decisions.md` y `frontend/docs/decisions.md` — con alternativas descartadas (Node/NestJS, Java/Spring, Vue, Next.js) y por qué.

**2. Modelo de datos (Fase 2)**
> "necesito que me ayudes a crear un schema con todo el contexto que tienes del archivo analisis-requerimientos.md usa los archivos sql de la carpeta database>init crea el schema tambien en docs>diagram.dbml para el diagrama"

Resultado: primera versión de `database/init/01-schema.sql` y `database/docs/diagram.dbml`, refinada en prompts posteriores (ej. la tabla `roles` normalizada, ver ejemplo 4).

**3. Arquitectura de carpetas (Fase 3)**
> "ayudame a estructurar las carpetas de mi proyecto con la tecnica de screaming architecture y agrega las posibles carpetas que voy a necesitar"

Resultado: la convención `Modules/<Módulo>/{Controllers,Services,Repositories,Dtos,Entities}` documentada en `backend/docs/decisions.md`, replicada después en el frontend a pedido explícito ("quiero estructurar el front con el mismo orden del backend... puedes usar MODULES para obtener todos los modulos del proyecto y reflejarlos en el front").

**4. Decisión de modelado corregida por el usuario (Fase 2)**
> "crea la tabla roles y conectala. en la tabla de roles deben estar el rol de administrador general, gerente de sucursal y operador de inventario. diferencia tablas de informacion maestra con tablas de detalle"

Resultado: reemplazo del `CHECK` inicial sobre `users.role` por la tabla `roles` (FK) y la convención maestra/cabecera/detalle que después se aplicó a las 22 tablas del esquema — documentado en `database/docs/decisions.md`, sección "Roles como tabla propia".

**5. Bug real reportado por el usuario (Fase 7)**
> "rompiste algo, la pantalla se vuelve en negro apenas hago el login"

Resultado: commit `88b0916` ("fix: pantalla en negro al loguearse por el cambio de forma de las listas paginadas") — un cambio anterior de Claude Code había modificado la forma de la respuesta de `getSales()`/`getPurchaseOrders()`/`getTransfers()` (de array plano a `{items, totalCount}`) sin actualizar `useHomeDashboard.js`, que hacía `.filter()` sobre eso fuera de un `try/catch`. Regresión real de la IA, detectada por el usuario probando la app, no por ningún test automatizado.

**6. Error de consola pegado directo (Fase 4)**
> "mira lo que me sale en consola: [...] Access to fetch at 'http://localhost:5107/api/auth/login' from origin 'http://localhost:5174' has been blocked by CORS policy [...]"

Resultado: ajuste de la política de CORS en `Program.cs` para el origen correcto del frontend.

**7. Aprendizaje dirigido, código escrito por el usuario (Fase 4)**
> "continuemos con el desarrollo, vamos en la parte RF-07 del documento-requisitos.md. Vamos a realizarla pero yo me encargare de hacerla, tu me armas un plan paso a paso que yo deba hacer, con el fin de aprender e interiorizar mucho mejor todo."

Resultado: para RF-07 (y otros bloques posteriores) Claude Code no escribió el código — entregó el plan paso a paso y el estudiante lo implementó, con explicaciones sobre la marcha. Esta modalidad quedó como forma de trabajo recurrente en varios módulos.

**8. Filtros y paginación (Fase 7, pulido)**
> "hay una transferencia TR-000002 creo que la hiciste para ejemplo. ya la puedes borrar. ademas en la parte de inventario es necesaria la fecha y agrega la paginacion que tienen los otros modulos y filtros importantes para una busqueda profesional y eficaz"

Resultado: paginación y filtro de fecha añadidos a Inventario replicando el patrón ya usado en Catálogo/Compras/Transferencias (commits `7657344`, `68a92b3`, `c54a01b`).

### Evaluación crítica

- **Qué aportó realmente:** velocidad para bloques bien acotados (un módulo backend completo con sus 5 capas, una pantalla React con su hook), consistencia entre módulos (un mismo patrón — Screaming Architecture, Repository por agregado — aplicado igual en los 8 módulos sin desviaciones), y trazabilidad automática vía `RUTA.md`/`SUSTENTACION.md`, que se mantuvieron actualizados en cada commit sin esfuerzo manual adicional del estudiante.
- **Qué se ajustó o rechazó manualmente:**
  - Los **diagramas visuales** (casos de uso, arquitectura, secuencias) se descartaron por completo del lado de la IA: existía una carpeta `diagrams/` generada por Claude Code que el usuario pidió borrar ("ya tengo versiones en draw.io sobre estos diagramas... deseo mantener mis diagramas allí") a favor de sus propios archivos hechos a mano en draw.io. La IA solo quedó como revisora de consistencia (roles del diagrama vs. roles implementados), no como autora.
  - El modelo de `roles` (ejemplo 4) empezó como `CHECK` propuesto por la IA y se corrigió a tabla propia por una necesidad de negocio (mostrar nombre/descripción del rol en UI) que la primera propuesta no cubría.
  - En varios bloques (RF-07, entre otros) el estudiante decidió explícitamente escribir el código él mismo, usando a Claude Code solo como tutor que arma el plan y explica, no como generador de código — evidencia de que la IA se usó también como herramienta de aprendizaje, no solo de producción.
- **Dónde no fue útil / generó trabajo extra:** la regresión del ejemplo 5 (pantalla en negro tras un cambio de forma de una respuesta de API) es el caso más claro de un costo real introducido por la IA — un cambio hecho en un módulo sin propagar su impacto a otro archivo que consumía esa misma función, detectado únicamente por prueba manual en el navegador (el build de Vite no lo marca por ser JS sin tipos). Otros bugs de consola (error de CORS, puerto ya en uso, campana con fondo blanco en modo oscuro) se resolvieron rápido, pero exigieron que el usuario pegara el error real — la IA no los detectó de forma proactiva.
- **Validación cruzada contra los requisitos:** el estudiante pidió explícitamente, más de una vez, que la IA auditara su propio trabajo contra la fuente de verdad ("revisa el documento de requisitos, y verifica si todo esta realizado... quiero una depuracion en el navegador, con el fin de que pruebes cada rol y si cumple con lo autorizado"; "valida que nos hace falta de los REQUISITOS NO FUNCIONALES, has una lista y luego yo te digo que hacer") — el criterio de aceptación final quedó siempre del lado del usuario, no de la respuesta de la IA.

### % estimado de código/documentación asistido

No se reporta un número inventado — la base es el propio repositorio y el historial de sesiones:

- **Código de aplicación:** ~7.525 líneas en `backend/**/*.cs` (205 archivos) y ~7.855 líneas en `frontend/src/**/*.{js,jsx}` (51 archivos), más 550 líneas de SQL en `database/init/`. La totalidad de esos archivos fue creada o modificada dentro de una sesión de Claude Code — no existe código escrito directamente en el editor por fuera de esas sesiones — pero una fracción no cuantificada con precisión (los bloques del ejemplo 7 y similares, varios RF completos) fue tecleada por el estudiante siguiendo un plan generado por la IA, no copiada de una respuesta. Estimación honesta: **~85–90% del código fue generado directamente por la IA y luego revisado/ajustado por el estudiante; el resto (~10–15%) fue escrito a mano por el estudiante con la IA como guía paso a paso**, sin forma de medir el corte exacto entre ambos sin instrumentación adicional que el proyecto no tiene.
- **Documentación:** `RUTA.md` (bitácora de 50 commits), `SUSTENTACION.md` (preguntas y respuestas de estudio) y los 3 `decisions.md` fueron redactados por Claude Code turno a turno, siempre a partir de lo realmente implementado y con correcciones puntuales del usuario cuando algo quedaba impreciso. Estimación: **~95% generado por IA, con revisión humana en cada actualización** (el estudiante decide qué se documenta y corrige el contenido antes de aceptarlo — ver ejemplo 4 y la sección de evaluación crítica).
- **Excepción explícita:** los **diagramas visuales de ingeniería** (`diagrams/*.png`, salvo el DER) son **0% IA** — hechos íntegramente a mano en draw.io por el estudiante, como se documenta arriba.
- 42 commits en total, 34 sesiones de Claude Code documentadas, 303 mensajes de usuario reales dirigiendo el trabajo — la proporción concreta entre "generado" y "escrito a mano" no se midió línea por línea porque el proyecto no instrumentó esa métrica desde el inicio; lo que sí queda como evidencia verificable es el historial de sesiones completo (no incluido en el repo por tamaño y por contener fragmentos de configuración local) y el historial de commits en `git log`.

## Documentación adicional

- [`requirements/documento-requisitos.md`](requirements/documento-requisitos.md) — requisitos funcionales, no funcionales, restricciones y supuestos.
- [`requirements/casos-de-uso.md`](requirements/casos-de-uso.md) — actores, matriz actor×módulo, casos de uso detallados.
- [`requirements/historias-de-usuario.md`](requirements/historias-de-usuario.md) — historias de usuario.
- [`requirements/analisis-requerimientos.md`](requirements/analisis-requerimientos.md) — análisis previo de requerimientos.
- [`RUTA.md`](RUTA.md) — bitácora cronológica de cada commit del proyecto.
- [`SUSTENTACION.md`](SUSTENTACION.md) — preguntas y respuestas de preparación para la sustentación.
