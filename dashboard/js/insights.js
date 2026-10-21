/**
 * AIMS Explainable AI & Onboarding Tour Engine ("The Warehouse Floor")
 * Pure utility, plain words, no sparkle icons, no floating FAB.
 */

// ============================================================================
// 1. REUSABLE AI TELEMETRY COMPONENT
// ============================================================================

function renderInsight(data = {}) {
  const {
    title = 'AI Telemetry & Analysis',
    summary = 'Demand velocity and trend telemetry derived from historical sales transactions.',
    bullets = [],
    action = 'Maintain standard procurement and safety buffer schedules.',
    confidence = 88,
    calculation_disclosure = ''
  } = data;

  const bulletsHtml = (bullets && bullets.length > 0)
    ? `<ul class="telemetry-bullets">${bullets.map(b => `<li>${b}</li>`).join('')}</ul>`
    : '';

  const formulaHtml = calculation_disclosure
    ? `<div class="telemetry-formula">
        <strong>Calculation:</strong> ${calculation_disclosure}
       </div>`
    : '';

  return `
    <div class="ai-telemetry-col">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <h4 class="telemetry-title">${title}</h4>
        <span class="status-pill healthy" title="Forecast Confidence: Empirical R² = 0.65 goodness-of-fit against 5 years of retail sales transactions">
          ${confidence}% Fit
        </span>
      </div>
      <p class="telemetry-summary">${summary}</p>
      ${bulletsHtml}
      ${action ? `<div class="telemetry-action-box"><strong>Recommended action:</strong> ${action}</div>` : ''}
      ${formulaHtml}
    </div>
  `;
}

// Helper to fetch and inject insights into an element
async function loadInsightInto(containerId, view, scope = 'fleet', id = '') {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const url = `/api/insights?view=${encodeURIComponent(view)}&scope=${encodeURIComponent(scope)}${id ? `&id=${encodeURIComponent(id)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && data.insight) {
      container.innerHTML = renderInsight(data.insight);
    }
  } catch (err) {
    console.warn(`[Insights] Fallback for ${view}:`, err.message);
  }
}

// ============================================================================
// 2. 4-STEP ONBOARDING TOUR
// ============================================================================

const TOUR_STEPS = [
  {
    step: 1,
    title: '1. Operational Worklist & Pick List',
    body: `Welcome to <strong>AIMS</strong>. The top status line immediately reveals items needing restock today. The Runway Bar maps exact days of cover against supplier lead time—if a bar turns red, stock will run out before an order arrives.`,
    targetRoute: '/app/overview'
  },
  {
    step: 2,
    title: '2. Multi-Store Inventory Catalog',
    body: `Inspect all 50 products across 10 store locations with zero hidden items. Use category, health, and ABC chips to filter. Toggle between Comfortable and Compact density, or switch to Cards view.`,
    targetRoute: '/app/inventory'
  },
  {
    step: 3,
    title: '3. Machine Learning Demand Forecast',
    body: `Track 5 years of daily POS sales transactions modeled with linear trend and seasonality. View 60-day predicted demand horizons with 95% service-level confidence intervals.`,
    targetRoute: '/app/forecasts'
  },
  {
    step: 4,
    title: '4. Reorder Planner & Safety Stocks',
    body: `Never miss a stockout. Safety Stock and Reorder Points are calculated with statistical formulas (<em>Z = 1.65, 95% service level</em>). Expand any row to inspect the real numbers filled into the formula.`,
    targetRoute: '/app/forecasts'
  }
];

let currentTourIndex = 0;

function startTour(forceStart = false) {
  if (!forceStart && localStorage.getItem('aims_tour_completed') === 'true') {
    return;
  }
  currentTourIndex = 0;
  showTourStep(currentTourIndex);
}

function showTourStep(index) {
  if (index >= TOUR_STEPS.length) {
    endTour();
    return;
  }

  const stepData = TOUR_STEPS[index];
  if (window.location.hash !== '#' + stepData.targetRoute && typeof window.switchRoute === 'function') {
    window.switchRoute(stepData.targetRoute);
  }

  let modal = document.getElementById('aimsTourModal');
  let backdrop = document.getElementById('aimsTourBackdrop');

  if (!modal) {
    backdrop = document.createElement('div');
    backdrop.id = 'aimsTourBackdrop';
    backdrop.className = 'drawer-backdrop';
    document.body.appendChild(backdrop);

    modal = document.createElement('div');
    modal.id = 'aimsTourModal';
    modal.className = 'sheet-card';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '480px';
    modal.style.maxWidth = '90vw';
    modal.style.zIndex = '1001';
    modal.style.boxShadow = 'var(--shadow-modal)';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="sheet-card-header" style="background:var(--ink-primary); color:#ffffff;">
      <span style="font-weight:700; font-size:14px;">${stepData.title}</span>
      <span style="font-size:11px; background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:2px;">Step ${stepData.step} of 4</span>
    </div>
    <div style="padding:1.25rem; font-size:13px; color:var(--ink-primary); line-height:1.5;">
      ${stepData.body}
    </div>
    <div style="padding:0.85rem 1.25rem; border-top:1px solid var(--ink-border); display:flex; justify-content:space-between; align-items:center; background:var(--surface-subtle);">
      <button class="btn btn-secondary btn-sm" onclick="endTour()">Skip Tour</button>
      <div style="display:flex; gap:0.5rem;">
        ${index > 0 ? `<button class="btn btn-secondary btn-sm" onclick="prevTourStep()">Previous</button>` : ''}
        <button class="btn btn-primary btn-sm" onclick="nextTourStep()">${index === TOUR_STEPS.length - 1 ? 'Finish' : 'Next Step'}</button>
      </div>
    </div>
  `;

  backdrop.classList.add('active');
}

function nextTourStep() {
  currentTourIndex++;
  showTourStep(currentTourIndex);
}

function prevTourStep() {
  if (currentTourIndex > 0) {
    currentTourIndex--;
    showTourStep(currentTourIndex);
  }
}

function endTour() {
  localStorage.setItem('aims_tour_completed', 'true');
  const modal = document.getElementById('aimsTourModal');
  const backdrop = document.getElementById('aimsTourBackdrop');
  if (modal) modal.remove();
  if (backdrop) backdrop.remove();
}

// ============================================================================
// 3. GLOSSARY DRAWER
// ============================================================================

const GLOSSARY_TERMS = [
  {
    term: 'SKU (Stock Keeping Unit)',
    desc: 'Unique alphanumeric identifier assigned to a distinct product and variant for physical inventory scanning and warehouse management.',
    example: 'SKU-FOOD-002: Extra Virgin Olive Oil 1L'
  },
  {
    term: 'Runway Bar & Days of Cover',
    desc: 'The number of days current on-hand inventory will sustain operations based on average daily sales demand: Days of Cover = Current Stock / Daily Demand.',
    example: '1,600 units / 708.87 units/day = ~2.25 Days of Cover. When Runway < Lead Time, the bar turns Hazard Red.'
  },
  {
    term: 'Lead Time (L)',
    desc: 'The elapsed physical time in days between placing a purchase order with a vendor and having verified goods received into warehouse racks.',
    example: 'Olive Oil supplier lead time is 7 calendar days.'
  },
  {
    term: 'Safety Stock (SS)',
    desc: 'Buffer stock held to protect against demand surges and lead-time delays: SS = Z × σ_d × √L (Z = 1.65 for 95% service level).',
    example: 'Olive Oil: 1.65 × 38.2 × √7 = 3,030 units safety stock.'
  },
  {
    term: 'Reorder Point (ROP)',
    desc: 'The minimum physical stock level that triggers a replenishment purchase order: ROP = (Daily Demand × Lead Time) + Safety Stock.',
    example: 'Olive Oil: (708.87 × 7) + 3,030 = 7,993 units reorder threshold.'
  },
  {
    term: 'ABC Stratification',
    desc: 'Pareto inventory analysis grouping items into A (top 70% value), B (next 20%), and C (bottom 10%) based on sales velocity and revenue.',
    example: 'Class A items receive daily cycle counts; Class C use periodic reviews.'
  },
  {
    term: 'Mean Absolute Error (MAE)',
    desc: 'Average absolute difference between actual sales and model predictions. Lower MAE indicates higher forecast accuracy.',
    example: 'AIMS Linear Regression MAE is 2,332 units vs 2,741 for 3-period moving average (14.9% error reduction).'
  },
  {
    term: 'Coefficient of Determination (R²)',
    desc: 'Statistical proportion of variance in historical demand captured by the regression model.',
    example: 'R² = 0.65 represents a solid fit for retail FMCG sales across 10 regional stores.'
  }
];

function openGlossaryDrawer() {
  let drawer = document.getElementById('aimsGlossaryDrawer');
  let backdrop = document.getElementById('aimsGlossaryBackdrop');

  if (!drawer) {
    backdrop = document.createElement('div');
    backdrop.id = 'aimsGlossaryBackdrop';
    backdrop.className = 'drawer-backdrop';
    backdrop.onclick = closeGlossaryDrawer;
    document.body.appendChild(backdrop);

    drawer = document.createElement('div');
    drawer.id = 'aimsGlossaryDrawer';
    drawer.className = 'detail-drawer';
    drawer.innerHTML = `
      <div class="drawer-header">
        <div>
          <h3 class="drawer-title">Supply Chain &amp; AI Glossary</h3>
          <p style="font-size:12px; color:var(--ink-secondary); margin:2px 0 0 0;">Definitions and mathematical formulas for AIMS metrics</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="closeGlossaryDrawer()" title="Close">&times;</button>
      </div>
      <div class="drawer-body" id="glossaryBody">
        ${GLOSSARY_TERMS.map(t => `
          <div style="background:var(--surface-subtle); border:1px solid var(--ink-border); border-radius:var(--radius-sharp); padding:0.85rem; margin-bottom:0.75rem;">
            <div style="font-weight:700; font-size:13px; color:var(--ink-primary); margin-bottom:0.25rem;">${t.term}</div>
            <div style="font-size:12.5px; color:var(--ink-secondary); line-height:1.45; margin-bottom:0.35rem;">${t.desc}</div>
            <div style="font-size:11.5px; color:var(--ink-muted); font-family:var(--font-mono);">${t.example}</div>
          </div>
        `).join('')}
      </div>
      <div class="drawer-footer">
        <button class="btn btn-secondary btn-sm" onclick="startTour(true)">Launch Tour</button>
        <button class="btn btn-primary btn-sm" onclick="closeGlossaryDrawer()">Close</button>
      </div>
    `;
    document.body.appendChild(drawer);
  }

  setTimeout(() => {
    backdrop.classList.add('active');
    drawer.classList.add('active');
  }, 10);
}

function closeGlossaryDrawer() {
  const drawer = document.getElementById('aimsGlossaryDrawer');
  const backdrop = document.getElementById('aimsGlossaryBackdrop');
  if (drawer) drawer.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
}

// NOTE: Floating "?" button is intentionally NOT initialized here.
// Users access Help directly via the header button as specified.
