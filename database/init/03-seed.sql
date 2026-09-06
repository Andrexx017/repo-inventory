-- =====================================================================
-- Datos de prueba — sucursales, catálogo y un usuario por rol.
-- Pensado para desarrollo/pruebas manuales durante la Fase 4/5, no para producción.
--
-- IMPORTANTE: los scripts de database/init/ solo se ejecutan automáticamente la
-- primera vez que el volumen de Postgres está vacío (comportamiento de la imagen
-- oficial). Si ya tenés datos cargados (ej. corriste 01-schema.sql/02-indexes.sql
-- a mano por DBeaver), este script también hay que correrlo a mano una vez.
--
-- Credenciales de prueba (usuarios sembrados más abajo) — SOLO PARA DESARROLLO:
--   Password para los 3: Prueba123!
--   admin@inventory.test         (general_admin,      sin sucursal)
--   diana.torres@inventory.test  (branch_manager,     Sucursal Bogotá)
--   julian.gomez@inventory.test  (inventory_operator, Sucursal Medellín)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Sucursales 
-- ---------------------------------------------------------------------

INSERT INTO branches (code, name, address, city, phone) VALUES
    ('BOG-01', 'Sucursal Bogotá',   'Cra 15 # 93-47, Bogotá',    'Bogotá',   '+57 601 555 0101'),
    ('MED-01', 'Sucursal Medellín', 'Cra 43A # 5-15, Medellín',  'Medellín', '+57 604 555 0102'),
    ('CAL-01', 'Sucursal Cali',     'Av 6N # 23N-25, Cali',      'Cali',     '+57 602 555 0103');

-- ---------------------------------------------------------------------
-- Catálogo: categorías, unidades de medida y productos
-- ---------------------------------------------------------------------

INSERT INTO product_categories (name, description) VALUES
    ('Alimentos',  'Productos alimenticios no perecederos y básicos de despensa'),
    ('Bebidas',    'Bebidas y lácteos líquidos'),
    ('Aseo',       'Productos de aseo personal y del hogar'),
    ('Panadería',  'Productos de panadería empacados');

INSERT INTO units_of_measure (name, abbreviation) VALUES
    ('Unidad',      'UN'),
    ('Caja',        'CJ'),
    ('Kilogramo',   'KG'),
    ('Litro',       'LT');

INSERT INTO products (sku, name, description, category_id, base_unit_id, reference_price) VALUES
    ('CAF-001', 'Café Sello Rojo 500g',    'Café molido tostado, presentación 500g',
        (SELECT id FROM product_categories WHERE name = 'Alimentos'),
        (SELECT id FROM units_of_measure WHERE abbreviation = 'UN'), 15000.00),
    ('ARR-001', 'Arroz Diana 500g',        'Arroz blanco, presentación 500g',
        (SELECT id FROM product_categories WHERE name = 'Alimentos'),
        (SELECT id FROM units_of_measure WHERE abbreviation = 'UN'), 3200.00),
    ('PNL-001', 'Panela San Jorge 1kg',    'Panela en bloque, presentación 1kg',
        (SELECT id FROM product_categories WHERE name = 'Alimentos'),
        (SELECT id FROM units_of_measure WHERE abbreviation = 'KG'), 4500.00),
    ('PAN-001', 'Pan Bimbo Tajado',        'Pan tajado empacado',
        (SELECT id FROM product_categories WHERE name = 'Panadería'),
        (SELECT id FROM units_of_measure WHERE abbreviation = 'UN'), 6500.00),
    ('LEC-001', 'Leche Alquería 1L',       'Leche entera UHT, presentación 1 litro',
        (SELECT id FROM product_categories WHERE name = 'Bebidas'),
        (SELECT id FROM units_of_measure WHERE abbreviation = 'LT'), 4200.00),
    ('JAB-001', 'Jabón Rey',               'Jabón en barra multiusos',
        (SELECT id FROM product_categories WHERE name = 'Aseo'),
        (SELECT id FROM units_of_measure WHERE abbreviation = 'UN'), 3900.00);

-- Unidad de compra/venta de cada producto = su propia unidad base (factor 1).
INSERT INTO product_units (product_id, unit_id, conversion_factor, is_purchase_unit, is_sale_unit)
SELECT p.id, p.base_unit_id, 1, TRUE, TRUE
FROM products p;

-- ---------------------------------------------------------------------
-- Proveedores de prueba (módulo Compras, RF-12)
-- ---------------------------------------------------------------------

INSERT INTO suppliers (name, tax_id, contact_name, phone, email, address) VALUES
    ('Distribuidora La Sabana S.A.S.', '900123456-1', 'Marcela Rojas', '+57 601 555 0201',
        'ventas@lasabana.test', 'Cra 68 # 24-15, Bogotá'),
    ('Alimentos del Valle Ltda.',      '900654321-2', 'Andrés Muñoz',  '+57 602 555 0202',
        'pedidos@alimentosdelvalle.test', 'Av 4N # 12-30, Cali'),
    ('Comercializadora Antioquia S.A.', '900789012-3', 'Laura Vélez',  '+57 604 555 0203',
        'compras@comerantioquia.test', 'Cl 50 # 45-20, Medellín');

-- ---------------------------------------------------------------------
-- Lista de precios de prueba (módulo Ventas, RF-18)
-- ---------------------------------------------------------------------

INSERT INTO price_lists (name, description, start_date, end_date) VALUES
    ('Lista Mayorista', 'Precios preferenciales para clientes de alto volumen', NULL, NULL);

INSERT INTO price_list_items (price_list_id, product_id, price)
SELECT (SELECT id FROM price_lists WHERE name = 'Lista Mayorista'), p.id, ROUND(p.reference_price * 0.85, 2)
FROM products p
WHERE p.sku IN ('CAF-001', 'ARR-001', 'JAB-001');

-- ---------------------------------------------------------------------
-- Usuarios de prueba — uno por rol (ver credenciales en el encabezado)
-- ---------------------------------------------------------------------

INSERT INTO users (branch_id, role_id, name, email, password_hash) VALUES
    (NULL,
        (SELECT id FROM roles WHERE code = 'general_admin'),
        'Carlos Ramírez', 'admin@inventory.test',
        'AQAAAAIAAYagAAAAEKc4IADwECgyZmzBin4/EDyiT4vJE9XXEuyxftdLmoXYQEwl1fpEYcK2QmXwOozsmw=='),
    ((SELECT id FROM branches WHERE code = 'BOG-01'),
        (SELECT id FROM roles WHERE code = 'branch_manager'),
        'Diana Torres', 'diana.torres@inventory.test',
        'AQAAAAIAAYagAAAAEKc4IADwECgyZmzBin4/EDyiT4vJE9XXEuyxftdLmoXYQEwl1fpEYcK2QmXwOozsmw=='),
    ((SELECT id FROM branches WHERE code = 'MED-01'),
        (SELECT id FROM roles WHERE code = 'inventory_operator'),
        'Julián Gómez', 'julian.gomez@inventory.test',
        'AQAAAAIAAYagAAAAEKc4IADwECgyZmzBin4/EDyiT4vJE9XXEuyxftdLmoXYQEwl1fpEYcK2QmXwOozsmw==');

-- ---------------------------------------------------------------------
-- Inventario inicial por sucursal (RF-06 a RF-11)
--
-- CAL-01 se deja deliberadamente sin PAN-001/JAB-001: esos dos productos
-- nacen recién con la recepción de la orden de compra OC-000002 más abajo,
-- para poder probar en vivo el flujo real "get-or-create" de
-- PurchaseReceiptService (una fila de inventory que no existe todavía).
-- BOG-01/CAF-001 y MED-01/ARR-001 ya arrancan por debajo o justo en su
-- minimum_stock, a propósito, para poder disparar una alerta de stock bajo
-- (RF-34) con el primer movimiento que se registre sobre ellos en las
-- pruebas manuales.
-- ---------------------------------------------------------------------

INSERT INTO inventory (branch_id, product_id, current_quantity, minimum_stock, maximum_stock, weighted_average_cost)
SELECT b.id, p.id, v.qty, v.min_stock, v.max_stock, v.wac
FROM (VALUES
    ('BOG-01', 'CAF-001', 40::numeric,  10::numeric, 100::numeric, 15000.00::numeric),
    ('BOG-01', 'ARR-001',  5,  10, 200,  3200.00),
    ('BOG-01', 'PNL-001', 60,  15, NULL,  4500.00),
    ('BOG-01', 'PAN-001', 25,  10,  80,  6500.00),
    ('BOG-01', 'LEC-001', 30,  10, 100,  4200.00),
    ('BOG-01', 'JAB-001', 50,  10, 100,  3900.00),
    ('MED-01', 'CAF-001', 20,  10, 100, 15000.00),
    ('MED-01', 'ARR-001', 80,  10, 100,  3200.00),
    ('MED-01', 'PNL-001', 10,  10, NULL,  4500.00),
    ('MED-01', 'PAN-001', 15,  10,  80,  6500.00),
    ('MED-01', 'LEC-001',  5,  10, 100,  4200.00),
    ('MED-01', 'JAB-001', 40,  10, 100,  3900.00),
    ('CAL-01', 'CAF-001', 15,  10, 100, 15000.00),
    ('CAL-01', 'ARR-001', 10,  10, 100,  3200.00),
    ('CAL-01', 'LEC-001', 12,  10, 100,  4200.00)
) AS v(branch_code, sku, qty, min_stock, max_stock, wac)
JOIN branches b ON b.code = v.branch_code
JOIN products p ON p.sku = v.sku;

-- Movimiento de apertura por cada fila de arriba (RF-11: ninguna fila de
-- inventory sin su historial en inventory_movements). BOG-01/CAF-001 y
-- MED-01/ARR-001 abren con 5 unidades más de las que quedan en `inventory`
-- — la diferencia es exactamente la venta que se registra más abajo
-- (VTA-000001/VTA-000002), para que el historial de movimientos siga
-- sumando al mismo total que ya quedó en la tabla `inventory`.
INSERT INTO inventory_movements (
    branch_id, product_id, movement_type, quantity, unit_cost, reason,
    responsible_user_id, reference_type, reference_id, movement_date, created_at
)
SELECT b.id, p.id, 'adjustment_in', v.qty, NULLIF(v.wac, 0), 'Saldo inicial de apertura (datos de prueba)',
    (SELECT id FROM users WHERE email = 'admin@inventory.test'),
    'manual_adjustment', NULL, now() - interval '30 days', now() - interval '30 days'
FROM (VALUES
    ('BOG-01', 'CAF-001', 45::numeric, 15000.00::numeric),
    ('BOG-01', 'ARR-001',  5,  3200.00),
    ('BOG-01', 'PNL-001', 60,  4500.00),
    ('BOG-01', 'PAN-001', 25,  6500.00),
    ('BOG-01', 'LEC-001', 30,  4200.00),
    ('BOG-01', 'JAB-001', 50,  3900.00),
    ('MED-01', 'CAF-001', 20, 15000.00),
    ('MED-01', 'ARR-001', 85,  3200.00),
    ('MED-01', 'PNL-001', 10,  4500.00),
    ('MED-01', 'PAN-001', 15,  6500.00),
    ('MED-01', 'LEC-001',  5,  4200.00),
    ('MED-01', 'JAB-001', 40,  3900.00),
    ('CAL-01', 'CAF-001', 15, 15000.00),
    ('CAL-01', 'ARR-001', 10,  3200.00),
    ('CAL-01', 'LEC-001', 12,  4200.00)
) AS v(branch_code, sku, qty, wac)
JOIN branches b ON b.code = v.branch_code
JOIN products p ON p.sku = v.sku;

-- ---------------------------------------------------------------------
-- Ventas de prueba (módulo Ventas, RF-16 a RF-19)
-- Una sin lista de precios (precio de referencia) y otra con la Lista
-- Mayorista, para ejercitar los dos caminos de resolución de precio de
-- SaleService.CreateAsync. Ambas descuentan stock de las filas de arriba.
-- ---------------------------------------------------------------------

INSERT INTO sales (sale_number, branch_id, price_list_id, seller_id, customer_name, sale_date, subtotal, total_discount, total, status) VALUES
    ('VTA-000001',
        (SELECT id FROM branches WHERE code = 'BOG-01'),
        NULL,
        (SELECT id FROM users WHERE email = 'diana.torres@inventory.test'),
        'Cliente Mostrador', now() - interval '5 days',
        75000.00, 0.00, 75000.00, 'confirmed'),
    ('VTA-000002',
        (SELECT id FROM branches WHERE code = 'MED-01'),
        (SELECT id FROM price_lists WHERE name = 'Lista Mayorista'),
        (SELECT id FROM users WHERE email = 'julian.gomez@inventory.test'),
        'Supermercado El Ahorro', now() - interval '2 days',
        13600.00, 0.00, 13600.00, 'confirmed');

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_pct) VALUES
    ((SELECT id FROM sales WHERE sale_number = 'VTA-000001'),
        (SELECT id FROM products WHERE sku = 'CAF-001'), 5, 15000.00, 0),
    ((SELECT id FROM sales WHERE sale_number = 'VTA-000002'),
        (SELECT id FROM products WHERE sku = 'ARR-001'), 5, 2720.00, 0);

-- Movimiento de salida que corresponde a cada venta de arriba (mismo patrón
-- que SaleService.CreateAsync: unit_cost NULL, reference_type='sale').
INSERT INTO inventory_movements (
    branch_id, product_id, movement_type, quantity, unit_cost, reason,
    responsible_user_id, reference_type, reference_id, movement_date, created_at
) VALUES
    ((SELECT id FROM branches WHERE code = 'BOG-01'), (SELECT id FROM products WHERE sku = 'CAF-001'),
        'sale_out', 5, NULL, 'Venta VTA-000001',
        (SELECT id FROM users WHERE email = 'diana.torres@inventory.test'),
        'sale', (SELECT id FROM sales WHERE sale_number = 'VTA-000001'),
        now() - interval '5 days', now() - interval '5 days'),
    ((SELECT id FROM branches WHERE code = 'MED-01'), (SELECT id FROM products WHERE sku = 'ARR-001'),
        'sale_out', 5, NULL, 'Venta VTA-000002',
        (SELECT id FROM users WHERE email = 'julian.gomez@inventory.test'),
        'sale', (SELECT id FROM sales WHERE sale_number = 'VTA-000002'),
        now() - interval '2 days', now() - interval '2 days');

-- ---------------------------------------------------------------------
-- Órdenes de compra de prueba (módulo Compras, RF-12 a RF-15)
--
-- Ambas nacen 'confirmed' directo (el Operador no necesita aprobación del
-- Gerente, ver PurchaseOrderService.CreateAsync) y ninguna queda
-- 'fully_received' a propósito, para poder probar en vivo los botones
-- "Cancelar"/"Recibir" en vez de mostrar el resultado ya consumado —
-- OC-000002, en particular, sirve para ver el cálculo de costo promedio
-- ponderado (RF-15) ejecutándose sobre productos que CAL-01 todavía no
-- tiene en `inventory`.
-- ---------------------------------------------------------------------

INSERT INTO purchase_orders (order_number, supplier_id, branch_id, status, order_date, payment_term_days, subtotal, total_discount, total, created_by, decided_by, decided_at) VALUES
    ('OC-000001',
        (SELECT id FROM suppliers WHERE name = 'Distribuidora La Sabana S.A.S.'),
        (SELECT id FROM branches WHERE code = 'BOG-01'),
        'confirmed', now() - interval '3 days', 30,
        420000.00, 0.00, 420000.00,
        (SELECT id FROM users WHERE email = 'admin@inventory.test'), NULL, NULL),
    ('OC-000002',
        (SELECT id FROM suppliers WHERE name = 'Alimentos del Valle Ltda.'),
        (SELECT id FROM branches WHERE code = 'CAL-01'),
        'confirmed', now() - interval '1 day', 15,
        450000.00, 0.00, 450000.00,
        (SELECT id FROM users WHERE email = 'admin@inventory.test'), NULL, NULL);

INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price, discount_pct) VALUES
    ((SELECT id FROM purchase_orders WHERE order_number = 'OC-000001'),
        (SELECT id FROM products WHERE sku = 'CAF-001'), 30, 14000.00, 0),
    ((SELECT id FROM purchase_orders WHERE order_number = 'OC-000002'),
        (SELECT id FROM products WHERE sku = 'PAN-001'), 40, 6000.00, 0),
    ((SELECT id FROM purchase_orders WHERE order_number = 'OC-000002'),
        (SELECT id FROM products WHERE sku = 'JAB-001'), 60, 3500.00, 0);

-- ---------------------------------------------------------------------
-- Transferencias de prueba (módulo Transferencias, RF-20 a RF-28)
--
-- Ninguna avanza más allá de 'requested' a propósito, mismo criterio que
-- las órdenes de compra: TR-000001 queda sin aprobar (prueba el botón
-- "Aprobar") y TR-000002 ya aprobada (prueba "Preparar" en la sucursal
-- origen) — despachar/recibir se prueban en vivo, no se pre-cargan, para no
-- tener que descontar/sumar stock a mano en este script.
-- ---------------------------------------------------------------------

INSERT INTO transfers (transfer_number, origin_branch_id, destination_branch_id, requested_by, approved_by, approved_at, status, urgency, request_date) VALUES
    ('TR-000001',
        (SELECT id FROM branches WHERE code = 'MED-01'),
        (SELECT id FROM branches WHERE code = 'CAL-01'),
        (SELECT id FROM users WHERE email = 'admin@inventory.test'),
        NULL, NULL,
        'requested', 'medium', now() - interval '1 day'),
    ('TR-000002',
        (SELECT id FROM branches WHERE code = 'BOG-01'),
        (SELECT id FROM branches WHERE code = 'MED-01'),
        (SELECT id FROM users WHERE email = 'julian.gomez@inventory.test'),
        (SELECT id FROM users WHERE email = 'admin@inventory.test'), now() - interval '6 hours',
        'requested', 'high', now() - interval '1 day');

INSERT INTO transfer_items (transfer_id, product_id, requested_quantity) VALUES
    ((SELECT id FROM transfers WHERE transfer_number = 'TR-000001'),
        (SELECT id FROM products WHERE sku = 'CAF-001'), 10),
    ((SELECT id FROM transfers WHERE transfer_number = 'TR-000002'),
        (SELECT id FROM products WHERE sku = 'PNL-001'), 20);

INSERT INTO transfer_events (transfer_id, status, event_date, notes, recorded_by) VALUES
    ((SELECT id FROM transfers WHERE transfer_number = 'TR-000001'),
        'requested', now() - interval '1 day', NULL,
        (SELECT id FROM users WHERE email = 'admin@inventory.test')),
    ((SELECT id FROM transfers WHERE transfer_number = 'TR-000002'),
        'requested', now() - interval '1 day', NULL,
        (SELECT id FROM users WHERE email = 'julian.gomez@inventory.test')),
    ((SELECT id FROM transfers WHERE transfer_number = 'TR-000002'),
        'requested', now() - interval '6 hours', 'Aprobada por el gerente de la sucursal destino.',
        (SELECT id FROM users WHERE email = 'admin@inventory.test'));
