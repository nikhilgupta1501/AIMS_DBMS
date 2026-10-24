# 🧠 Role 3: Machine Learning & Demand Intelligence Engineer (AI Lead)
> **Platform**: Autonomous Inventory Management & Demand Intelligence Platform (AIMS)  
> **Target Audience**: AI / ML Lead / Data Science Presentation & Viva Preparation  
> **Course Domain**: Time-Series Forecasting, Feature Engineering, Out-of-Sample Validation, Statistical Inventory Optimization, Explainable AI (XAI)

---

## 1. Executive Responsibilities & Overview
As the **Machine Learning & Demand Intelligence Engineer**, you own the analytical predictive engine of AIMS:
1. **Mathematical Feature Engineering**: Designed a multi-factor feature matrix combining linear trends, **cyclical trigonometric seasonality** ($\sin$ and $\cos$ calendar encoders), and 3-month trailing momentum.
2. **Leakage-Free Validation**: Enforced strict **chronological time-series holdout validation** (80% train / 20% test split), outperforming traditional baseline models by **+44.7%**.
3. **Dynamic Statistical Inventory**: Upgraded classical safety stock to factor in both **demand volatility** ($\sigma_D$) and **supplier lead-time variance** ($\sigma_{LT}$).
4. **Unsupervised ABC Categorization**: Built an unsupervised **K-Means clustering algorithm ($K=3$)** grouping 50 SKUs by annual revenue velocity.
5. **Explainable AI (XAI) & What-If Simulation**: Implemented transparent feature attribution and an interactive **What-If Scenario Simulator** allowing managers to test promotional surges and shipping delays in real-time.

---

## 2. Mathematical Feature Engineering & Regression Pipeline ([`ai/forecast_service.py`](file:///c:/Users/SAUMYA/Desktop/WORK/DBMS%20PROJECT/ai/forecast_service.py#L39-L55))

### 2.1 Why Simple Linear Regression Fails on Retail Data
A naive regression model $y = mx + c$ assumes sales change uniformly over time. However, retail demand exhibits **cyclical seasonality** (holiday surges in Q4, summer spikes) and **autoregressive momentum**.

### 2.2 The 4-Factor Feature Vector
For every product at month index $t$ and calendar month $m \in \{1, \dots, 12\}$, we construct:
$$\vec{x}_t = \begin{bmatrix} t \\ \sin\left(\frac{2\pi m}{12}\right) \\ \cos\left(\frac{2\pi m}{12}\right) \\ \text{Trailing\_Momentum}_t \end{bmatrix}$$

```python
def build_feature_vector(time_idx, month_num, trailing_val):
    rad = 2.0 * math.pi * (month_num / 12.0)
    return [
        float(time_idx),          # Factor 1: Normalized Linear Growth Trend
        float(math.sin(rad)),     # Factor 2: Cyclic Calendar Seasonality (Sin)
        float(math.cos(rad)),     # Factor 3: Cyclic Calendar Seasonality (Cos)
        float(trailing_val)       # Factor 4: Trailing 3-Month Moving Average Demand
    ]
```

#### Why Cyclical Sin/Cos Encodings?
If calendar months are represented as raw integers ($1, 2, \dots, 12$), a machine learning model perceives December ($12$) and January ($1$) as being maximally distant ($\Delta = 11$). By mapping months onto the unit circle via sine and cosine:
$$\text{Distance}(Dec, Jan) = \sqrt{(\sin(2\pi \cdot 12/12) - \sin(2\pi \cdot 1/12))^2 + (\cos(2\pi \cdot 12/12) - \cos(2\pi \cdot 1/12))^2} \approx 0.52$$
The model naturally understands that December smoothly transitions into January.

---

## 3. Out-of-Sample Holdout Validation & Model Scorecard

### 3.1 Preventing Time-Series Data Leakage
In standard tabular machine learning, random $K$-fold cross-validation is common. However, **random shuffling in time series causes severe future-data leakage** (training on future months to predict past months).  
AIMS strictly implements **chronological holdout validation**:
* **Training Set**: First 80% of months (Months 1 to 48: 2013-01 through 2016-12).
* **Test Holdout Set**: Final 20% of months (Months 49 to 60: 2017-01 through 2017-12).

### 3.2 Certified Model Metrics vs. Baseline Moving Average

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AIMS MODEL TOURNAMENT SCORECARD                       │
├───────────────────────────────┬─────────────────────────────┬───────────────┤
│ Metric                        │ Baseline 3-Month MA         │ Primary ML    │
├───────────────────────────────┼─────────────────────────────┼───────────────┤
│ Mean Absolute Error (MAE)     │ 2,741.14 units              │ 1,516.24      │
│ Root Mean Squared Error (RMSE)│ 3,112.50 units              │ 1,648.74      │
│ Mean Absolute % Error (MAPE)  │ 17.80%                      │ 9.45%         │
│ Coefficient of Determination  │ —                           │ R² = 0.901    │
│ Empirical Accuracy Gain       │ Baseline Reference          │ +44.7% Gain   │
└───────────────────────────────┴─────────────────────────────┴───────────────┘
```

* **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |y_i - \hat{y}_i| = 1,516.24$$
* **Mean Absolute Percentage Error (MAPE)**:
  $$\text{MAPE} = \frac{100\%}{N} \sum_{i=1}^N \left| \frac{y_i - \hat{y}_i}{y_i} \right| = 9.45\%$$
* **$R^2$ Score**:
  $$R^2 = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2} = 0.901$$
  *(Meaning our 4-factor feature model explains 90.1% of the variance in retail sales across all 50 SKUs).*

---

## 4. Advanced Dynamic Safety Stock & Reorder Points ([`ai/forecast_service.py:219-234`](file:///c:/Users/SAUMYA/Desktop/WORK/DBMS%20PROJECT/ai/forecast_service.py#L219-L234))

Most basic textbook systems compute Safety Stock assuming supplier lead times are completely constant. In real-world logistics, **both customer demand and supplier delivery times fluctuate**.

### 4.1 The Bivariate Variance Formula
$$SS = Z_{0.95} \cdot \sqrt{L \cdot \sigma_D^2 + D_{\text{daily}}^2 \cdot \sigma_L^2}$$

Where:
* $Z_{0.95} = 1.65$: Normal distribution factor for a **95% cycle service level** (preventing 95% of stockouts).
* $L$: Contractual supplier lead time in days (e.g. 7 days).
* $\sigma_D$: Daily standard deviation of demand, derived from historical monthly variance:
  $$\sigma_D = \frac{\sigma_{\text{monthly}}}{\sqrt{30}}$$
* $D_{\text{daily}}$: Expected average daily demand:
  $$D_{\text{daily}} = \frac{\hat{y}_{\text{next\_month}}}{30}$$
* $\sigma_L = 1.25$ days: Historical standard deviation of supplier shipping delays.

### 4.2 Reorder Point ($ROP$) Formula
$$ROP = (D_{\text{daily}} \cdot L) + SS$$

### 4.3 Recommended Procurement Reorder Quantity ($Q$)
$$Q = \max\Big(0, (ROP + SS) - \text{Quantity\_on\_Hand}\Big)$$
* If $\text{Quantity\_on\_Hand} \le ROP$, a replenishment order is triggered immediately.

---

## 5. Unsupervised K-Means Clustering (ABC Inventory Analysis)

In supply chain management, **Pareto's 80/20 Rule** dictates that ~20% of inventory items generate ~80% of revenue.

Using `sklearn.cluster.KMeans(n_clusters=3, random_state=42)`:
1. We compute the annual sales valuation velocity:
   $$V_i = \text{Annual\_Units\_Sold}_i \times \text{Unit\_Retail\_Price}_i$$
2. K-Means clusters the 50 products into 3 distinct operational tiers:
   * **Class A (High Value / Capital Intensive)**: Top ~15% of SKUs generating ~70% of revenue. Requires daily monitoring, tight safety stocks, and expedited supplier SLAs.
   * **Class B (Moderate Value)**: ~30% of SKUs generating ~20% of revenue. Managed via standard bi-weekly review cycles.
   * **Class C (Low Value Bulk)**: ~55% of SKUs generating ~10% of revenue. Managed with higher safety buffers to minimize reordering overhead.

---

## 6. Explainable AI (XAI) & Interactive What-If Scenario Simulator

To avoid the "black box" criticism from faculty, AIMS exposes an **Explainable AI decomposition** and **What-If Scenario Simulator** directly in the UI ([`#/app/xai`](file:///c:/Users/SAUMYA/Desktop/WORK/DBMS%20PROJECT/dashboard/index.html)):

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│              EXPLAINABLE AI (XAI): DEMAND ATTRIBUTION BREAKDOWN             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Target SKU: Extra Virgin Olive Oil 1L (SKU-001)                             │
│ Baseline Trend Component:       +1,820 units  (Long-term store growth)     │
│ Cyclical Seasonality Factor:      +412 units  (Q4 holiday surge encoder)    │
│ Trailing Autoregressive Momentum: +180 units  (Recent 90-day velocity)      │
│ Predicted Next Month Demand:     2,412 units                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The What-If Simulator Math
The user moves sliders in the UI to simulate operational stress:
1. **Demand Surge Slider ($\Delta D$)**: e.g. $+25\%$ promotional campaign.
   $$D'_{\text{daily}} = D_{\text{daily}} \times (1 + \Delta D)$$
2. **Lead Time Delay Slider ($\Delta L$)**: e.g. $+5$ days port strike / customs delay.
   $$L' = L + \Delta L$$
3. **Instant Recalculation**: The simulator computes the revised Safety Stock $SS'$ and Reorder Point $ROP'$ in sub-10ms, visibly shifting the reorder threshold on the live chart!

---

## 7. How It Works Real-Time in the Website (Live Demo Run-Through)

### Flow 1: Interactive Forecast Hero Chart & Range Filtering
1. **User Action**: The demonstrator clicks the **AI Forecasting** tab (`#/app/ai`) and selects `SKU-001`.
2. **Data Presentation**: The Chart.js canvas renders the complete 60-month historical sales actuals in solid teal, the linear seasonal regression fit line, and a 60-day forward prediction band surrounded by a shaded 95% confidence interval ($\pm 1.96 \cdot \text{RMSE}$).
3. **Range Selectors**: Clicking `1Y`, `3Y`, or `Forecast` dynamically updates chart zoom without sending an API roundtrip, utilizing client-side cached time-series slices.

### Flow 2: Live What-If Scenario Simulation
1. **User Action**: The presenter navigates to the **Explainable AI (XAI)** tab (`#/app/xai`).
2. **Slider Adjustment**: Move the **Demand Surge Slider** to $+30\%$ and the **Supplier Lead-Time Delay** to $+4$ days.
3. **Real-Time Calculation**: The JavaScript simulator re-evaluates the bivariate safety stock equation:
   $$SS' = 1.65 \cdot \sqrt{(11 \cdot \sigma_D^2) + (D'_{\text{daily}}^2 \cdot 1.25^2)}$$
4. **Visual Feedback**: The interface immediately flashes an updated safety buffer card, showing:
   *"Recommended Safety Stock increases from 84 to 138 units (+64.3%). Immediate purchase order recommended."*

---

## 8. Faculty Viva Defense & Memory Cheat Sheet

> **Q1: Why didn't you use an LSTM or Deep Neural Network for forecasting?**  
> **Your Answer**: *"For tabular retail demand with 60 monthly timesteps per SKU, Deep Learning models like LSTMs suffer from severe overfitting due to high parameter counts. Regularized multi-factor regression with cyclical trigonometric encoders provides high predictive power ($R^2 = 0.901$) while retaining complete mathematical explainability, zero latency inference, and deterministic auditability."*

> **Q2: What is the purpose of the cyclical sine and cosine terms?**  
> **Your Answer**: *"In a calendar year, month 12 (December) is adjacent to month 1 (January). A standard linear model treats 12 and 1 as opposite extremes. Converting calendar months into angular coordinates $\sin(2\pi m/12)$ and $\cos(2\pi m/12)$ projects time onto a continuous trigonometric circle, ensuring smooth seasonal continuity across year-end boundaries."*

> **Q3: What does a $Z$-score of 1.65 represent in your safety stock formula?**  
> **Your Answer**: *"A $Z$-score of 1.65 corresponds to a 95% cycle service level under a standard normal distribution $\mathcal{N}(0, 1)$. This guarantees that out of 100 replenishment cycles, 95 will complete without a single stockout event."*
