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
