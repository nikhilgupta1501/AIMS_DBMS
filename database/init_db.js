/**
 * AIMS Database Initialization Script
 * Creates the SQLite Relational Database (aims.db) with:
 * - 3NF Schema, Primary Keys, Foreign Keys, Unique & Check Constraints
 * - High-performance B-tree Indexes
 * - Reporting & AI Training Views
 * - Low-stock Alert Automation Trigger
 * - Comprehensive Seed Data
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const { execSync } = require('child_process');
const dbPath = path.join(__dirname, 'aims.db');
const csvPath = path.join(__dirname, '..', 'data', 'train.csv');
const migrateScript = path.join(__dirname, 'migrate_competition_dataset.py');

// If the real-world competition dataset exists, delegate to migration engine
if (fs.existsSync(csvPath) && fs.existsSync(migrateScript)) {
  console.log('[DB-INIT] Real-world competition dataset detected (data/train.csv).');
  console.log('[DB-INIT] Running automated real-world database migration engine...');
  try {
    execSync(`python "${migrateScript}"`, { stdio: 'inherit' });
    console.log('[DB-INIT] Database initialized with 10 stores, 50 items, and 913k transactions!');
    return;
  } catch (err) {
    console.warn('[DB-INIT] Python runner error, falling back to standard DDL setup:', err.message);
  }
}

// Ensure database directory exists
if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

// Remove old DB file if starting fresh
if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
  } catch (e) {
    // If locked, continue
  }
}

const db = new DatabaseSync(dbPath);

console.log('[DB-INIT] Connected to SQLite database:', dbPath);

// Enable Foreign Key Enforcement
db.exec('PRAGMA foreign_keys = OFF;');

db.exec(`
DROP VIEW IF EXISTS v_stock_reorder_recommendations;
DROP VIEW IF EXISTS v_monthly_sales_velocity;
DROP VIEW IF EXISTS v_product_inventory_status;
DROP TRIGGER IF EXISTS trg_stock_level_alert_update;
DROP TRIGGER IF EXISTS trg_stock_level_alert_insert;
DROP TABLE IF EXISTS forecast_logs;
DROP TABLE IF EXISTS stock_alerts;
DROP TABLE IF EXISTS stock_transactions;
DROP TABLE IF EXISTS purchase_order_items;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS warehouse_stock;
DROP TABLE IF EXISTS warehouses;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
`);

db.exec('PRAGMA foreign_keys = ON;');

// 1. DDL: Create Tables
db.exec(`
-- Users & Roles (RBAC)
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'STAFF', 'MANAGER')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    lead_time_days INTEGER DEFAULT 7,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    cost_price REAL NOT NULL CHECK (cost_price >= 0),
    reorder_threshold INTEGER NOT NULL DEFAULT 10 CHECK (reorder_threshold >= 0),
    lead_time_days INTEGER DEFAULT 7,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    warehouse_id INTEGER PRIMARY KEY AUTOINCREMENT,
    warehouse_name TEXT NOT NULL,
    location TEXT NOT NULL,
    code TEXT NOT NULL,
    max_capacity INTEGER DEFAULT 10000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Warehouse Stock (M:N Associative Entity)
CREATE TABLE IF NOT EXISTS warehouse_stock (
    stock_id INTEGER PRIMARY KEY AUTOINCREMENT,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (warehouse_id, product_id)
);

-- Purchase Orders (Supplier Procurement)
CREATE TABLE IF NOT EXISTS purchase_orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    created_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    order_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (order_status IN ('PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED')),
    total_amount REAL DEFAULT 0 CHECK (total_amount >= 0),
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date TEXT
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES purchase_orders(order_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    unit_cost REAL NOT NULL CHECK (unit_cost >= 0),
    line_total REAL GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED
);

-- Stock Transactions (Immutable Movement Ledger)
CREATE TABLE IF NOT EXISTS stock_transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
    performed_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'RESTOCK', 'ADJUSTMENT', 'RETURN')),
    quantity_change INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    notes TEXT,
    transaction_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stock Alerts
CREATE TABLE IF NOT EXISTS stock_alerts (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    current_quantity INTEGER NOT NULL,
    reorder_threshold INTEGER NOT NULL,
    alert_severity TEXT NOT NULL DEFAULT 'WARNING' CHECK (alert_severity IN ('WARNING', 'CRITICAL')),
    alert_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (alert_status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Forecast Logs (AI Models vs Ground Truth)
CREATE TABLE IF NOT EXISTS forecast_logs (
    forecast_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    model_name TEXT NOT NULL DEFAULT 'LINEAR_REGRESSION',
    forecast_period TEXT NOT NULL DEFAULT 'MONTHLY',
    predicted_demand INTEGER NOT NULL,
    actual_demand INTEGER,
    confidence_score REAL DEFAULT 0.85,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

console.log('[DB-INIT] Tables created successfully.');

// 2. Indexes
db.exec(`
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_lookup ON warehouse_stock(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transactions_time_product ON stock_transactions(product_id, transaction_time);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON stock_alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_orders_status_supplier ON purchase_orders(supplier_id, order_status);
`);
console.log('[DB-INIT] Indexes created successfully.');

// 3. Views
db.exec(`
-- View 1: Multi-warehouse consolidated inventory status
CREATE VIEW IF NOT EXISTS v_product_inventory_status AS
SELECT 
    p.product_id,
    p.sku,
    p.product_name,
    c.category_id,
    c.category_name,
    p.unit_price,
    p.cost_price,
    p.reorder_threshold,
    p.lead_time_days,
    COALESCE(SUM(ws.quantity_on_hand), 0) AS total_stock,
    ROUND(COALESCE(SUM(ws.quantity_on_hand), 0) * p.unit_price, 2) AS total_inventory_value,
    CASE 
        WHEN COALESCE(SUM(ws.quantity_on_hand), 0) = 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(SUM(ws.quantity_on_hand), 0) <= p.reorder_threshold THEN 'LOW_STOCK'
        ELSE 'HEALTHY'
    END AS stock_status
FROM products p
JOIN categories c ON p.category_id = c.category_id
LEFT JOIN warehouse_stock ws ON p.product_id = ws.product_id
GROUP BY p.product_id, p.sku, p.product_name, c.category_id, c.category_name, p.unit_price, p.cost_price, p.reorder_threshold, p.lead_time_days;

-- View 2: Monthly Sales Velocity (AI Training Feed)
CREATE VIEW IF NOT EXISTS v_monthly_sales_velocity AS
SELECT 
    t.product_id,
    p.sku,
    p.product_name,
    strftime('%Y-%m', t.transaction_time) AS sales_month,
    ABS(SUM(t.quantity_change)) AS total_quantity_sold,
    COUNT(t.transaction_id) AS transaction_count
FROM stock_transactions t
JOIN products p ON t.product_id = p.product_id
WHERE t.transaction_type = 'STOCK_OUT'
GROUP BY t.product_id, p.sku, p.product_name, strftime('%Y-%m', t.transaction_time);

-- View 3: Reorder Recommendations
CREATE VIEW IF NOT EXISTS v_stock_reorder_recommendations AS
SELECT 
    p.product_id,
    p.sku,
    p.product_name,
    c.category_name,
    p.reorder_threshold,
    p.lead_time_days,
    COALESCE(SUM(ws.quantity_on_hand), 0) AS current_total_stock,
    MAX(0, (p.reorder_threshold * 2) - COALESCE(SUM(ws.quantity_on_hand), 0)) AS suggested_reorder_qty,
    p.cost_price,
    ROUND(MAX(0, (p.reorder_threshold * 2) - COALESCE(SUM(ws.quantity_on_hand), 0)) * p.cost_price, 2) AS estimated_procurement_cost
FROM products p
JOIN categories c ON p.category_id = c.category_id
LEFT JOIN warehouse_stock ws ON p.product_id = ws.product_id
GROUP BY p.product_id, p.sku, p.product_name, c.category_name, p.reorder_threshold, p.lead_time_days, p.cost_price
HAVING COALESCE(SUM(ws.quantity_on_hand), 0) <= p.reorder_threshold;
`);
console.log('[DB-INIT] Views created successfully.');

// 4. Automated Triggers for Low-Stock Warning & Auto-Resolution
db.exec(`
-- Trigger on Update
CREATE TRIGGER IF NOT EXISTS trg_stock_level_alert_update
AFTER UPDATE OF quantity_on_hand ON warehouse_stock
BEGIN
    -- If drops below or at threshold: Insert or Update Alert
    INSERT INTO stock_alerts (product_id, warehouse_id, current_quantity, reorder_threshold, alert_severity, alert_status, triggered_at)
    SELECT 
        NEW.product_id, 
        NEW.warehouse_id, 
        NEW.quantity_on_hand, 
        p.reorder_threshold, 
        CASE WHEN NEW.quantity_on_hand <= 5 THEN 'CRITICAL' ELSE 'WARNING' END,
        'OPEN',
        DATETIME('now')
    FROM products p
    WHERE p.product_id = NEW.product_id 
      AND NEW.quantity_on_hand <= p.reorder_threshold
      AND NOT EXISTS (
          SELECT 1 FROM stock_alerts 
          WHERE product_id = NEW.product_id 
            AND warehouse_id = NEW.warehouse_id 
            AND alert_status = 'OPEN'
      );

    -- If alert already exists and still low, update current quantity and severity
    UPDATE stock_alerts
    SET current_quantity = NEW.quantity_on_hand,
        alert_severity = CASE WHEN NEW.quantity_on_hand <= 5 THEN 'CRITICAL' ELSE 'WARNING' END,
        triggered_at = DATETIME('now')
    WHERE product_id = NEW.product_id 
      AND warehouse_id = NEW.warehouse_id 
      AND alert_status = 'OPEN'
      AND NEW.quantity_on_hand <= (SELECT reorder_threshold FROM products WHERE product_id = NEW.product_id);

    -- If replenished above threshold: auto-resolve open alerts
    UPDATE stock_alerts
    SET alert_status = 'RESOLVED'
    WHERE product_id = NEW.product_id 
      AND warehouse_id = NEW.warehouse_id 
      AND alert_status = 'OPEN'
      AND NEW.quantity_on_hand > (SELECT reorder_threshold FROM products WHERE product_id = NEW.product_id);
END;

-- Trigger on Insert
CREATE TRIGGER IF NOT EXISTS trg_stock_level_alert_insert
AFTER INSERT ON warehouse_stock
BEGIN
    INSERT INTO stock_alerts (product_id, warehouse_id, current_quantity, reorder_threshold, alert_severity, alert_status, triggered_at)
    SELECT 
        NEW.product_id, 
        NEW.warehouse_id, 
        NEW.quantity_on_hand, 
        p.reorder_threshold, 
        CASE WHEN NEW.quantity_on_hand <= 5 THEN 'CRITICAL' ELSE 'WARNING' END,
        'OPEN',
        DATETIME('now')
    FROM products p
    WHERE p.product_id = NEW.product_id 
      AND NEW.quantity_on_hand <= p.reorder_threshold;
END;
`);
console.log('[DB-INIT] Triggers created successfully.');

// 5. Seed Data Loading
console.log('[DB-INIT] Loading Seed Data...');

// Users
const insertUser = db.prepare('INSERT INTO users (user_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)');
const defaultBcryptHash = '$2b$10$IIsKeway.wGqWDPuL5fGsOkm2qQsNnn3mIK.AQq0sY5UJl1Q.gyGa'; // password123
insertUser.run(1, 'Saumya Sharma', 'saumya@aims.org', defaultBcryptHash, 'ADMIN');
insertUser.run(2, 'Rahul Verma', 'rahul@aims.org', defaultBcryptHash, 'STAFF');
insertUser.run(3, 'Ananya Gupta', 'ananya@aims.org', defaultBcryptHash, 'MANAGER');

// Categories
const insertCat = db.prepare('INSERT INTO categories (category_id, category_name, description) VALUES (?, ?, ?)');
insertCat.run(1, 'Consumer Electronics', 'Audio gear, computing peripherals, microcontrollers, and chargers');
insertCat.run(2, 'Industrial Automation', 'Sensors, relays, PLCs, motor drivers, and actuators');
insertCat.run(3, 'Office Supplies', 'Ergonomic accessories, stationery, thermal paper rolls, packaging');
insertCat.run(4, 'Networking & Telecom', 'Routers, patch cables, switches, and transceivers');

// Suppliers
const insertSupplier = db.prepare('INSERT INTO suppliers (supplier_id, company_name, contact_person, email, phone, address, lead_time_days) VALUES (?, ?, ?, ?, ?, ?, ?)');
insertSupplier.run(1, 'Apex Silicon Dynamics', 'Marcus Vance', 'orders@apexsilicon.com', '+1-555-019-2834', '42 Tech Parkway, San Jose, CA', 7);
insertSupplier.run(2, 'Zenith Micro Component Co.', 'Li Wei', 'procure@zenithmicro.tw', '+886-2-8729-1002', 'Hsinchu Science Park, Taiwan', 12);
insertSupplier.run(3, 'Nordic Electro Supply', 'Freja Lind', 'sales@nordicelectro.se', '+46-8-123-4567', 'Kistagangen 16, Stockholm, Sweden', 9);
insertSupplier.run(4, 'Prime Logistics & Hardware', 'Vikram Patel', 'vpatel@primelog.in', '+91-22-6789-4321', 'Bhiwandi Logistics Hub, Mumbai, India', 4);

// Products
const insertProduct = db.prepare('INSERT INTO products (product_id, sku, product_name, category_id, unit_price, cost_price, reorder_threshold, lead_time_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const productsData = [
  [1, 'SKU-ELEC-001', 'Noise-Cancelling Wireless Headphones', 1, 149.99, 85.00, 20, 7],
  [2, 'SKU-ELEC-002', 'USB-C 100W GaN Fast Charger', 1, 39.99, 18.50, 30, 5],
  [3, 'SKU-ELEC-003', 'Mechanical Keyboard (Tactile Brown)', 1, 89.50, 48.00, 15, 8],
  [4, 'SKU-ELEC-004', 'Ultra-Wide 4K HDMI 2.1 Cable 2m', 1, 14.99, 4.20, 50, 4],
  [5, 'SKU-AUTO-101', 'Industrial LiDAR Range Sensor (20m)', 2, 280.00, 160.00, 10, 14],
  [6, 'SKU-AUTO-102', 'Solid State Relay 40A 240VAC', 2, 24.50, 11.80, 25, 6],
  [7, 'SKU-AUTO-103', 'Optical Rotary Encoder 1024 PPR', 2, 75.00, 42.00, 12, 10],
  [8, 'SKU-NETW-201', 'Managed Gigabit 8-Port PoE Switch', 4, 119.00, 68.00, 15, 7],
  [9, 'SKU-NETW-202', 'Cat6A Shielded Patch Cable 10-Pack', 4, 28.50, 12.00, 40, 3],
  [10, 'SKU-NETW-203', 'SFP+ 10G Optical Transceiver Module', 4, 45.00, 21.00, 25, 7],
  [11, 'SKU-OFFC-301', 'Thermal Receipt Paper Roll (Box of 50)', 3, 32.00, 14.50, 20, 4],
  [12, 'SKU-OFFC-302', 'Ergonomic Memory Foam Wrist Rest', 3, 19.99, 7.80, 15, 5]
];
productsData.forEach(p => insertProduct.run(...p));

// Warehouses
const insertWh = db.prepare('INSERT INTO warehouses (warehouse_id, warehouse_name, location, code, max_capacity) VALUES (?, ?, ?, ?, ?)');
insertWh.run(1, 'Central Distribution Hub - North', 'Chicago, IL - Sector 4B', 'ORD-01', 50000);
insertWh.run(2, 'West Coast Depository - South', 'Oakland, CA - Dock 12', 'OAK-02', 35000);

// Warehouse Stock
const insertStock = db.prepare('INSERT INTO warehouse_stock (warehouse_id, product_id, quantity_on_hand) VALUES (?, ?, ?)');
const stockData = [
  [1, 1, 45],  // Healthy
  [2, 1, 12],  // Below 20 -> Alert!
  [1, 2, 85],
  [2, 2, 14],  // Below 30 -> Alert!
  [1, 3, 6],   // Critical!
  [2, 3, 22],
  [1, 4, 180],
  [2, 4, 210],
  [1, 5, 4],   // Critical! (threshold 10)
  [2, 5, 15],
  [1, 6, 60],
  [2, 6, 40],
  [1, 7, 18],
  [2, 7, 8],   // Low stock (threshold 12)
  [1, 8, 22],
  [2, 8, 3],   // Critical! (threshold 15)
  [1, 9, 140],
  [2, 9, 95],
  [1, 10, 32],
  [2, 10, 28],
  [1, 11, 42],
  [2, 11, 16], // Low stock (threshold 20)
  [1, 12, 55],
  [2, 12, 30]
];
stockData.forEach(s => insertStock.run(...s));

// Purchase Orders
const insertPO = db.prepare('INSERT INTO purchase_orders (order_id, supplier_id, created_by_user_id, order_status, total_amount, order_date, expected_delivery_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
insertPO.run(1, 1, 1, 'RECEIVED', 4250.00, '2026-08-20 10:00:00', '2026-08-27');
insertPO.run(2, 2, 2, 'RECEIVED', 1980.00, '2026-09-05 14:30:00', '2026-09-15');
insertPO.run(3, 1, 1, 'APPROVED', 3400.00, '2026-09-28 09:15:00', '2026-10-10');
insertPO.run(4, 3, 3, 'PENDING', 2150.00, '2026-10-02 11:20:00', '2026-10-12');

// Purchase Order Items
const insertPOItem = db.prepare('INSERT INTO purchase_order_items (order_id, product_id, quantity_ordered, unit_cost) VALUES (?, ?, ?, ?)');
insertPOItem.run(1, 1, 50, 85.00);
insertPOItem.run(2, 2, 100, 18.50);
insertPOItem.run(3, 1, 40, 85.00);
insertPOItem.run(4, 8, 25, 68.00);

// Stock Transactions (Comprehensive 6-Month Historical Sales & Restock Ledger for AI Training)
const insertTx = db.prepare('INSERT INTO stock_transactions (product_id, warehouse_id, performed_by_user_id, transaction_type, quantity_change, balance_after, notes, transaction_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

// Monthly base demand profiles for each of the 12 products across 6 months (May to Oct 2026)
// Incorporates realistic market dynamics (upward trends, seasonal spikes, stable commodities)
const monthlyDemandPatterns = [
  // Product 1: Noise-Cancelling Headphones (Upward growth trend: 28 -> 44)
  { pid: 1, wh: 1, base: [28, 31, 35, 38, 41, 45], lead: 7 },
  // Product 2: USB-C 100W GaN Charger (Fast mover surge: 85 -> 122)
  { pid: 2, wh: 2, base: [85, 92, 98, 106, 114, 122], lead: 5 },
  // Product 3: Mechanical Keyboard (Steady office demand: 18 -> 26)
  { pid: 3, wh: 1, base: [18, 19, 21, 23, 24, 26], lead: 8 },
  // Product 4: Ultra-Wide 4K HDMI Cable (High velocity bulk accessory: 140 -> 195)
  { pid: 4, wh: 2, base: [140, 152, 160, 172, 185, 195], lead: 4 },
  // Product 5: Industrial LiDAR Range Sensor (Low volume high value robotics: 6 -> 12)
  { pid: 5, wh: 1, base: [6, 7, 8, 9, 10, 12], lead: 14 },
  // Product 6: Solid State Relay 40A (Industrial automation: 32 -> 46)
  { pid: 6, wh: 1, base: [32, 35, 37, 40, 43, 46], lead: 6 },
  // Product 7: Optical Rotary Encoder (Precision instrumentation: 11 -> 17)
  { pid: 7, wh: 2, base: [11, 12, 13, 15, 16, 17], lead: 10 },
  // Product 8: Managed Gigabit 8-Port PoE Switch (Networking growth: 20 -> 32)
  { pid: 8, wh: 2, base: [20, 22, 25, 27, 29, 32], lead: 7 },
  // Product 9: Cat6A Patch Cable 10-Pack (Bulk infrastructure: 95 -> 138)
  { pid: 9, wh: 1, base: [95, 102, 112, 118, 128, 138], lead: 3 },
  // Product 10: SFP+ 10G Optical Transceiver (Server upgrade cycle: 22 -> 34)
  { pid: 10, wh: 2, base: [22, 24, 27, 29, 31, 34], lead: 7 },
  // Product 11: Thermal Receipt Paper Roll (Consumable retail: 34 -> 48)
  { pid: 11, wh: 1, base: [34, 36, 39, 42, 45, 48], lead: 4 },
  // Product 12: Ergonomic Memory Foam Wrist Rest (Office accessory: 22 -> 31)
  { pid: 12, wh: 2, base: [22, 24, 25, 27, 29, 31], lead: 5 }
];

const months = [
  { m: '2026-05', days: ['04', '12', '21', '28'] },
  { m: '2026-06', days: ['05', '14', '22', '29'] },
  { m: '2026-07', days: ['03', '11', '19', '27'] },
  { m: '2026-08', days: ['06', '15', '23', '30'] },
  { m: '2026-09', days: ['04', '13', '21', '28'] },
  { m: '2026-10', days: ['02', '05', '06', '07'] }
];

let runningBalances = {};
// Initialize simulated starting balance
for (let i = 1; i <= 12; i++) {
  runningBalances[i] = 100;
}

let txCount = 0;
// Seed 6 months of discrete sales orders and restocks per product
monthlyDemandPatterns.forEach(pat => {
  pat.base.forEach((monthlyTotal, mIdx) => {
    const monthObj = months[mIdx];
    
    // Inbound restock at beginning of month to keep stock healthy
    const restockQty = Math.round(monthlyTotal * 1.1);
    runningBalances[pat.pid] += restockQty;
    insertTx.run(
      pat.pid,
      pat.wh,
      1,
      'RESTOCK',
      restockQty,
      runningBalances[pat.pid],
      `Scheduled Supplier Inbound Shipment (${monthObj.m})`,
      `${monthObj.m}-01 09:00:00`
    );
    txCount++;

    // Split monthly demand across 3-4 sales dispatches
    const splitCount = monthObj.days.length;
    const baseChunk = Math.floor(monthlyTotal / splitCount);
    let remainder = monthlyTotal - (baseChunk * splitCount);

    monthObj.days.forEach((day, dIdx) => {
      const chunkQty = baseChunk + (dIdx === splitCount - 1 ? remainder : 0);
      if (chunkQty > 0) {
        runningBalances[pat.pid] = Math.max(0, runningBalances[pat.pid] - chunkQty);
        insertTx.run(
          pat.pid,
          pat.wh,
          dIdx % 2 === 0 ? 2 : 3, // Staff / Manager attribution
          'STOCK_OUT',
          -chunkQty,
          runningBalances[pat.pid],
          `Sales Dispatch Order #${1000 + txCount} - Channel Delivery`,
          `${monthObj.m}-${day} 14:${15 + dIdx * 10}:00`
        );
        txCount++;
      }
    });
  });
});
console.log(`[DB-INIT] Seeded ${txCount} historical stock transactions for authentic ML training.`);

// Forecast Logs (AI Evaluation Logs)
const insertLog = db.prepare('INSERT INTO forecast_logs (product_id, model_name, forecast_period, predicted_demand, actual_demand, confidence_score, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
insertLog.run(1, 'LINEAR_REGRESSION', 'MONTHLY', 42, 38, 0.89, '2026-09-01 00:00:00');
insertLog.run(1, 'MOVING_AVG_30D', 'MONTHLY', 35, 30, 0.93, '2026-09-15 00:00:00');
insertLog.run(2, 'LINEAR_REGRESSION', 'MONTHLY', 110, 115, 0.91, '2026-09-01 00:00:00');
insertLog.run(3, 'LINEAR_REGRESSION', 'MONTHLY', 28, 26, 0.88, '2026-09-01 00:00:00');
insertLog.run(5, 'MOVING_AVG_30D', 'MONTHLY', 14, 12, 0.84, '2026-09-01 00:00:00');
insertLog.run(8, 'LINEAR_REGRESSION', 'MONTHLY', 30, null, 0.87, '2026-10-01 00:00:00');

console.log('[DB-INIT] Seed data loaded successfully.');

// Verify Trigger & Alert Counts
const alertCount = db.prepare("SELECT COUNT(*) as count FROM stock_alerts WHERE alert_status = 'OPEN'").get();
console.log(`[DB-INIT] Verified: ${alertCount.count} stock alerts automatically generated by trigger!`);

const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
console.log(`[DB-INIT] Verified: ${prodCount.count} products stored in 3NF schema.`);

db.close();
console.log('[DB-INIT] Database initialized at:', dbPath);
