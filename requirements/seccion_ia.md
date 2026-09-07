# Uso de IA en el desarrollo

> Elaborado según la sección 9 ("Uso de Inteligencia Artificial en el Desarrollo") de `requirements/Prueba Tecnica Inventario.pdf`, y cumpliendo la restricción RN-04 (`requirements/documento-requisitos.md`).

Cumpliendo RN-04: el proyecto se construyó de punta a punta en sesiones de conversación con **Claude Code**, dirigidas por el estudiante. No es una estimación reconstruida de memoria — el historial completo de esas sesiones queda como evidencia local (34 transcripciones: 31 en la raíz del proyecto, 2 en `backend/`, 1 en `frontend/`, con 303 mensajes reales de usuario en total) y es la fuente de los ejemplos citados abajo. `RUTA.md` y `SUSTENTACION.md` son en sí mismos el subproducto de ese proceso: se actualizaron en cada commit, a pedido explícito, como bitácora y como material de estudio para la sustentación.

## Áreas de aplicación (según sección 9.1 del PDF, con lo realmente hecho en este proyecto)

La sección 9.1 del PDF sugiere 6 áreas de aplicación de IA. Esta es la misma tabla, con la descripción e impacto reemplazados por lo que efectivamente ocurrió en las sesiones de Claude Code de este proyecto (no una proyección genérica):

| Área | Descripción (lo realmente hecho) | Impacto |
|---|---|---|
| **Diseño de arquitectura** | Se usó Claude Code para comparar alternativas de stack y de patrones antes de decidir: Node/NestJS y Java/Spring frente a .NET, Vue/Next.js frente a React, base central única frente a una BD por sucursal con sincronización por eventos/colas. Cada comparación quedó documentada con sus alternativas descartadas en los 3 `decisions.md` (`backend/`, `frontend/`, `database/`). | Alto — las 3 decisiones de arquitectura de Fase 1 (autenticación, sincronización entre sucursales, patrones del backend) se cerraron así, y son la base que sostiene el resto del sistema. |
| **Generación de código** | Los 8 módulos del backend (`Controllers`/`Services`/`Repositories`/`Dtos`/`Entities`) y sus pantallas React equivalentes se generaron con Claude Code, módulo por módulo, siguiendo siempre el mismo patrón (Screaming Architecture + Repository por agregado). En varios bloques (ej. RF-07) el código no lo escribió la IA sino el estudiante, con Claude Code dando el plan paso a paso (ver ejemplo 7). | Alto — es el área de mayor uso; ver el desglose de % en la sección siguiente. |
| **Generación de tests** | Aplicada en una sesión dedicada (ver ejemplo 9): Claude Code creó el proyecto `backend.Tests` (xUnit + Moq) y escribió 7 pruebas unitarias, una por cada regla de `reglas-negocio-criticas.md` (RN-CRIT-01 a 05, dos de ellas con dos casos cada una). Alcance acotado a pedido explícito por la fecha de entrega: sin pruebas de integración ni CI. | Media — cubre exactamente las 5 reglas que el propio proyecto identificó como las que Postgres no puede garantizar solo (ver la evaluación de impacto en el ejemplo 9.2), pero es alcance acotado: sin pruebas de integración ni de frontend, una regresión como la del ejemplo 5 (pantalla en negro) seguiría sin detectarse antes de probar la app a mano. |
| **Documentación técnica** | Redacción de este documento, el README raíz, `RUTA.md`, `SUSTENTACION.md` y los 3 `decisions.md`, siempre turno a turno a partir de lo realmente implementado (no generados de una sola vez al final). | Alto — ver el % estimado de documentación asistida más abajo. |
| **Revisión de código** | Uso reactivo, no proactivo: cuando el estudiante pegaba un error de consola (CORS, ejemplo 6) o reportaba un bug visual (pantalla en negro, ejemplo 5), Claude Code diagnosticaba la causa en el código ya escrito. También se usó para auditorías explícitas contra los requisitos ("revisa el documento de requisitos y verifica si todo esta realizado... quiero una depuracion en el navegador, con el fin de que pruebes cada rol"). | Media — útil para diagnóstico dirigido, pero no detectó proactivamente la regresión del ejemplo 5 antes de que el estudiante la reportara probando la app. |
| **Consulta de buenas prácticas** | Investigación puntual de convenciones para el stack elegido: paquete `EFCore.NamingConventions` para mapear `snake_case` de Postgres a `PascalCase` de C# sin `HasColumnName` manual en cada propiedad, y la convención de nombres/estructura Screaming Architecture aplicada de forma idéntica en backend y frontend. | Media — ahorró trabajo repetitivo (mapeo columna por columna) y mantuvo consistencia de nomenclatura en las 22 tablas del esquema. |

## Herramientas por etapa

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
| Fase 7 — Documentación y cierre | Claude Code | el README, `RUTA.md`, `SUSTENTACION.md` y este mismo documento |

## Ejemplos de prompts con resultados

Prompts reales (citados tal como se escribieron, con typos incluidos), no reconstruidos:

**1. Justificación del stack (Fase 1)**
> "voy a usar las siguientes tecnologias .net para el backend, react para frontent con vite, y la database la creare con posgrest. se usara docker para el proyecto. quiero que me des una razon justificable para usar este conjunto de tecnologias y guarda tu respuesta en el archivo 'decisions.md'"

Resultado: la sección "Lenguaje y framework" de [`backend/docs/decisions.md`](../backend/docs/decisions.md), su equivalente en `database/docs/decisions.md` y `frontend/docs/decisions.md` — con alternativas descartadas (Node/NestJS, Java/Spring, Vue, Next.js) y por qué.

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

**9.1. Generación de pruebas unitarias (Fase 7, cierre)**
> "generaremos test con lo siguiente: Creación automática de pruebas unitarias e integración para los módulos críticos del sistema. Explica paso a paso como lo haces"

Resultado: Claude Code explicó primero el enfoque (xUnit + Moq, mockeando repositorios sin base de datos real) y, a pedido explícito del usuario ("hazlo tu", luego "hazlos todos de una vez"), creó `backend.Tests/` completo con 7 pruebas — una por cada regla de `backend/docs/reglas-negocio-criticas.md` (RN-CRIT-01 a 05). De paso, diagnosticó y resolvió sin intervención manual un error real de compilación (`CSC : error CS1705`) causado por un conflicto de versiones de `Microsoft.EntityFrameworkCore` entre `backend.Tests` y `inventory.dll`, agregando una referencia explícita de versión en el `.csproj` del proyecto de pruebas. La decisión de no avanzar con pruebas de integración ni CI fue explícita del usuario, dada la fecha de entrega del mismo día.

**9.2. Evaluación de impacto**

Media: rápido y bien dirigido en velocidad y cobertura de las reglas correctas, pero acotado en profundidad. A favor: en una sola sesión quedaron cubiertas las 5 reglas que el propio proyecto ya había identificado como críticas desde Fase 4 (`reglas-negocio-criticas.md` pedía explícitamente "verificar que la regla quede cubierta por al menos una prueba unitaria", pendiente hasta este punto) — sin ese documento previo, escribir las pruebas correctas hubiera exigido releer todo el código de negocio para encontrar qué probar. El diagnóstico del conflicto de versiones de EF Core también hubiera tomado tiempo real de investigación manual (el mensaje de error no apunta directo a la causa — un paquete con `PrivateAssets="all"` que no propaga su versión). En contra: la cobertura es superficial frente a "integración" (nunca se ejecuta contra Postgres real, así que el `CHECK` de la base como red de seguridad final queda sin probar) y quedó decidida por el usuario en función del tiempo disponible, no de un análisis de riesgo — es la misma tensión que ya señalaba el ejemplo 5 (una regresión de integración real no la hubiera atrapado esta suite, que es 100% unitaria).

## Evaluación crítica

- **Qué aportó realmente:** velocidad para bloques bien acotados (un módulo backend completo con sus 5 capas, una pantalla React con su hook), consistencia entre módulos (un mismo patrón — Screaming Architecture, Repository por agregado — aplicado igual en los 8 módulos sin desviaciones), y trazabilidad automática vía `RUTA.md`/`SUSTENTACION.md`, que se mantuvieron actualizados en cada commit sin esfuerzo manual adicional del estudiante.
- **Qué se ajustó o rechazó manualmente:**
  - Los **diagramas visuales** (casos de uso, arquitectura, secuencias) se descartaron por completo del lado de la IA: existía una carpeta `diagrams/` generada por Claude Code que el usuario pidió borrar ("ya tengo versiones en draw.io sobre estos diagramas... deseo mantener mis diagramas allí") a favor de sus propios archivos hechos a mano en draw.io. La IA solo quedó como revisora de consistencia (roles del diagrama vs. roles implementados), no como autora.
  - El modelo de `roles` (ejemplo 4) empezó como `CHECK` propuesto por la IA y se corrigió a tabla propia por una necesidad de negocio (mostrar nombre/descripción del rol en UI) que la primera propuesta no cubría.
  - En varios bloques (RF-07, entre otros) el estudiante decidió explícitamente escribir el código él mismo, usando a Claude Code solo como tutor que arma el plan y explica, no como generador de código — evidencia de que la IA se usó también como herramienta de aprendizaje, no solo de producción.
- **Dónde no fue útil / generó trabajo extra:** la regresión del ejemplo 5 (pantalla en negro tras un cambio de forma de una respuesta de API) es el caso más claro de un costo real introducido por la IA — un cambio hecho en un módulo sin propagar su impacto a otro archivo que consumía esa misma función, detectado únicamente por prueba manual en el navegador (el build de Vite no lo marca por ser JS sin tipos). Otros bugs de consola (error de CORS, puerto ya en uso, campana con fondo blanco en modo oscuro) se resolvieron rápido, pero exigieron que el usuario pegara el error real — la IA no los detectó de forma proactiva.
- **Validación cruzada contra los requisitos:** el estudiante pidió explícitamente, más de una vez, que la IA auditara su propio trabajo contra la fuente de verdad ("revisa el documento de requisitos, y verifica si todo esta realizado... quiero una depuracion en el navegador, con el fin de que pruebes cada rol y si cumple con lo autorizado"; "valida que nos hace falta de los REQUISITOS NO FUNCIONALES, has una lista y luego yo te digo que hacer") — el criterio de aceptación final quedó siempre del lado del usuario, no de la respuesta de la IA.

## % estimado de código/documentación asistido

No se reporta un número inventado — la base es el propio repositorio y el historial de sesiones:

- **Código de aplicación:** ~7.525 líneas en `backend/**/*.cs` (205 archivos) y ~7.855 líneas en `frontend/src/**/*.{js,jsx}` (51 archivos), más 550 líneas de SQL en `database/init/`. La totalidad de esos archivos fue creada o modificada dentro de una sesión de Claude Code — no existe código escrito directamente en el editor por fuera de esas sesiones — pero una fracción no cuantificada con precisión (los bloques del ejemplo 7 y similares, varios RF completos) fue tecleada por el estudiante siguiendo un plan generado por la IA, no copiada de una respuesta. Estimación honesta: **~80–85% del código fue generado directamente por la IA y luego revisado/ajustado por el estudiante; el resto (~20–15%) fue escrito a mano por el estudiante con la IA como guía paso a paso**, sin forma de medir el corte exacto entre ambos sin instrumentación adicional que el proyecto no tiene.
- **Documentación:** `RUTA.md` (bitácora de commits), `SUSTENTACION.md` (preguntas y respuestas de estudio) y los 3 `decisions.md` fueron redactados por Claude Code turno a turno, siempre a partir de lo realmente implementado y con correcciones puntuales del usuario cuando algo quedaba impreciso. Estimación: **~75% generado por IA, con revisión humana en cada actualización** (el estudiante decide qué se documenta y corrige el contenido antes de aceptarlo — ver ejemplo 4 y la sección de evaluación crítica).
- **Excepción explícita:** los **diagramas visuales de ingeniería** (`diagrams/*.png`, salvo el DER) son **0% IA** — hechos íntegramente a mano en draw.io por el estudiante, como se documenta arriba.
- 42 commits en total, 34 sesiones de Claude Code documentadas, 303 mensajes de usuario reales dirigiendo el trabajo — la proporción concreta entre "generado" y "escrito a mano" no se midió línea por línea porque el proyecto no instrumentó esa métrica desde el inicio; lo que sí queda como evidencia verificable es el historial de sesiones completo (no incluido en el repo por tamaño y por contener fragmentos de configuración local) y el historial de commits en `git log`.
