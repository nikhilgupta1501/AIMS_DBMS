# Relational Schema Diagram & 3NF Normalization Proof
## AI-Based Inventory Management System (AIMS) — DBMS Review 1

This document provides the formal **Relational Schema Design** and the theoretical **Normalization Proof up to Third Normal Form (3NF)** for the AIMS database.

---

## 1. Relational Schema Representation

```
USERS (
    user_id [PK],
    full_name,
    email [UK],
    password_hash,
    role,
    created_at
)

CATEGORIES (
    category_id [PK],
    category_name [UK],
    description
)

SUPPLIERS (
    supplier_id [PK],
    company_name,
    contact_person,
    email [UK],
    phone,
    address,
    created_at
)

PRODUCTS (
    product_id [PK],
    sku [UK],
    product_name,
    category_id [FK -> CATEGORIES(category_id)],
    unit_price,
    cost_price,
    reorder_threshold,
    created_at
)

WAREHOUSES (
    warehouse_id [PK],
    warehouse_name,
    location,
    max_capacity
)

WAREHOUSE_STOCK (
    stock_id [PK],
    warehouse_id [FK -> WAREHOUSES(warehouse_id)],
    product_id [FK -> PRODUCTS(product_id)],
    quantity_on_hand,
    last_updated,
    [UK (warehouse_id, product_id)]
)

PURCHASE_ORDERS (
    order_id [PK],
    supplier_id [FK -> SUPPLIERS(supplier_id)],
    created_by_user_id [FK -> USERS(user_id)],
    order_status,
    total_amount,
    order_date,
    expected_date
)

PURCHASE_ORDER_ITEMS (
    order_item_id [PK],
    order_id [FK -> PURCHASE_ORDERS(order_id) ON DELETE CASCADE],
    product_id [FK -> PRODUCTS(product_id)],
    quantity_ordered,
    unit_cost,
    line_total
)

STOCK_TRANSACTIONS (
    transaction_id [PK],
    product_id [FK -> PRODUCTS(product_id)],
    warehouse_id [FK -> WAREHOUSES(warehouse_id)],
    performed_by_user_id [FK -> USERS(user_id)],
    transaction_type,
    quantity_change,
    balance_after,
    transaction_time,
    notes
)

STOCK_ALERTS (
    alert_id [PK],
    product_id [FK -> PRODUCTS(product_id)],
    warehouse_id [FK -> WAREHOUSES(warehouse_id)],
    current_quantity,
    reorder_threshold,
    alert_severity,
    alert_status,
    triggered_at
)

FORECAST_LOGS (
    forecast_id [PK],
    product_id [FK -> PRODUCTS(product_id)],
    model_name,
    forecast_period,
    predicted_demand,
    actual_demand,
    confidence_score,
    generated_at
)
```

---

## 2. Normalization Analysis & Proof (1NF $\rightarrow$ 2NF $\rightarrow$ 3NF)

Normalization is the systematic process of organizing data in a relational database to minimize redundancy and eliminate anomalies (Insertion, Deletion, and Update anomalies).

### 2.1 Unnormalized Form (UNF) Initial State
In a legacy spreadsheet or non-normalized system, an inventory record might look like:
$$\text{INVENTORY\_SPREADSHEET}(\underline{\text{SKU}}, \text{ProdName}, \text{CatName}, \text{CatDesc}, \text{SuppName}, \text{SuppPhone}, \text{Warehouses}[\text{WH\_ID}, \text{WH\_Loc}, \text{Qty}], \text{Orders}[\text{OrdID}, \text{OrdQty}])$$
* **Problems**:
  - Repeating groups for warehouses and purchase orders.
  - Multi-valued attributes.
  - Inability to add a supplier without stocking a product (Insertion Anomaly).
  - Deleting the last product removes supplier information (Deletion Anomaly).

---

### 2.2 First Normal Form (1NF)
**Requirement**:
1. All attributes must contain atomic (indivisible) values.
2. No repeating groups or arrays.
3. A unique primary key must be designated for each relation.

**Transformation**:
- Decompose repeating groups into independent tables:
  - `PRODUCTS`, `WAREHOUSE_STOCK`, `PURCHASE_ORDER_ITEMS`.
- Ensure single-valued fields (e.g., `phone`, `email` are single scalar values; addresses normalized).
- Establish unique primary keys (`product_id`, `stock_id`, `order_item_id`).

$$\text{Status: } \mathbf{1NF \text{ Achieved.}}$$

---

### 2.3 Second Normal Form (2NF)
**Requirement**:
1. Relation must be in 1NF.
2. Every non-prime attribute must be **fully functionally dependent** on the primary key (no **Partial Functional Dependencies** on composite candidate keys).

**Analysis of Composite Candidate Keys**:
- Consider `PURCHASE_ORDER_ITEMS`:
  - Composite candidate key: `(order_id, product_id)`.
  - Non-prime attributes: `quantity_ordered`, `unit_cost`, `line_total`.
  - Functional Dependencies:
    $$\{ \text{order\_id}, \text{product\_id} \} \rightarrow \text{quantity\_ordered}$$
    $$\{ \text{order\_id}, \text{product\_id} \} \rightarrow \text{unit\_cost}$$
    $$\{ \text{order\_id}, \text{product\_id} \} \rightarrow \text{line\_total}$$
  - Note: Product attributes such as `product_name`, `unit_price`, and `category_id` depend *only* on `product_id`, not on `order_id`. Therefore, keeping them in `PURCHASE_ORDER_ITEMS` would be a **partial dependency**:
    $$\text{product\_id} \rightarrow \text{product\_name} \quad (\text{Violation of 2NF if stored in order items})$$
  - **Resolution**: Product details remain strictly in `PRODUCTS`. `PURCHASE_ORDER_ITEMS` contains only attributes dependent on both the order and the product.

- Consider `WAREHOUSE_STOCK`:
  - Candidate Key: `(warehouse_id, product_id)`.
  - Functional Dependency:
    $$\{ \text{warehouse\_id}, \text{product\_id} \} \rightarrow \text{quantity\_on\_hand}$$
  - Warehouse details (`warehouse_name`, `location`) depend solely on `warehouse_id`. They are isolated into the `WAREHOUSES` relation.

$$\text{Status: } \mathbf{2NF \text{ Achieved (All partial dependencies eliminated).}}$$

---

### 2.4 Third Normal Form (3NF)
**Requirement**:
1. Relation must be in 2NF.
2. No non-prime attribute is transitively dependent on the primary key (no **Transitive Dependencies**).
   - Formally: For every non-trivial functional dependency $X \rightarrow Y$, either:
     - $X$ is a Superkey, OR
     - $Y$ is a Prime Attribute (member of a candidate key).

**Analysis & Elimination of Transitive Dependencies**:

1. **`PRODUCTS` Relation**:
   - Initial candidate: $\text{product\_id} \rightarrow \text{category\_name}, \text{category\_desc}$.
   - Here, $\text{product\_id} \rightarrow \text{category\_id}$, and $\text{category\_id} \rightarrow \text{category\_name}, \text{category\_desc}$.
   - This creates a transitive dependency: $\text{product\_id} \rightarrow \text{category\_name}$.
   - **Resolution**: Extracted into separate relation `CATEGORIES(category_id, category_name, description)`. `PRODUCTS` stores only the foreign key `category_id`.
   - Now in `PRODUCTS`: Every functional dependency $X \rightarrow Y$ has $X = \text{product\_id}$ (Superkey).

2. **`PURCHASE_ORDERS` Relation**:
   - Initial candidate: $\text{order\_id} \rightarrow \text{supplier\_id} \rightarrow \text{supplier\_phone}, \text{company\_name}$.
   - Transitive dependency: $\text{order\_id} \rightarrow \text{company\_name}$.
   - **Resolution**: Supplier details isolated in `SUPPLIERS(supplier_id, company_name, contact_person, email, phone, address)`. `PURCHASE_ORDERS` retains only `supplier_id`.

3. **`STOCK_TRANSACTIONS` Relation**:
   - Key: `transaction_id`.
   - Functional Dependencies:
     $$\text{transaction\_id} \rightarrow \{ \text{product\_id}, \text{warehouse\_id}, \text{performed\_by\_user\_id}, \text{transaction\_type}, \text{quantity\_change}, \text{balance\_after}, \text{timestamp} \}$$
   - No non-key attribute determines any other non-key attribute.

$$\text{Status: } \mathbf{3NF \text{ Achieved (All transitive dependencies eliminated).}}$$

---

## 3. Database Constraints & Integrity Safeguards

| Level | Constraint Type | Implementation | Purpose |
| :--- | :--- | :--- | :--- |
| **Domain** | `CHECK (quantity_on_hand >= 0)` | `WAREHOUSE_STOCK` | Prevents negative physical inventory. |
| **Domain** | `CHECK (unit_price >= 0)` | `PRODUCTS` | Prevents negative valuation. |
| **Domain** | `CHECK (role IN ('ADMIN', 'STAFF', 'MANAGER'))` | `USERS` | Enforces valid authorization roles. |
| **Domain** | `CHECK (transaction_type IN (...))` | `STOCK_TRANSACTIONS` | Restricts transaction states. |
| **Entity** | Primary Keys (`PK`) | All tables | Guarantees entity uniqueness. |
| **Referential**| Foreign Keys (`FK`) with `RESTRICT` / `CASCADE` | Dependent tables | Guarantees parent-child consistency (e.g. no orphaned order items). |
| **Trigger** | `trg_stock_level_alert` | `AFTER UPDATE ON WAREHOUSE_STOCK` | Automatically inserts or resolves `STOCK_ALERTS` upon threshold breach. |

---

## 4. Stored Procedures & Reporting Views

| Object Type | Identifier | Implementation Purpose |
| :--- | :--- | :--- |
| **Procedure** | `sp_process_stock_movement` | Atomic stock movement transaction: validates foreign keys, checks stock balance non-negative, updates depot quantity, and writes immutable audit entry. |
| **Procedure** | `sp_receive_purchase_order` | Atomic procurement fulfillment: transitions order status to `RECEIVED`, iterates line items, restocks inventory, and updates ledger. |
| **View** | `v_product_inventory_status` | Pre-computes multi-warehouse aggregated stock, total inventory valuation, and health state (`HEALTHY`, `LOW_STOCK`, `OUT_OF_STOCK`). |
| **View** | `v_monthly_sales_velocity` | Aggregates historical monthly sales volume per SKU, feeding clean training data directly to the AI demand forecasting models. |
| **View** | `v_stock_reorder_recommendations`| Evaluates current stock against reorder thresholds and computes suggested replenishment quantities and procurement costs. |

