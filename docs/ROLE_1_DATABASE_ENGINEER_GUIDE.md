# 📘 Role 1: Database & Relational Storage Engineer (DBMS Lead)
> **Platform**: Autonomous Inventory Management & Demand Intelligence Platform (AIMS)  
> **Target Audience**: Database Lead / DBMS Presentation & Viva Preparation  
> **Course Domain**: Relational Database Management Systems, SQL DDL/DML, 3NF Normalization, ACID Transactions, Indexing & Triggers

---

## 1. Executive Responsibilities & Overview
As the **Database & Relational Storage Engineer**, you own the foundational tier of AIMS:
1. **Relational Architecture**: Designed and maintained **11 normalized tables** in strict **Third Normal Form (3NF)**.
2. **ACID Engine Configuration**: Configured the storage engine with **Write-Ahead Logging (WAL)**, foreign key cascade enforcement, and domain check constraints.
3. **Data Integrity & Automation**: Authored automated **SQL Triggers** (`trg_stock_level_alert_update`, `trg_stock_level_alert_insert`) that generate real-time alerts upon stock breaches.
4. **Data Scale**: Ingested, validated, and calibrated **913,000 real-world commercial retail transactions** across 50 SKUs, 10 stores, and 5 categories.
5. **Query Optimization**: Implemented 7 composite and B-Tree indexes, views for consolidated inventory roll-ups, and an append-only double-entry audit ledger.

---

## 2. Relational Schema & 3NF Normalization Proof

### 2.1 The 11 Core Entities ([`database/schema.sql`](file:///c:/Users/SAUMYA/Desktop/WORK/DBMS%20PROJECT/database/schema.sql))
| Table Name | Entity Type | Primary Key | Key Foreign Keys & Constraints | Purpose |
|---|---|---|---|---|
| `users` | Strong Entity | `user_id` | `CHECK (role IN ('ADMIN', 'STAFF', 'MANAGER'))` | User accounts, Bcrypt hashes, RBAC roles |
| `categories` | Lookup Entity | `category_id` | `UNIQUE(category_name)` | FMCG category taxonomy |
| `suppliers` | Strong Entity | `supplier_id` | `email UNIQUE`, `lead_time_days >= 1` | Vendor profiles & contractual delivery SLA |
| `products` | Core Catalog | `product_id` | `category_id REFERENCES categories`, `sku UNIQUE` | SKU catalog, unit price, cost, ROP thresholds |
| `warehouses` | Strong Entity | `warehouse_id`| `location`, `code UNIQUE` | Physical regional depot locations |
| `warehouse_stock` | Associative Entity | `stock_id` | `UNIQUE(warehouse_id, product_id)`, `CHECK(quantity_on_hand >= 0)` | Resolves M:N relationship between Products & Warehouses |
| `purchase_orders` | Header Entity | `order_id` | `supplier_id`, `created_by_user_id`, `CHECK(order_status IN ...)` | Procurement orders workflow state machine |
| `purchase_order_items` | Line-Item Entity | `order_item_id`| `order_id CASCADE`, `product_id RESTRICT` | Order itemization with price and quantity |
| `stock_transactions` | Audit Ledger | `transaction_id`| `product_id`, `warehouse_id`, `performed_by_user_id` | Immutable, append-only double-entry inventory ledger |
| `stock_alerts` | Trigger-Driven | `alert_id` | `product_id`, `warehouse_id`, `alert_status` | Operational warnings created automatically by DB triggers |
| `forecast_logs` | AI Logging | `forecast_id` | `product_id REFERENCES products` | Machine learning prediction audit log vs ground truth |

### 2.2 Proof of Third Normal Form (3NF)
During your viva, faculty will challenge you on normalization. Be ready with this formal proof:
* **First Normal Form (1NF)**:
  * Every attribute holds atomic (indivisible) scalar values (no repeating groups, no JSON arrays stored in single fields).
  * Unique primary key exists on all 11 tables.
* **Second Normal Form (2NF)**:
  * System meets 1NF.
  * In composite associative entities like `warehouse_stock` (`warehouse_id`, `product_id`), the non-key attribute `quantity_on_hand` is **fully functionally dependent** on the entire composite candidate key, not a subset.
* **Third Normal Form (3NF)**:
  * System meets 2NF.
  * **Zero Transitive Dependencies**: Non-prime attributes depend *strictly* on candidate keys:
    * In `products`: `unit_price` depends on `product_id`. The category name is not duplicated here; only foreign key `category_id` is stored.
    * In `purchase_orders`: Supplier contact details reside in `suppliers`, avoiding transitive dependence through `supplier_id`.
    * In `warehouse_stock`: Depot address is in `warehouses`, avoiding transitive dependence.

---

## 3. Storage Engine Constraints & WAL Mode

### 3.1 Write-Ahead Logging (WAL) Mode
In [`server.js`](file:///c:/Users/SAUMYA/Desktop/WORK/DBMS%20PROJECT/server.js) lines 30–34 and [`database/init_db.js`](file:///c:/Users/SAUMYA/Desktop/WORK/DBMS%20PROJECT/database/init_db.js):
```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
```
* **Why WAL?**: In traditional rollback journals, readers block writers and writers block readers. In WAL mode, SQLite appends changes to a separate `-wal` file (`aims.db-wal`). Readers read from the database file without acquiring locks while writes occur concurrently, achieving high concurrency for our 913,000-record dataset.
* **Why Foreign Keys ON?**: SQLite disables foreign key validation by default for backwards compatibility. We explicitly enforce `PRAGMA foreign_keys = ON;` on every connection to guarantee engine-level referential integrity.

### 3.2 Declarative Engine Constraints
```sql
-- Prevents physical impossibility of negative inventory in warehouse racks
CONSTRAINT chk_non_negative_stock CHECK (quantity_on_hand >= 0);

-- Enforces valid accounting pricing
CONSTRAINT chk_unit_price CHECK (unit_price >= 0);
CONSTRAINT chk_cost_price CHECK (cost_price >= 0);

-- Enforces strict procurement state machine
CONSTRAINT chk_order_status CHECK (order_status IN ('PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'));

-- Enforces double-entry ledger semantics
CONSTRAINT chk_transaction_type CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'RESTOCK', 'ADJUSTMENT', 'RETURN'));
```

---

## 4. Automated SQL Triggers ([`database/init_db.js`](file:///c:/Users/SAUMYA/Desktop/WORK/DBMS%20PROJECT/database/init_db.js#L275-L330))

### 4.1 How the Low-Stock Alert Trigger Operates
```sql
CREATE TRIGGER IF NOT EXISTS trg_stock_level_alert_update
AFTER UPDATE OF quantity_on_hand ON warehouse_stock
BEGIN
    -- 1. Insert alert if quantity dropped below threshold and no OPEN alert exists
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

    -- 2. Update existing OPEN alert if stock level changed further
    UPDATE stock_alerts
    SET current_quantity = NEW.quantity_on_hand,
        alert_severity = CASE WHEN NEW.quantity_on_hand <= 5 THEN 'CRITICAL' ELSE 'WARNING' END,
        triggered_at = DATETIME('now')
    WHERE product_id = NEW.product_id 
      AND warehouse_id = NEW.warehouse_id 
      AND alert_status = 'OPEN'
      AND NEW.quantity_on_hand <= (SELECT reorder_threshold FROM products WHERE product_id = NEW.product_id);

    -- 3. Auto-Resolve alert if stock is replenished above reorder threshold
    UPDATE stock_alerts
    SET alert_status = 'RESOLVED'
    WHERE product_id = NEW.product_id 
      AND warehouse_id = NEW.warehouse_id 
      AND alert_status = 'OPEN'
      AND NEW.quantity_on_hand > (SELECT reorder_threshold FROM products WHERE product_id = NEW.product_id);
END;
```

---

## 5. SQL Reporting Views & Analytical Queries

### 5.1 Multi-Depot Inventory Roll-Up View (`v_product_inventory_status`)
Consolidates quantities and valuations across all 10 retail depots into a single high-performance summary:
```sql
CREATE VIEW IF NOT EXISTS v_product_inventory_status AS
SELECT 
    p.product_id,
    p.sku,
    p.product_name,
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
GROUP BY p.product_id, p.sku, p.product_name, c.category_name, p.unit_price, p.cost_price, p.reorder_threshold;
```

### 5.2 AI Training Monthly Sales Velocity View (`v_monthly_sales_velocity`)
Extracts aggregated monthly demand feeds used by the Python machine learning service:
```sql
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
```

---

## 6. How It Works Real-Time in the Website (Live Demo Run-Through)

### Flow 1: Live Stock Dispatch & Trigger Firing
1. **User Action**: On the **Warehouse Floor Staff Terminal** (`#/app/terminal`) or Stock Modal, the user selects SKU `SKU-001` at Store 1 and dispatches 50 units.
2. **Backend Execution**: Node.js executes:
   ```sql
   UPDATE warehouse_stock 
   SET quantity_on_hand = quantity_on_hand - 50, last_updated = CURRENT_TIMESTAMP
   WHERE product_id = 1 AND warehouse_id = 1;
   ```
3. **Database Reaction**: The `quantity_on_hand` drops below `reorder_threshold` (e.g. 15).
4. **Trigger Intercept**: SQLite immediately fires `trg_stock_level_alert_update`:
   * Checks `reorder_threshold` in `products`.
   * Inserts an `'OPEN'` warning into `stock_alerts`.
5. **Real-Time UI Update**: The top navigation badge increments its alert bell counter, the KPI card updates "At-Risk Items", and the item appears in the **Urgent Action Items** table.

### Flow 2: Inbound Purchase Order & Trigger Auto-Resolution
1. **User Action**: Manager approves Purchase Order `PO-1042` and clicks **Receive Inbound Pallet**.
2. **Backend Execution**: Node.js executes an ACID transaction incrementing `warehouse_stock` by +100 units.
3. **Trigger Intercept**: The trigger fires, detects `NEW.quantity_on_hand > reorder_threshold`, and executes:
   ```sql
   UPDATE stock_alerts SET alert_status = 'RESOLVED' 
   WHERE product_id = 1 AND warehouse_id = 1 AND alert_status = 'OPEN';
   ```
4. **Real-Time UI Update**: The alert vanishes from open alerts and moves to "Resolved" status without manual user clearing.

---

## 7. Faculty Viva Defense & Memory Cheat Sheet

> **Q1: Why did you choose SQLite over MongoDB or Firebase?**  
> **Your Answer**: *"Inventory management requires strict relational ACID guarantees. An inventory movement is a two-phase operation: decrementing physical stock while appending an immutable double-entry ledger row. Document stores like MongoDB or Firebase lack declarative engine-level foreign keys and have high overhead for multi-document ACID transactions. SQLite with WAL mode gives us zero-latency local relational processing, strict foreign keys, check constraints, and declarative triggers without network serialization overhead."*

> **Q2: What happens if two staff members dispatch stock simultaneously for the last remaining item?**  
> **Your Answer**: *"Our database enforces the engine check constraint `CHECK (quantity_on_hand >= 0)`. If concurrent updates attempt to reduce stock below zero, the second transaction is instantly aborted by SQLite with a constraint violation error, preventing negative inventory."*

> **Q3: How do you prevent table locks on a 913,000-row database?**  
> **Your Answer**: *"We configured SQLite in WAL (Write-Ahead Logging) mode. Readers access data pages concurrently with writers appending to the WAL log. Furthermore, composite indexes on `(product_id, transaction_time)` and `(product_id, warehouse_id)` allow indexed lookups in sub-5ms without full-table table scans."*
