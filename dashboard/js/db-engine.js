/**
 * AIMS In-Memory Relational Engine & ACID Simulator
 * Enforces Referential Integrity, Check Constraints, and Triggers in real time
 */

class DBMSEngine {
  constructor(initialData) {
    this.data = JSON.parse(JSON.stringify(initialData));
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  // --- SQL Views Simulation ---

  // Simulates View: v_product_inventory_status (Joins Products + Categories + Warehouse_Stock Aggregation)
  getProductInventoryStatus() {
    return this.data.products.map(prod => {
      const category = this.data.categories.find(c => c.category_id === prod.category_id);
      const stockEntries = this.data.warehouse_stock.filter(ws => ws.product_id === prod.product_id);
      const totalStock = stockEntries.reduce((sum, item) => sum + item.quantity_on_hand, 0);
      const totalValuation = totalStock * prod.unit_price;

      let status = 'HEALTHY';
      if (totalStock === 0) {
        status = 'OUT_OF_STOCK';
      } else if (totalStock <= prod.reorder_threshold) {
        status = 'LOW_STOCK';
      }

      return {
        ...prod,
        category_name: category ? category.category_name : 'Unassigned',
        total_stock: totalStock,
        total_valuation: totalValuation,
        stock_status: status,
        warehouse_breakdown: stockEntries.map(se => {
          const wh = this.data.warehouses.find(w => w.warehouse_id === se.warehouse_id);
          return {
            warehouse_id: se.warehouse_id,
            warehouse_name: wh ? wh.warehouse_name : `WH-${se.warehouse_id}`,
            quantity: se.quantity_on_hand
          };
        })
      };
    });
  }

  // System KPI Aggregations
  getKPIs() {
    const products = this.getProductInventoryStatus();
    const totalValuation = products.reduce((acc, p) => acc + p.total_valuation, 0);
    const lowStockCount = products.filter(p => p.stock_status !== 'HEALTHY').length;
    const activeAlerts = this.data.stock_alerts.filter(a => a.status === 'OPEN').length;

    return {
      total_products: products.length,
      total_valuation: totalValuation,
      low_stock_count: lowStockCount,
      open_alerts_count: activeAlerts,
      forecast_accuracy: '91.4%'
    };
  }

  // --- ACID Transaction Simulation ---

  /**
   * Executes an atomic inventory movement:
   * 1. Validates foreign keys and check constraints (quantity >= 0).
   * 2. Deducts/Adds quantity in warehouse_stock.
   * 3. Appends immutable audit record to stock_transactions.
   * 4. Fires Trigger: fn_check_low_stock().
   */
  executeStockTransaction({ productId, warehouseId, type, quantityChange, userId = 1, notes = '' }) {
    // 1. Constraint Check: Product and Warehouse must exist (Referential Integrity)
    const product = this.data.products.find(p => p.product_id === Number(productId));
    const warehouse = this.data.warehouses.find(w => w.warehouse_id === Number(warehouseId));
    if (!product || !warehouse) {
      throw new Error(`Referential Integrity Violation: Invalid Product ID or Warehouse ID.`);
    }

    // 2. Find target warehouse stock row
    let stockRow = this.data.warehouse_stock.find(
      ws => ws.product_id === Number(productId) && ws.warehouse_id === Number(warehouseId)
    );

    if (!stockRow) {
      // Create new associative record if absent
      stockRow = {
        stock_id: this.data.warehouse_stock.length + 1,
        warehouse_id: Number(warehouseId),
        product_id: Number(productId),
        quantity_on_hand: 0
      };
      this.data.warehouse_stock.push(stockRow);
    }

    const newBalance = stockRow.quantity_on_hand + Number(quantityChange);

    // 3. Domain Constraint Check: CHECK (quantity_on_hand >= 0)
    if (newBalance < 0) {
      throw new Error(
        `CHECK Constraint Violation [chk_non_negative_stock]: Current stock is ${stockRow.quantity_on_hand}, cannot deduct ${Math.abs(quantityChange)}. Stock cannot become negative!`
      );
    }

    // --- Begin Atomic Commit ---
    stockRow.quantity_on_hand = newBalance;

    // Append to Transaction Ledger
    const newTxId = 100 + this.data.transactions.length + 1;
    const user = this.data.users.find(u => u.user_id === Number(userId));
    const txEntry = {
      transaction_id: newTxId,
      product_id: product.product_id,
      warehouse_id: warehouse.warehouse_id,
      type: type,
      qty: Number(quantityChange),
      balance_after: newBalance,
      user: user ? user.full_name : 'Staff Member',
      time: 'Just now',
      notes: notes || `Operation: ${type}`
    };
    this.data.transactions.unshift(txEntry);

    // 4. Trigger Execution: trg_stock_level_alert
    const triggerResult = this._triggerCheckLowStock(product, warehouse, newBalance);

    // Commit complete, notify UI listeners
    this.notify();

    return {
      success: true,
      transaction: txEntry,
      newBalance: newBalance,
      triggerFired: triggerResult
    };
  }

  // --- Database Trigger Simulator: trg_stock_level_alert ---
  _triggerCheckLowStock(product, warehouse, currentQuantity) {
    const threshold = product.reorder_threshold;
    const existingAlertIndex = this.data.stock_alerts.findIndex(
      a => a.product_id === product.product_id && a.warehouse_id === warehouse.warehouse_id && a.status === 'OPEN'
    );

    if (currentQuantity <= threshold) {
      const severity = currentQuantity <= 5 ? 'CRITICAL' : 'WARNING';

      if (existingAlertIndex >= 0) {
        this.data.stock_alerts[existingAlertIndex].current_quantity = currentQuantity;
        this.data.stock_alerts[existingAlertIndex].severity = severity;
        this.data.stock_alerts[existingAlertIndex].triggered_at = 'Just now (Updated)';
        return { fired: true, type: 'UPDATED_ALERT', severity };
      } else {
        const newAlert = {
          alert_id: this.data.stock_alerts.length + 1,
          product_id: product.product_id,
          warehouse_id: warehouse.warehouse_id,
          current_quantity: currentQuantity,
          reorder_threshold: threshold,
          severity: severity,
          status: 'OPEN',
          triggered_at: 'Just now'
        };
        this.data.stock_alerts.unshift(newAlert);
        return { fired: true, type: 'NEW_ALERT', severity, alert: newAlert };
      }
    } else {
      // Stock replenished above threshold: auto-resolve open alerts
      if (existingAlertIndex >= 0) {
        this.data.stock_alerts[existingAlertIndex].status = 'RESOLVED';
        return { fired: true, type: 'RESOLVED_ALERT' };
      }
    }

    return { fired: false };
  }

  // Add a new product with constraints
  addProduct({ sku, name, categoryId, unitPrice, costPrice, reorderThreshold }) {
    if (this.data.products.some(p => p.sku.toLowerCase() === sku.toLowerCase())) {
      throw new Error(`Unique Key Violation: SKU '${sku}' already exists.`);
    }

    const newId = this.data.products.length + 1;
    const newProduct = {
      product_id: newId,
      sku: sku.toUpperCase(),
      name,
      category_id: Number(categoryId),
      unit_price: Number(unitPrice),
      cost_price: Number(costPrice),
      reorder_threshold: Number(reorderThreshold)
    };

    this.data.products.push(newProduct);
    
    // Initialize warehouse stock rows
    this.data.warehouse_stock.push({
      stock_id: this.data.warehouse_stock.length + 1,
      warehouse_id: 1,
      product_id: newId,
      quantity_on_hand: 0
    });
    this.data.warehouse_stock.push({
      stock_id: this.data.warehouse_stock.length + 1,
      warehouse_id: 2,
      product_id: newId,
      quantity_on_hand: 0
    });

    // Check trigger (0 is below threshold)
    this._triggerCheckLowStock(newProduct, this.data.warehouses[0], 0);

    this.notify();
    return newProduct;
  }
}
