-- ============================================================================
-- AI-Based Inventory Management System (AIMS)
-- DBMS Course Project — Seed Data Script (Real-World Enterprise Scale)
-- Populates 10 Warehouses/Stores, 50 Products Catalog & Multi-Store Stock
-- ============================================================================

-- Clear existing data
TRUNCATE TABLE forecast_logs, stock_alerts, stock_transactions, 
               purchase_order_items, purchase_orders, warehouse_stock, 
               warehouses, products, suppliers, categories, users 
RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------------------
-- 1. USERS & RBAC
-- ----------------------------------------------------------------------------
INSERT INTO users (full_name, email, password_hash, role) VALUES
('Saumya Sharma', 'saumya@aims.org', '$2b$12$eW...hashed1', 'ADMIN'),
('Rahul Verma', 'rahul@aims.org', '$2b$12$eW...hashed2', 'STAFF'),
('Ananya Gupta', 'ananya@aims.org', '$2b$12$eW...hashed3', 'MANAGER');

-- ----------------------------------------------------------------------------
-- 2. CATEGORIES (5 Normalized Retail Sectors)
-- ----------------------------------------------------------------------------
INSERT INTO categories (category_name, description) VALUES
('Packaged Foods & Pantry', 'Grains, cereals, cooking oils, pasta, and dry condiments'),
('Beverages & Dairy', 'Specialty coffee, teas, juices, plant-based milks, and energy drinks'),
('Personal Care & Hygiene', 'Oral care, body wash, organic soaps, skincare, and sanitizers'),
('Household & Cleaning', 'Eco-friendly detergents, disinfectants, paper goods, and surface sprays'),
('Snacks & Confectionery', 'Nuts, artisan chocolate, protein bars, gourmet crackers, and chips');

-- ----------------------------------------------------------------------------
-- 3. SUPPLIERS (5 Commercial FMCG Suppliers)
-- ----------------------------------------------------------------------------
INSERT INTO suppliers (company_name, contact_person, email, phone, address) VALUES
('Apex Logistics & FMCG Ltd.', 'Marcus Vance', 'orders@apexfmcg.com', '+1-555-019-2834', 'Sector 42 Logistics Hub, Chicago, IL'),
('Harvest Valley Naturals Co.', 'Sarah Chen', 'procure@harvestvalley.com', '+1-555-028-1192', 'Willamette Valley Farm Road, OR'),
('Nordic Clean Care Supply', 'Freja Lind', 'sales@nordiccleancare.se', '+46-8-123-4567', 'Logistics Ring 16, Stockholm, Sweden'),
('Pacific Beverage & Roasters', 'Elena Rostova', 'orders@pacificroast.com', '+1-555-339-4410', 'Roastery District Dock 4, Seattle, WA'),
('Global Pantry Brands Inc.', 'Vikram Patel', 'vpatel@globalpantry.com', '+1-555-884-9102', 'Continental Distribution Center, Dallas, TX');

-- ----------------------------------------------------------------------------
-- 4. WAREHOUSES (10 Stores & Regional Distribution Centers)
-- ----------------------------------------------------------------------------
INSERT INTO warehouses (warehouse_name, location, max_capacity) VALUES
('Store 01 - Metro Central Flagship', 'Downtown Metro Financial District, Hub 1', 60000),
('Store 02 - Northside Commercial Outlet', 'North Industrial & Shopping District', 45000),
('Store 03 - East Harbor Distribution Center', 'Port Logistics Park, Terminal East', 65000),
('Store 04 - West Valley Express Hub', 'Tech Valley Expressway, Sector 8', 55000),
('Store 05 - Southgate Retail Depot', 'South Suburban Plaza, Gate 3', 40000),
('Store 06 - Midtown Consumer Center', 'City Center Commerce Plaza, Wing B', 50000),
('Store 07 - Highland Regional Warehouse', 'Highland Corridor Highway Mile 14', 45000),
('Store 08 - Lakeside Fulfillment Hub', 'Lakeside Terminal Logistics Zone', 52000),
('Store 09 - Suburbia Perimeter Mart', 'Outer Ring Road Junction 4', 42000),
('Store 10 - Aerocity Air Cargo Depot', 'International Airport Logistics Gate 7', 70000);

-- ----------------------------------------------------------------------------
-- 5. PRODUCTS (50 Retail Items matching Kaggle Store-Item Competition Schema)
-- ----------------------------------------------------------------------------
INSERT INTO products (sku, product_name, category_id, unit_price, cost_price, reorder_threshold) VALUES
-- Category 1: Packaged Foods & Pantry (Items 1 to 10)
('SKU-FOOD-001', 'Organic Rolled Oats 1kg', 1, 5.99, 3.20, 63),
('SKU-FOOD-002', 'Extra Virgin Olive Oil 1L', 1, 16.50, 9.80, 224),
('SKU-FOOD-003', 'Premium Basmati Rice 5kg', 1, 19.99, 12.00, 123),
('SKU-FOOD-004', 'Italian Durum Wheat Penne 500g', 1, 3.49, 1.80, 52),
('SKU-FOOD-005', 'San Marzano Whole Peeled Tomatoes 800g', 1, 4.29, 2.10, 43),
('SKU-FOOD-006', 'Himalayan Pink Rock Salt 1kg', 1, 3.99, 1.70, 105),
('SKU-FOOD-007', 'Organic Black Chia Seeds 500g', 1, 7.49, 4.10, 127),
('SKU-FOOD-008', 'Pure Organic Canadian Maple Syrup 500ml', 1, 12.99, 7.50, 269),
('SKU-FOOD-009', 'Whole Grain Quinoa 1kg', 1, 8.49, 4.80, 182),
('SKU-FOOD-010', 'Raw Unfiltered Wildflower Honey 750g', 1, 11.50, 6.40, 240),

-- Category 2: Beverages & Dairy (Items 11 to 20)
('SKU-BEV-011', 'Arabica Single-Origin Coffee Beans 500g', 2, 14.99, 8.20, 228),
('SKU-BEV-012', 'Organic Ceremonial Matcha Powder 100g', 2, 22.50, 13.00, 312),
('SKU-BEV-013', 'Cold Brew Coffee Concentrate 1L', 2, 9.99, 5.40, 162),
('SKU-BEV-014', 'Barista Unsweetened Oat Milk 1L', 2, 4.49, 2.30, 113),
('SKU-BEV-015', 'Organic Roasted Almond Milk 1L', 2, 4.29, 2.20, 281),
('SKU-BEV-016', 'Sparkling Spring Water 12-Pack (330ml)', 2, 11.99, 6.50, 71),
('SKU-BEV-017', 'Ginger Lemon Probiotic Kombucha 350ml', 2, 3.99, 1.95, 59),
('SKU-BEV-018', 'Pure Coconut Water 1L', 2, 5.49, 2.90, 280),
('SKU-BEV-019', 'English Breakfast Black Tea 100 Bags', 2, 8.99, 4.60, 115),
('SKU-BEV-020', 'Electrolyte Hydration Drink Mix 20pk', 2, 15.99, 8.80, 157),

-- Category 3: Personal Care & Hygiene (Items 21 to 30)
('SKU-CARE-021', 'Sulfate-Free Botanical Shampoo 500ml', 3, 13.50, 7.20, 141),
('SKU-CARE-022', 'Moisturizing Shea Conditioner 500ml', 3, 13.50, 7.20, 286),
('SKU-CARE-023', 'Tea Tree Foaming Body Wash 750ml', 3, 11.99, 6.10, 74),
('SKU-CARE-024', 'Natural Mineral SPF 50 Sunscreen 200ml', 3, 16.99, 9.40, 290),
('SKU-CARE-025', 'Fluoride-Free Charcoal Toothpaste 120g', 3, 5.99, 2.80, 185),
('SKU-CARE-026', 'Hydrating Hyaluronic Acid Serum 50ml', 3, 21.00, 11.50, 248),
('SKU-CARE-027', 'Aloe Vera Antibacterial Hand Soap 300ml', 3, 4.49, 2.10, 39),
('SKU-CARE-028', 'Eco Bamboo Toothbrush (4-Pack)', 3, 7.99, 3.40, 271),
('SKU-CARE-029', 'Organic Coconut Body Moisturizer 400ml', 3, 14.50, 7.80, 203),
('SKU-CARE-030', 'Gentle Micellar Cleansing Water 400ml', 3, 9.99, 5.00, 108),

-- Category 4: Household & Cleaning (Items 31 to 40)
('SKU-HOME-031', 'Plant-Based Laundry Detergent 2L', 4, 15.99, 8.90, 172),
('SKU-HOME-032', 'Citrus Degreaser Multi-Surface Spray 750ml', 4, 6.49, 3.10, 109),
('SKU-HOME-033', 'Ultra Dishwashing Liquid Gel 1L', 4, 5.99, 2.80, 187),
('SKU-HOME-034', 'Recycled 3-Ply Paper Towels (6 Rolls)', 4, 12.50, 6.80, 84),
('SKU-HOME-035', 'Bamboo Fiber Kitchen Cleaning Cloths 5pk', 4, 8.99, 4.20, 139),
('SKU-HOME-036', 'Automatic Dishwasher Detergent Pods 45ct', 4, 14.99, 8.40, 292),
('SKU-HOME-037', 'Lavender Essential Oil Room Freshener 250ml', 4, 7.49, 3.60, 68),
('SKU-HOME-038', 'Compostable Kitchen Trash Bags 30ct', 4, 9.50, 4.80, 303),
('SKU-HOME-039', 'Non-Toxic Bathroom Cleaner Spray 750ml', 4, 6.99, 3.30, 121),
('SKU-HOME-040', 'Natural Fabric Softener Lavender 1.5L', 4, 10.99, 5.70, 95),

-- Category 5: Snacks & Confectionery (Items 41 to 50)
('SKU-SNCK-041', 'Roasted Salted California Almonds 500g', 5, 9.99, 5.60, 75),
('SKU-SNCK-042', 'Dark Chocolate 70% Cocoa Bar 100g', 5, 3.99, 1.90, 97),
('SKU-SNCK-043', 'Artisan Sea Salt Sourdough Crackers 200g', 5, 4.79, 2.30, 128),
('SKU-SNCK-044', 'Plant Protein Crunch Bars (Box of 12)', 5, 21.99, 12.50, 169),
('SKU-SNCK-045', 'Kettle Cooked Jalapeno Potato Chips 180g', 5, 3.89, 1.80, 214),
('SKU-SNCK-046', 'Organic Trail Mix (Raisins & Nuts) 450g', 5, 8.99, 4.90, 190),
('SKU-SNCK-047', 'Dry Roasted Cashew Halves 400g', 5, 11.50, 6.70, 72),
('SKU-SNCK-048', 'Gluten-Free Chocolate Chip Cookies 250g', 5, 5.99, 3.10, 137),
('SKU-SNCK-049', 'Freeze-Dried Organic Strawberries 50g', 5, 6.49, 3.40, 89),
('SKU-SNCK-050', 'Medjool Organic Dates Box 500g', 5, 9.49, 5.20, 267);

-- ----------------------------------------------------------------------------
-- 6. SAMPLE WAREHOUSE STOCK (Sample multi-store distribution)
-- ----------------------------------------------------------------------------
INSERT INTO warehouse_stock (warehouse_id, product_id, quantity_on_hand)
SELECT w.warehouse_id, p.product_id, 
       CASE 
         WHEN (w.warehouse_id + p.product_id) % 9 = 0 THEN CAST(p.reorder_threshold * 0.4 AS INT)
         ELSE CAST(p.reorder_threshold * 2.5 AS INT)
       END
FROM warehouses w
CROSS JOIN products p;

-- ----------------------------------------------------------------------------
-- 7. PURCHASE ORDERS & LINE ITEMS
-- ----------------------------------------------------------------------------
INSERT INTO purchase_orders (supplier_id, created_by_user_id, order_status, total_amount, order_date, expected_delivery_date) VALUES
(1, 1, 'RECEIVED', 4250.00, CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '38 days'),
(2, 2, 'RECEIVED', 2180.00, CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP - INTERVAL '18 days'),
(4, 1, 'APPROVED', 3400.00, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '3 days'),
(5, 3, 'PENDING', 2850.00, CURRENT_TIMESTAMP - INTERVAL '1 days', CURRENT_TIMESTAMP + INTERVAL '8 days');

INSERT INTO purchase_order_items (order_id, product_id, quantity_ordered, unit_cost) VALUES
(1, 1, 50, 3.20),
(1, 2, 30, 9.80),
(2, 11, 40, 8.20),
(3, 21, 25, 7.20),
(4, 41, 60, 5.60);

-- ----------------------------------------------------------------------------
-- 8. FORECAST LOGS SAMPLE
-- ----------------------------------------------------------------------------
INSERT INTO forecast_logs (product_id, model_name, forecast_period, predicted_demand, actual_demand, confidence_score, generated_at) VALUES
(1, 'LINEAR_REGRESSION', 'MONTHLY', 2318, 2290, 0.89, CURRENT_TIMESTAMP - INTERVAL '30 days'),
(2, 'LINEAR_REGRESSION', 'MONTHLY', 6150, 6080, 0.91, CURRENT_TIMESTAMP - INTERVAL '30 days'),
(3, 'LINEAR_REGRESSION', 'MONTHLY', 3840, 3910, 0.88, CURRENT_TIMESTAMP - INTERVAL '30 days'),
(4, 'MOVING_AVG_30D', 'MONTHLY', 2280, 2305, 0.84, CURRENT_TIMESTAMP - INTERVAL '30 days');
