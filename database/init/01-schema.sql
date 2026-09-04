-- =====================================================================
-- Sistema de Inventario Multi-Sucursal — Schema inicial
-- Cubre los módulos obligatorios 3.1 a 3.5 de requirements/analisis-requerimientos.md
-- (inventario, compras, ventas, transferencias, logística).
-- Funcionalidad adicional (sección 4): alertas inteligentes de stock
-- (tabla stock_alerts + inventory.maximum_stock). El módulo de reportes
-- exportables no requiere tablas nuevas — ver database/docs/decisions.md.
--
--
-- Convención de clasificación: cada tabla se etiqueta según su rol en el modelo.
--   [MAESTRA]   catálogo de referencia, independiente, no cuelga de un documento
--               transaccional (roles, sucursales, categorías, proveedores...).
--   [CABECERA]  encabezado de una transacción (orden de compra, venta, transferencia).
--   [DETALLE]   líneas o eventos que dependen de una cabecera o de una maestra y
--               no tienen sentido por sí solas (items, movimientos, eventos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tablas maestras: sucursales, roles y usuarios
-- ---------------------------------------------------------------------

-- [MAESTRA]
CREATE TABLE branches (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    name        VARCHAR(150) NOT NULL,
    address     TEXT,
    city        VARCHAR(100),
    phone       VARCHAR(30),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- [MAESTRA]
-- Roles fijos según sección 6.2 del análisis (Administrador general, Gerente de
-- sucursal, Operador de inventario). Antes se modelaba como CHECK sobre users.role
-- porque el conjunto es cerrado; se pasa a tabla propia para poder mostrar
-- nombre/descripción en UI y reportes sin hardcodear texto en el backend, y para
-- no tener que migrar el esquema si el análisis agrega un rol más adelante.
CREATE TABLE roles (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(30)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    description TEXT
);

INSERT INTO roles (code, name, description) VALUES
    ('general_admin',      'Administrador general',  'Configuración, usuarios, sucursales, visibilidad total.'),
    ('branch_manager',     'Gerente de sucursal',     'Supervisa su sucursal, aprueba transferencias, consulta reportes.'),
    ('inventory_operator', 'Operador de inventario',  'Ingresos, retiros, solicita transferencias, registra ventas/compras.');

-- [MAESTRA]
CREATE TABLE users (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_id      BIGINT REFERENCES branches(id) ON DELETE RESTRICT,
    role_id        BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    name           VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  TEXT         NOT NULL,
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
    -- Regla "solo el administrador general puede no tener sucursal": Postgres no
    -- permite CHECK con subconsulta a otra tabla (roles), así que queda a cargo
    -- del backend, igual que los totales agregados de purchase_orders/sales.
);

-- [DETALLE]
-- Tokens de un solo uso para el flujo "olvidé mi contraseña" (recuperación por
-- email). Se guarda el hash SHA-256 del token, nunca el token en texto plano
-- (mismo criterio defensivo que password_hash: si esta tabla se filtra, los
-- tokens no quedan directamente usables). ON DELETE CASCADE a propósito, a
-- diferencia de branch_id/role_id en users (RESTRICT): un token de reset no
-- tiene ningún sentido de negocio si el usuario dueño ya no existe.
CREATE TABLE password_reset_tokens (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Catálogo de productos
-- ---------------------------------------------------------------------

-- [MAESTRA]
CREATE TABLE product_categories (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- [MAESTRA]
CREATE TABLE units_of_measure (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR(50) NOT NULL UNIQUE,
    abbreviation VARCHAR(10) NOT NULL UNIQUE
);

-- [MAESTRA]
CREATE TABLE products (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku              VARCHAR(50)  NOT NULL UNIQUE,
    name             VARCHAR(200) NOT NULL,
    description      TEXT,
    category_id      BIGINT REFERENCES product_categories(id) ON DELETE RESTRICT,
    base_unit_id     BIGINT NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT,
    reference_price  NUMERIC(14,2) CHECK (reference_price IS NULL OR reference_price >= 0),
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- [DETALLE de products]
-- Múltiples unidades de medida por producto (sección 3.1), con factor de
-- conversión respecto a la unidad base del producto.
CREATE TABLE product_units (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id          BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_id             BIGINT NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT,
    conversion_factor   NUMERIC(14,6) NOT NULL CHECK (conversion_factor > 0),
    is_purchase_unit    BOOLEAN NOT NULL DEFAULT FALSE,
    is_sale_unit        BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (product_id, unit_id)
);

-- ---------------------------------------------------------------------
-- Inventario y movimientos (3.1) — trazabilidad obligatoria
-- ---------------------------------------------------------------------

-- [MAESTRA] (estado actual, no histórico)
-- Stock por sucursal. weighted_average_cost se recalcula desde el backend
-- en cada ingreso con costo (compra), según sección 3.2.
CREATE TABLE inventory (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_id              BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    product_id             BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    current_quantity       NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    minimum_stock          NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
    maximum_stock          NUMERIC(14,4) CHECK (maximum_stock IS NULL OR maximum_stock >= minimum_stock),
    weighted_average_cost  NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (weighted_average_cost >= 0),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (branch_id, product_id)
);

-- [DETALLE de inventory] — Funcionalidad adicional (sección 4): alertas inteligentes.
-- Cada fila es una alerta disparada al cruzar minimum_stock/maximum_stock; el backend
-- la crea al confirmar un movimiento que afecta inventory.current_quantity.
CREATE TABLE stock_alerts (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_id            BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    product_id           BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    alert_type           VARCHAR(15) NOT NULL CHECK (alert_type IN ('low_stock', 'high_stock')),
    quantity_at_trigger  NUMERIC(14,4) NOT NULL CHECK (quantity_at_trigger >= 0),
    threshold_value      NUMERIC(14,4) NOT NULL,
    status               VARCHAR(15) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    triggered_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_by          BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    resolved_at          TIMESTAMPTZ,
    notified_at          TIMESTAMPTZ,
    -- A diferencia de las reglas de reglas-negocio-criticas.md (que necesitan
    -- consultar otra tabla), esta sí es de una sola fila: si status='resolved',
    -- resolved_by/resolved_at deben quedar poblados. Postgres sí la puede
    -- garantizar, así que se hace aquí y no se delega al backend.
    CHECK (status = 'pending' OR (resolved_by IS NOT NULL AND resolved_at IS NOT NULL))
);

-- [DETALLE] (bitácora, no cuelga de una única cabecera)
-- Historial auditable de todo ingreso/retiro (fecha, responsable, motivo,
-- cantidad — requisito explícito de la sección 3.1).
-- reference_type/reference_id apuntan de forma polimórfica al documento que
-- originó el movimiento (orden de compra, venta, transferencia o ajuste manual);
-- no llevan FK física porque la tabla referenciada varía según el tipo.
CREATE TABLE inventory_movements (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_id           BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    product_id          BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_type       VARCHAR(30) NOT NULL CHECK (movement_type IN (
        'purchase_in', 'return_in', 'adjustment_in', 'transfer_in',
        'sale_out', 'shrinkage_out', 'adjustment_out', 'transfer_out'
    )),
    quantity            NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
    unit_cost           NUMERIC(14,4) CHECK (unit_cost IS NULL OR unit_cost >= 0),
    reason              TEXT NOT NULL,
    responsible_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reference_type      VARCHAR(30) CHECK (reference_type IN ('purchase_order', 'sale', 'transfer', 'manual_adjustment')),
    reference_id        BIGINT,
    movement_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Compras (3.2)
-- ---------------------------------------------------------------------

-- [MAESTRA]
CREATE TABLE suppliers (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR(200) NOT NULL,
    tax_id       VARCHAR(30) UNIQUE,
    contact_name VARCHAR(150),
    phone        VARCHAR(30),
    email        VARCHAR(150),
    address      TEXT,
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- [CABECERA]
CREATE TABLE purchase_orders (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number       VARCHAR(30) NOT NULL UNIQUE,
    supplier_id        BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    branch_id          BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    status             VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'sent', 'confirmed', 'partially_received', 'fully_received', 'cancelled'
    )),
    order_date         TIMESTAMPTZ NOT NULL DEFAULT now(),
    payment_term_days  INTEGER CHECK (payment_term_days IS NULL OR payment_term_days >= 0),
    -- subtotal/total_discount/total agregan las líneas del detalle; no se pueden
    -- derivar con columnas GENERATED (Postgres no soporta agregados entre tablas),
    -- por lo que el backend es responsable de mantenerlos consistentes.
    subtotal           NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_discount     NUMERIC(14,2) NOT NULL DEFAULT 0,
    total              NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_by         BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- [DETALLE de purchase_orders]
CREATE TABLE purchase_order_items (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id        BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity          NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
    unit_price        NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    discount_pct      NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
    subtotal          NUMERIC(14,2) GENERATED ALWAYS AS
        (round(quantity * unit_price * (1 - discount_pct / 100.0), 2)) STORED
);

-- [CABECERA]
CREATE TABLE purchase_receipts (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_order_id  BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    receipt_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_by        BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_complete        BOOLEAN NOT NULL DEFAULT FALSE,
    notes              TEXT
);

-- [DETALLE de purchase_receipts]
CREATE TABLE purchase_receipt_items (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    receipt_id              BIGINT NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    purchase_order_item_id  BIGINT NOT NULL REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
    received_quantity       NUMERIC(14,4) NOT NULL CHECK (received_quantity > 0)
);

-- ---------------------------------------------------------------------
-- Ventas (3.3)
-- ---------------------------------------------------------------------

-- [MAESTRA]
CREATE TABLE price_lists (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    start_date  DATE,
    end_date    DATE,
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- [DETALLE de price_lists]
CREATE TABLE price_list_items (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    price_list_id  BIGINT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id     BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    price          NUMERIC(14,2) NOT NULL CHECK (price >= 0),
    UNIQUE (price_list_id, product_id)
);

-- [CABECERA]
CREATE TABLE sales (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_number     VARCHAR(30) NOT NULL UNIQUE,
    branch_id       BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    price_list_id   BIGINT REFERENCES price_lists(id) ON DELETE RESTRICT,
    seller_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    customer_name   VARCHAR(200),
    sale_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Igual que en purchase_orders: totales agregados, mantenidos por el backend.
    subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_discount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    total           NUMERIC(14,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'voided')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- [DETALLE de sales]
CREATE TABLE sale_items (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id        BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id     BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity       NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
    unit_price     NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    discount_pct   NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
    subtotal       NUMERIC(14,2) GENERATED ALWAYS AS
        (round(quantity * unit_price * (1 - discount_pct / 100.0), 2)) STORED
);

-- ---------------------------------------------------------------------
-- Transferencias entre sucursales (3.4) y logística (3.5)
-- ---------------------------------------------------------------------

-- [CABECERA]
CREATE TABLE transfers (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transfer_number          VARCHAR(30) NOT NULL UNIQUE,
    origin_branch_id         BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    destination_branch_id    BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    requested_by             BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status                   VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN (
        'requested', 'preparing', 'in_transit',
        'fully_received', 'partially_received', 'cancelled'
    )),
    urgency                  VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
    route_priority           VARCHAR(10) CHECK (route_priority IN ('low', 'medium', 'high')),
    carrier                  VARCHAR(150),
    shipping_cost            NUMERIC(14,2) CHECK (shipping_cost IS NULL OR shipping_cost >= 0),
    request_date             TIMESTAMPTZ NOT NULL DEFAULT now(),
    estimated_ship_date      TIMESTAMPTZ,
    actual_ship_date         TIMESTAMPTZ,
    estimated_arrival_date   TIMESTAMPTZ,
    actual_arrival_date      TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (origin_branch_id <> destination_branch_id)
);

-- [DETALLE de transfers]
CREATE TABLE transfer_items (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transfer_id          BIGINT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    product_id           BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    requested_quantity   NUMERIC(14,4) NOT NULL CHECK (requested_quantity > 0),
    shipped_quantity     NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (shipped_quantity >= 0),
    received_quantity    NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
    -- Diferencia positiva = faltante detectado en la recepción parcial (sección 3.4, paso 5).
    difference           NUMERIC(14,4) GENERATED ALWAYS AS (shipped_quantity - received_quantity) STORED
);

-- [DETALLE de transfers]
-- Historial de estados de una transferencia: soporta "visualizar el estado de
-- cada transferencia en curso" y el cálculo de tiempos estimados vs. reales (3.5).
CREATE TABLE transfer_events (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transfer_id    BIGINT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    status         VARCHAR(20) NOT NULL CHECK (status IN (
        'requested', 'preparing', 'in_transit',
        'fully_received', 'partially_received', 'cancelled'
    )),
    event_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes          TEXT,
    recorded_by    BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);
