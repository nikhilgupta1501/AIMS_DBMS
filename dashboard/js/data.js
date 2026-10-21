/**
 * AIMS - Initial In-Memory Relational Dataset
 * Mirroring the PostgreSQL schema and seed data
 */

const INITIAL_DB = {
  users: [
    { user_id: 1, full_name: 'Saumya Sharma', email: 'saumya@aims.org', role: 'ADMIN' },
    { user_id: 2, full_name: 'Rahul Verma', email: 'rahul@aims.org', role: 'STAFF' },
    { user_id: 3, full_name: 'Ananya Gupta', email: 'ananya@aims.org', role: 'MANAGER' }
  ],

  categories: [
    { category_id: 1, category_name: 'Packaged Foods & Pantry', description: 'Grains, cereals, cooking oils, pasta, and dry condiments' },
    { category_id: 2, category_name: 'Beverages & Dairy', description: 'Specialty coffee, teas, juices, plant-based milks, and energy drinks' },
    { category_id: 3, category_name: 'Personal Care & Hygiene', description: 'Oral care, body wash, organic soaps, skincare, and sanitizers' },
    { category_id: 4, category_name: 'Household & Cleaning', description: 'Eco-friendly detergents, disinfectants, paper goods, and surface sprays' },
    { category_id: 5, category_name: 'Snacks & Confectionery', description: 'Nuts, artisan chocolate, protein bars, gourmet crackers, and chips' }
  ],

  suppliers: [
    { supplier_id: 1, company_name: 'Apex Logistics & FMCG Ltd.', contact: 'Marcus Vance', email: 'orders@apexfmcg.com', lead_days: 7 },
    { supplier_id: 2, company_name: 'Harvest Valley Naturals Co.', contact: 'Sarah Chen', email: 'procure@harvestvalley.com', lead_days: 10 },
    { supplier_id: 3, company_name: 'Nordic Clean Care Supply', contact: 'Freja Lind', email: 'sales@nordiccleancare.se', lead_days: 8 },
    { supplier_id: 4, company_name: 'Pacific Beverage & Roasters', contact: 'Elena Rostova', email: 'orders@pacificroast.com', lead_days: 5 },
    { supplier_id: 5, company_name: 'Global Pantry Brands Inc.', contact: 'Vikram Patel', email: 'vpatel@globalpantry.com', lead_days: 6 }
  ],

  warehouses: [
    { warehouse_id: 1, warehouse_name: 'Store 01 - Metro Central Flagship', code: 'STR-01' },
    { warehouse_id: 2, warehouse_name: 'Store 02 - Northside Commercial Outlet', code: 'STR-02' },
    { warehouse_id: 3, warehouse_name: 'Store 03 - East Harbor Distribution Center', code: 'STR-03' },
    { warehouse_id: 4, warehouse_name: 'Store 04 - West Valley Express Hub', code: 'STR-04' },
    { warehouse_id: 5, warehouse_name: 'Store 05 - Southgate Retail Depot', code: 'STR-05' },
    { warehouse_id: 6, warehouse_name: 'Store 06 - Midtown Consumer Center', code: 'STR-06' },
    { warehouse_id: 7, warehouse_name: 'Store 07 - Highland Regional Warehouse', code: 'STR-07' },
    { warehouse_id: 8, warehouse_name: 'Store 08 - Lakeside Fulfillment Hub', code: 'STR-08' },
    { warehouse_id: 9, warehouse_name: 'Store 09 - Suburbia Perimeter Mart', code: 'STR-09' },
    { warehouse_id: 10, warehouse_name: 'Store 10 - Aerocity Air Cargo Depot', code: 'STR-10' }
  ],

  products: [
    { product_id: 1, sku: 'SKU-ELEC-001', name: 'Noise-Cancelling Headphones Pro', category_id: 1, unit_price: 149.99, cost_price: 85.00, reorder_threshold: 25, lead_time_days: 7 },
    { product_id: 2, sku: 'SKU-ELEC-002', name: 'USB-C 100W GaN Fast Charger', category_id: 1, unit_price: 39.99, cost_price: 18.50, reorder_threshold: 40, lead_time_days: 5 },
    { product_id: 3, sku: 'SKU-ELEC-003', name: 'Mechanical Keyboard (Tactile Brown)', category_id: 1, unit_price: 89.50, cost_price: 48.00, reorder_threshold: 20, lead_time_days: 8 },
    { product_id: 4, sku: 'SKU-ELEC-004', name: 'Ultra-Wide 4K HDMI 2.1 Cable 2m', category_id: 1, unit_price: 14.99, cost_price: 4.20, reorder_threshold: 60, lead_time_days: 4 },
    { product_id: 5, sku: 'SKU-AUTO-101', name: 'Industrial LiDAR Range Sensor (20m)', category_id: 2, unit_price: 280.00, cost_price: 160.00, reorder_threshold: 12, lead_time_days: 14 },
    { product_id: 6, sku: 'SKU-AUTO-102', name: 'Solid State Relay 40A 240VAC', category_id: 2, unit_price: 24.50, cost_price: 11.80, reorder_threshold: 30, lead_time_days: 6 },
    { product_id: 7, sku: 'SKU-AUTO-103', name: 'Optical Rotary Encoder 1024 PPR', category_id: 2, unit_price: 75.00, cost_price: 42.00, reorder_threshold: 15, lead_time_days: 10 },
    { product_id: 8, sku: 'SKU-NETW-201', name: 'Managed Gigabit 8-Port PoE Switch', category_id: 4, unit_price: 119.00, cost_price: 68.00, reorder_threshold: 18, lead_time_days: 7 },
    { product_id: 9, sku: 'SKU-NETW-202', name: 'Cat6A Shielded Patch Cable 10-Pack', category_id: 4, unit_price: 28.50, cost_price: 12.00, reorder_threshold: 50, lead_time_days: 3 },
    { product_id: 10, sku: 'SKU-OFFC-301', name: 'Thermal Receipt Paper (Box of 50)', category_id: 3, unit_price: 32.00, cost_price: 14.50, reorder_threshold: 25, lead_time_days: 4 }
  ],

  // Stock per warehouse
  warehouse_stock: [
    { stock_id: 1, warehouse_id: 1, product_id: 1, quantity_on_hand: 42 },
    { stock_id: 2, warehouse_id: 2, product_id: 1, quantity_on_hand: 14 },
    { stock_id: 3, warehouse_id: 1, product_id: 2, quantity_on_hand: 85 },
    { stock_id: 4, warehouse_id: 2, product_id: 2, quantity_on_hand: 12 }, // Low Stock!
    { stock_id: 5, warehouse_id: 1, product_id: 3, quantity_on_hand: 6 },  // Low Stock!
    { stock_id: 6, warehouse_id: 2, product_id: 3, quantity_on_hand: 18 },
    { stock_id: 7, warehouse_id: 1, product_id: 4, quantity_on_hand: 190 },
    { stock_id: 8, warehouse_id: 2, product_id: 4, quantity_on_hand: 220 },
    { stock_id: 9, warehouse_id: 1, product_id: 5, quantity_on_hand: 4 },  // Critical Low Stock!
    { stock_id: 10, warehouse_id: 2, product_id: 5, quantity_on_hand: 15 },
    { stock_id: 11, warehouse_id: 1, product_id: 6, quantity_on_hand: 65 },
    { stock_id: 12, warehouse_id: 2, product_id: 6, quantity_on_hand: 45 },
    { stock_id: 13, warehouse_id: 1, product_id: 7, quantity_on_hand: 8 },  // Low Stock!
    { stock_id: 14, warehouse_id: 2, product_id: 7, quantity_on_hand: 20 },
    { stock_id: 15, warehouse_id: 1, product_id: 8, quantity_on_hand: 22 },
    { stock_id: 16, warehouse_id: 2, product_id: 8, quantity_on_hand: 3 },  // Critical Low Stock!
    { stock_id: 17, warehouse_id: 1, product_id: 9, quantity_on_hand: 140 },
    { stock_id: 18, warehouse_id: 2, product_id: 9, quantity_on_hand: 95 },
    { stock_id: 19, warehouse_id: 1, product_id: 10, quantity_on_hand: 18 }, // Low Stock!
    { stock_id: 20, warehouse_id: 2, product_id: 10, quantity_on_hand: 35 }
  ],

  // Trigger-Generated Alerts
  stock_alerts: [
    { alert_id: 1, product_id: 3, warehouse_id: 1, current_quantity: 6, reorder_threshold: 20, severity: 'CRITICAL', status: 'OPEN', triggered_at: '2026-09-19 14:22:00' },
    { alert_id: 2, product_id: 5, warehouse_id: 1, current_quantity: 4, reorder_threshold: 12, severity: 'CRITICAL', status: 'OPEN', triggered_at: '2026-09-20 09:15:00' },
    { alert_id: 3, product_id: 8, warehouse_id: 2, current_quantity: 3, reorder_threshold: 18, severity: 'CRITICAL', status: 'OPEN', triggered_at: '2026-09-20 11:40:00' },
    { alert_id: 4, product_id: 2, warehouse_id: 2, current_quantity: 12, reorder_threshold: 40, severity: 'WARNING', status: 'OPEN', triggered_at: '2026-09-18 16:05:00' }
  ],

  // Recent Transactions Audit Ledger
  transactions: [
    { transaction_id: 101, product_id: 1, warehouse_id: 1, type: 'STOCK_OUT', qty: -12, balance_after: 42, user: 'Rahul Verma', time: '10 mins ago', notes: 'B2B Client Fulfillment #SO-882' },
    { transaction_id: 102, product_id: 5, warehouse_id: 1, type: 'STOCK_OUT', qty: -4, balance_after: 4, user: 'Rahul Verma', time: '35 mins ago', notes: 'Robotics Lab PO Delivery' },
    { transaction_id: 103, product_id: 4, warehouse_id: 2, type: 'RESTOCK', qty: 100, balance_after: 220, user: 'Saumya Sharma', time: '2 hours ago', notes: 'Supplier Batch Apex-910 Arrival' },
    { transaction_id: 104, product_id: 3, warehouse_id: 1, type: 'STOCK_OUT', qty: -10, balance_after: 6, user: 'Rahul Verma', time: '4 hours ago', notes: 'Office Expansion Procurement' },
    { transaction_id: 105, product_id: 8, warehouse_id: 2, type: 'STOCK_OUT', qty: -5, balance_after: 3, user: 'Rahul Verma', time: 'Yesterday', notes: 'Emergency Server Rack Setup' }
  ],

  // AI Demand Forecast Models
  forecast_data: {
    monthly_trends: {
      labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep (Actual)', 'Oct (AI Forecast)', 'Nov (AI Forecast)'],
      actual_demand: [240, 265, 290, 310, 340, 365, null, null],
      linear_regression: [238, 262, 288, 315, 339, 362, 388, 415],
      moving_average: [null, null, 252, 277, 300, 325, 355, 380]
    },
    product_predictions: [
      { product_id: 1, name: 'Noise-Cancelling Headphones Pro', current_stock: 56, avg_daily_sales: 3.2, predicted_30d_demand: 96, suggested_reorder: 60, confidence: 92 },
      { product_id: 2, name: 'USB-C 100W GaN Fast Charger', current_stock: 97, avg_daily_sales: 6.8, predicted_30d_demand: 210, suggested_reorder: 150, confidence: 95 },
      { product_id: 3, name: 'Mechanical Keyboard (Tactile Brown)', current_stock: 24, avg_daily_sales: 2.1, predicted_30d_demand: 65, suggested_reorder: 50, confidence: 88 },
      { product_id: 5, name: 'Industrial LiDAR Range Sensor (20m)', current_stock: 19, avg_daily_sales: 0.9, predicted_30d_demand: 28, suggested_reorder: 20, confidence: 84 },
      { product_id: 8, name: 'Managed Gigabit 8-Port PoE Switch', current_stock: 25, avg_daily_sales: 1.6, predicted_30d_demand: 48, suggested_reorder: 35, confidence: 90 }
    ]
  }
};
