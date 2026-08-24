-- =====================================================================
-- Índices adicionales.
-- Postgres ya crea índice automático para cada PRIMARY KEY y UNIQUE
-- (branches.code, users.email, products.sku, product_units(product_id, unit_id),
-- inventory(branch_id, product_id), purchase_orders.order_number,
-- price_list_items(price_list_id, product_id), sales.sale_number,
-- transfers.transfer_number). Aquí solo se cubren FKs y patrones de consulta
-- frecuentes que no quedan indexados por esas restricciones.
-- =====================================================================

-- Usuarios por sucursal (listados de operadores/gerentes por sede) y por rol.
CREATE INDEX idx_users_branch ON users (branch_id);
CREATE INDEX idx_users_role ON users (role_id);

-- Catálogo: filtros habituales por categoría/unidad base.
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_base_unit ON products (base_unit_id);
CREATE INDEX idx_product_units_product ON product_units (product_id);

-- Inventario: "consultar el inventario de cualquier otra sucursal" por producto,
-- y detección rápida de productos por debajo del stock mínimo (dashboard 3.6).
CREATE INDEX idx_inventory_product ON inventory (product_id);
CREATE INDEX idx_inventory_low_stock ON inventory (branch_id) WHERE current_quantity <= minimum_stock;

-- Alertas inteligentes (sección 4): listado de alertas pendientes por sucursal
-- y por producto, y consulta del historial de una alerta ya resuelta.
CREATE INDEX idx_stock_alerts_branch_status ON stock_alerts (branch_id, status);
CREATE INDEX idx_stock_alerts_product ON stock_alerts (product_id);

-- No es solo un índice de performance: es la regla de negocio "no puede haber
-- dos alertas abiertas para el mismo producto/sucursal/tipo" hecha constraint.
-- Al ser parcial (WHERE status = 'pending'), no molesta al historial de
-- alertas ya resueltas, solo impide duplicar las que siguen abiertas.
CREATE UNIQUE INDEX ux_stock_alerts_open ON stock_alerts (branch_id, product_id, alert_type) WHERE status = 'pending';

-- Movimientos: trazabilidad por sucursal/producto, por fecha, por responsable
-- y por documento de origen (compra/venta/transferencia/ajuste).
CREATE INDEX idx_inventory_movements_branch_product ON inventory_movements (branch_id, product_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements (movement_date);
CREATE INDEX idx_inventory_movements_responsible ON inventory_movements (responsible_user_id);
CREATE INDEX idx_inventory_movements_reference ON inventory_movements (reference_type, reference_id);

-- Compras: histórico por proveedor y por producto (sección 3.2), y filtros por estado.
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders (supplier_id);
CREATE INDEX idx_purchase_orders_branch ON purchase_orders (branch_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders (status);
CREATE INDEX idx_purchase_order_items_order ON purchase_order_items (purchase_order_id);
CREATE INDEX idx_purchase_order_items_product ON purchase_order_items (product_id);
CREATE INDEX idx_purchase_receipts_order ON purchase_receipts (purchase_order_id);
CREATE INDEX idx_purchase_receipt_items_receipt ON purchase_receipt_items (receipt_id);
CREATE INDEX idx_purchase_receipt_items_order_item ON purchase_receipt_items (purchase_order_item_id);

-- Listas de precio.
CREATE INDEX idx_price_list_items_product ON price_list_items (product_id);

-- Ventas: comparativa mes actual vs. anteriores por sucursal y fecha (dashboard 3.6).
CREATE INDEX idx_sales_branch_date ON sales (branch_id, sale_date);
CREATE INDEX idx_sales_seller ON sales (seller_id);
CREATE INDEX idx_sales_status ON sales (status);
CREATE INDEX idx_sale_items_sale ON sale_items (sale_id);
CREATE INDEX idx_sale_items_product ON sale_items (product_id);

-- Transferencias: por sucursal origen/destino, estado y fecha de solicitud.
CREATE INDEX idx_transfers_origin ON transfers (origin_branch_id);
CREATE INDEX idx_transfers_destination ON transfers (destination_branch_id);
CREATE INDEX idx_transfers_status ON transfers (status);
CREATE INDEX idx_transfers_request_date ON transfers (request_date);
CREATE INDEX idx_transfer_items_transfer ON transfer_items (transfer_id);
CREATE INDEX idx_transfer_items_product ON transfer_items (product_id);
CREATE INDEX idx_transfer_events_transfer ON transfer_events (transfer_id);
CREATE INDEX idx_transfer_events_date ON transfer_events (event_date);
