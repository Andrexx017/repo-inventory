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
- **Detalle** — líneas o eventos que dependen de una cabecera o de una maestra y no tienen sentido por sí solos (`product_units`, `inventory_movements`, `purchase_order_items`, `purchase_receipt_items`, `price_list_items`, `sale_items`, `transfer_items`, `transfer_events`).

**Justificación:** hace explícito en el propio esquema qué tablas son catálogos reutilizables y cuáles son líneas dependientes de un documento, sin necesidad de inferirlo de las relaciones FK — útil tanto para el diagrama E-R (sección 7) como para justificar el diseño ante evaluación (sección 8.2).
