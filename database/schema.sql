-- ============================================================================
-- AI-Based Inventory Management System (AIMS)
-- Database Management System Course Project — Review 1 Deliverable
-- Schema DDL: Tables, Constraints, Indexes, Views, and Triggers
-- ============================================================================

-- Drop tables in reverse dependency order if recreating
DROP VIEW IF EXISTS v_monthly_sales_velocity;
DROP VIEW IF EXISTS v_product_inventory_status;
DROP TRIGGER IF EXISTS trg_stock_level_alert ON warehouse_stock;
DROP FUNCTION IF EXISTS fn_check_low_stock();
DROP TABLE IF EXISTS forecast_logs CASCADE;
DROP TABLE IF EXISTS stock_alerts CASCADE;
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS warehouse_stock CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ----------------------------------------------------------------------------
-- 1. USERS & RBAC
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STAFF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_role CHECK (role IN ('ADMIN', 'STAFF', 'MANAGER'))
);

-- ----------------------------------------------------------------------------
-- 2. CATEGORIES
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(80) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. SUPPLIERS
-- ----------------------------------------------------------------------------
CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    company_name VARCHAR(120) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(120) UNIQUE,
    phone VARCHAR(25),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. PRODUCTS (Catalog & Base Inventory Thresholds)
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    unit_price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL,
    reorder_threshold INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_cost_price CHECK (cost_price >= 0),
    CONSTRAINT chk_reorder_threshold CHECK (reorder_threshold >= 0)
);

-- ----------------------------------------------------------------------------
-- 5. WAREHOUSES
-- ----------------------------------------------------------------------------
CREATE TABLE warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    warehouse_name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    max_capacity INT DEFAULT 10000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. WAREHOUSE_STOCK (Resolving M:N Products <-> Warehouses)
-- ----------------------------------------------------------------------------
CREATE TABLE warehouse_stock (
    stock_id SERIAL PRIMARY KEY,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_warehouse_product UNIQUE (warehouse_id, product_id),
    CONSTRAINT chk_non_negative_stock CHECK (quantity_on_hand >= 0)
);

-- ----------------------------------------------------------------------------
-- 7. PURCHASE_ORDERS (Supplier Procurement Headers)
-- ----------------------------------------------------------------------------
CREATE TABLE purchase_orders (
    order_id SERIAL PRIMARY KEY,
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    created_by_user_id INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    order_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date DATE,
    CONSTRAINT chk_order_status CHECK (order_status IN ('PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED')),
    CONSTRAINT chk_positive_total CHECK (total_amount >= 0)
);

-- ----------------------------------------------------------------------------
-- 8. PURCHASE_ORDER_ITEMS (Order Line Items)
-- ----------------------------------------------------------------------------
CREATE TABLE purchase_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES purchase_orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity_ordered INT NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    line_total NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
    CONSTRAINT chk_item_quantity CHECK (quantity_ordered > 0),
    CONSTRAINT chk_item_cost CHECK (unit_cost >= 0)
);

-- ----------------------------------------------------------------------------
-- 9. STOCK_TRANSACTIONS (Immutable Inventory Movement Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE stock_transactions (
    transaction_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
    performed_by_user_id INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    transaction_type VARCHAR(20) NOT NULL,
    quantity_change INT NOT NULL, -- Positive for incoming, negative for outgoing
    balance_after INT NOT NULL,
    notes TEXT,
    transaction_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_transaction_type CHECK (
        transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'RESTOCK', 'ADJUSTMENT', 'RETURN')
    )
);

-- ----------------------------------------------------------------------------
-- 10. STOCK_ALERTS (Triggered Real-time Warnings)
-- ----------------------------------------------------------------------------
CREATE TABLE stock_alerts (
    alert_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    current_quantity INT NOT NULL,
    reorder_threshold INT NOT NULL,
    alert_severity VARCHAR(20) NOT NULL DEFAULT 'WARNING',
    alert_status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_alert_severity CHECK (alert_severity IN ('WARNING', 'CRITICAL')),
    CONSTRAINT chk_alert_status CHECK (alert_status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED'))
);

-- ----------------------------------------------------------------------------
-- 11. FORECAST_LOGS (AI Predictions vs Ground Truth)
-- ----------------------------------------------------------------------------
CREATE TABLE forecast_logs (
    forecast_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    model_name VARCHAR(50) NOT NULL DEFAULT 'LINEAR_REGRESSION',
    forecast_period VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    predicted_demand INT NOT NULL,
    actual_demand INT DEFAULT NULL,
    confidence_score NUMERIC(5, 2) DEFAULT 0.85,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_warehouse_stock_lookup ON warehouse_stock(product_id, warehouse_id);
CREATE INDEX idx_transactions_time_product ON stock_transactions(product_id, transaction_time);
CREATE INDEX idx_transactions_type ON stock_transactions(transaction_type);
CREATE INDEX idx_stock_alerts_status ON stock_alerts(alert_status);
CREATE INDEX idx_orders_status_supplier ON purchase_orders(supplier_id, order_status);

-- ============================================================================
-- REPORTING & AI VIEWS
-- ============================================================================

-- View 1: Consolidated Product Stock Overview (Multi-warehouse roll-up)
CREATE OR REPLACE VIEW v_product_inventory_status AS
SELECT 
    p.product_id,
    p.sku,
    p.product_name,
    c.category_name,
    p.unit_price,
    p.cost_price,
    p.reorder_threshold,
    COALESCE(SUM(ws.quantity_on_hand), 0) AS total_stock,
    (COALESCE(SUM(ws.quantity_on_hand), 0) * p.unit_price) AS total_inventory_value,
    CASE 
        WHEN COALESCE(SUM(ws.quantity_on_hand), 0) = 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(SUM(ws.quantity_on_hand), 0) <= p.reorder_threshold THEN 'LOW_STOCK'
        ELSE 'HEALTHY'
    END AS stock_status
FROM products p
JOIN categories c ON p.category_id = c.category_id
LEFT JOIN warehouse_stock ws ON p.product_id = ws.product_id
GROUP BY p.product_id, p.sku, p.product_name, c.category_name, p.unit_price, p.cost_price, p.reorder_threshold;

-- View 2: Monthly Sales Velocity (Training Feed for AI Forecasting Model)
CREATE OR REPLACE VIEW v_monthly_sales_velocity AS
SELECT 
    t.product_id,
    p.sku,
    p.product_name,
    DATE_TRUNC('month', t.transaction_time) AS sales_month,
    ABS(SUM(t.quantity_change)) AS total_quantity_sold,
    COUNT(t.transaction_id) AS transaction_count
FROM stock_transactions t
JOIN products p ON t.product_id = p.product_id
WHERE t.transaction_type = 'STOCK_OUT'
GROUP BY t.product_id, p.sku, p.product_name, DATE_TRUNC('month', t.transaction_time);

-- ============================================================================
-- DATABASE TRIGGERS (DBMS Core Requirement)
-- ============================================================================

-- Function: Detect Low Stock and Auto-Insert Alert
CREATE OR REPLACE FUNCTION fn_check_low_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_reorder_threshold INT;
    v_severity VARCHAR(20);
BEGIN
    -- Query product threshold
    SELECT reorder_threshold INTO v_reorder_threshold
    FROM products
    WHERE product_id = NEW.product_id;

    -- If quantity has dropped below or equal to threshold
    IF NEW.quantity_on_hand <= v_reorder_threshold THEN
        -- Assign severity
        IF NEW.quantity_on_hand = 0 THEN
            v_severity := 'CRITICAL';
        ELSE
            v_severity := 'WARNING';
        END IF;

        -- Check if an OPEN alert already exists for this product and warehouse
        IF NOT EXISTS (
            SELECT 1 FROM stock_alerts 
            WHERE product_id = NEW.product_id 
              AND warehouse_id = NEW.warehouse_id 
              AND alert_status = 'OPEN'
        ) THEN
            INSERT INTO stock_alerts (
                product_id, 
                warehouse_id, 
                current_quantity, 
                reorder_threshold, 
                alert_severity, 
                alert_status
            )
            VALUES (
                NEW.product_id, 
                NEW.warehouse_id, 
                NEW.quantity_on_hand, 
                v_reorder_threshold, 
                v_severity, 
                'OPEN'
            );
        ELSE
            -- Update existing open alert with newest quantity
            UPDATE stock_alerts
            SET current_quantity = NEW.quantity_on_hand,
                alert_severity = v_severity,
                triggered_at = CURRENT_TIMESTAMP
            WHERE product_id = NEW.product_id 
              AND warehouse_id = NEW.warehouse_id 
              AND alert_status = 'OPEN';
        END IF;
    ELSE
        -- If stock was replenished above threshold, auto-resolve previous open alerts
        UPDATE stock_alerts
        SET alert_status = 'RESOLVED'
        WHERE product_id = NEW.product_id 
          AND warehouse_id = NEW.warehouse_id 
          AND alert_status = 'OPEN';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition on warehouse_stock table
CREATE TRIGGER trg_stock_level_alert
AFTER INSERT OR UPDATE OF quantity_on_hand ON warehouse_stock
FOR EACH ROW
EXECUTE FUNCTION fn_check_low_stock();

-- ============================================================================
-- STORED PROCEDURES (Atomic Business Logic & ACID Integrity)
-- ============================================================================

-- Procedure 1: Atomic Stock Movement with Constraint Checks & Ledger Logging
CREATE OR REPLACE PROCEDURE sp_process_stock_movement(
    p_product_id INT,
    p_warehouse_id INT,
    p_user_id INT,
    p_type VARCHAR(20),
    p_quantity_change INT,
    p_notes TEXT,
    INOUT p_new_balance INT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_stock INT;
BEGIN
    -- 1. Ensure product and warehouse exist
    IF NOT EXISTS (SELECT 1 FROM products WHERE product_id = p_product_id) THEN
        RAISE EXCEPTION 'Product with ID % does not exist.', p_product_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM warehouses WHERE warehouse_id = p_warehouse_id) THEN
        RAISE EXCEPTION 'Warehouse with ID % does not exist.', p_warehouse_id;
    END IF;

    -- 2. Lock and retrieve current stock
    SELECT quantity_on_hand INTO v_current_stock
    FROM warehouse_stock
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- If stock row does not exist, initialize at 0
        INSERT INTO warehouse_stock (warehouse_id, product_id, quantity_on_hand)
        VALUES (p_warehouse_id, p_product_id, 0);
        v_current_stock := 0;
    END IF;

    -- 3. Calculate new balance
    p_new_balance := v_current_stock + p_quantity_change;

    -- Enforce Non-negative Check Constraint
    IF p_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient stock! Current: %, Attempted change: %, Resulting: % (Stock cannot be negative).',
            v_current_stock, p_quantity_change, p_new_balance;
    END IF;

    -- 4. Atomic stock update (Will fire trg_stock_level_alert)
    UPDATE warehouse_stock
    SET quantity_on_hand = p_new_balance,
        last_updated = CURRENT_TIMESTAMP
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

    -- 5. Append immutable entry to transaction audit ledger
    INSERT INTO stock_transactions (
        product_id,
        warehouse_id,
        performed_by_user_id,
        transaction_type,
        quantity_change,
        balance_after,
        notes
    )
    VALUES (
        p_product_id,
        p_warehouse_id,
        p_user_id,
        p_type,
        p_quantity_change,
        p_new_balance,
        p_notes
    );
END;
$$;

-- Procedure 2: Receive Purchase Order and Atomically Restock Products
CREATE OR REPLACE PROCEDURE sp_receive_purchase_order(
    p_order_id INT,
    p_target_warehouse_id INT,
    p_user_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    r_item RECORD;
    v_current_status VARCHAR(20);
    v_dummy_bal INT;
BEGIN
    SELECT order_status INTO v_current_status
    FROM purchase_orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order ID % not found.', p_order_id;
    END IF;

    IF v_current_status = 'RECEIVED' THEN
        RAISE EXCEPTION 'Order ID % has already been received.', p_order_id;
    END IF;

    -- Iterate all line items and process inbound movement atomically
    FOR r_item IN (SELECT product_id, quantity_ordered FROM purchase_order_items WHERE order_id = p_order_id) LOOP
        CALL sp_process_stock_movement(
            r_item.product_id,
            p_target_warehouse_id,
            p_user_id,
            'RESTOCK',
            r_item.quantity_ordered,
            'PO #' || p_order_id || ' Fulfillment Restock',
            v_dummy_bal
        );
    END LOOP;

    -- Mark order as received
    UPDATE purchase_orders
    SET order_status = 'RECEIVED'
    WHERE order_id = p_order_id;
END;
$$;

-- View 3: Reorder Recommendations View (Connecting Demand & Buffer Rules)
CREATE OR REPLACE VIEW v_stock_reorder_recommendations AS
SELECT 
    p.product_id,
    p.sku,
    p.product_name,
    c.category_name,
    p.reorder_threshold,
    COALESCE(SUM(ws.quantity_on_hand), 0) AS current_total_stock,
    GREATEST(0, (p.reorder_threshold * 2) - COALESCE(SUM(ws.quantity_on_hand), 0)) AS suggested_reorder_qty,
    p.cost_price,
    (GREATEST(0, (p.reorder_threshold * 2) - COALESCE(SUM(ws.quantity_on_hand), 0)) * p.cost_price) AS estimated_procurement_cost
FROM products p
JOIN categories c ON p.category_id = c.category_id
LEFT JOIN warehouse_stock ws ON p.product_id = ws.product_id
GROUP BY p.product_id, p.sku, p.product_name, c.category_name, p.reorder_threshold, p.cost_price
HAVING COALESCE(SUM(ws.quantity_on_hand), 0) <= p.reorder_threshold;

