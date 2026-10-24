CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    role VARCHAR(20) NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'STAFF', 'MANAGER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(80) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    company_name VARCHAR(120) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(120) UNIQUE,
    phone VARCHAR(25),
    address TEXT,
    lead_time_days INTEGER NOT NULL DEFAULT 7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    cost_price NUMERIC(10, 2) NOT NULL CHECK (cost_price >= 0),
    reorder_threshold INTEGER NOT NULL DEFAULT 10 CHECK (reorder_threshold >= 0),
    lead_time_days INTEGER NOT NULL DEFAULT 7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    warehouse_name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL DEFAULT '',
    code VARCHAR(20) NOT NULL DEFAULT 'WH-DEFAULT',
    max_capacity INTEGER NOT NULL DEFAULT 10000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouse_stock (
    stock_id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (warehouse_id, product_id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    order_id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    created_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    order_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (order_status IN ('PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED')),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    order_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date DATE
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES purchase_orders(order_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
    line_total NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED
);

CREATE TABLE IF NOT EXISTS stock_transactions (
    transaction_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
    performed_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'RESTOCK', 'ADJUSTMENT', 'RETURN')),
    quantity_change INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    notes TEXT,
    transaction_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_alerts (
    alert_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    current_quantity INTEGER NOT NULL,
    reorder_threshold INTEGER NOT NULL,
    alert_severity VARCHAR(20) NOT NULL DEFAULT 'WARNING' CHECK (alert_severity IN ('WARNING', 'CRITICAL')),
    alert_status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (alert_status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forecast_logs (
    forecast_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    model_name VARCHAR(50) NOT NULL DEFAULT 'LINEAR_REGRESSION',
    forecast_period VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    predicted_demand INTEGER NOT NULL,
    actual_demand INTEGER,
    confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0.85,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_lookup ON warehouse_stock(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transactions_time_product ON stock_transactions(product_id, transaction_time);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON stock_alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_orders_status_supplier ON purchase_orders(supplier_id, order_status);

CREATE OR REPLACE VIEW v_product_inventory_status AS
SELECT p.product_id, p.sku, p.product_name, c.category_name, p.unit_price, p.cost_price,
       p.reorder_threshold, COALESCE(SUM(ws.quantity_on_hand), 0) AS total_stock,
       COALESCE(SUM(ws.quantity_on_hand), 0) * p.unit_price AS total_inventory_value,
       CASE WHEN COALESCE(SUM(ws.quantity_on_hand), 0) = 0 THEN 'OUT_OF_STOCK'
            WHEN COALESCE(SUM(ws.quantity_on_hand), 0) <= p.reorder_threshold THEN 'LOW_STOCK'
            ELSE 'HEALTHY' END AS stock_status
FROM products p
JOIN categories c ON c.category_id = p.category_id
LEFT JOIN warehouse_stock ws ON ws.product_id = p.product_id
GROUP BY p.product_id, c.category_name;

CREATE OR REPLACE FUNCTION fn_check_low_stock()
RETURNS TRIGGER AS $$
DECLARE
    threshold_value INTEGER;
    severity_value VARCHAR(20);
BEGIN
    SELECT reorder_threshold INTO threshold_value
    FROM products WHERE product_id = NEW.product_id;

    IF NEW.quantity_on_hand <= threshold_value THEN
        severity_value := CASE WHEN NEW.quantity_on_hand <= 5 THEN 'CRITICAL' ELSE 'WARNING' END;
        IF NOT EXISTS (
            SELECT 1 FROM stock_alerts
            WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id AND alert_status = 'OPEN'
        ) THEN
            INSERT INTO stock_alerts (product_id, warehouse_id, current_quantity, reorder_threshold, alert_severity, alert_status)
            VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity_on_hand, threshold_value, severity_value, 'OPEN');
        END IF;
        UPDATE stock_alerts
        SET current_quantity = NEW.quantity_on_hand,
            reorder_threshold = threshold_value,
            alert_severity = severity_value,
            triggered_at = CURRENT_TIMESTAMP
        WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id AND alert_status = 'OPEN';
    ELSE
        UPDATE stock_alerts SET alert_status = 'RESOLVED'
        WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id AND alert_status = 'OPEN';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_level_alert ON warehouse_stock;
CREATE TRIGGER trg_stock_level_alert
AFTER INSERT OR UPDATE OF quantity_on_hand ON warehouse_stock
FOR EACH ROW EXECUTE FUNCTION fn_check_low_stock();
