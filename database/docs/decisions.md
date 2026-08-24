# Decisiones Técnicas — Base de Datos

## Motor: PostgreSQL 18

**Contexto:** el sistema exige un modelo de datos relacional con integridad referencial estricta (productos, sucursales, movimientos de inventario, órdenes de compra/venta, transferencias con estados, trazabilidad completa) y soporte para consultas analíticas del dashboard.

**Decisión:** PostgreSQL 18 (imagen oficial `postgres:18`), inicializado con scripts SQL versionados (`01-schema.sql`, `02-indexes.sql`).

**Justificación:**
- El dominio es intrínsecamente relacional: transferencias, compras y ventas son transacciones que involucran múltiples entidades relacionadas (producto, sucursal origen/destino, responsable, línea de detalle), donde la integridad referencial y las transacciones ACID son necesarias — no es un caso de uso natural para NoSQL.
- Soporta transacciones multi-tabla atómicas para operaciones críticas como "confirmar recepción de transferencia y actualizar stock destino" o "confirmar venta y descontar inventario", evitando estados inconsistentes entre sucursales.
- Motor open-source maduro, sin costos de licenciamiento, con excelente soporte en el ecosistema .NET (Npgsql / EF Core) y en Docker (imagen oficial ligera y bien mantenida).
- Funciones avanzadas útiles para el alcance del proyecto: vistas y CTEs para los KPIs del dashboard (rotación de inventario, comparativas entre sucursales), y tipos `JSON`/`JSONB` para datos semi-estructurados puntuales sin sacrificar el modelo relacional de fondo.
- Escalable con réplicas de lectura si se necesitara distribuir consultas entre sucursales, sin cambiar de motor.

**Alternativas consideradas:**
- MongoDB — descartado porque el dominio requiere integridad referencial fuerte y transacciones consistentes (el stock nunca debe quedar negativo ni duplicado entre sucursales), algo que un modelo relacional garantiza de forma más natural que uno documental.
- MySQL — descartado a favor de PostgreSQL por mejor soporte de tipos avanzados (JSONB, arrays) y funciones de ventana, útiles para las consultas analíticas del dashboard.

**Consecuencias:** el esquema se versiona como scripts SQL ejecutados en el arranque del contenedor (`docker-entrypoint-initdb.d`); si el esquema crece en complejidad conviene adoptar una herramienta de migraciones (EF Core Migrations o similar) en vez de scripts numerados a mano.

---

## Contenedorización

**Decisión:** PostgreSQL corre como servicio independiente en `docker-compose.yml`, con volumen nombrado (`postgres_data`) para persistencia entre reinicios.

**Justificación:** aísla el estado de la base de datos del ciclo de vida de los contenedores de aplicación y cumple el requisito de arranque con un solo comando (`docker compose up`).

**Nota de seguridad pendiente:** `docker-compose.yml` define hoy `POSTGRES_PASSWORD` en texto plano dentro del archivo versionado. Antes de la entrega conviene moverlo a variables de entorno vía `.env` (excluido de git) o Docker secrets, para no exponer credenciales en el repositorio.

---

## Roles como tabla propia (`roles`)

**Contexto:** los tres roles del actor obligatorio (sección 6.2 del análisis: Administrador general, Gerente de sucursal, Operador de inventario) se modelaron inicialmente como un `CHECK` sobre `users.role`, por ser un conjunto cerrado que no crece por datos.

**Decisión:** se reemplaza el `CHECK` por una tabla maestra `roles` (`id`, `code`, `name`, `description`), referenciada desde `users.role_id` como FK, y sembrada con los 3 roles vía `INSERT` en `01-schema.sql`.

**Justificación:**
- El backend necesita mostrar nombre y descripción de cada rol en UI/reportes (sección 6.2); con `CHECK` ese texto quedaría hardcodeado en el código en vez de en la base de datos.
- Una tabla consultable permite validar y listar roles sin duplicar el catálogo en el backend, y evita una migración de esquema si el análisis final agrega un cuarto rol.
- Postgres no permite `CHECK` con subconsulta a otra tabla, así que la regla "solo `general_admin` puede no tener sucursal" ya no se puede expresar como constraint de base de datos entre `users` y `roles`; queda a cargo del backend, siguiendo el mismo patrón usado para los totales agregados de `purchase_orders`/`sales`.

**Alternativas consideradas:**
- Mantener el `CHECK`: descartado por las razones anteriores — no es solo un tema de crecimiento del conjunto, sino de necesitar metadatos (nombre, descripción) por rol.

---

## Convención: tablas maestras vs. tablas de detalle/cabecera

**Decisión:** cada `CREATE TABLE` en `01-schema.sql` (y cada `Table` en `diagram.dbml`) se etiqueta según su rol en el modelo:
- **Maestra** — catálogo de referencia independiente (`roles`, `branches`, `users`, `product_categories`, `units_of_measure`, `products`, `suppliers`, `price_lists`, `inventory`).
- **Cabecera** — encabezado de una transacción (`purchase_orders`, `purchase_receipts`, `sales`, `transfers`).
- **Detalle** — líneas o eventos que dependen de una cabecera o de una maestra y no tienen sentido por sí solos (`product_units`, `inventory_movements`, `purchase_order_items`, `purchase_receipt_items`, `price_list_items`, `sale_items`, `transfer_items`, `transfer_events`, `stock_alerts`).

**Justificación:** hace explícito en el propio esquema qué tablas son catálogos reutilizables y cuáles son líneas dependientes de un documento, sin necesidad de inferirlo de las relaciones FK — útil tanto para el diagrama E-R (sección 7) como para justificar el diseño ante evaluación (sección 8.2).

---

## Sincronización de inventario entre sucursales: base de datos central única

**Contexto:** el PDF exige que cada sucursal "comparta información de inventario con las demás sucursales en tiempo real o near-real-time" y pueda "consultar el inventario de cualquier otra sucursal de la red" (sección 2.1), y pide documentar explícitamente el "mecanismo de sincronización de inventario entre sucursales" como una de las cinco decisiones arquitectónicas obligatorias (sección 8.2) — la más sensible del proyecto según el propio análisis del equipo.

**Decisión:** una única instancia de PostgreSQL, compartida por todas las sucursales, donde cada fila relevante (`inventory`, `inventory_movements`, `sales`, `transfers`, etc.) se identifica con `branch_id`. No existe una base de datos por sucursal ni un mecanismo de réplica o mensajería entre nodos — la "sincronización" queda resuelta por diseño, no por infraestructura adicional.

**Justificación:**
- Con una sola base de datos, la consistencia entre sucursales es automática y está garantizada por las propiedades ACID de Postgres: en el momento en que una sucursal confirma un movimiento de inventario, cualquier otra sucursal que consulte ese producto ve el dato actualizado en su siguiente lectura. No hay ventana de "desincronización" que resolver, porque nunca existieron dos copias de la verdad.
- Encaja mejor de lo esperado con el requisito de "tiempo real o near-real-time": con una base compartida es tiempo real por definición, sin la latencia de propagación que implicaría una arquitectura near-real-time basada en réplicas o eventos.
- Evita la complejidad de un sistema distribuido (colas de mensajes, resolución de conflictos de escritura concurrente, consistencia eventual) que no aporta valor real para el alcance de esta prueba técnica; con el plazo disponible, esa arquitectura sería sobre-ingeniería.
- El esquema (`01-schema.sql`) ya estaba diseñado bajo esta premisa desde el principio — `branch_id` es una columna más en las tablas relevantes, no una base de datos distinta — así que formalizar esta decisión no requiere ningún cambio al modelo de datos ya construido.
- Escalable dentro del alcance esperado: si en el futuro el volumen creciera mucho, existen rutas de evolución (réplicas de lectura, particionamiento por `branch_id`) sin tener que rediseñar el modelo.

**Alternativas consideradas:**
- Una base de datos por sucursal con sincronización asíncrona (mensajería/eventos, patrón outbox) — descartada por ser considerablemente más compleja de implementar, probar y documentar en el tiempo disponible, e introducir problemas reales (conflictos de escritura concurrente, consistencia eventual, qué pasa si dos sucursales transfieren el mismo stock al mismo tiempo) que simplemente no existen con una base central.
- Base central + réplicas de lectura por sucursal desde el día uno — descartada por ser una optimización de rendimiento prematura, sin evidencia de que el volumen de esta prueba técnica la necesite, y que añadiría infraestructura y complejidad de consistencia de réplicas sin beneficio demostrable en el alcance actual.

**Consecuencias:**
- El backend no necesita ningún componente de sincronización (sin colas, sin eventos de dominio entre servicios, sin jobs de reconciliación): toda "sincronización" es una simple consulta SQL, con `WHERE branch_id = ...` para vistas de una sucursal o sin ese filtro para vistas cross-sucursal (dashboard comparativo del Administrador general).
- La disponibilidad del sistema depende de una única instancia de Postgres: si ese contenedor cae, todas las sucursales pierden acceso simultáneamente. Es un trade-off aceptado y coherente con el alcance de una prueba técnica, no con un sistema de producción con requisitos de alta disponibilidad.
- Operaciones que afectan a más de una sucursal a la vez (ej. confirmar una transferencia, que toca inventario de origen y destino) pueden implementarse como una única transacción de base de datos — más simple y más seguro que coordinar dos escrituras en dos bases distintas.
- Cierra, junto con la Decisión de autenticación (`backend/docs/decisions.md`), el bloqueo de la Fase 1 para poder iniciar en serio la Fase 4 (backend). Solo queda pendiente la decisión de patrones de diseño.

---

## Funcionalidad adicional (sección 4): alertas inteligentes de stock + reportes exportables

**Contexto:** la sección 4 del análisis exige implementar al menos una funcionalidad adicional de la lista orientadora. Se eligen dos: **"Sistema de alertas inteligentes"** y **"Módulo de reportes exportables"**, decidido en esta etapa (Fase 1, aún en diseño de esquema) para no tener que migrar el modelo más adelante con el backend ya construido.

**Decisión:**
- **Alertas inteligentes:** se agrega `maximum_stock` (nullable) a `inventory`, junto al `minimum_stock` ya existente, para soportar umbral superior además del inferior. Se agrega la tabla de detalle `stock_alerts`, que registra cada alerta disparada (tipo `low_stock`/`high_stock`, cantidad y umbral al momento del disparo, estado `pending`/`resolved`, quién la resolvió y si fue notificada por correo).
- **Reportes exportables:** no se agregan tablas nuevas. El requisito ("reportes en PDF o Excel para movimientos de inventario, ventas o transferencias en un rango de fechas") se resuelve consultando `inventory_movements`, `sales` y `transfers` — todas ya tienen columna de fecha indexada (`movement_date`, `sale_date`, `request_date`) — y generando el archivo desde el backend. Es una decisión de la capa de negocio (librería de exportación), no de modelo de datos.

**Justificación:**
- `maximum_stock` como columna nueva (no tabla aparte) sigue el mismo patrón que `minimum_stock`: es un umbral configurable por producto/sucursal, propio de la fila de `inventory`, no un evento.
- `stock_alerts` sí necesita ser tabla propia (no basta con detectar el umbral al vuelo) porque una alerta tiene ciclo de vida propio: se dispara, puede notificarse por correo, y alguien la marca como resuelta — eso requiere persistencia y trazabilidad (quién la atendió y cuándo), igual que `inventory_movements` para los movimientos.
- Se etiqueta `stock_alerts` como **[DETALLE]** de `inventory` (no maestra, no cabecera): depende de la fila de inventario que la originó y no tiene sentido de forma independiente.
- Reportes exportables no requiere modelo nuevo: es la funcionalidad de menor riesgo para el esquema (cero migraciones) y de mayor certeza de completarse dado el tiempo disponible, mientras que alertas sí aporta un diferencial de diseño de datos (nueva tabla con estado propio).

**Alternativas consideradas:**
- Guardar solo la última alerta por producto/sucursal (columna en `inventory` en vez de tabla `stock_alerts`) — descartado porque pierde el historial de alertas pasadas y no permite marcar cuáles ya fueron atendidas, rompiendo la trazabilidad que el propio proyecto exige en otras áreas (`inventory_movements`, `transfer_events`).
- Tabla `report_exports` para auditar cada reporte generado — descartada por sobre-ingeniería: no la pide el enunciado y no aporta valor sin un requisito de auditoría explícito para reportes (a diferencia de los movimientos de inventario, donde sí es requisito obligatorio de la sección 3.1).

**Consecuencias:**
- El backend necesita un mecanismo para evaluar `stock_alerts` (al confirmar cada movimiento que afecta `inventory.current_quantity`, comparar contra `minimum_stock`/`maximum_stock` y crear la alerta si corresponde) y, opcionalmente, un job/servicio de envío de correo.
- La elección de librería de generación de PDF/Excel para reportes queda pendiente de documentar en `backend/docs/decisions.md` cuando se implemente esa capa.

**Confirmación de alcance (22/08/2026):** ambas quedan como plan firme (no como "una u otra según el tiempo") — el PDF exige mínimo 1, aquí se hacen 2 porque el costo incremental es bajo: "reportes exportables" no requiere ningún cambio de esquema, y "alertas inteligentes" ya tiene su modelo de datos completo y probado a nivel de restricciones. El único trabajo real pendiente para ambas está en el backend (Fase 4, punto 10) y el frontend (Fase 5).

**Refinamiento posterior a `stock_alerts` (22/08/2026):** se agregaron dos restricciones que sí puede garantizar la propia base de datos (a diferencia de las reglas listadas en `backend/docs/reglas-negocio-criticas.md`, que necesitan consultar otra tabla):
- `CHECK (status = 'pending' OR (resolved_by IS NOT NULL AND resolved_at IS NOT NULL))` — una alerta resuelta siempre debe registrar quién y cuándo la resolvió.
- Índice único parcial `ux_stock_alerts_open (branch_id, product_id, alert_type) WHERE status = 'pending'` — impide que existan dos alertas abiertas para el mismo producto/sucursal/tipo (ej. varias ventas seguidas del mismo producto ya en alerta no deben generar alertas duplicadas), sin afectar el historial de alertas ya resueltas.
