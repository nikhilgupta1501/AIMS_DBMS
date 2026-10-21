# Conceptual Entity-Relationship (ER) Diagram
## AI-Based Inventory Management System (AIMS) — DBMS Review 1

This document outlines the **Conceptual ER Modeling** for the AI-Based Inventory Management System. It articulates all core entities, their attributes (keys, descriptors, foreign links), relationship degrees, and mapping cardinalities.

---

## 1. Visual ER Diagram (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ PURCHASE_ORDERS : "creates / approves"
    USERS ||--o{ STOCK_TRANSACTIONS : "authorizes / logs"

    CATEGORIES ||--|{ PRODUCTS : "classifies"

    SUPPLIERS ||--o{ PURCHASE_ORDERS : "fulfills"

    PRODUCTS ||--|{ WAREHOUSE_STOCK : "stocked_in"
    WAREHOUSES ||--|{ WAREHOUSE_STOCK : "holds"

    PURCHASE_ORDERS ||--|{ PURCHASE_ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ PURCHASE_ORDER_ITEMS : "ordered_as"

    PRODUCTS ||--o{ STOCK_TRANSACTIONS : "subject_of"
    WAREHOUSES ||--o{ STOCK_TRANSACTIONS : "origin_or_target"

    PRODUCTS ||--o{ STOCK_ALERTS : "triggers"
    WAREHOUSES ||--o{ STOCK_ALERTS : "occurs_at"

    PRODUCTS ||--o{ FORECAST_LOGS : "evaluated_for"

    USERS {
        int user_id PK
        string full_name
        string email UK
        string password_hash
        string role "ADMIN | STAFF"
        timestamp created_at
    }

    CATEGORIES {
        int category_id PK
        string category_name UK
        string description
    }

    SUPPLIERS {
        int supplier_id PK
        string company_name
        string contact_person
        string email UK
        string phone
        string address
        timestamp created_at
    }

    PRODUCTS {
        int product_id PK
        string sku UK
        string product_name
        int category_id FK
        decimal unit_price
        decimal cost_price
        int reorder_threshold
        timestamp created_at
    }

    WAREHOUSES {
        int warehouse_id PK
        string warehouse_name
        string location
        int max_capacity
    }

    WAREHOUSE_STOCK {
        int stock_id PK
        int warehouse_id FK
        int product_id FK
        int quantity_on_hand
        timestamp last_updated
    }

    PURCHASE_ORDERS {
        int order_id PK
        int supplier_id FK
        int created_by_user_id FK
        string order_status "PENDING | APPROVED | RECEIVED | CANCELLED"
        decimal total_amount
        timestamp order_date
        timestamp expected_date
    }

    PURCHASE_ORDER_ITEMS {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity_ordered
        decimal unit_cost
        decimal line_total
    }

    STOCK_TRANSACTIONS {
        int transaction_id PK
        int product_id FK
        int warehouse_id FK
        int performed_by_user_id FK
        string transaction_type "STOCK_IN | STOCK_OUT | RESTOCK | ADJUSTMENT"
        int quantity_change
        int balance_after
        timestamp transaction_time
        string notes
    }

    STOCK_ALERTS {
        int alert_id PK
        int product_id FK
        int warehouse_id FK
        int current_quantity
        int reorder_threshold
        string alert_severity "WARNING | CRITICAL"
        string alert_status "OPEN | ACKNOWLEDGED | RESOLVED"
        timestamp triggered_at
    }

    FORECAST_LOGS {
        int forecast_id PK
        int product_id FK
        string model_name "MOVING_AVG | LINEAR_REGRESSION"
        string forecast_period "MONTHLY | WEEKLY"
        int predicted_demand
        int actual_demand
        decimal confidence_score
        timestamp generated_at
    }
```

---

## 2. Entities & Attribute Specifications

### 2.1 Strong Entities
1. **`USERS`**: Staff and administrative accounts interacting with the dashboard and authorizing operations.
   - Key: `user_id` (PK)
   - Unique: `email`
2. **`CATEGORIES`**: Hierarchical grouping for inventory items (e.g., Electronics, Perishables, Raw Materials).
   - Key: `category_id` (PK)
   - Unique: `category_name`
3. **`SUPPLIERS`**: Vendors providing products for purchase orders.
   - Key: `supplier_id` (PK)
4. **`WAREHOUSES`**: Physical distribution centers or storage depots.
   - Key: `warehouse_id` (PK)
5. **`PRODUCTS`**: Catalog items tracked across warehouses.
   - Key: `product_id` (PK)
   - Unique: `sku` (Stock Keeping Unit)
   - Foreign Key: `category_id` references `CATEGORIES`

### 2.2 Associative & Dependent Entities
1. **`WAREHOUSE_STOCK`**: Resolves the $M:N$ relationship between `PRODUCTS` and `WAREHOUSES`.
   - Primary Key: `stock_id` (or composite `(warehouse_id, product_id)`)
   - Unique Constraint: `(warehouse_id, product_id)`
   - Attribute: `quantity_on_hand` with `CHECK (quantity_on_hand >= 0)`
2. **`PURCHASE_ORDERS`**: Header record for supplier procurement.
   - Foreign Keys: `supplier_id`, `created_by_user_id`
3. **`PURCHASE_ORDER_ITEMS`**: Line items for orders ($M:N$ resolution between `PURCHASE_ORDERS` and `PRODUCTS`).
   - Foreign Keys: `order_id`, `product_id`
4. **`STOCK_TRANSACTIONS`**: Immutable audit ledger recording every inventory delta (sales, restocks, damages).
   - Foreign Keys: `product_id`, `warehouse_id`, `performed_by_user_id`
5. **`STOCK_ALERTS`**: Auto-generated by database triggers when `quantity_on_hand <= reorder_threshold`.
   - Foreign Keys: `product_id`, `warehouse_id`
6. **`FORECAST_LOGS`**: Records AI/ML model demand forecasts alongside ground-truth actual demand for performance tracking.
   - Foreign Key: `product_id`

---

## 3. Relationship Cardinalities & Business Rules

| Relationship | Entities Involved | Cardinality | Business Semantics |
| :--- | :--- | :--- | :--- |
| **Categorization** | `CATEGORIES` $\rightarrow$ `PRODUCTS` | $1 : N$ (Mandatory 1 to Optional $N$) | A product belongs to exactly one category; a category can contain zero or more products. |
| **Multi-depot Stocking**| `PRODUCTS` $\leftrightarrow$ `WAREHOUSES` | $M : N$ (via `WAREHOUSE_STOCK`) | A product can be stocked in multiple warehouses; a warehouse holds multiple products. |
| **Procurement** | `SUPPLIERS` $\rightarrow$ `PURCHASE_ORDERS` | $1 : N$ | A supplier can receive multiple purchase orders; an order is issued to exactly one supplier. |
| **Order Line Items** | `PURCHASE_ORDERS` $\rightarrow$ `ITEMS` $\leftarrow$ `PRODUCTS` | $1 : N$ each | An order contains multiple items; each item specifies a product and ordered quantity. |
| **Audit Ledger** | `PRODUCTS` $\rightarrow$ `STOCK_TRANSACTIONS` | $1 : N$ | Every stock movement is immutably logged with before/after balance and user responsibility. |
| **Automated Alerts** | `PRODUCTS` $\rightarrow$ `STOCK_ALERTS` | $1 : N$ | Triggered automatically when warehouse stock breaches reorder thresholds. |
| **AI Demand Logs** | `PRODUCTS` $\rightarrow$ `FORECAST_LOGS` | $1 : N$ | Historical prediction runs logged for demand trend analysis. |
