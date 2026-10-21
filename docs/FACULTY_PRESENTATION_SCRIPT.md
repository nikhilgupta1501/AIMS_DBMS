# AIMS: Faculty Presentation Scripts & Viva Defense Guide
**Course**: Database Management Systems (DBMS)  
**Project**: AIMS (Autonomous Inventory Management & Demand Intelligence Platform)  
**System Architecture**: 3-Tier Enterprise Web System (Relational DB Core + Express REST API + Python ML Engine + Interactive Dashboard)  

---

## Table of Contents
1. [Part 1: Dedicated Script for the DBMS Engineer / Database Lead](#part-1-dedicated-script-for-the-dbms-engineer--database-lead)
   - 1.1 [Opening & Schema Overview](#11-opening--schema-overview-6090-seconds)
   - 1.2 [3NF Normalization Proof Defense](#12-3nf-normalization-proof-point-by-point-defense)
   - 1.3 [ACID Transactions & Concurrency Defense](#13-acid-transactions--concurrency-defense)
   - 1.4 [Event-Driven Database Triggers Defense](#14-event-driven-database-triggers-defense)
2. [Part 2: Overall System Presentation Script (Full Team / System Walkthrough)](#part-2-overall-system-presentation-script-full-team-walkthrough)
   - 2.1 [Introduction & Problem Statement](#step-1-hook--problem-statement-team-lead)
   - 2.2 [Role-Based Access Control (RBAC)](#step-2-authentication--role-based-access-control-rbac)
   - 2.3 [Executive Overview & Fleet Telemetry](#step-3-executive-overview--live-fleet-telemetry)
   - 2.4 [Catalog & Outbound Stock Movement](#step-4-catalog-multi-depot-stock--movement)
   - 2.5 [Immutable Audit Ledger & ACID Proof](#step-5-immutable-audit-ledger--acid-proof)
   - 2.6 [Live Trigger Alert Generation](#step-6-live-trigger-demonstration-in-stock-alerts)
   - 2.7 [Inbound Procurement & Automated Restocking](#step-7-procurement-purchase-order-workflow)
   - 2.8 [Machine Learning Demand Intelligence & Retraining](#step-8-machine-learning-demand-intelligence--live-retraining)
   - 2.9 [Conclusion & Faculty Hand-Off](#step-9-conclusion--faculty-hand-off)
3. [Part 3: Interactive Faculty Demonstration Protocol (Live Click-by-Click Guide)](#part-3-interactive-faculty-demonstration-protocol)
4. [Part 4: Faculty Viva / Oral Examination Cheat Sheet (Questions & Answers)](#part-4-faculty-viva--oral-examination-cheat-sheet)

---

# Part 1: Dedicated Script for the DBMS Engineer / Database Lead

> **Role Focus**: Relational Schema Architecture, 3NF Normalization Proof, ACID Transactional Integrity, Event-Driven Database Triggers, Engine-Level Domain Constraints, and Concurrency Control.

---

### 1.1 Opening & Schema Overview (60–90 Seconds)
> **Spoken Delivery:**
> 
> *"Good morning, Respected Faculty. I am the Database Systems Lead for **AIMS** (Autonomous Inventory Management System).*
> 
> *Traditional inventory applications often treat the database as a passive key-value store or use un-normalized flat spreadsheets. This causes chronic industry failures: data redundancy, insertion/update anomalies, dirty reads, and negative stock corruption.*
> 
> *In AIMS, our database tier is the central engine enforcing absolute business rules and data consistency. Our relational schema consists of **11 fully normalized entities** mapped in strict compliance with the relational model:*
> 1. `users` — for credential hashing and Role-Based Access Control (`ADMIN`, `STAFF`, `MANAGER`).
> 2. `categories` & `products` — catalog taxonomy with cost prices and SKU constraints.
> 3. `suppliers` — vendor contact details and contractual delivery lead times (`lead_time_days`).
> 4. `warehouses` & `warehouse_stock` — resolving the Many-to-Many relationship between products and physical regional depots.
> 5. `purchase_orders` & `purchase_order_items` — procurement header-detail decomposition.
> 6. `stock_transactions` — an append-only, immutable double-entry ledger.
> 7. `stock_alerts` — real-time warning states populated automatically by database triggers.
> 8. `forecast_logs` — audit logs storing ML predictions alongside ground truth actuals for tracking model drift.*
> 
> *Let me now justify our **Third Normal Form (3NF)** normalization proof."*

---

### 1.2 3NF Normalization Proof (Point-by-Point Defense)
> *`[ACTION: Navigate to '#/app/specs' tab on screen]`*
> 
> **Spoken Delivery:**
> 
> *"Our database strictly satisfies up to **Third Normal Form (3NF)**:*
> 
> - **First Normal Form (1NF — Atomicity & No Repeating Groups):**  
>   *In an unnormalized spreadsheet, multiple line items in an order or stocks across multiple depots are stored as repeating arrays or multi-valued columns. In AIMS, every attribute contains atomic, indivisible scalar values. Repeating order lines are decomposed into `purchase_order_items`, and multi-depot inventory is separated into discrete rows in `warehouse_stock` with primary keys.*
> 
> - **Second Normal Form (2NF — Elimination of Partial Key Dependencies):**  
>   *A table is in 2NF if it is in 1NF and no non-prime attribute depends on a proper subset of any composite candidate key. In our composite relation `warehouse_stock(warehouse_id, product_id)`, non-key attributes like `product_name` or `warehouse_location` are **NOT** stored here. Only attributes functionally dependent on the entire composite key (`quantity_on_hand`, `last_updated`) remain. Therefore, partial dependencies are completely eliminated.*
> 
> - **Third Normal Form (3NF — Elimination of Transitive Dependencies):**  
>   *A table is in 3NF if it is in 2NF and contains no transitive dependencies ($X \rightarrow Y \rightarrow Z$). For example, in our `purchase_orders` table, the primary key is `order_id`, and it references `supplier_id` as a foreign key. Vendor phone numbers, emails, and lead times are strictly isolated in `suppliers`. If a vendor updates their contact info, it is modified in exactly **one tuple**, completely preventing update and deletion anomalies."*

---

### 1.3 ACID Transactions & Concurrency Defense
> **Spoken Delivery:**
> 
> *"Next, regarding concurrency and transactional consistency:*
> 
> *Inventory systems frequently encounter race conditions where multiple warehouse operators attempt to dispatch stock simultaneously. We solve this at two distinct layers:*
> 
> 1. **Engine-Level Domain Constraints:**  
>    *The table `warehouse_stock` defines `CONSTRAINT chk_non_negative_stock CHECK (quantity_on_hand >= 0)`. The database engine itself physically rejects any statement that would produce negative inventory.*
> 
> 2. **ACID Transaction Wrapping:**  
>    *In `server.js`, every stock dispatch executes inside an explicit `BEGIN TRANSACTION;` block. We deduct the warehouse quantity and insert an audit row into `stock_transactions`. If any constraint fails, the engine triggers an immediate `ROLLBACK;`. The ledger and balance are updated atomically—either completely committed or entirely rolled back, preventing dirty reads or partial writes."*

---

### 1.4 Event-Driven Database Triggers Defense
> **Spoken Delivery:**
> 
> *"Finally, we do not poll or use scheduled cron jobs to detect stockouts. We implemented an event-driven database trigger: `trg_stock_level_alert`.*
> 
> *Attached to `AFTER UPDATE OF quantity_on_hand ON warehouse_stock`, the trigger executes automatically at the database engine level:*
> - *If `NEW.quantity_on_hand <= products.reorder_threshold`, it queries the threshold, evaluates severity (`CRITICAL` if stock is 0, else `WARNING`), and writes an open alert into `stock_alerts`.*
> - *Conversely, when a purchase order arrives and stock rises above the threshold, the trigger automatically marks unresolved alerts as `RESOLVED`.*
> 
> *This decouples business logic from client code and guarantees real-time notification at the storage engine level."*

---

# Part 2: Overall System Presentation Script (Full Team Walkthrough)

* **Target Time:** 6 to 8 minutes
* **Tone:** Professional, technically sound, and structured

---

### Step 1: Hook & Problem Statement (Team Lead)
> **Spoken Delivery:**
> 
> *"Respected Faculty members, welcome to our presentation of **AIMS: Autonomous Inventory Management & Demand Intelligence Platform**.*
> 
> *Modern enterprises lose billions every year due to two critical operational flaws:*
> 1. **Stockouts & Emergency Shipments**, because legacy software cannot forecast upward trend velocity.
> 2. **Overstocking & Capital Bloat**, because managers rely on static guesswork reorder thresholds.
> 
> *Furthermore, legacy tools rely on fragmented spreadsheets and un-normalized stores that lack ACID guarantees, leading to ghost inventory and data corruption.*
> 
> *Our solution, **AIMS**, is an enterprise-grade 3-Tier Web Platform built on:*
> - **PostgreSQL / Relational DBMS Core** normalized to 3NF with automated triggers and ACID transactions.
> - **Node.js & Express REST API Application Tier** handling decoupled business workflows.
> - **Python ML Intelligence Engine** using `scikit-learn` for demand forecasting and unsupervised K-Means ABC stratification.
> - **Modern Operations Dashboard** with real-time visual telemetry.*
> 
> *Let us now demonstrate the live working system."*

---

### Step 2: Authentication & Role-Based Access Control (RBAC)
> *`[ACTION: Open Browser at 'http://localhost:3000/#/login']`*
> 
> **Spoken Delivery:**
> 
> *"AIMS enforces strict Role-Based Access Control (`RBAC`) to ensure operational security. We have built-in personas representing real enterprise roles:*
> 
> 1. **Saumya Sharma (`ADMIN`):** Has complete CRUD permissions across the catalog, supplier onboarding, order approvals, and catalog deletions.
> 2. **Rahul Verma (`STAFF`):** Operates on the warehouse floor—dispatches stock, receives shipments, but has deletion buttons strictly disabled.
> 3. **Ananya Gupta (`MANAGER`):** Responsible for catalog items, inbound procurement, and triggering machine learning forecasting models.
> 
> *Let us log in as Administrator to inspect the main dashboard."*

---

### Step 3: Executive Overview & Live Fleet Telemetry
> *`[ACTION: Click on 'Overview' tab ('#/app/overview')]`*
> 
> **Spoken Delivery:**
> 
> *"On the Overview page, our relational SQL views aggregate live KPIs:*
> - **Total Fleet Stock Units & Valuation:** Computed dynamically via our view `v_product_inventory_status`.
> - **Active Warehouse Depots:** Tracking capacities across Chicago (ORD-01), New York (JFK-02), and Dallas (DFW-03).
> - **Triggered System Alerts:** Directly monitoring open stockout risks.*
> 
> *Now let's see how warehouse inventory is managed."*

---

### Step 4: Catalog, Multi-Depot Stock & Movement
> *`[ACTION: Click on 'Catalog & Stock' tab ('#/app/inventory')]`*
> 
> **Spoken Delivery:**
> 
> *"In the Catalog view, each product is mapped to multiple warehouses via the associative entity `warehouse_stock`. Every SKU has a unit selling price, cost price, and safety reorder threshold.*
> 
> *Let's perform an outbound dispatch movement:*
> `[ACTION: Click 'Dispatch / Restock', select 'STOCK_OUT', enter Product 'Smart ANC Headphones Pro', Warehouse 'ORD-01 Chicago', Quantity: 15, Notes: 'B2B Client Order #882']`  
> `[ACTION: Click 'Execute Transaction']`
> 
> *Notice two instantaneous reactions:*
> 1. *Stock quantity is decremented atomically.*
> 2. *Our append-only ledger recorded this in `stock_transactions`.*
> 
> *Let us verify the audit log right now."*

---

### Step 5: Immutable Audit Ledger & ACID Proof
> *`[ACTION: Click on 'Audit Ledger (ACID)' tab ('#/app/audit')]`*
> 
> **Spoken Delivery:**
> 
> *"Here in the Audit Ledger, you can see the transaction we just committed. It records:*
> - *Exact Timestamp*
> - *Product SKU & Depot ID*
> - *Quantity Change (-15)*
> - *Resulting Balance After*
> - *Authenticated User ID*
> 
> *This table is strictly append-only. There is no update or delete capability on this relation, guaranteeing a tamper-proof audit trail for enterprise compliance."*

---

### Step 6: Live Trigger Demonstration in Stock Alerts
> *`[ACTION: Click on 'Stock Alerts' tab ('#/app/alerts')]`*
> 
> **Spoken Delivery:**
> 
> *"Because our dispatch reduced the inventory below the product's reorder threshold, our database trigger `trg_stock_level_alert` immediately fired in the database engine and inserted an alert.*
> 
> *You can see the Alert severity: `WARNING` (or `CRITICAL` if stock hits 0).  
> Notice that the frontend did not generate this alert—it was created server-side by the database trigger. Now, how do we replenish this inventory?"*

---

### Step 7: Procurement Purchase Order Workflow
> *`[ACTION: Click on 'Purchase Orders' tab ('#/app/purchase-orders')]`*
> 
> **Spoken Delivery:**
> 
> *"In the Purchase Orders module, procurement managers create inbound orders to certified suppliers.  
> Notice our procurement state machine:*
> $$\text{PENDING} \longrightarrow \text{APPROVED} \longrightarrow \text{RECEIVED}$$
> 
> *When an order status is updated to `RECEIVED`:*
> `[ACTION: Find a PENDING order, click 'Approve', then click 'Receive Shipment']`
> 
> *Under the hood, an atomic database transaction executes:  
> 1. It adds the incoming stock quantity to `warehouse_stock`.  
> 2. It creates an incoming transaction record (`RESTOCK`).  
> 3. The database trigger evaluates the new quantity, sees that stock is now healthy, and automatically resolves the open alert in `stock_alerts`!"*

---

### Step 8: Machine Learning Demand Intelligence & Live Retraining
> *`[ACTION: Click on 'AI Demand Forecast' tab ('#/app/forecasts')]`*
> 
> **Spoken Delivery:**
> 
> *"Now let's examine our AI Intelligence Tier. In this module, we bridge classical DBMS history with explainable Machine Learning:*
> 
> 1. **Data Ingestion via SQL View:**  
>    *Our Python service (`ai/forecast_service.py`) queries `v_monthly_sales_velocity` to aggregate real outbound sales transactions month-by-month.*
> 
> 2. **Benchmark Model Evaluation (Linear Regression vs Moving Average):**  
>    *We evaluate our Linear Trend Regression against the industry-standard 3-Period Moving Average baseline.  
>    Our Linear Regression achieves a **Mean Absolute Error (MAE) of 0.87 units**, compared to **7.68 units** for the baseline—an **88.7% empirical accuracy gain** with an $R^2$ of **0.971**.*
> 
> 3. **Statistical Inventory Theory Formulas:**  
>    *Instead of arbitrary guesswork, the engine computes:*
>    - **Safety Stock ($SS$):** $SS = 1.65 \times \sigma_{\text{demand}} \times \sqrt{L}$ *(providing 95% cycle-service level protection against supplier lead time $L$)*.
>    - **Dynamic Reorder Point ($ROP$):** $ROP = (\text{Daily Demand} \times L) + SS$.
> 
> 4. **Unsupervised K-Means Clustering ($k=3$):**  
>    *We cluster products into **Class A (High Value / Velocity)**, **Class B**, and **Class C** using Scikit-Learn $K$-Means clustering.*
> 
> 5. **Live One-Click Retraining:**  
>    *`[ACTION: Click the 'Retrain AI Models' button]`*  
>    *The Express server asynchronously invokes the Python process via child process, retrains the regression models on the latest database rows, logs the projections into `forecast_logs`, and refreshes the Chart.js visual canvas in real time."*

---

### Step 9: Conclusion & Faculty Hand-Off
> **Spoken Delivery:**
> 
> *"To summarize: AIMS is not just a UI form. It is an end-to-end, enterprise-grade architecture:
> - **Strict 3NF Database Normalization** eliminating redundancy and anomalies.
> - **Event-driven SQL Triggers** protecting stock levels in real time.
> - **Atomic ACID Transactions** ensuring ledger consistency.
> - **Explainable Machine Learning** driving proactive, automated procurement.
> 
> *Thank you very much. We are now open for viva questions and technical review."*

---

# Part 3: Interactive Faculty Demonstration Protocol

| Sequence | What to Click / Do on Screen | What to Say to the Faculty | What Happens in the Database Behind the Scenes |
|---|---|---|---|
| **Demo 1: Landing Page & 3D Isometric View** | Open `http://localhost:3000/#/`, scroll to Hero section and show the interactive 3D warehouse isometric model and telemetry tags. | *"Here is our landing page showcasing the 3D warehouse layout, live depot fill percentages, and architectural specifications."* | Serves static assets, loads typography and metadata. |
| **Demo 2: RBAC Role Switching** | Click **Sign In**, select **Rahul Verma (`STAFF`)**, log in. Show that catalog deletion buttons are hidden or disabled. Then log out and select **Saumya Sharma (`ADMIN`)**. | *"Our system implements Role-Based Access Control (RBAC). Floor staff can execute dispatches, but only Admins can delete catalog items or register suppliers."* | Queries table `users` verifying role `ADMIN` vs `STAFF` stored in `users.role`. |
| **Demo 3: Force a Trigger to Fire** | Go to **Catalog & Stock**, click **Dispatch / Restock**, choose `STOCK_OUT` with a quantity that drops stock $\le$ Reorder Threshold (e.g. dispatch 20 units). | *"Now watch carefully. I am dispatching 20 units. This drops the quantity below the product's safety threshold."* | `server.js` starts a `BEGIN TRANSACTION`, updates `warehouse_stock`. Trigger `trg_stock_level_alert` fires and inserts a new row in `stock_alerts`. |
| **Demo 4: Verify Trigger & Audit Log** | Click **Stock Alerts** tab $\rightarrow$ point out the new `WARNING`/`CRITICAL` alert. Then click **Audit Ledger** $\rightarrow$ show the immutable row with negative change and updated balance. | *"Without writing any backend polling loops, our database trigger automatically generated this alert row. Furthermore, the transaction ledger logged this movement."* | Queries `stock_alerts` table (viewing open alerts) and `stock_transactions` table. |
| **Demo 5: Trigger Auto-Resolution** | Go to **Purchase Orders**, create or receive a PO for that product, click **Receive Shipment**. Return to **Stock Alerts**. | *"When the replacement stock is received, the trigger checks that stock is once again healthy and automatically marks the alert status as `RESOLVED`."* | The update to `warehouse_stock` causes `fn_check_low_stock()` to execute the `ELSE` branch: `UPDATE stock_alerts SET alert_status = 'RESOLVED'`. |
| **Demo 6: Negative Stock Rejection** | Attempt to dispatch **999,999 units** of any product from a depot that only has 50 units. | *"Notice that the system rejects this transaction with an error. This is enforced directly by the database check constraint: `CHECK (quantity_on_hand >= 0)`."* | The database throws a `CHECK constraint failed` error, the Express backend catches it, executes `ROLLBACK;`, and returns an HTTP 400 error. |
| **Demo 7: AI Demand Retraining** | Go to **AI Demand Forecast** tab, review the actual sales vs Linear Regression projection chart and Moving Average line. Click **Retrain AI Models**. | *"Our AI engine runs live Scikit-Learn Linear Regression and K-Means clustering off the SQL database, demonstrating an 88.7% accuracy advantage over the 3-period moving average benchmark."* | Node calls Python child process `ai/forecast_service.py`, fits model, writes output to `forecast_logs` and JSON cache. |

---

# Part 4: Faculty Viva / Oral Examination Cheat Sheet

### Q1: "Why did you use SQLite/PostgreSQL instead of MongoDB or NoSQL for this project?"
> **Winning Answer:**  
> *"Inventory management is fundamentally relational and requires strict ACID compliance. A stock dispatch is a two-phase operation: decrementing the depot balance and logging the audit ledger. In NoSQL document stores like MongoDB, multi-document transactions introduce significant overhead, and document models often duplicate product data across orders, leading to update anomalies. Relational databases enforce declarative foreign keys, unique SKU constraints, and table-level `CHECK (quantity_on_hand >= 0)` constraints at the storage engine level."*

---

### Q2: "Can you prove that your schema has no Transitive Dependencies (3NF)?"
> **Winning Answer:**  
> *"Yes, Sir/Madam. A transitive dependency exists if $X \rightarrow Y$ and $Y \rightarrow Z$, meaning a non-key attribute depends on another non-key attribute.  
> In our design:  
> - In `purchase_orders`, the primary key is `order_id`. It references `supplier_id`. If we had stored `supplier_address` or `phone` in `purchase_orders`, then $\text{order\_id} \rightarrow \text{supplier\_id} \rightarrow \text{phone}$ would be a transitive dependency.  
> - We strictly eliminated this by creating a dedicated `suppliers` table where vendor details depend exclusively on `supplier_id`. The same applies to `products` referencing `categories`. Thus, no transitive dependencies exist, satisfying 3NF."*

---

### Q3: "What happens if two users try to dispatch the last 5 items at the exact same millisecond?"
> **Winning Answer:**  
> *"Our architecture handles this at two levels:  
> 1. **ACID Transaction Isolation**: The update runs inside a serial transaction (`BEGIN TRANSACTION`). The database engine places a row-level write lock on the specific `warehouse_stock` row.  
> 2. **Check Constraint Defense**: Even in high concurrency, the table has `CONSTRAINT chk_non_negative_stock CHECK (quantity_on_hand >= 0)`. The first transaction succeeds and drops stock to 0. The second transaction immediately fails the check constraint, triggering an automatic `ROLLBACK;`, completely preventing negative stock."*

---

### Q4: "Why did you implement a trigger instead of simply checking stock in your Node.js code?"
> **Winning Answer:**  
> *"If stock checking logic is written only in Node.js, any other service, script, batch import, or DBA directly running an `UPDATE` in SQL would bypass the safety check entirely. Moving the alert logic into a database trigger (`trg_stock_level_alert`) guarantees that **regardless of which application or interface modifies the inventory**, the business rule is universally and consistently enforced at the lowest and most authoritative layer."*

---

### Q5: "Why Linear Regression instead of a Deep Learning LSTM or Neural Network?"
> **Winning Answer:**  
> *"Two reasons:  
> 1. **Data Reality in Inventory**: Enterprise sales records are aggregated periodically (monthly/weekly). Deep learning models like LSTMs require tens of thousands of continuous data points and would severely overfit on sparse monthly inventory numbers.  
> 2. **Auditability & Explainability**: In supply chains, purchase orders represent real company capital. With Linear Regression, managers can mathematically verify the trend slope ($y = mx + c$) and confidence intervals. Furthermore, linear regression trains in milliseconds directly off our SQL view, enabling instant on-demand retraining."*

---

### Pre-Viva Checklist:
- [x] Run `node server.js` from workspace root.
- [x] Ensure browser is open at `http://localhost:3000`.
- [x] Test `Dispatch / Restock` once to verify database write.
- [x] Have `docs/schema_diagram.md` and `#/app/specs` open in a background tab for instant reference.
