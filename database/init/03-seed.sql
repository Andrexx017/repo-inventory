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
