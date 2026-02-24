/**
 * calendar.js — Monthly sales calendar with revenue heatmap and date
 *               detail modals.
 *
 * Sections:
 *  1. Global State           — currentYear, currentMonth, calendarData
 *  2. renderCalendar()       — entry point, fetches month data & header
 *  3. renderCalendarGrid()   — 7×N grid with revenue-based colour coding
 *  4. changeMonth()          — prev/next month navigation
 *  5. showDateDetails()      — fetch & display a single day's details
 *  6. showDateModal()        — rich modal with product-sold list
 *  7. closeModal()           — dismiss handler
 *  8. Helpers                — getMonthName, isTodayDate
 *
 * Dependencies: database.js (DB)
 */


console.log('📅 Loading calendar module...');

// =============================================================================
//  1. GLOBAL STATE
// =============================================================================

let currentYear = new Date().getFullYear();
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
        to { transform: rotate(360deg); }
      }
    </style>
  `;

  try {
    // Fetch calendar data from API
    const data = await DB.getCalendarData(currentYear, currentMonth + 1);
    
    calendarData = {};
    
    // Index summaries by date
    data.summaries.forEach(summary => {
      calendarData[summary.date] = {
        date: summary.date,
        total_revenue: parseFloat(summary.total_revenue || 0),
        total_profit: parseFloat(summary.total_profit || 0),
        transaction_count: parseInt(summary.transaction_count || 0)
      };
    });
    
    console.log('📅 Calendar data loaded:', calendarData);
    
    const html = `
      <div class="calendar-container">
        <!-- Header -->
        <div class="calendar-header">
          <h2 style="color: var(--text-primary, #3a3a38); margin: 0; font-size: 1.8rem;">
            📅 Sales Calendar
          </h2>
          <p style="color: var(--text-secondary, #6a6a65); font-size: 14px; margin-top: 8px;">
            Click on any date to view detailed sales information
          </p>
        </div>
        
        <!-- Month Navigation -->
        <div class="calendar-nav">
          <button class="calendar-nav-btn" id="prevMonth">
            <span>←</span>
          </button>
          <h3 class="calendar-month-title" id="monthTitle">
            ${getMonthName(currentMonth)} ${currentYear}
          </h3>
          <button class="calendar-nav-btn" id="nextMonth">
            <span>→</span>
          </button>
        </div>
        
        <!-- Calendar Grid -->
        <div class="calendar-grid-container">
          ${renderCalendarGrid()}
        </div>
        
        <!-- Legend -->
        <div class="calendar-legend">
          <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(135deg, #D1FAE5, #A7F3D0);"></div>
            <span>< ₱500</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(135deg, #A7F3D0, #6EE7B7);"></div>
            <span>₱500 - ₱2,000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(135deg, #6EE7B7, #34D399);"></div>
            <span>> ₱2,000</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #f5f5f0; border: 1px dashed #ccc;"></div>
            <span>No Sales</span>
          </div>
        </div>
      </div>
    `;
    
    content.innerHTML = html;
    
    // Attach event listeners
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    
    // Attach click listeners to date cells
    document.querySelectorAll('.calendar-date-cell').forEach(cell => {
      const dateStr = cell.dataset.date;
      if (dateStr) {
        cell.addEventListener('click', () => showDateDetails(dateStr));
      }
    });
    
  } catch (error) {
    console.error('❌ Error rendering calendar:', error);
    content.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #DC2626;">
        <h2>⚠️ Error Loading Calendar</h2>
        <p>${error.message}</p>
        <button onclick="renderCalendar()" style="padding: 12px 24px; background: #87B382; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 700; margin-top: 15px;">Retry</button>
      </div>
    `;
  }
}

// =============================================================================
//  3. RENDER CALENDAR GRID
// =============================================================================


/**
 * Build the 7-column grid.  Each day cell is colour-coded by revenue:
 *   green (high) → yellow (medium) → grey (none).
 */

function renderCalendarGrid() {
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
  
  let html = `
    <div class="calendar-grid">
      <!-- Day headers -->
      <div class="calendar-day-header">Sun</div>
      <div class="calendar-day-header">Mon</div>
      <div class="calendar-day-header">Tue</div>
      <div class="calendar-day-header">Wed</div>
      <div class="calendar-day-header">Thu</div>
      <div class="calendar-day-header">Fri</div>
      <div class="calendar-day-header">Sat</div>
  `;
  
  // Empty cells before first day
  for (let i = 0; i < startDayOfWeek; i++) {
    html += `<div class="calendar-date-cell empty"></div>`;
  }
  
  // Date cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const summary = calendarData[dateStr];
    const isToday = isTodayDate(currentYear, currentMonth, day);
    
    let cellClass = 'calendar-date-cell';
    let cellStyle = '';
    let revenue = 0;
    let salesCount = 0;
    
    if (summary) {
      revenue = parseFloat(summary.total_revenue || 0);
      salesCount = summary.transaction_count || 0;
      
      // Color intensity based on revenue
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
    
    if (isToday) {
      cellClass += ' today';
    }
    
    html += `
      <div class="${cellClass}" data-date="${dateStr}" style="${cellStyle}">
        <div class="date-number">${day}</div>
        ${revenue > 0 ? `
          <div class="date-revenue">₱${revenue.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
          <div class="date-sales-count">${salesCount} sale${salesCount !== 1 ? 's' : ''}</div>
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
  
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  } else if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  
  await renderCalendar();
}

// =============================================================================
//  5. SHOW DATE DETAILS (fetch)
// =============================================================================


/** Fetch DailySummary for a specific date, then open the detail modal. */

async function showDateDetails(dateStr) {
  console.log('📆 Showing details for:', dateStr);
  
  try {
    // Show loading modal
    showDateModal(dateStr, null, true);
    
    // Fetch details from API
    const details = await DB.getDateDetails(dateStr);
    
    if (!details) {
      showDateModal(dateStr, null, false);
      return;
    }
    
    // Show details modal
    showDateModal(dateStr, details, false);
    
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
 * and a scrollable product-sold breakdown table.
 */
function showDateModal(dateStr, details, isLoading) {
  // Remove existing modal
  const existing = document.getElementById('dateDetailsModal');
  if (existing) existing.remove();
  
  const date = new Date(dateStr + 'T00:00:00');
  const formattedDate = date.toLocaleDateString('en-PH', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const overlay = document.createElement('div');
  overlay.id = 'dateDetailsModal';
  
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
  } else if (!details || details.transaction_count === 0) {
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
          </div>
        </div>
      </div>
    `;
  } else {
    const revenue = parseFloat(details.total_revenue || 0);
    const profit = parseFloat(details.total_profit || 0);
    const salesCount = details.transaction_count || 0;
    const bestByQty = details.best_seller_by_quantity || 'N/A';
    const bestByQtyCount = details.best_seller_quantity || 0;
    const bestByProfit = details.best_seller_by_profit || 'N/A';
    const bestByProfitAmount = parseFloat(details.best_seller_profit || 0);
    const productsList = details.products_sold_list || [];
    
    overlay.innerHTML = `
      <div class="date-modal-overlay" onclick="closeModal(event)">
        <div class="date-modal-box">
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
          
          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">📅 ${formattedDate}</h2>
            <p class="modal-subtitle">
              <span class="transaction-badge">${salesCount} transaction${salesCount !== 1 ? 's' : ''}</span>
            </p>
          </div>
          
          <!-- Body -->
          <div class="modal-body">
            <!-- Summary Cards -->
            <div class="modal-summary-grid">
              <div class="modal-summary-card revenue">
                <div class="summary-card-icon">💰</div>
                <div class="summary-card-content">
                  <div class="summary-card-label">Total Revenue</div>
                  <div class="summary-card-value">₱${revenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
              
              <div class="modal-summary-card profit">
                <div class="summary-card-icon">📈</div>
                <div class="summary-card-content">
                  <div class="summary-card-label">Total Profit</div>
                  <div class="summary-card-value">₱${profit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>
            
            <!-- Best Sellers Section -->
            <div class="modal-section">
              <h3 class="modal-section-title">🏆 Best Sellers</h3>
              <div class="best-sellers-grid">
                <div class="best-seller-card">
                  <div class="best-seller-badge quantity">📦 By Quantity</div>
                  <div class="best-seller-name">${bestByQty}</div>
                  <div class="best-seller-stat">${bestByQtyCount} unit${bestByQtyCount !== 1 ? 's' : ''} sold</div>
                </div>
                
                <div class="best-seller-card">
                  <div class="best-seller-badge profit">💎 By Profit</div>
                  <div class="best-seller-name">${bestByProfit}</div>
                  <div class="best-seller-stat">₱${bestByProfitAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} earned</div>
                </div>
              </div>
            </div>
            
            <!-- Products Sold Section -->
            ${productsList.length > 0 ? `
              <div class="modal-section">
                <h3 class="modal-section-title">📦 Products Sold <span class="count-badge">${productsList.length}</span></h3>
                <div class="products-list">
                  ${productsList.map((product, index) => {
                    const pProfit = parseFloat(product.profit || 0);
                    return `
                    <div class="product-list-item">
                      <div class="product-rank">${index + 1}</div>
                      <div class="product-info">
                        <div class="product-name">${product.name || 'Unknown'}</div>
                        <div class="product-stats">
                          <span class="product-quantity">📦 ${product.quantity || 0} unit${(product.quantity || 0) !== 1 ? 's' : ''}</span>
                          <span class="product-profit">💰 ₱${pProfit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  `;
                  }).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}

// =============================================================================
//  7. CLOSE MODAL
// =============================================================================
function closeModal(event) {
  if (event && event.target.className !== 'date-modal-overlay') {
    return;
  }
  
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
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
}

function isTodayDate(year, month, day) {
  const today = new Date();
  return today.getFullYear() === year && 
         today.getMonth() === month && 
         today.getDate() === day;
}

// =============================================================================
//  EXPORTS
// =============================================================================
window.renderCalendar = renderCalendar;
window.showDateDetails = showDateDetails;
window.closeModal = closeModal;
window.changeMonth = changeMonth;

console.log('✅ Calendar module loaded!');