# 📦 Autonomous Inventory & Demand Intelligence Platform (AIMS)

[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%203NF%20(WAL%20Mode)-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Machine Learning](https://img.shields.io/badge/ML%20Engine-scikit--learn%20Linear%20Regression-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![ACID Compliant](https://img.shields.io/badge/Transactions-Atomic%20ACID%20Double--Entry-4B32C3)](#-acid-transaction-guarantees)
[![License](https://img.shields.io/badge/License-Academic%20%2F%20MIT-blue.svg)]()

> **Database Management Systems (DBMS) — Course Project Deliverable**  
> An enterprise-grade relational inventory management and demand intelligence system combining a normalized third-normal-form (3NF) relational database, atomic double-entry transaction ledgers, database-level event triggers, and explainable classical machine learning demand forecasting trained on **913,000 real-world retail sales transactions**.

---

## 🌟 Executive Overview

Traditional inventory systems suffer from two systemic failures:
1. **Application-level data corruption**: Overselling and race conditions when business rules are checked in client code rather than enforced at the database storage engine.
2. **Black-box or naive forecasting**: Relying either on un-auditable deep learning models or static reorder thresholds that fail during seasonal demand surges.

**AIMS bridges modern database theory with practical statistical machine learning**:
- **Storage-Engine Enforcement**: Strict domain constraints (`CHECK quantity_on_hand >= 0`) and automatic database triggers (`trg_stock_level_alert`) eliminate negative stock anomalies at the storage tier.
- **Explainable Machine Learning**: Ordinary Least Squares (OLS) Linear Regression paired with a 95% service-level Gaussian confidence envelope ($Z = 1.65$) outperforming standard moving-average baselines by **+14.9% empirical MAE reduction** ($R^2 = 0.65$).
- **Live Retraining Execution**: Dynamic orchestration triggering scikit-learn from the backend with zero service restarts, updating forecast caches and relational logs on demand.

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND DASHBOARD                             │
│   • Vanilla ES6 SPA Router  • Chart.js Visuals  • 3D Isometric View    │
│   • 4-State Health Chips    • Real-time Restock & Movement Modals     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST / JSON (RBAC Headers)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    NODE.JS EXPRESS API BACKEND                         │
│   • Route RBAC Guard: requireRole('ADMIN', 'MANAGER', 'STAFF')         │
│   • In-Memory & Disk Forecast Cache Sync (ai/forecast_cache.json)      │
│   • Subprocess Gateway: exec('python ai/forecast_service.py')          │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ SQL (node:sqlite WAL Mode)      │ JSON Cache Sync
┌──────────────────▼───────────────┐ ┌───────────────▼───────────────────┐
│     3NF RELATIONAL DATABASE      │ │      PYTHON ML PIPELINE           │
│  • 11 Normalized Tables (3NF)    │ │  • scikit-learn LinearRegression  │
│  • CHECK (quantity_on_hand >= 0) │ │  • 3-Period Moving Average Baseline│
│  • Event-Driven SQL Triggers     │ │  • Safety Stock: Z * σ * sqrt(L)  │
│  • Double-Entry Audit Ledger     │ │  • Unsupervised K-Means ABC Clust.│
└──────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 🔬 Core Engineering Highlights

### 1. Relational DBMS Design & 3NF Normalization
- **11 Normalized Entities**: Fully decomposes `categories`, `products`, `suppliers`, `warehouses`, `warehouse_stock`, `purchase_orders`, `purchase_order_items`, `stock_transactions`, `stock_alerts`, `forecast_logs`, and `users`.
- **Elimination of Anomalies**:
  - *Insertion Anomaly*: Categories and suppliers exist independently without requiring product associations.
  - *Update Anomaly*: Product price modifications update a single row without cascade risk across depot records.
  - *Deletion Anomaly*: Removing a purchase order preserves product definitions and historical inventory logs via strict foreign key constraints.

### 2. ACID Transaction Guarantees
- **Domain Check Constraints**:
  ```sql
  CONSTRAINT chk_non_negative_stock CHECK (quantity_on_hand >= 0)
  ```
  Prevents overselling even in high-concurrency race condition scenarios.
- **Atomic Double-Entry Inventory Movements**:
  Every stock movement (dispatch, inbound intake, restock) executes inside an atomic database transaction:
  1. `BEGIN TRANSACTION;`
  2. Mutates balance in `warehouse_stock`.
  3. Writes an immutable audit entry into `stock_transactions` (recording transaction delta, timestamp, operator user ID, and remaining balance).
  4. If any constraint fails, the engine triggers an automatic `ROLLBACK;`.

### 3. Event-Driven Database Triggers
- **`trg_stock_level_alert`**:
  Fires automatically on `UPDATE` of `warehouse_stock`:
  - When balance drops below `reorder_threshold`, creates an automated `'CRITICAL'` alert row in `stock_alerts`.
  - When an inbound purchase order is received and stock recovers, automatically marks active alerts as `'RESOLVED'`.

---

## 📈 Machine Learning & Inventory Theory

Our demand pipeline is trained on **913,000 real sales transactions** aggregated from `stock_transactions`:

| Visual Component | Model / Method | Mathematical Formulation | Function |
| :--- | :--- | :--- | :--- |
| **Historical Actuals** (Solid Blue) | SQL Aggregation | $Y_t = \sum_{\text{depots}} \|\Delta \text{Stock Out}\|$ | Empirical ground-truth consumption across 60 months. |
| **ML Trend Line** (Dashed Black) | OLS Linear Regression | $\hat{Y}_t = \beta_0 + \beta_1 \cdot t$ | Models multi-year volume growth ($+12.4\%/\text{yr}$) & projects 60-day horizon. |
| **95% Confidence Band** (Shaded Indigo) | Gaussian Residual Envelope | $\hat{Y}_t \pm (1.65 \cdot \sigma_{\text{residual}})$ | Quantifies demand dispersion & feeds Safety Stock ($Z=1.65$). |
| **Moving Average Baseline** (Dashed Grey) | 3-Period Rolling Window | $\text{SMA}_t = \frac{1}{3}\sum_{k=1}^3 Y_{t-k}$ | Naive benchmark showing **+14.9% empirical MAE reduction** ($R^2 = 0.65$). |

### Statistical Reorder Planner
$$\text{Safety Stock (SS)} = Z_{0.95} \times \sigma_{\text{daily}} \times \sqrt{\text{Lead Time (days)}}$$
$$\text{Reorder Point (ROP)} = (\text{Daily Demand} \times \text{Lead Time}) + \text{Safety Stock}$$

- **Unsupervised $K$-Means ABC Clustering**: Evaluates annual revenue versus sales velocity to classify catalog SKUs into Class A (Top 70% Revenue), Class B (Core 20% Volume), and Class C (Long Tail 10%).

---

## ⚡ Live ML Retraining Pipeline (`POST /api/forecast/retrain`)

The platform supports live online retraining:
1. User clicks **"Retrain ML Engine"** from the AI Demand view.
2. The server authenticates user tier (`requireRole('ADMIN', 'MANAGER')`).
3. Express invokes [ai/forecast_service.py](file:///c:/Users/SAUMYA/Desktop/WORK/DBMS%20PROJECT/ai/forecast_service.py) via Node child process.
4. The Python pipeline extracts current transaction history, re-fits linear trend coefficients, computes new confidence bounds, recalculates safety stocks, and writes audit rows into `forecast_logs`.
5. Updated cache ([ai/forecast_cache.json](file:///c:/Users/SAUMYA/Desktop/WORK/DBMS%20PROJECT/ai/forecast_cache.json)) is reloaded and returned as JSON, refreshing the live Chart.js visualization instantly without page reload.

---

## 👥 Demo Personas (One-Click RBAC Switching)

| Persona Name | Role | Email | Permissions |
| :--- | :--- | :--- | :--- |
| **Saumya Sharma** | `ADMIN` | `saumya@aims.org` | Unrestricted schema CRUD, supplier management, PO approvals, trigger audits, ML Retrain. |
| **Ananya Gupta** | `MANAGER`| `ananya@aims.org` | Catalog item additions, PO issuance, AI forecast planning, ML Retrain. |
| **Rahul Verma** | `STAFF` | `rahul@aims.org` | Stock movement dispatches, inbound intake, alert viewing (destructive operations locked). |

---

## 📁 Repository Structure

```text
├── ai/
│   ├── forecast_cache.json     # Cached ML parameters, predictions & evaluation metrics
│   └── forecast_service.py     # Python ML pipeline (scikit-learn Linear Regression + K-Means)
├── dashboard/                  # Frontend Web Application (Vanilla ES6 + CSS 3D)
│   ├── css/
│   │   ├── style.css           # B2B Slate layout styling
│   │   └── theme.css           # Industrial typography tokens & glassmorphism system
│   ├── js/
│   │   ├── app.js              # Hash router, RBAC controller & REST client
│   │   ├── charts.js           # Chart.js visualization engine (Hero canvas, Scatter, Donut)
│   │   ├── data.js             # Client fallback data schemas
│   │   └── db-engine.js        # Offline relational fallback engine
│   └── index.html              # Multi-view application shell (Landing + Auth + App)
├── database/
│   ├── aims.db                 # SQLite Relational Database Engine (WAL Mode)
│   ├── init_db.js              # Database initialization & trigger setup script
│   ├── schema.sql              # DDL schema definitions (tables, constraints, triggers)
│   └── seed.sql                # Seed dataset with 360 transaction history rows
├── docs/
│   ├── er_diagram.md           # Entity-Relationship diagram & cardinality specifications
│   ├── schema_diagram.md       # Relational mapping & formal 3NF normalization proof
│   └── MASTER_FACULTY_PRESENTATION_SCRIPT.md # Complete defense & presentation script
├── server.js                   # Node.js Express REST API Backend
└── package.json                # Project dependencies and startup scripts
```

---

## 🛠️ Quick Start & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.10+ recommended with `scikit-learn`, `pandas`, `numpy`)

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SAMJOD07-devz/Inventory-Management-System.git
   cd Inventory-Management-System
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Install Python ML dependencies**:
   ```bash
   pip install pandas numpy scikit-learn
   ```

4. **Start the Application Server**:
   ```bash
   node server.js
   ```

5. **Open in Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)
   - Public Landing: `http://localhost:3000/#/`
   - Sign In: `http://localhost:3000/#/login`
   - Operational Workspace: `http://localhost:3000/#/app/overview`
   - AI Demand Intelligence: `http://localhost:3000/#/app/forecasts`

---

## 🖥️ Dashboard Navigation Guide

1. **System Overview (`#/app/overview`)**:
   - Live status banner summarizing immediate actions.
   - 4 reconciled KPI cards: *Needs Attention*, *Fleet Valuation*, *Inbound Orders*, and *Model Precision*.
   - 4-State Inventory Health donut chart (Critical, Low, Healthy, Overstocked).
   - 10 Depot &times; 5 Category stock distribution heatmap matrix.

2. **Catalog & Depot Stock (`#/app/inventory`)**:
   - Complete 50-SKU visibility with multi-attribute filtering.
   - Slicing modes: Flat, By Category, By Depot, or By ABC.
   - Dynamic Days of Cover bar with Reorder Point (ROP) vertical tick markers.
   - Slide-out product detail drawer with 10-depot allocation breakdown and immutable ledger history.

3. **AI Demand Forecasting (`#/app/forecasts`)**:
   - Full-width hero chart with range selector (`1Y`, `3Y`, `All (5Y)`, `Forecast Horizon`).
   - Interactive zoom/pan with "Reset Zoom".
   - Model scorecard comparing Baseline MAE, ML MAE, Empirical Gain, and $R^2$.
   - Interactive Reorder Planner Table with collapsible **"Explain calculation"** formulas.
   - Header **"Retrain ML Engine"** button executing live Python retraining.

4. **Audit Ledger & ACID Inspection (`#/app/audit`)**:
   - Real-time immutable transaction feed with verification of check constraints and trigger outcomes.

---

## 📊 Course Project Review Phases

- **Review 1 (Current Phase)**:
  - 3NF relational normalization proof and ER diagram.
  - Atomic stock movement transactions with balance check constraints.
  - Event-driven database triggers (`trg_stock_level_alert`).
  - Scikit-learn linear regression and moving-average demand modeling.
  - Complete multi-page web application and RBAC access tiers.
- **Review 2 (Phase 2 Roadmap)**:
  - Multi-warehouse inter-depot transit tracking.
  - Seasonal deep time-series AI models (ARIMA / SARIMA).
  - Database query execution plan optimization (`EXPLAIN QUERY PLAN`).
  - Barcode / QR warehouse scanning intake.
  - Downloadable PDF purchase orders and ledger audit exports.
