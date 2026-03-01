/**
 * calendar.js — Monthly sales calendar with revenue heatmap, date
 *               detail modals, jump-to-date.
 *
 * Sections:
 *  1. Global State           — currentYear, currentMonth, calendarData
 *  2. renderCalendar()       — entry point, fetches month data & header
 *  3. renderCalendarGrid()   — 7×N grid with revenue-based colour coding
 *  4. changeMonth()          — prev/next month navigation
 *  5. showDateDetails()      — fetch & display a single day's details
 *  6. showDateModal()        — rich modal with product-sold list + paid debtors
 *  7. closeModal()           — dismiss handler
 *  8. Helpers                — getMonthName, isTodayDate
 *
 * Dependencies: database.js (DB)
 */

console.log('📅 Loading calendar module...');

// =============================================================================
//  1. GLOBAL STATE
// =============================================================================

let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-11
let calendarData = {};

// =============================================================================
//  2. RENDER CALENDAR PAGE
// =============================================================================

/** Fetch the month's DailySummary data and render the header + grid. */
async function renderCalendar() {
  const content = document.getElementById('calendarContent');

  content.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="font-size: 48px; animation: spin 1s linear infinite;">📅</div>
      <p style="color: #666; margin-top: 10px;">Loading calendar...</p>
    </div>
    <style>
      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
    </style>
  `;

  try {
    const data = await DB.getCalendarData(currentYear, currentMonth + 1);

    calendarData = {};
    data.summaries.forEach(summary => {
      calendarData[summary.date] = {
        date:              summary.date,
        total_revenue:     parseFloat(summary.total_revenue     || 0),
        total_profit:      parseFloat(summary.total_profit      || 0),
        transaction_count: parseInt(summary.transaction_count   || 0)
      };
    });

    console.log('📅 Calendar data loaded:', calendarData);

    const html = `
      <div class="calendar-container">

        <!-- ── Month Navigation ── -->
        <div class="calendar-nav">
          <button class="calendar-nav-btn" id="prevMonth"><span>←</span></button>
          <h3 class="calendar-month-title" id="monthTitle">
            ${getMonthName(currentMonth)} ${currentYear}
          </h3>
          <button class="calendar-nav-btn" id="nextMonth"><span>→</span></button>
        </div>

        <!-- ── Jump to Date ── -->
        <div class="calendar-jump-row">
          <span class="jump-label">📅 Go to:</span>
          <select id="jumpMonth" class="jump-select">
            ${['January','February','March','April','May','June',
               'July','August','September','October','November','December']
              .map((m, i) => `<option value="${i}" ${i === currentMonth ? 'selected' : ''}>${m}</option>`)
              .join('')}
          </select>
          <input id="jumpYear" class="jump-input" type="number"
                 value="${currentYear}" min="2000" max="2099" />
          <button id="jumpGoBtn" class="jump-go-btn">Go</button>
        </div>

        <!-- ── Calendar Grid ── -->
        <div class="calendar-grid-container">
          ${renderCalendarGrid()}
        </div>

        <!-- ── Legend ── -->
        <div class="calendar-legend">
          <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(135deg, #D1FAE5, #A7F3D0);"></div>
            <span>&lt; ₱500</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(135deg, #A7F3D0, #6EE7B7);"></div>
            <span>₱500 – ₱2,000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(135deg, #6EE7B7, #34D399);"></div>
            <span>&gt; ₱2,000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #f5f5f0; border: 1px dashed #ccc;"></div>
            <span>No Sales</span>
          </div>
        </div>

      </div>

      <style>
        /* ────────────────────────────────────────────
           Jump to date row
        ──────────────────────────────────────────── */
        .calendar-jump-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: -6px 0 20px;
          flex-wrap: wrap;
        }
        .jump-label {
          font-size: 13px;
          font-weight: 700;
          color: #5d9458;
          letter-spacing: 0.3px;
        }
        .jump-select,
        .jump-input {
          padding: 9px 14px;
          border-radius: 12px;
          border: 1.5px solid rgba(135,179,130,0.4);
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(8px);
          font-size: 13px;
          font-weight: 700;
          color: #2d4d28;
          outline: none;
          box-shadow: 0 2px 8px rgba(93,148,86,0.10);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .jump-input {
          width: 82px;
          text-align: center;
        }
        .jump-select:focus,
        .jump-input:focus {
          border-color: #87B382;
          box-shadow: 0 0 0 3px rgba(135,179,130,0.20);
        }
        .jump-go-btn {
          padding: 9px 20px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #87B382, #5d9458);
          color: white;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(93,148,86,0.30);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .jump-go-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(93,148,86,0.40);
        }
        .jump-go-btn:active { transform: translateY(0); }
        body.dark-mode .jump-select,
        body.dark-mode .jump-input {
          background: rgba(28,44,26,0.80);
          color: #c8ecc4;
          border-color: rgba(135,179,130,0.25);
        }
        body.dark-mode .jump-label { color: #87B382; }
      </style>
    `;

    content.innerHTML = html;

    // ── Wire up navigation & jump controls ──────────────────────────────────
    document.getElementById('prevMonth')?.addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth')?.addEventListener('click', () => changeMonth(1));

    const jumpGo    = document.getElementById('jumpGoBtn');
    const jumpYear  = document.getElementById('jumpYear');
    const jumpMonth = document.getElementById('jumpMonth');

    if (jumpGo) {
      jumpGo.addEventListener('click', () => {
        const month = parseInt(jumpMonth.value);
        const year  = parseInt(jumpYear.value);
        if (!isNaN(month) && !isNaN(year) && year >= 2000 && year <= 2099) {
          currentMonth = month;
          currentYear  = year;
          renderCalendar();
        }
      });
    }

    if (jumpYear) {
      jumpYear.addEventListener('keydown', e => {
        if (e.key === 'Enter') jumpGo?.click();
      });
    }

    // ── Attach click listeners to date cells ────────────────────────────────
    document.querySelectorAll('.calendar-date-cell').forEach(cell => {
      const dateStr = cell.dataset.date;
      if (dateStr) cell.addEventListener('click', () => showDateDetails(dateStr));
    });

  } catch (error) {
    console.error('❌ Error rendering calendar:', error);
    content.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #DC2626;">
        <h2>⚠️ Error Loading Calendar</h2>
        <p>${error.message}</p>
        <button onclick="renderCalendar()"
          style="padding: 12px 24px; background: #87B382; color: white; border: none;
                 border-radius: 12px; cursor: pointer; font-weight: 700; margin-top: 15px;">
          Retry
        </button>
      </div>
    `;
  }
}

// =============================================================================
//  3. RENDER CALENDAR GRID
// =============================================================================

/**
 * Build the 7-column grid. Each day cell is colour-coded by revenue:
 *   dark green (high) → medium green → light green → grey (none).
 */
function renderCalendarGrid() {
  const firstDay       = new Date(currentYear, currentMonth, 1);
  const lastDay        = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth    = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  let html = `
    <div class="calendar-grid">
      <div class="calendar-day-header">Sun</div>
      <div class="calendar-day-header">Mon</div>
      <div class="calendar-day-header">Tue</div>
      <div class="calendar-day-header">Wed</div>
      <div class="calendar-day-header">Thu</div>
      <div class="calendar-day-header">Fri</div>
      <div class="calendar-day-header">Sat</div>
  `;

  // Empty cells before first day of month
  for (let i = 0; i < startDayOfWeek; i++) {
    html += `<div class="calendar-date-cell empty"></div>`;
  }

  // One cell per day
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr  = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const summary  = calendarData[dateStr];
    const isToday  = isTodayDate(currentYear, currentMonth, day);

    let cellClass  = 'calendar-date-cell';
    let cellStyle  = '';
    let revenue    = 0;
    let salesCount = 0;

    if (summary) {
      revenue    = parseFloat(summary.total_revenue || 0);
      salesCount = summary.transaction_count || 0;

      if (revenue > 0) {
        cellClass += ' has-sales';
        if (revenue < 500) {
          cellStyle = 'background: linear-gradient(135deg, #D1FAE5, #A7F3D0);';
        } else if (revenue < 2000) {
          cellStyle = 'background: linear-gradient(135deg, #A7F3D0, #6EE7B7);';
        } else {
          cellStyle = 'background: linear-gradient(135deg, #6EE7B7, #34D399);';
        }
      }
    }

    if (isToday) cellClass += ' today';

    html += `
      <div class="${cellClass}" data-date="${dateStr}" style="${cellStyle}">
        <div class="date-number">${day}</div>
        ${revenue > 0 ? `
          <div class="date-revenue">
            ₱${revenue.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div class="date-sales-count">
            ${salesCount} sale${salesCount !== 1 ? 's' : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

// =============================================================================
//  4. CHANGE MONTH
// =============================================================================

/** Navigate forward / backward one month and re-render. */
async function changeMonth(direction) {
  currentMonth += direction;

  if      (currentMonth > 11) { currentMonth = 0;  currentYear++; }
  else if (currentMonth <  0) { currentMonth = 11; currentYear--; }

  await renderCalendar();
}

// =============================================================================
//  5. SHOW DATE DETAILS (fetch)
// =============================================================================

/**
 * Fetch DailySummary + paid debtors for a specific date,
 * then open the detail modal.
 */
async function showDateDetails(dateStr) {
  console.log('📆 Showing details for:', dateStr);

  try {
    // Show loading state immediately
    showDateModal(dateStr, null, [], true);

    // Fetch sales details AND all debtors in parallel
    const [details, allDebtors] = await Promise.all([
      DB.getDateDetails(dateStr),
      DB.getDebtors().catch(() => [])
    ]);

    // Filter debtors paid on this exact date
    const targetDate = new Date(dateStr + 'T00:00:00');
    const paidOnDate = allDebtors.filter(d => {
      if (!d.paid || !d.date_paid) return false;
      const paid = new Date(d.date_paid);
      return paid.getFullYear() === targetDate.getFullYear() &&
             paid.getMonth()    === targetDate.getMonth()    &&
             paid.getDate()     === targetDate.getDate();
    });

    if (!details) {
      showDateModal(dateStr, null, paidOnDate, false);
      return;
    }
    showDateModal(dateStr, details, paidOnDate, false);
  } catch (error) {
    console.error('❌ Error fetching date details:', error);
    showModernAlert('Failed to load date details. Please try again.', '❌');
  }
}

// =============================================================================
//  6. DATE DETAILS MODAL
// =============================================================================

/**
 * Render a full-screen modal with revenue, profit, sales count,
 * product-sold breakdown, and paid debtors for that day.
 *
 * @param {string}  dateStr      — YYYY-MM-DD
 * @param {object}  details      — DailySummary data (or null)
 * @param {Array}   paidDebtors  — debtors paid on this date
 * @param {boolean} isLoading    — show spinner while fetching
 */
function showDateModal(dateStr, details, paidDebtors, isLoading) {
  const existing = document.getElementById('dateDetailsModal');
  if (existing) existing.remove();

  const date          = new Date(dateStr + 'T00:00:00');
  const formattedDate = date.toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const overlay = document.createElement('div');
  overlay.id    = 'dateDetailsModal';

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    overlay.innerHTML = `
      <div class="date-modal-overlay">
        <div class="date-modal-box">
          <div class="modal-loading">
            <div class="loading-spinner">⏳</div>
            <p>Loading sales data...</p>
          </div>
        </div>
      </div>
    `;

  // ── No sales on this date ──────────────────────────────────────────────────
  } else if (!details || details.transaction_count === 0) {

    // Build paid debtors block for no-sales days (there may still be payments)
    const paidBlock = buildPaidDebtorsHTML(paidDebtors || []);

    overlay.innerHTML = `
      <div class="date-modal-overlay" onclick="closeModal(event)">
        <div class="date-modal-box">
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
          <div class="modal-header">
            <h2 class="modal-title">📅 ${formattedDate}</h2>
          </div>
          <div class="modal-body">
            <div class="empty-state">
              <div class="empty-icon">📭</div>
              <h3>No Sales Recorded</h3>
              <p>There were no transactions on this date.</p>
            </div>
            ${paidBlock}
          </div>
        </div>
      </div>
      ${modalPaidDebtorStyles()}
    `;

  // ── Full details ───────────────────────────────────────────────────────────
  } else {
    const revenue            = parseFloat(details.total_revenue       || 0);
    const profit             = parseFloat(details.total_profit        || 0);
    const salesCount         = details.transaction_count              || 0;
    const bestByQty          = details.best_seller_by_quantity        || 'N/A';
    const bestByQtyCount     = details.best_seller_quantity           || 0;
    const bestByProfit       = details.best_seller_by_profit          || 'N/A';
    const bestByProfitAmount = parseFloat(details.best_seller_profit  || 0);
    const productsList       = details.products_sold_list             || [];

    const paidBlock = buildPaidDebtorsHTML(paidDebtors || []);

    overlay.innerHTML = `
      <div class="date-modal-overlay" onclick="closeModal(event)">
        <div class="date-modal-box">
          <button class="modal-close-btn" onclick="closeModal()">✕</button>

          <div class="modal-header">
            <h2 class="modal-title">📅 ${formattedDate}</h2>
            <p class="modal-subtitle">
              <span class="transaction-badge">
                ${salesCount} transaction${salesCount !== 1 ? 's' : ''}
              </span>
            </p>
          </div>

          <div class="modal-body">
            <div class="modal-summary-grid">
              <div class="modal-summary-card revenue">
                <div class="summary-card-icon">💰</div>
                <div class="summary-card-content">
                  <div class="summary-card-label">Total Revenue</div>
                  <div class="summary-card-value">
                    ₱${revenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div class="modal-summary-card profit">
                <div class="summary-card-icon">📈</div>
                <div class="summary-card-content">
                  <div class="summary-card-label">Total Profit</div>
                  <div class="summary-card-value">
                    ₱${profit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-section">
              <h3 class="modal-section-title">🏆 Best Sellers</h3>
              <div class="best-sellers-grid">
                <div class="best-seller-card">
                  <div class="best-seller-badge quantity">📦 By Quantity</div>
                  <div class="best-seller-name">${bestByQty}</div>
                  <div class="best-seller-stat">
                    ${bestByQtyCount} unit${bestByQtyCount !== 1 ? 's' : ''} sold
                  </div>
                </div>
                <div class="best-seller-card">
                  <div class="best-seller-badge profit">💎 By Profit</div>
                  <div class="best-seller-name">${bestByProfit}</div>
                  <div class="best-seller-stat">
                    ₱${bestByProfitAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} earned
                  </div>
                </div>
              </div>
            </div>

            ${productsList.length > 0 ? `
              <div class="modal-section">
                <h3 class="modal-section-title">
                  📦 Products Sold
                  <span class="count-badge">${productsList.length}</span>
                </h3>
                <div class="products-list">
                  ${productsList.map((product, index) => {
                    const pProfit = parseFloat(product.profit || 0);
                    return `
                      <div class="product-list-item">
                        <div class="product-rank">${index + 1}</div>
                        <div class="product-info">
                          <div class="product-name">${product.name || 'Unknown'}</div>
                          <div class="product-stats">
                            <span class="product-quantity">
                              📦 ${product.quantity || 0} unit${(product.quantity || 0) !== 1 ? 's' : ''}
                            </span>
                            <span class="product-profit">
                              💰 ₱${pProfit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>`;
                  }).join('')}
                </div>
              </div>
            ` : ''}

            ${paidBlock}

          </div>
        </div>
      </div>
      ${modalPaidDebtorStyles()}
    `;
  }

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}

// =============================================================================
//  PAID DEBTORS BLOCK BUILDER
// =============================================================================

/**
 * Build the HTML for the "Debts Paid on This Day" section inside the modal.
 * Records are kept for 1 year (controlled by auto-cleanup in views.py).
 */
function buildPaidDebtorsHTML(paidDebtors) {
  if (!paidDebtors || paidDebtors.length === 0) {
    // Only show the section if there's something to display
    return '';
  }

  const totalPaid = paidDebtors.reduce((sum, d) => sum + parseFloat(d.total_debt || 0), 0);

  const items = paidDebtors.map(d => {
    const amount = parseFloat(d.total_debt || 0).toFixed(2);
    const initial = (d.name || '?').charAt(0).toUpperCase();

    // Build items list
    let itemsList = '';
    try {
      const items = d.items || [];
      if (items.length > 0) {
        itemsList = items.map(i => {
          const name = i.product_name || i.name || 'Unknown';
          return `${name} ×${i.quantity || 0}`;
        }).join(', ');
      }
    } catch (e) { /* ignore */ }

    return `
      <div class="mpd-item">
        <div class="mpd-avatar">${initial}</div>
        <div class="mpd-info">
          <div class="mpd-name">${d.name || 'Unknown'}</div>
          ${itemsList ? `<div class="mpd-items">${itemsList}</div>` : ''}
        </div>
        <div class="mpd-amount">₱${amount}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="modal-section mpd-section">
      <h3 class="modal-section-title mpd-title">
        ✅ Debts Paid on This Day
        <span class="count-badge mpd-badge">${paidDebtors.length}</span>
      </h3>

      <!-- Receipt-style divider -->
      <div class="mpd-receipt-top">
        <span>- - - - - - - - - - - - - - - - - - - - -</span>
      </div>

      <div class="mpd-list">
        ${items}
      </div>

      <!-- Receipt total footer -->
      <div class="mpd-receipt-divider"></div>
      <div class="mpd-total-row">
        <span class="mpd-total-label">Total Collected</span>
        <span class="mpd-total-value">₱${totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    </div>
  `;
}

/** CSS injected alongside the modal for the paid-debtors section. */
function modalPaidDebtorStyles() {
  return `
    <style>
      /* ── Paid Debtors Modal Section ───────────────────────────── */
      .mpd-section {
        margin-top: 20px;
        background: linear-gradient(135deg,
          rgba(220,252,231,0.6),
          rgba(187,247,208,0.4));
        border: 1.5px solid rgba(74,222,128,0.35);
        border-radius: 16px;
        padding: 16px;
        backdrop-filter: blur(8px);
      }
      body.dark-mode .mpd-section {
        background: rgba(20,50,30,0.55);
        border-color: rgba(74,222,128,0.20);
      }

      .mpd-title {
        color: #166534 !important;
        margin-bottom: 4px !important;
      }
      body.dark-mode .mpd-title { color: #4ade80 !important; }

      .mpd-badge {
        background: linear-gradient(135deg, #4ade80, #22c55e) !important;
        color: #fff !important;
      }

      .mpd-receipt-top {
        text-align: center;
        font-size: 11px;
        color: #86efac;
        letter-spacing: 1px;
        margin: 8px 0 12px;
        overflow: hidden;
        white-space: nowrap;
      }
      body.dark-mode .mpd-receipt-top { color: #4ade80; opacity: 0.5; }

      .mpd-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .mpd-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: rgba(255,255,255,0.55);
        border: 1px solid rgba(74,222,128,0.25);
        border-radius: 12px;
        transition: transform 0.15s;
      }
      .mpd-item:hover { transform: translateX(3px); }
      body.dark-mode .mpd-item {
        background: rgba(20,60,30,0.55);
        border-color: rgba(74,222,128,0.15);
      }

      .mpd-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4ade80, #22c55e);
        color: #fff;
        font-size: 15px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(74,222,128,0.35);
      }

      .mpd-info {
        flex: 1;
        min-width: 0;
      }

      .mpd-name {
        font-size: 13px;
        font-weight: 700;
        color: #14532d;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      body.dark-mode .mpd-name { color: #bbf7d0; }

      .mpd-items {
        font-size: 11px;
        color: #15803d;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        opacity: 0.8;
      }
      body.dark-mode .mpd-items { color: #86efac; }

      .mpd-amount {
        font-size: 14px;
        font-weight: 800;
        color: #16a34a;
        flex-shrink: 0;
      }
      body.dark-mode .mpd-amount { color: #4ade80; }

      .mpd-receipt-divider {
        border-top: 2px dashed rgba(74,222,128,0.4);
        margin: 12px 0 10px;
      }

      .mpd-total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2px 2px;
      }

      .mpd-total-label {
        font-size: 13px;
        font-weight: 700;
        color: #15803d;
      }
      body.dark-mode .mpd-total-label { color: #86efac; }

      .mpd-total-value {
        font-size: 16px;
        font-weight: 900;
        color: #166534;
      }
      body.dark-mode .mpd-total-value { color: #4ade80; }
    </style>
  `;
}

// =============================================================================
//  7. CLOSE MODAL
// =============================================================================

function closeModal(event) {
  if (event && event.target.className !== 'date-modal-overlay') return;

  const modal = document.getElementById('dateDetailsModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

// =============================================================================
//  8. HELPERS
// =============================================================================

function getMonthName(monthIndex) {
  return ['January','February','March','April','May','June',
          'July','August','September','October','November','December'][monthIndex];
}

function isTodayDate(year, month, day) {
  const today = new Date();
  return today.getFullYear() === year &&
         today.getMonth()    === month &&
         today.getDate()     === day;
}

// =============================================================================
//  EXPORTS
// =============================================================================

window.renderCalendar  = renderCalendar;
window.showDateDetails = showDateDetails;
window.closeModal      = closeModal;
window.changeMonth     = changeMonth;

console.log('✅ Calendar module loaded!');