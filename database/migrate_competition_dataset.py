"""
AIMS (Autonomous Inventory & Demand Intelligence Platform)
Real-World Dataset Migration & Seeding Engine
Course: Database Management Systems

Maps Kaggle's Store Item Demand Forecasting dataset into AIMS Relational Schema (SQLite aims.db):
- 10 Stores  -> 'warehouses' (Distribution Hubs & Retail Outlets)
- 50 Items   -> 'products' (Catalog with realistic retail SKUs, categories, pricing, lead times)
- 500 Stocks -> 'warehouse_stock' (Initial inventory levels grounded in actual sales velocity)
- 913k Sales -> 'stock_transactions' (Historical sales ledger with ACID commit & indexes)
- Procurement POs & automated trigger-driven stock alerts
"""

import os
import sys
import time
import math
import random
import sqlite3
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "database", "aims.db"))
TRAIN_CSV = os.path.join(BASE_DIR, "data", "train.csv")

if not os.path.exists(TRAIN_CSV):
    print(f"[ERROR] Dataset not found at {TRAIN_CSV}")
    sys.exit(1)

# Ensure database directory exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# -----------------------------------------------------------------------------
# 1. METADATA CATALOG DEFINITIONS (10 Stores, 50 Items across 5 Categories)
# -----------------------------------------------------------------------------

CATEGORIES = [
    (1, "Packaged Foods & Pantry", "Grains, cereals, cooking oils, pasta, and dry condiments"),
    (2, "Beverages & Dairy", "Specialty coffee, teas, juices, plant-based milks, and energy drinks"),
    (3, "Personal Care & Hygiene", "Oral care, body wash, organic soaps, skincare, and sanitizers"),
    (4, "Household & Cleaning", "Eco-friendly detergents, disinfectants, paper goods, and surface sprays"),
    (5, "Snacks & Confectionery", "Nuts, artisan chocolate, protein bars, gourmet crackers, and chips")
]

SUPPLIERS = [
    (1, "Apex Logistics & FMCG Ltd.", "Marcus Vance", "orders@apexfmcg.com", "+1-555-019-2834", "Sector 42 Logistics Hub, Chicago, IL", 7),
    (2, "Harvest Valley Naturals Co.", "Sarah Chen", "procure@harvestvalley.com", "+1-555-028-1192", "Willamette Valley Farm Road, OR", 10),
    (3, "Nordic Clean Care Supply", "Freja Lind", "sales@nordiccleancare.se", "+46-8-123-4567", "Logistics Ring 16, Stockholm, Sweden", 8),
    (4, "Pacific Beverage & Roasters", "Elena Rostova", "orders@pacificroast.com", "+1-555-339-4410", "Roastery District Dock 4, Seattle, WA", 5),
    (5, "Global Pantry Brands Inc.", "Vikram Patel", "vpatel@globalpantry.com", "+1-555-884-9102", "Continental Distribution Center, Dallas, TX", 6)
]

STORES = [
    (1, "Store 01 - Metro Central Flagship", "Downtown Metro Financial District, Hub 1", "STR-01", 60000),
    (2, "Store 02 - Northside Commercial Outlet", "North Industrial & Shopping District", "STR-02", 45000),
    (3, "Store 03 - East Harbor Distribution Center", "Port Logistics Park, Terminal East", "STR-03", 65000),
    (4, "Store 04 - West Valley Express Hub", "Tech Valley Expressway, Sector 8", "STR-04", 55000),
    (5, "Store 05 - Southgate Retail Depot", "South Suburban Plaza, Gate 3", "STR-05", 40000),
    (6, "Store 06 - Midtown Consumer Center", "City Center Commerce Plaza, Wing B", "STR-06", 50000),
    (7, "Store 07 - Highland Regional Warehouse", "Highland Corridor Highway Mile 14", "STR-07", 45000),
    (8, "Store 08 - Lakeside Fulfillment Hub", "Lakeside Terminal Logistics Zone", "STR-08", 52000),
    (9, "Store 09 - Suburbia Perimeter Mart", "Outer Ring Road Junction 4", "STR-09", 42000),
    (10, "Store 10 - Aerocity Air Cargo Depot", "International Airport Logistics Gate 7", "STR-10", 70000)
]

# 50 Curated Retail Products matching item IDs 1 to 50
PRODUCTS_CATALOG = [
    # Category 1: Packaged Foods & Pantry (Items 1 to 10)
    (1, "SKU-FOOD-001", "Organic Rolled Oats 1kg", 1, 5.99, 3.20, 5),
    (2, "SKU-FOOD-002", "Extra Virgin Olive Oil 1L", 1, 16.50, 9.80, 7),
    (3, "SKU-FOOD-003", "Premium Basmati Rice 5kg", 1, 19.99, 12.00, 6),
    (4, "SKU-FOOD-004", "Italian Durum Wheat Penne 500g", 1, 3.49, 1.80, 4),
    (5, "SKU-FOOD-005", "San Marzano Whole Peeled Tomatoes 800g", 1, 4.29, 2.10, 4),
    (6, "SKU-FOOD-006", "Himalayan Pink Rock Salt 1kg", 1, 3.99, 1.70, 3),
    (7, "SKU-FOOD-007", "Organic Black Chia Seeds 500g", 1, 7.49, 4.10, 8),
    (8, "SKU-FOOD-008", "Pure Organic Canadian Maple Syrup 500ml", 1, 12.99, 7.50, 7),
    (9, "SKU-FOOD-009", "Whole Grain Quinoa 1kg", 1, 8.49, 4.80, 6),
    (10, "SKU-FOOD-010", "Raw Unfiltered Wildflower Honey 750g", 1, 11.50, 6.40, 5),

    # Category 2: Beverages & Dairy (Items 11 to 20)
    (11, "SKU-BEV-011", "Arabica Single-Origin Coffee Beans 500g", 2, 14.99, 8.20, 6),
    (12, "SKU-BEV-012", "Organic Ceremonial Matcha Powder 100g", 2, 22.50, 13.00, 9),
    (13, "SKU-BEV-013", "Cold Brew Coffee Concentrate 1L", 2, 9.99, 5.40, 4),
    (14, "SKU-BEV-014", "Barista Unsweetened Oat Milk 1L", 2, 4.49, 2.30, 4),
    (15, "SKU-BEV-015", "Organic Roasted Almond Milk 1L", 2, 4.29, 2.20, 4),
    (16, "SKU-BEV-016", "Sparkling Spring Water 12-Pack (330ml)", 2, 11.99, 6.50, 5),
    (17, "SKU-BEV-017", "Ginger Lemon Probiotic Kombucha 350ml", 2, 3.99, 1.95, 3),
    (18, "SKU-BEV-018", "Pure Coconut Water 1L", 2, 5.49, 2.90, 5),
    (19, "SKU-BEV-019", "English Breakfast Black Tea 100 Bags", 2, 8.99, 4.60, 5),
    (20, "SKU-BEV-020", "Electrolyte Hydration Drink Mix 20pk", 2, 15.99, 8.80, 6),

    # Category 3: Personal Care & Hygiene (Items 21 to 30)
    (21, "SKU-CARE-021", "Sulfate-Free Botanical Shampoo 500ml", 3, 13.50, 7.20, 7),
    (22, "SKU-CARE-022", "Moisturizing Shea Conditioner 500ml", 3, 13.50, 7.20, 7),
    (23, "SKU-CARE-023", "Tea Tree Foaming Body Wash 750ml", 3, 11.99, 6.10, 5),
    (24, "SKU-CARE-024", "Natural Mineral SPF 50 Sunscreen 200ml", 3, 16.99, 9.40, 8),
    (25, "SKU-CARE-025", "Fluoride-Free Charcoal Toothpaste 120g", 3, 5.99, 2.80, 4),
    (26, "SKU-CARE-026", "Hydrating Hyaluronic Acid Serum 50ml", 3, 21.00, 11.50, 10),
    (27, "SKU-CARE-027", "Aloe Vera Antibacterial Hand Soap 300ml", 3, 4.49, 2.10, 3),
    (28, "SKU-CARE-028", "Eco Bamboo Toothbrush (4-Pack)", 3, 7.99, 3.40, 5),
    (29, "SKU-CARE-029", "Organic Coconut Body Moisturizer 400ml", 3, 14.50, 7.80, 6),
    (30, "SKU-CARE-030", "Gentle Micellar Cleansing Water 400ml", 3, 9.99, 5.00, 5),

    # Category 4: Household & Cleaning (Items 31 to 40)
    (31, "SKU-HOME-031", "Plant-Based Laundry Detergent 2L", 4, 15.99, 8.90, 6),
    (32, "SKU-HOME-032", "Citrus Degreaser Multi-Surface Spray 750ml", 4, 6.49, 3.10, 4),
    (33, "SKU-HOME-033", "Ultra Dishwashing Liquid Gel 1L", 4, 5.99, 2.80, 4),
    (34, "SKU-HOME-034", "Recycled 3-Ply Paper Towels (6 Rolls)", 4, 12.50, 6.80, 5),
    (35, "SKU-HOME-035", "Bamboo Fiber Kitchen Cleaning Cloths 5pk", 4, 8.99, 4.20, 4),
    (36, "SKU-HOME-036", "Automatic Dishwasher Detergent Pods 45ct", 4, 14.99, 8.40, 6),
    (37, "SKU-HOME-037", "Lavender Essential Oil Room Freshener 250ml", 4, 7.49, 3.60, 4),
    (38, "SKU-HOME-038", "Compostable Kitchen Trash Bags 30ct", 4, 9.50, 4.80, 5),
    (39, "SKU-HOME-039", "Non-Toxic Bathroom Cleaner Spray 750ml", 4, 6.99, 3.30, 4),
    (40, "SKU-HOME-040", "Natural Fabric Softener Lavender 1.5L", 4, 10.99, 5.70, 5),

    # Category 5: Snacks & Confectionery (Items 41 to 50)
    (41, "SKU-SNCK-041", "Roasted Salted California Almonds 500g", 5, 9.99, 5.60, 5),
    (42, "SKU-SNCK-042", "Dark Chocolate 70% Cocoa Bar 100g", 5, 3.99, 1.90, 4),
    (43, "SKU-SNCK-043", "Artisan Sea Salt Sourdough Crackers 200g", 5, 4.79, 2.30, 4),
    (44, "SKU-SNCK-044", "Plant Protein Crunch Bars (Box of 12)", 5, 21.99, 12.50, 7),
    (45, "SKU-SNCK-045", "Kettle Cooked Jalapeno Potato Chips 180g", 5, 3.89, 1.80, 3),
    (46, "SKU-SNCK-046", "Organic Trail Mix (Raisins & Nuts) 450g", 5, 8.99, 4.90, 5),
    (47, "SKU-SNCK-047", "Dry Roasted Cashew Halves 400g", 5, 11.50, 6.70, 6),
    (48, "SKU-SNCK-048", "Gluten-Free Chocolate Chip Cookies 250g", 5, 5.99, 3.10, 4),
    (49, "SKU-SNCK-049", "Freeze-Dried Organic Strawberries 50g", 5, 6.49, 3.40, 5),
    (50, "SKU-SNCK-050", "Medjool Organic Dates Box 500g", 5, 9.49, 5.20, 6)
]

def run_migration():
    print("=" * 70)
    print("[AIMS] DATABASE MIGRATION ENGINE - KAGGLE DATASET MAPPING")
    print(f"Relational Target: {DB_PATH}")
    print(f"Source Dataset:    {TRAIN_CSV}")
    print("=" * 70)

    # 1. Connect and initialize pragmas for maximum ACID performance
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = OFF;")
    cursor.execute("PRAGMA journal_mode = WAL;")
    cursor.execute("PRAGMA synchronous = NORMAL;")

    # 2. Reset or Recreate Core Schema Tables
    print("\n[STEP 1/5] Initializing Schema Tables & Constraints...")
    cursor.executescript("""
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

    -- Users & RBAC
    CREATE TABLE users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'STAFF', 'MANAGER')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Categories
    CREATE TABLE categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Suppliers
    CREATE TABLE suppliers (
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
    CREATE TABLE products (
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
    CREATE TABLE warehouses (
        warehouse_id INTEGER PRIMARY KEY AUTOINCREMENT,
        warehouse_name TEXT NOT NULL,
        location TEXT NOT NULL,
        code TEXT NOT NULL,
        max_capacity INTEGER DEFAULT 50000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Warehouse Stock (M:N Associative Entity)
    CREATE TABLE warehouse_stock (
        stock_id INTEGER PRIMARY KEY AUTOINCREMENT,
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (warehouse_id, product_id)
    );

    -- Purchase Orders
    CREATE TABLE purchase_orders (
        order_id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
        created_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
        order_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (order_status IN ('PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED')),
        total_amount REAL DEFAULT 0 CHECK (total_amount >= 0),
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        expected_delivery_date TEXT
    );

    -- Purchase Order Items
    CREATE TABLE purchase_order_items (
        order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES purchase_orders(order_id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
        quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
        unit_cost REAL NOT NULL CHECK (unit_cost >= 0),
        line_total REAL GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED
    );

    -- Stock Transactions (Historical Consumption Ledger)
    CREATE TABLE stock_transactions (
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
    CREATE TABLE stock_alerts (
        alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
        current_quantity INTEGER NOT NULL,
        reorder_threshold INTEGER NOT NULL,
        alert_severity TEXT NOT NULL DEFAULT 'WARNING' CHECK (alert_severity IN ('WARNING', 'CRITICAL')),
        alert_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (alert_status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
        triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Forecast Logs
    CREATE TABLE forecast_logs (
        forecast_id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        model_name TEXT NOT NULL DEFAULT 'LINEAR_REGRESSION',
        forecast_period TEXT NOT NULL DEFAULT 'MONTHLY',
        predicted_demand INTEGER NOT NULL,
        actual_demand INTEGER,
        confidence_score REAL DEFAULT 0.85,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Seed Users, Categories, Suppliers, Warehouses
    print("[STEP 2/5] Seeding Users, Categories, Suppliers, and 10 Stores...")
    cursor.executemany("INSERT INTO users (user_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?);", [
        (1, "Saumya Sharma", "saumya@aims.org", "pbkdf2$hash_admin", "ADMIN"),
        (2, "Rahul Verma", "rahul@aims.org", "pbkdf2$hash_staff", "STAFF"),
        (3, "Ananya Gupta", "ananya@aims.org", "pbkdf2$hash_manager", "MANAGER")
    ])

    cursor.executemany("INSERT INTO categories (category_id, category_name, description) VALUES (?, ?, ?);", CATEGORIES)
    cursor.executemany("INSERT INTO suppliers (supplier_id, company_name, contact_person, email, phone, address, lead_time_days) VALUES (?, ?, ?, ?, ?, ?, ?);", SUPPLIERS)
    cursor.executemany("INSERT INTO warehouses (warehouse_id, warehouse_name, location, code, max_capacity) VALUES (?, ?, ?, ?, ?);", STORES)

    # 4. Read Kaggle Dataset & Compute Empirical Metrics per Item
    print("[STEP 3/5] Ingesting & Analyzing Kaggle Dataset (913,000 rows)...")
    t0 = time.time()
    df = pd.read_csv(TRAIN_CSV)
    print(f"  -> Loaded CSV in {time.time() - t0:.2f}s (Shape: {df.shape})")

    # Group by item to compute average daily sales & standard deviation across all stores
    item_stats = df.groupby('item')['sales'].agg(['mean', 'std']).to_dict(orient='index')

    # Seed 50 Products with empirically grounded reorder thresholds
    products_rows = []
    for item_meta in PRODUCTS_CATALOG:
        item_id, sku, name, cat_id, unit_price, cost_price, lead_time = item_meta
        mean_sales = item_stats[item_id]['mean']
        std_sales = item_stats[item_id]['std']

        # Empirical Safety Stock = Z * std * sqrt(L), Z = 1.65 (95% service level)
        safety_stock = int(math.ceil(1.65 * std_sales * math.sqrt(lead_time)))
        # Empirical Reorder Point = (Avg Daily Sales * Lead Time) + Safety Stock
        reorder_point = int(math.ceil((mean_sales * lead_time) + safety_stock))
        # Reorder threshold for catalog
        threshold = max(15, int(reorder_point * 0.45))

        products_rows.append((item_id, sku, name, cat_id, unit_price, cost_price, threshold, lead_time))

    cursor.executemany("""
    INSERT INTO products (product_id, sku, product_name, category_id, unit_price, cost_price, reorder_threshold, lead_time_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, products_rows)
    print(f"  -> Seeded {len(products_rows)} products into catalog.")

    # Seed 500 Warehouse Stock records (10 Stores x 50 Items)
    # Using 2017 end-of-year sales rate to generate realistic healthy & alert stock levels
    print("\n[STEP 4/5] Initializing Warehouse Stocks (500 store-item combinations)...")
    store_item_stats = df[df['date'] >= '2017-07-01'].groupby(['store', 'item'])['sales'].mean().to_dict()

    stock_rows = []
    alerts_to_insert = []
    random.seed(42)  # Deterministic seed for reproducible testing

    for store_id in range(1, 11):
        for item_id in range(1, 51):
            daily_store_rate = store_item_stats.get((store_id, item_id), 25.0)
            threshold = next(p[6] for p in products_rows if p[0] == item_id)

            # Assign ~12% items as LOW_STOCK or CRITICAL to generate realistic actionable alerts
            rand_factor = random.random()
            if rand_factor < 0.05:
                # Critical stock
                qty = random.randint(1, min(5, max(1, threshold // 3)))
                alerts_to_insert.append((item_id, store_id, qty, threshold, 'CRITICAL', 'OPEN'))
            elif rand_factor < 0.12:
                # Warning low stock
                qty = random.randint(min(6, threshold), max(6, threshold))
                alerts_to_insert.append((item_id, store_id, qty, threshold, 'WARNING', 'OPEN'))
            else:
                # Healthy stock (15 to 30 days buffer)
                qty = int(daily_store_rate * random.uniform(14, 28))

            stock_rows.append((store_id, item_id, qty))

    cursor.executemany("INSERT INTO warehouse_stock (warehouse_id, product_id, quantity_on_hand) VALUES (?, ?, ?);", stock_rows)
    print(f"  -> Seeded {len(stock_rows)} warehouse_stock allocations.")

    cursor.executemany("""
    INSERT INTO stock_alerts (product_id, warehouse_id, current_quantity, reorder_threshold, alert_severity, alert_status)
    VALUES (?, ?, ?, ?, ?, ?);
    """, alerts_to_insert)
    print(f"  -> Created {len(alerts_to_insert)} operational stock alerts for dashboard.")

    # 5. Bulk Load Historical Sales into stock_transactions
    print("\n[STEP 5/5] Bulk Migrating 913,000 Transactions into SQLite...")
    t_start_tx = time.time()

    # Fast conversion of dataframe rows into transaction tuples
    tx_tuples = [
        (
            int(r.item),
            int(r.store),
            1, # Saumya Sharma (Admin)
            'STOCK_OUT',
            -int(r.sales),
            500, # Rolling nominal balance indicator
            'Kaggle Store POS Sale',
            str(r.date)
        )
        for r in df.itertuples(index=False)
    ]

    cursor.executemany("""
    INSERT INTO stock_transactions (product_id, warehouse_id, performed_by_user_id, transaction_type, quantity_change, balance_after, notes, transaction_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, tx_tuples)
    print(f"  -> Inserted {len(tx_tuples):,} rows in {time.time() - t_start_tx:.2f}s!")

    # Seed Sample Purchase Orders for procurement workflow
    print("\n[STEP 6/6] Seeding Procurement Purchase Orders, Triggers & Views...")
    cursor.executescript("""
    INSERT INTO purchase_orders (order_id, supplier_id, created_by_user_id, order_status, total_amount, order_date, expected_delivery_date)
    VALUES 
        (1, 1, 1, 'RECEIVED', 4250.00, '2026-08-20 10:00:00', '2026-08-27'),
        (2, 2, 2, 'RECEIVED', 2180.00, '2026-09-05 14:30:00', '2026-09-15'),
        (3, 4, 1, 'APPROVED', 3400.00, '2026-09-28 09:15:00', '2026-10-10'),
        (4, 5, 3, 'PENDING', 2850.00, '2026-10-02 11:20:00', '2026-10-12');

    INSERT INTO purchase_order_items (order_id, product_id, quantity_ordered, unit_cost)
    VALUES 
        (1, 1, 50, 3.20),
        (1, 2, 30, 9.80),
        (2, 11, 40, 8.20),
        (3, 21, 25, 7.20),
        (4, 41, 60, 5.60);
    """)

    # 6. Re-create Indexes, Views, and Triggers
    cursor.executescript("""
    -- High Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_warehouse_stock_lookup ON warehouse_stock(product_id, warehouse_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_time_product ON stock_transactions(product_id, transaction_time);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON stock_transactions(transaction_type);
    CREATE INDEX IF NOT EXISTS idx_transactions_store_item ON stock_transactions(warehouse_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON stock_alerts(alert_status);
    CREATE INDEX IF NOT EXISTS idx_orders_status_supplier ON purchase_orders(supplier_id, order_status);

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

    -- View 2: Monthly Sales Velocity
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

    -- Automated Low-Stock Alert Triggers
    CREATE TRIGGER IF NOT EXISTS trg_stock_level_alert_update
    AFTER UPDATE OF quantity_on_hand ON warehouse_stock
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
          AND NEW.quantity_on_hand <= p.reorder_threshold
          AND NOT EXISTS (
              SELECT 1 FROM stock_alerts 
              WHERE product_id = NEW.product_id 
                AND warehouse_id = NEW.warehouse_id 
                AND alert_status = 'OPEN'
          );

        UPDATE stock_alerts
        SET alert_status = 'RESOLVED'
        WHERE product_id = NEW.product_id 
          AND warehouse_id = NEW.warehouse_id 
          AND alert_status = 'OPEN'
          AND NEW.quantity_on_hand > (SELECT reorder_threshold FROM products WHERE product_id = NEW.product_id);
    END;

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
    """)

    conn.commit()
    conn.close()

    print("\n" + "=" * 70)
    print("[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY!")
    print(f"Database File: {DB_PATH}")
    print("Summary of Relational State:")
    print("  * Warehouses / Stores: 10")
    print("  * Categories:          5")
    print("  * Suppliers:           5")
    print("  * Products (Catalog):  50")
    print("  * Stock Allocations:   500 (10 stores x 50 items)")
    print("  * Stock Transactions:  913,000 (Full 5-year consumption ledger)")
    print(f"  * Open Stock Alerts:   {len(alerts_to_insert)}")
    print("=" * 70)

if __name__ == '__main__':
    run_migration()
