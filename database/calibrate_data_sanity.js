/**
 * Calibrate Data Sanity for AIMS
 * Aligns product thresholds with fleet ROP from ML forecast
 * Ensures exactly 7 products need action today (2 Critical <= 3 days of cover, 5 Low <= ROP)
 * Keeps store-level stock_alerts synced with alert pairs across depots
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'aims.db');
const db = new DatabaseSync(dbPath);

console.log('[CALIBRATE] Connecting to aims.db...');

// Load forecast cache to get real ROP and daily demand per product
const forecastPath = path.join(__dirname, '..', 'ai', 'forecast_cache.json');
if (!fs.existsSync(forecastPath)) {
  console.error('[CALIBRATE] forecast_cache.json not found!');
  process.exit(1);
}

const forecastCache = JSON.parse(fs.readFileSync(forecastPath, 'utf8'));
const forecastMap = new Map();
forecastCache.products.forEach(p => {
  forecastMap.set(p.product_id, p);
});

db.exec('BEGIN TRANSACTION;');

try {
  // 1. Update products.reorder_threshold to match true fleet ROP
  const updateProductThreshold = db.prepare(`
    UPDATE products 
    SET reorder_threshold = ?, lead_time_days = ?
    WHERE product_id = ?
  `);

  forecastCache.products.forEach(p => {
    updateProductThreshold.run(p.reorder_point, p.lead_time_days || 7, p.product_id);
  });
  console.log(`[CALIBRATE] Updated reorder_threshold to fleet ROP for ${forecastCache.products.length} products.`);

  // 2. Define the exact 7 at-risk products
  // Critical (2 items): Product 2 (Extra Virgin Olive Oil 1L) and Product 7 (Organic Black Chia Seeds 500g)
  // Low (5 items): Product 22, 26, 8, 50, 19
  // Overstocked (3 items): Product 12, 16, 45
  // Healthy (40 items): Remaining

  const targetAllocations = {
    // 2 Critical products (stock <= 0.25 * ROP, ~2-3 days of cover)
    2: { total: 1600, store10: 4 },     // Extra Virgin Olive Oil 1L (ROP 7993, daily 708.87 -> 2.2 days cover, Store 10 has 4 units!)
    7: { total: 1800, store10: 12 },    // Organic Black Chia Seeds 500g (ROP 8937, daily 707.37 -> 2.5 days cover)
    
    // 5 Low stock products (stock <= ROP, ~7-10 days of cover)
    22: { total: 7500 },  // Moisturizing Shea Conditioner (ROP 10999, daily 973.17 -> 7.7 days cover)
    26: { total: 5200 },  // Hydrating Hyaluronic Acid Serum (ROP 8763, daily 577.23 -> 9.0 days cover)
    8:  { total: 8200 },  // Pure Organic Canadian Maple Syrup (ROP 10568, daily 932.93 -> 8.8 days cover)
    50: { total: 6100 },  // Medjool Organic Dates Box 500g (ROP 7973, daily 796.23 -> 7.6 days cover)
    19: { total: 3300 },  // English Breakfast Black Tea 100 Bags (ROP 4233, daily 489.17 -> 6.7 days cover)

    // 3 Overstocked products (stock > 3 * ROP, > 75 days of cover)
    12: { factor: 3.3 }, // Organic Ceremonial Matcha Powder
    16: { factor: 3.2 }, // Sparkling Spring Water 12-Pack
    45: { factor: 3.4 }  // Kettle Cooked Jalapeno Potato Chips
  };

  const updateStock = db.prepare(`
    UPDATE warehouse_stock 
    SET quantity_on_hand = ? 
    WHERE warehouse_id = ? AND product_id = ?
  `);

  // Distribute stocks across 10 warehouses
  for (let pId = 1; pId <= 50; pId++) {
    const fp = forecastMap.get(pId);
    if (!fp) continue;

    const target = targetAllocations[pId];

    if (target && target.total) {
      // Specified target total
      const totalUnits = target.total;
      let remaining = totalUnits;
      
      // If store 10 has specific units:
      if (target.store10 !== undefined) {
        updateStock.run(target.store10, 10, pId);
        remaining -= target.store10;
        const perStore = Math.floor(remaining / 9);
        for (let w = 1; w <= 9; w++) {
          const qty = (w === 9) ? (remaining - perStore * 8) : perStore;
          updateStock.run(Math.max(1, qty), w, pId);
        }
      } else {
        const perStore = Math.floor(remaining / 10);
        for (let w = 1; w <= 10; w++) {
          const qty = (w === 10) ? (remaining - perStore * 9) : perStore;
          updateStock.run(Math.max(1, qty), w, pId);
        }
      }
    } else if (target && target.factor) {
      // Overstocked
      const totalUnits = Math.round(fp.reorder_point * target.factor);
      const perStore = Math.floor(totalUnits / 10);
      for (let w = 1; w <= 10; w++) {
        const qty = (w === 10) ? (totalUnits - perStore * 9) : perStore;
        updateStock.run(qty, w, pId);
      }
    } else {
      // Healthy: between 1.4 and 2.2 times ROP (~20 to 50 days of cover)
      const healthyFactor = 1.4 + ((pId * 7) % 8) * 0.1; // deterministic between 1.4 and 2.1
      const totalUnits = Math.round(fp.reorder_point * healthyFactor);
      const perStore = Math.floor(totalUnits / 10);
      for (let w = 1; w <= 10; w++) {
        // Vary slightly per store (+- 15%)
        const variance = 1 + (((w * pId) % 7) - 3) * 0.04;
        const qty = Math.max(20, Math.round(perStore * variance));
        updateStock.run(qty, w, pId);
      }
    }
  }

  // 3. Resync stock_alerts table to accurately reflect store-level threshold breaches
  // Store threshold = Round(fleet ROP / 10)
  db.exec('DELETE FROM stock_alerts;');

  const insertAlert = db.prepare(`
    INSERT INTO stock_alerts (product_id, warehouse_id, current_quantity, reorder_threshold, alert_severity, alert_status, triggered_at)
    VALUES (?, ?, ?, ?, ?, 'OPEN', DATETIME('now'))
  `);

  const stocks = db.prepare(`
    SELECT ws.warehouse_id, ws.product_id, ws.quantity_on_hand, p.reorder_threshold as fleet_rop, p.product_name
    FROM warehouse_stock ws
    JOIN products p ON ws.product_id = p.product_id
  `).all();

  let criticalAlerts = 0;
  let warningAlerts = 0;

  stocks.forEach(s => {
    const storeRop = Math.max(10, Math.round(s.fleet_rop / 10));
    const storeCrit = Math.max(2, Math.round(storeRop * 0.25));

    if (s.quantity_on_hand <= storeCrit) {
      insertAlert.run(s.product_id, s.warehouse_id, s.quantity_on_hand, storeRop, 'CRITICAL');
      criticalAlerts++;
    } else if (s.quantity_on_hand <= storeRop) {
      insertAlert.run(s.product_id, s.warehouse_id, s.quantity_on_hand, storeRop, 'WARNING');
      warningAlerts++;
    }
  });

  console.log(`[CALIBRATE] Created ${criticalAlerts} CRITICAL and ${warningAlerts} WARNING alerts in stock_alerts.`);

  // 4. Update forecast_cache.json with current stock values so it reflects reality
  const currentStocks = db.prepare(`
    SELECT product_id, SUM(quantity_on_hand) as total_stock
    FROM warehouse_stock
    GROUP BY product_id
  `).all();
  const stockDict = new Map(currentStocks.map(r => [r.product_id, r.total_stock]));

  forecastCache.products.forEach(p => {
    const cs = stockDict.get(p.product_id) || 0;
    p.current_stock = cs;
    p.is_reorder_needed = cs <= p.reorder_point;
    p.suggested_reorder = p.is_reorder_needed ? Math.max(0, (p.reorder_point + p.safety_stock) - cs) : 0;
  });

  fs.writeFileSync(forecastPath, JSON.stringify(forecastCache, null, 2), 'utf8');
  console.log('[CALIBRATE] Synchronized ai/forecast_cache.json with new live stocks.');

  db.exec('COMMIT;');
  console.log('[CALIBRATE] Data sanity calibration committed successfully!');
} catch (err) {
  db.exec('ROLLBACK;');
  console.error('[CALIBRATE] Error during calibration:', err);
  process.exit(1);
}
