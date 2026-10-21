# Changelog

All notable changes to the AIMS (Autonomous Inventory & Demand Intelligence Platform) project are documented in this file.

## [2.0.0] - 2026-10-11

### Frontend Architectural Redesign & UX Overhaul
- **Design System Tokens (`theme.css`)**:
  - Implemented cohesive CSS variable design tokens based on the core `#0F766E` teal visual identity, high-contrast typography, and accessible status colors.
  - Added dedicated styling for 4-state health badges, monospace SKU chips, ROP progress bar markers, slide-out drawer, tour modals, and responsive layout utilities down to 390px.
- **System Overview ("Start Here")**:
  - Added real-time operational status banner generated from live data: *"7 of 50 products need action today. 2 are critical and will stock out within 3 days. Next best step: Restock Extra Virgin Olive Oil 1L at Store 10."* with a primary action button.
  - Reconciled KPI cards in a 4 -> 2 -> 1 responsive CSS grid. Explicitly separated distinct at-risk products (7) from depot-level alert pairs (70 across 10 stores).
  - Added interactive SVG sparklines and calculation tooltips to every KPI card.
  - Replaced ambiguous stock lists with an **Urgent Action Items** table sorted by days of cover ascending.
  - Added interactive **Stock Health at a Glance** donut chart with click-to-filter capability.
  - Added 10 Depot &times; 5 Category stock heatmap matrix displaying density and alert counts.
- **Catalog & Depot Stock Workspace**:
  - Display all 50 products by default—inventory is never hidden behind a default filter.
  - Added sticky toolbar with full-text search, category filter, 4-state health chips, ABC cluster chips, depot filter, and multi-criteria sort dropdown.
  - Added live result counter (*"Showing 50 of 50"*) and a *Clear filters* button.
  - Implemented **Group-By Slicing** (`[Flat | By Category | By Depot | By ABC]`) with collapsible group headers displaying group totals (SKUs, units, valuation, # at risk).
  - Implemented **View Mode Toggle** (`[Table | Cards]`).
  - Replaced generic progress bars with statistical **Days of Cover & ROP Bars** with visible Reorder Point tick markers and tooltips.
  - Added slide-out **Product Detail Drawer** with 12-month sales velocity mini-chart, AI forecast horizon, 10-store allocation table, supplier lead time, and recent transaction history.
  - Added bulk item selection with batch Purchase Order issuance and CSV export.
- **AI Demand Forecasting & Reorder Engine**:
  - Added collapsible *"How to Read This Page"* methodology introduction.
  - Added 4-column **Model Scorecard** comparing Baseline MAE (2,741.1), ML MAE (2,332.0), Empirical Improvement (+14.9%), and $R^2$ (0.65) with color-coded *"Moderate fit"* badge and honest retail variance disclosure.
  - Implemented full-width **Hero Chart** (min-height 520px) with actual sales, ML linear trend, 60-day prediction, shaded 95% confidence bands, quarterly tick formatting, range selectors (`1Y`, `3Y`, `All`, `Forecast`), zoom/pan, and clear legends positioned strictly above the canvas.
  - Added **"What the AI Sees" Narrative Panel** generated from deterministic template logic.
  - Added supporting analytics: 12-Month Seasonality bar chart, Forecast Accuracy MAE distribution chart, and ABC K-Means scatter plot.
  - Replaced cluttered card lists with a **Procurement Reorder Planner Table** featuring interactive **"Explain Formula"** expanders displaying live $SS$ and $ROP$ calculations.
  - Moved **Retrain ML Engine** button to the header with live progress spinner and before/after MAE toast notifications.
- **Onboarding & Accessibility**:
  - Added dismissible 4-step onboarding tour with `localStorage` persistence.
  - Added persistent `? Help` button opening a slide-out Supply Chain & ML Glossary with plain-language definitions for 9 key terms.

### Backend & API Additions
- `GET /api/inventory/health`: Returns 4-state health classification, days of cover, ROP thresholds, depot breakdowns, and reconciled alert statistics.
- `GET /api/forecast/series`: Returns aggregated monthly actuals, linear trends, 95% confidence intervals, and baseline moving averages with range filtering.
- `GET /api/insights`: Deterministic narrative engine computing YoY growth, seasonal indices, and replenishment recommendations.

### Data Calibration & Sanity
- Deterministically calibrated stock levels and thresholds in `database/aims.db`:
  - Exactly 7 distinct products require attention (2 Critical with Days of Cover $\le 3$, 5 Low with Days of Cover $\le 10$).
  - 3 products overstocked ($> 3 \times \text{ROP}$) and 40 products healthy.
  - Reconciled `stock_alerts` table to have 70 alerts across depots matching inventory status.
  - Synchronized `ai/forecast_cache.json` with relational schema.
