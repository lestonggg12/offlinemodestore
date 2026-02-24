/**
 * debtors.js — Debtors management page.
 */

// =============================================================================
//  PART 1: MAIN RENDER & DISPLAY
// =============================================================================

window.renderDebtors = async function() {
  const content = document.getElementById('debtorsContent');

  content.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="font-size: 48px; animation: spin 1s linear infinite;">⏳</div>
      <p style="color: #666; margin-top: 10px;">Loading debtors...</p>
    </div>
    <style>
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    </style>
  `;

  try {
    await DB.autoCleanupPaidDebtors();
    const debtors = await DB.getDebtors();
    if (!Array.isArray(debtors)) throw new Error('Debtors data is not available');

    const unpaidDebtors = debtors.filter(d => !d.paid);
    const paidDebtors   = debtors.filter(d =>  d.paid);

    // ── Metrics ──────────────────────────────────────────────────────────────
    let totalOutstanding = 0; unpaidDebtors.forEach(d => { totalOutstanding += parseFloat(d.total_debt || 0); });
    let totalCollected   = 0; paidDebtors.forEach(d   => { totalCollected   += parseFloat(d.total_debt || 0); });
    let surchargeCollected = 0; paidDebtors.forEach(d  => { surchargeCollected += parseFloat(d.surcharge_amount || 0); });
    let surchargePending   = 0; unpaidDebtors.forEach(d => { surchargePending   += parseFloat(d.surcharge_amount || 0); });
    const highestDebt     = unpaidDebtors.length > 0 ? Math.max(...unpaidDebtors.map(d => parseFloat(d.total_debt || 0))) : 0;
    const totalEverLoaned = totalOutstanding + totalCollected;
    const collectionRate  = totalEverLoaned > 0 ? Math.round((totalCollected / totalEverLoaned) * 100) : 0;

    let html = `
      <!-- 6-CARD SUMMARY ROW -->
      <div class="debtors-summary-cards">
        <div class="summary-card debt-card-red">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <div class="card-label">TOTAL OUTSTANDING</div>
            <div class="card-value">₱${totalOutstanding.toFixed(2)}</div>
            <div class="card-sub">${unpaidDebtors.length} unpaid debtor${unpaidDebtors.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="summary-card debt-card-green">
          <div class="card-icon">✅</div>
          <div class="card-content">
            <div class="card-label">TOTAL COLLECTED</div>
            <div class="card-value">₱${totalCollected.toFixed(2)}</div>
            <div class="card-sub">${paidDebtors.length} paid debtor${paidDebtors.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="summary-card debt-card-blue">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <div class="card-label">COLLECTION RATE</div>
            <div class="card-value">${collectionRate}%</div>
            <div class="card-sub">of total amount loaned</div>
          </div>
        </div>
        <div class="summary-card debt-card-amber">
          <div class="card-icon">⚡</div>
          <div class="card-content">
            <div class="card-label">SURCHARGE COLLECTED</div>
            <div class="card-value">₱${surchargeCollected.toFixed(2)}</div>
            <div class="card-sub">from paid debts</div>
          </div>
        </div>
        <div class="summary-card debt-card-orange">
          <div class="card-icon">⏳</div>
          <div class="card-content">
            <div class="card-label">SURCHARGE PENDING</div>
            <div class="card-value">₱${surchargePending.toFixed(2)}</div>
            <div class="card-sub">from unpaid debts</div>
          </div>
        </div>
        <div class="summary-card debt-card-purple">
          <div class="card-icon">🏆</div>
          <div class="card-content">
            <div class="card-label">HIGHEST UNPAID DEBT</div>
            <div class="card-value">${highestDebt > 0 ? '₱' + highestDebt.toFixed(2) : '—'}</div>
            <div class="card-sub">${highestDebt > 0 ? 'single largest balance' : 'no unpaid debts'}</div>
          </div>
        </div>
      </div>

      <!-- Unpaid Debts Section -->
      <div class="debts-section">
        <div class="section-header-row">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <h3 class="section-header unpaid-header">📋 Unpaid Debts</h3>
            <button class="toggle-section-btn toggle-btn-red" onclick="toggleDebtSection('unpaid')">
              <span id="unpaidToggleIcon">🙈</span>
              <span id="unpaidToggleLabel">Hide</span>
            </button>
          </div>
        </div>
        <div id="unpaidDebtContainer" style="transition: max-height 0.35s ease, opacity 0.3s ease; overflow: hidden; max-height: none; opacity: 1;">
          ${renderDebtorsCards(unpaidDebtors, false)}
        </div>
      </div>

      <!-- Paid Debts Section -->
      <div class="debts-section">
        <div class="section-header-row">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <h3 class="section-header paid-header">✅ Paid Debts</h3>
            <button class="toggle-section-btn toggle-btn-green" onclick="toggleDebtSection('paid')">
              <span id="paidToggleIcon">🙈</span>
              <span id="paidToggleLabel">Hide</span>
            </button>
          </div>
          ${paidDebtors.length > 0 ? `
            <button class="modern-btn btn-clear-paid" id="btnClearAllPaid">
              <span class="btn-icon">🧹</span>
              <span>Clear All Paid</span>
            </button>
          ` : ''}
        </div>
        ${paidDebtors.length > 0 ? `<p class="auto-delete-notice">⏱️ Paid debts are automatically deleted after 7 days</p>` : ''}
        <div id="paidDebtContainer" style="transition: max-height 0.35s ease, opacity 0.3s ease; overflow: hidden; max-height: none; opacity: 1;">
          ${renderDebtorsCards(paidDebtors, true)}
        </div>
      </div>
    `;

    content.innerHTML = html + getDebtorStyles();
    setupDebtorEventListeners();

  } catch (error) {
    console.error('❌ Error rendering debtors:', error);
    content.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #DC2626;">
        <h2>⚠️ Error Loading Debtors</h2>
        <p>${error.message || 'An unexpected error occurred'}</p>
        <button onclick="renderDebtors()" style="margin-top: 20px; padding: 12px 24px; background: #87B382; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 700;">Retry</button>
      </div>
    `;
  }
};

// ─────────────────────────────────────────────────────────────────────────────

window.toggleDebtSection = function(section) {
  const container = document.getElementById(section === 'unpaid' ? 'unpaidDebtContainer' : 'paidDebtContainer');
  const icon      = document.getElementById(section === 'unpaid' ? 'unpaidToggleIcon'    : 'paidToggleIcon');
  const label     = document.getElementById(section === 'unpaid' ? 'unpaidToggleLabel'   : 'paidToggleLabel');
  if (!container) return;

  const isVisible = container.style.maxHeight !== '0px';

  if (isVisible) {
    container.style.maxHeight = container.scrollHeight + 'px';
    requestAnimationFrame(() => {
      container.style.maxHeight = '0px';
      container.style.opacity   = '0';
    });
    icon.textContent  = '👁️';
    label.textContent = 'Show';
  } else {
    container.style.maxHeight = container.scrollHeight + 'px';
    container.style.opacity   = '1';
    icon.textContent  = '🙈';
    label.textContent = 'Hide';
    setTimeout(() => { container.style.maxHeight = 'none'; }, 380);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

function renderDebtorsCards(debtors, isPaid) {
  if (debtors.length === 0) {
    return `<p class="no-data">${isPaid ? '🎉 No paid debts yet' : '📭 No unpaid debts'}</p>`;
  }

  let html = '<div class="debtors-grid">';

  debtors.forEach(debtor => {
    const date = new Date(debtor.date_borrowed || debtor.date);
    const formattedDate = date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });

    let itemsList = 'N/A';
    try {
      const items = debtor.items || [];
      if (items.length > 0) {
        itemsList = items.map(item => {
          const prodName = item.product_name || item.name || 'Unknown Product';
          return `${prodName} (×${item.quantity || 0})`;
        }).join(', ');
      }
    } catch (e) { console.error('Error parsing debtor items:', e); }

    const totalDebt     = parseFloat(debtor.total_debt     || 0);
    const originalTotal = parseFloat(debtor.original_total || 0);
    const surchargeAmt  = parseFloat(debtor.surcharge_amount || 0);
    const surchargeP    = parseFloat(debtor.surcharge_percent || 0);
    const hasSurcharge  = surchargeP > 0 && originalTotal > 0 && surchargeAmt > 0;
    const customerName  = debtor.name    || 'Unknown';
    const contact       = debtor.contact || '';

    html += `
      <div class="debtor-card ${isPaid ? 'paid' : 'unpaid'}">
        <div class="debtor-header">
          <div class="debtor-name">${customerName}</div>
          <span class="status-badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}">
            ${isPaid ? '✓ PAID' : '⚠ UNPAID'}
          </span>
        </div>
        <div class="debtor-details">
          <div class="detail-row"><span class="detail-label">📅 Date:</span><span class="detail-value">${formattedDate}</span></div>
          <div class="detail-row"><span class="detail-label">🕐 Time:</span><span class="detail-value">${formattedTime}</span></div>
          ${contact ? `<div class="detail-row"><span class="detail-label">📱 Contact:</span><span class="detail-value">${contact}</span></div>` : ''}
        </div>
        <div class="debtor-items">
          <div class="items-label">📦 Items Loaned</div>
          <div class="items-list">${itemsList}</div>
        </div>
        ${hasSurcharge ? `
          <div class="debtor-amount-breakdown ${isPaid ? 'amount-paid' : 'amount-unpaid'}">
            <div class="breakdown-row subtotal-row">
              <span class="breakdown-label">Subtotal</span>
              <span class="breakdown-value">₱${originalTotal.toFixed(2)}</span>
            </div>
            <div class="breakdown-row surcharge-row">
              <span class="breakdown-label">Surcharge (${surchargeP}%)</span>
              <span class="breakdown-value surcharge-value">+₱${surchargeAmt.toFixed(2)}</span>
            </div>
            <div class="breakdown-divider"></div>
            <div class="breakdown-row total-row">
              <span class="breakdown-label total-label-text">Total</span>
              <span class="breakdown-value total-value">₱${totalDebt.toFixed(2)}</span>
            </div>
          </div>
          ${!isPaid ? `<div class="surcharge-note">⚠️ <strong>+₱${surchargeAmt.toFixed(2)}</strong> surcharge was added to the original ₱${originalTotal.toFixed(2)}</div>` : ''}
        ` : `
          <div class="debtor-amount ${isPaid ? 'amount-paid' : 'amount-unpaid'}">₱${totalDebt.toFixed(2)}</div>
        `}
        ${isPaid ? `
          <div class="paid-info">✓ Paid on ${debtor.date_paid ? new Date(debtor.date_paid).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div>
          ${debtor.date_paid ? (() => {
            const paidDate   = new Date(debtor.date_paid);
            const deleteDate = new Date(paidDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            const daysLeft   = Math.max(0, Math.ceil((deleteDate - new Date()) / (1000 * 60 * 60 * 24)));
            return `<div class="auto-delete-countdown">${daysLeft > 0 ? `🗑️ Auto-deletes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : '🗑️ Will be deleted soon'}</div>`;
          })() : ''}
        ` : `
          <div class="debtor-actions">
            <button class="action-btn btn-mark-paid" data-debtor-id="${debtor.id}"><span>💰</span> Mark as Paid</button>
            <button class="action-btn btn-delete-debtor" data-debtor-id="${debtor.id}"><span>🗑️</span> Delete</button>
          </div>
        `}
      </div>
    `;
  });

  html += '</div>';
  return html;
}

// =============================================================================
//  PART 2: CSS STYLES
// =============================================================================

function getDebtorStyles() {
  const isDarkMode = document.body.classList.contains('dark-mode');
  return `
    <style>
      .debtors-summary-cards {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 16px; margin-bottom: 40px;
      }
      @media (max-width: 900px) { .debtors-summary-cards { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 560px) { .debtors-summary-cards { grid-template-columns: 1fr; } }
      .summary-card {
        display: flex; align-items: center; padding: 22px 20px;
        border-radius: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: all 0.3s ease;
      }
      .summary-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.13); }
      .card-icon { font-size: 2.2rem; margin-right: 16px; flex-shrink: 0; }
      .card-content { flex: 1; min-width: 0; }
      .card-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.75; margin-bottom: 5px; }
      .card-value { font-size: 1.6rem; font-weight: 800; line-height: 1.1; }
      .card-sub   { font-size: 0.72rem; font-weight: 600; opacity: 0.65; margin-top: 3px; }

      .debt-card-red    { background: linear-gradient(135deg,#FEE2E2,#FECACA); border-left: 5px solid #DC2626; }
      .debt-card-red .card-label, .debt-card-red .card-sub { color: #7f1d1d; }
      .debt-card-red .card-value { color: #DC2626; }
      body.dark-mode .debt-card-red { background: linear-gradient(135deg,#4a2c2c,#5c3535); border-left-color: #f87171; }
      body.dark-mode .debt-card-red .card-label, body.dark-mode .debt-card-red .card-sub { color: #fca5a5; }
      body.dark-mode .debt-card-red .card-value { color: #fca5a5; }

      .debt-card-green  { background: linear-gradient(135deg,#D1FAE5,#A7F3D0); border-left: 5px solid #10B981; }
      .debt-card-green .card-label, .debt-card-green .card-sub { color: #064e3b; }
      .debt-card-green .card-value { color: #059669; }
      body.dark-mode .debt-card-green { background: linear-gradient(135deg,#1e3a2f,#264536); border-left-color: #34d399; }
      body.dark-mode .debt-card-green .card-label, body.dark-mode .debt-card-green .card-sub { color: #6ee7b7; }
      body.dark-mode .debt-card-green .card-value { color: #6ee7b7; }

      .debt-card-blue   { background: linear-gradient(135deg,#DBEAFE,#BFDBFE); border-left: 5px solid #3B82F6; }
      .debt-card-blue .card-label, .debt-card-blue .card-sub { color: #1e3a5f; }
      .debt-card-blue .card-value { color: #1D4ED8; }
      body.dark-mode .debt-card-blue { background: linear-gradient(135deg,#1e2f4a,#243a58); border-left-color: #60a5fa; }
      body.dark-mode .debt-card-blue .card-label, body.dark-mode .debt-card-blue .card-sub { color: #93c5fd; }
      body.dark-mode .debt-card-blue .card-value { color: #93c5fd; }

      .debt-card-amber  { background: linear-gradient(135deg,#FEF3C7,#FDE68A); border-left: 5px solid #F59E0B; }
      .debt-card-amber .card-label, .debt-card-amber .card-sub { color: #78350f; }
      .debt-card-amber .card-value { color: #B45309; }
      body.dark-mode .debt-card-amber { background: linear-gradient(135deg,#4a4528,#5c5530); border-left-color: #fbbf24; }
      body.dark-mode .debt-card-amber .card-label, body.dark-mode .debt-card-amber .card-sub { color: #fcd34d; }
      body.dark-mode .debt-card-amber .card-value { color: #fcd34d; }

      .debt-card-orange { background: linear-gradient(135deg,#FFEDD5,#FED7AA); border-left: 5px solid #F97316; }
      .debt-card-orange .card-label, .debt-card-orange .card-sub { color: #7c2d12; }
      .debt-card-orange .card-value { color: #C2410C; }
      body.dark-mode .debt-card-orange { background: linear-gradient(135deg,#3d2010,#4f2a14); border-left-color: #fb923c; }
      body.dark-mode .debt-card-orange .card-label, body.dark-mode .debt-card-orange .card-sub { color: #fdba74; }
      body.dark-mode .debt-card-orange .card-value { color: #fdba74; }

      .debt-card-purple { background: linear-gradient(135deg,#EDE9FE,#DDD6FE); border-left: 5px solid #7C3AED; }
      .debt-card-purple .card-label, .debt-card-purple .card-sub { color: #3b0764; }
      .debt-card-purple .card-value { color: #5B21B6; }
      body.dark-mode .debt-card-purple { background: linear-gradient(135deg,#2d1f4a,#39255c); border-left-color: #a78bfa; }
      body.dark-mode .debt-card-purple .card-label, body.dark-mode .debt-card-purple .card-sub { color: #c4b5fd; }
      body.dark-mode .debt-card-purple .card-value { color: #c4b5fd; }

      /* ── Section header row with toggle ── */
      .section-header-row {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
      }
      .section-header-row .section-header { margin-bottom: 0; }

      .toggle-section-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 7px 16px; border: none; border-radius: 20px;
        font-size: 13px; font-weight: 700; cursor: pointer;
        font-family: 'Quicksand', sans-serif;
        transition: all 0.2s ease;
        box-shadow: 0 3px 10px rgba(0,0,0,0.15);
      }
      .toggle-section-btn:hover { transform: translateY(-2px); }

      .toggle-btn-red {
        background: linear-gradient(135deg, #EF4444, #DC2626);
        color: white;
      }
      body.dark-mode .toggle-btn-red {
        background: linear-gradient(135deg, #b91c1c, #991b1b);
      }

      .toggle-btn-green {
        background: linear-gradient(135deg, #10B981, #059669);
        color: white;
      }
      body.dark-mode .toggle-btn-green {
        background: linear-gradient(135deg, #047857, #065f46);
      }

      /* ── Paid header row ── */
      .paid-header-row {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; flex-wrap: wrap;
      }

      .btn-clear-paid {
        display: flex; align-items: center; gap: 6px;
        padding: 8px 18px;
        background: ${isDarkMode ? 'linear-gradient(135deg,#4a2c2c,#3a2020)' : 'linear-gradient(135deg,#FEE2E2,#FECACA)'};
        color: ${isDarkMode ? '#f87171' : '#DC2626'};
        border: 1px solid ${isDarkMode ? 'rgba(248,113,113,0.3)' : '#fca5a5'};
        border-radius: 12px; font-weight: 700; font-size: 13px;
        cursor: pointer; transition: all 0.3s ease;
        font-family: 'Quicksand', sans-serif;
      }
      .btn-clear-paid:hover {
        background: ${isDarkMode ? 'linear-gradient(135deg,#5a2e2e,#4a2222)' : 'linear-gradient(135deg,#FECACA,#FCA5A5)'};
        transform: translateY(-2px); box-shadow: 0 4px 12px rgba(220,38,38,0.2);
      }
      .btn-clear-paid .btn-icon { font-size: 15px; }

      .auto-delete-notice {
        font-size: 12px; color: ${isDarkMode ? '#9CA3AF' : '#6B7280'};
        margin: 4px 0 12px 0; padding: 6px 12px;
        background: ${isDarkMode ? 'rgba(75,85,99,0.3)' : 'rgba(243,244,246,0.8)'};
        border-radius: 8px; border-left: 3px solid ${isDarkMode ? '#6B7280' : '#9CA3AF'};
        font-style: italic;
      }

      .modern-btn {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 15px 25px; border: none; border-radius: 12px;
        font-size: 1rem; font-weight: 700; font-family: 'Quicksand', sans-serif;
        cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
      .modern-btn:hover  { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }
      .btn-icon { font-size: 1.2rem; }

      .debts-section { margin-bottom: 40px; }
      .section-header { font-size: 1.3rem; font-weight: 700; color: #5D534A; display: flex; align-items: center; gap: 10px; }
      body.dark-mode .section-header { color: #f7fafc; }
      .unpaid-header { color: #DC2626; }
      body.dark-mode .unpaid-header { color: #f87171; }
      .paid-header { color: #059669; }
      body.dark-mode .paid-header { color: #34d399; }

      .debtors-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }
      .debtor-card {
        background: white; border-radius: 16px; padding: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.06); transition: all 0.3s ease;
        position: relative; overflow: hidden; border: 1px solid rgba(0,0,0,0.05);
      }
      body.dark-mode .debtor-card { background: #2d3748; border-color: #4a5568; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      .debtor-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; }
      .debtor-card.unpaid::before { background: linear-gradient(180deg,#DC2626,#EF4444); }
      .debtor-card.paid::before   { background: linear-gradient(180deg,#10B981,#34D399); }
      .debtor-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
      body.dark-mode .debtor-card:hover { box-shadow: 0 8px 20px rgba(0,0,0,0.3); }

      .debtor-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 2px solid #F3F4F6; }
      body.dark-mode .debtor-header { border-bottom-color: #4a5568; }
      .debtor-name { font-size: 1.2rem; font-weight: 700; color: #5D534A; }
      body.dark-mode .debtor-name { color: #f7fafc; }

      .status-badge { padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
      .badge-unpaid { background: #FEE2E2; color: #DC2626; }
      body.dark-mode .badge-unpaid { background: #4a2c2c; color: #fca5a5; }
      .badge-paid   { background: #D1FAE5; color: #059669; }
      body.dark-mode .badge-paid   { background: #1e3a2f; color: #6ee7b7; }

      .debtor-details { margin-bottom: 15px; }
      .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; }
      .detail-label { color: #6B7280; font-weight: 600; }
      body.dark-mode .detail-label { color: #a0aec0; }
      .detail-value { color: #5D534A; font-weight: 600; }
      body.dark-mode .detail-value { color: #e2e8f0; }

      .debtor-items { background: #F9FAFB; padding: 12px; border-radius: 10px; margin-bottom: 15px; border: 1px solid rgba(0,0,0,0.05); }
      body.dark-mode .debtor-items { background: #1a202c; border-color: #4a5568; }
      .items-label { font-size: 0.75rem; text-transform: uppercase; color: #6B7280; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px; }
      body.dark-mode .items-label { color: #a0aec0; }
      .items-list { color: #5D534A; font-size: 0.9rem; line-height: 1.5; }
      body.dark-mode .items-list { color: #e2e8f0; }

      .debtor-amount { font-size: 1.8rem; font-weight: 800; text-align: center; padding: 15px; border-radius: 10px; margin-bottom: 15px; }
      .debtor-amount-breakdown { padding: 14px 16px; border-radius: 10px; margin-bottom: 10px; }
      .breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 0.9rem; }
      .breakdown-label  { color: inherit; opacity: 0.75; font-weight: 600; }
      .breakdown-value  { font-weight: 700; }
      .surcharge-row .breakdown-label { opacity: 1; }
      .surcharge-value  { color: #F59E0B !important; }
      body.dark-mode .surcharge-value { color: #fbbf24 !important; }
      .breakdown-divider { border-top: 1px dashed currentColor; opacity: 0.25; margin: 6px 0; }
      .total-row        { padding-top: 4px; }
      .total-label-text { opacity: 1; font-weight: 800; font-size: 1rem; }
      .total-value      { font-size: 1.4rem; font-weight: 900; }

      .amount-unpaid { background: linear-gradient(135deg,#FEE2E2,#FECACA); color: #DC2626; }
      body.dark-mode .amount-unpaid { background: linear-gradient(135deg,#4a2c2c,#5c3535); color: #fca5a5; }
      .amount-paid   { background: linear-gradient(135deg,#D1FAE5,#A7F3D0); color: #059669; }
      body.dark-mode .amount-paid   { background: linear-gradient(135deg,#1e3a2f,#264536); color: #6ee7b7; }

      .surcharge-note { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; padding: 10px 14px; background: linear-gradient(135deg,#FFF7ED,#FEF3C7); border: 1px solid #FCD34D; border-left: 4px solid #F59E0B; border-radius: 10px; font-size: 13px; color: #92400E; font-weight: 600; line-height: 1.5; }
      body.dark-mode .surcharge-note { background: linear-gradient(135deg,rgba(245,158,11,0.12),rgba(251,191,36,0.08)); border-color: rgba(251,191,36,0.3); border-left-color: #F59E0B; color: #FCD34D; }
      .surcharge-note strong { color: #D97706; font-size: 14px; }
      body.dark-mode .surcharge-note strong { color: #FBBF24; }

      .debtor-actions { display: flex; gap: 10px; }
      .action-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 6px; }
      .btn-mark-paid { background: linear-gradient(135deg,#10B981,#059669); color: white; }
      .btn-mark-paid:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(16,185,129,0.3); }
      .btn-delete-debtor { background: linear-gradient(135deg,#EF4444,#DC2626); color: white; }
      .btn-delete-debtor:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(239,68,68,0.3); }

      .paid-info { text-align: center; padding: 12px; background: #ECFDF5; border-radius: 10px; color: #059669; font-weight: 600; font-size: 0.9rem; }
      body.dark-mode .paid-info { background: #1e3a2f; color: #6ee7b7; }
      .auto-delete-countdown { text-align: center; padding: 8px; background: #FEF3C7; border-radius: 8px; color: #92400E; font-weight: 600; font-size: 0.8rem; margin-top: 6px; }
      body.dark-mode .auto-delete-countdown { background: rgba(146,64,14,0.2); color: #FCD34D; }

      .no-data { text-align: center; padding: 60px 20px; background: linear-gradient(135deg,#F9FAFB,#F3F4F6); border-radius: 16px; color: #9CA3AF; font-size: 1.1rem; font-weight: 600; border: 1px solid rgba(0,0,0,0.05); }
      body.dark-mode .no-data { background: linear-gradient(135deg,#2d3748,#252d3d); color: #718096; border-color: #4a5568; }

      @media (max-width: 768px) {
        .debtors-grid { grid-template-columns: 1fr; }
        .debtor-actions { flex-direction: column; }
      }
      @media (max-width: 480px) {
        .summary-card { padding: 15px; } .card-icon { font-size: 1.8rem; margin-right: 12px; }
        .card-value { font-size: 1.3rem; } .debtor-card { padding: 15px; }
        .debtor-amount { font-size: 1.5rem; padding: 12px; } .total-value { font-size: 1.2rem; }
      }
    </style>
  `;
}

// =============================================================================
//  PART 3: EVENT LISTENERS
// =============================================================================

let selectedLoanProducts = [];
let allAvailableProducts = [];

function setupDebtorEventListeners() {
  document.querySelectorAll('.btn-mark-paid').forEach(btn => {
    btn.addEventListener('click', function() {
      markAsPaid(parseInt(this.getAttribute('data-debtor-id')));
    });
  });
  document.querySelectorAll('.btn-delete-debtor').forEach(btn => {
    btn.addEventListener('click', function() {
      deleteDebtor(parseInt(this.getAttribute('data-debtor-id')));
    });
  });
  const btnClearAllPaid = document.getElementById('btnClearAllPaid');
  if (btnClearAllPaid) btnClearAllPaid.addEventListener('click', clearAllPaidDebtors);
}

// =============================================================================
//  PART 3.5: CUSTOM CONFIRMATION MODAL
// =============================================================================

window.customConfirm = function(message, title = 'Confirm Action', options = {}) {
  return new Promise((resolve) => {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const overlay    = document.createElement('div');
    overlay.className = 'custom-confirm-overlay';

    const lines       = message.split('\n\n');
    const mainMessage = lines[0] || message;
    const details     = lines.slice(1).join('\n\n');

    overlay.innerHTML = `
      <div class="custom-confirm-modal">
        <div class="confirm-header">
          <span class="confirm-icon">${options.icon || '❓'}</span>
          <h3 class="confirm-title">${title}</h3>
        </div>
        <div class="confirm-body">
          <p class="confirm-main-message">${mainMessage.replace(/\n/g, '<br>')}</p>
          ${details ? `<div class="confirm-details">${details.replace(/\n/g, '<br>')}</div>` : ''}
        </div>
        <div class="confirm-actions">
          ${options.cancelText !== '' ? `
          <button class="confirm-btn confirm-btn-cancel" id="confirmCancel">
            <span class="btn-icon">✕</span>
            <span>${options.cancelText || 'Cancel'}</span>
          </button>` : ''}
          <button class="confirm-btn confirm-btn-ok" id="confirmOk">
            <span class="btn-icon">✓</span>
            <span>${options.okText || 'OK'}</span>
          </button>
        </div>
      </div>
      <style>
        .custom-confirm-overlay { position:fixed;top:0;left:0;right:0;bottom:0;background:${isDarkMode?'rgba(0,0,0,0.8)':'rgba(0,0,0,0.6)'};backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:10000;animation:confirmFadeIn 0.25s ease-out; }
        @keyframes confirmFadeIn  { from{opacity:0}to{opacity:1} }
        @keyframes confirmFadeOut { from{opacity:1}to{opacity:0} }
        @keyframes confirmSlideUp { from{transform:translateY(30px) scale(0.95);opacity:0}to{transform:translateY(0) scale(1);opacity:1} }
        .custom-confirm-modal { background:${isDarkMode?'linear-gradient(145deg,#1e2530,#171c24)':'linear-gradient(145deg,#ffffff,#f8f9fa)'};border:1px solid ${isDarkMode?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)'};border-radius:24px;box-shadow:${isDarkMode?'0 25px 80px rgba(0,0,0,0.6)':'0 25px 60px rgba(0,0,0,0.2)'};max-width:500px;width:90%;overflow:hidden;animation:confirmSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1); }
        .confirm-header { background:${isDarkMode?'linear-gradient(135deg,#2d4a3e,#1e3a2f)':'linear-gradient(135deg,#87B382,#689962)'};padding:25px 30px;display:flex;align-items:center;gap:15px;border-bottom:1px solid ${isDarkMode?'rgba(255,255,255,0.05)':'transparent'}; }
        .confirm-icon { font-size:2.5rem; }
        .confirm-title { color:${isDarkMode?'#e8f5e9':'white'};font-size:1.4rem;font-weight:700;margin:0;font-family:'Quicksand',sans-serif; }
        .confirm-body { padding:30px; }
        .confirm-main-message { font-size:1.1rem;color:${isDarkMode?'#e2e8f0':'#374151'};line-height:1.6;margin:0 0 15px 0;font-weight:600; }
        .confirm-details { background:${isDarkMode?'rgba(255,255,255,0.04)':'#F9FAFB'};padding:20px;border-radius:12px;border-left:4px solid ${isDarkMode?'#4ade80':'#87B382'};margin-top:15px;font-size:0.95rem;color:${isDarkMode?'#a0aec0':'#6B7280'};line-height:1.8;white-space:pre-line; }
        .confirm-actions { display:flex;gap:12px;padding:0 30px 30px 30px; }
        .confirm-btn { flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:15px 25px;border:none;border-radius:14px;font-size:1rem;font-weight:700;font-family:'Quicksand',sans-serif;cursor:pointer;transition:all 0.3s; }
        .confirm-btn:hover { transform:translateY(-3px); }
        .confirm-btn-cancel { background:${isDarkMode?'linear-gradient(135deg,#4a2c2c,#3a2020)':'linear-gradient(135deg,#FEE2E2,#FECACA)'};color:${isDarkMode?'#f87171':'#DC2626'};border:1px solid ${isDarkMode?'rgba(248,113,113,0.3)':'#fca5a5'}; }
        .confirm-btn-ok { background:${isDarkMode?'linear-gradient(135deg,#22c55e,#16a34a)':'linear-gradient(135deg,#87B382,#689962)'};color:white; }
        .confirm-btn .btn-icon { font-size:1.2rem; }
        @media(max-width:600px) { .confirm-actions { flex-direction:column;padding:0 20px 20px; } }
      </style>
    `;

    document.body.appendChild(overlay);
    const btnOk     = overlay.querySelector('#confirmOk');
    const btnCancel = overlay.querySelector('#confirmCancel');
    const cleanup   = (result) => {
      overlay.style.animation = 'confirmFadeOut 0.2s ease-out forwards';
      setTimeout(() => { if (document.body.contains(overlay)) document.body.removeChild(overlay); resolve(result); }, 200);
    };
    btnOk.addEventListener('click', () => cleanup(true));
    if (btnCancel) btnCancel.addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
    const handleEsc = (e) => { if (e.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', handleEsc); } };
    document.addEventListener('keydown', handleEsc);
    setTimeout(() => btnOk.focus(), 100);
  });
};

// =============================================================================
//  PART 4: ADD DEBTOR (kept for external calls via cart)
// =============================================================================

async function addDebtor() {
  const customerName = document.getElementById('debtorCustomerName')?.value.trim();
  const contact      = document.getElementById('debtorContact')?.value.trim() || '';

  if (!customerName) { alert('⚠️ Please enter customer name!'); return; }
  if (selectedLoanProducts.length === 0) { alert('⚠️ Please select at least one product!'); return; }

  let subtotal = 0;
  selectedLoanProducts.forEach(item => { subtotal += item.price * item.quantity; });
  subtotal = parseFloat(subtotal.toFixed(2));

  const surchargePercent = parseFloat(window.storeSettings?.debtSurcharge || 0);
  const surchargeAmount  = parseFloat(((surchargePercent / 100) * subtotal).toFixed(2));
  const grandTotal       = parseFloat((subtotal + surchargeAmount).toFixed(2));

  const now = new Date();
  const dateTime = now.toLocaleString('en-US', { year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true });
  const itemsList = selectedLoanProducts.map(p => `${p.name} (×${p.quantity})`).join(', ');
  const amountLine = surchargePercent > 0
    ? `Subtotal: ₱${subtotal.toFixed(2)}\nSurcharge (${surchargePercent}%): +₱${surchargeAmount.toFixed(2)}\nTotal: ₱${grandTotal.toFixed(2)}`
    : `Total Amount: ₱${grandTotal.toFixed(2)}`;

  const confirmed = await customConfirm(
    `Add debtor with the following details?\n\nCustomer: ${customerName}\nContact: ${contact || 'N/A'}\nItems: ${itemsList}\n${amountLine}\nDate & Time: ${dateTime}`,
    'Add New Debtor', { icon:'👤', okText:'Add Debtor', cancelText:'Cancel' }
  );
  if (!confirmed) return;

  try {
    const productsList = await DB.getProducts();
    for (const item of selectedLoanProducts) {
      const product = productsList.find(p => p.id === item.id);
      if (product) {
        const newQty = parseFloat(product.quantity || 0) - item.quantity;
        if (newQty < 0) { alert(`⚠️ Insufficient stock for ${product.name}!`); return; }
        await DB.updateProduct(item.id, { quantity: newQty });
      }
    }

    await DB.addDebtor({
      name: customerName, contact,
      items: selectedLoanProducts.map(item => ({ product_id:item.id, name:item.name, price:item.price, cost:item.cost, quantity:item.quantity })),
      original_total: subtotal, surcharge_percent: surchargePercent,
      surcharge_amount: surchargeAmount, total_debt: grandTotal,
      date_borrowed: new Date().toISOString(), paid: false
    });

    await renderDebtors();
    if (typeof renderProfit === 'function') await renderProfit();
    if (typeof renderSales  === 'function') await renderSales();

    const successAmount = surchargePercent > 0
      ? `₱${subtotal.toFixed(2)} + ₱${surchargeAmount.toFixed(2)} surcharge = ₱${grandTotal.toFixed(2)}`
      : `₱${grandTotal.toFixed(2)}`;
    await customConfirm(`Debtor successfully added!\n\nCustomer: ${customerName}\nAmount: ${successAmount}`, 'Debtor Added', { icon:'✅', okText:'Great!', cancelText:'' });

  } catch (error) {
    console.error('Error adding debtor:', error);
    alert(`❌ Failed to add debtor: ${error.message}`);
    try {
      const productsList = await DB.getProducts();
      for (const item of selectedLoanProducts) {
        const product = productsList.find(p => p.id === item.id);
        if (product) await DB.updateProduct(item.id, { quantity: parseFloat(product.quantity || 0) + item.quantity });
      }
    } catch (restoreError) { console.error('Failed to restore product quantities:', restoreError); }
  }
}

// =============================================================================
//  PART 5: MARK AS PAID & DELETE
// =============================================================================

async function markAsPaid(debtorId) {
  try {
    const debtors = await DB.getDebtors();
    const debtor  = debtors.find(d => d.id === debtorId);
    if (!debtor) { alert('⚠️ Debtor not found!'); return; }

    const amount       = parseFloat(debtor.total_debt || 0);
    const customerName = debtor.name || 'Unknown';

    const confirmed = await customConfirm(
      `Mark this debt as paid?\n\nCustomer: ${customerName}\nAmount: ₱${amount.toFixed(2)}\n\nThis will record the payment and move it to paid debts.`,
      'Mark Debt as Paid', { icon:'💰', okText:'Mark as Paid', cancelText:'Cancel' }
    );
    if (!confirmed) return;

    await DB.updateDebtor(debtorId, { paid: true, date_paid: new Date().toISOString() });

    const items = debtor.items || [];
    let totalProfit = 0;
    const saleItems = items.map(item => {
      const price = parseFloat(item.price || 0), cost = parseFloat(item.cost || 0), qty = parseFloat(item.quantity || 0);
      totalProfit += (price - cost) * qty;
      return { product_id: item.product_id || item.product || item.id || null, name: item.name || item.product_name || '', quantity: qty, price, cost };
    });

    try { await DB.addSale({ total: amount, profit: totalProfit, payment_method: 'credit-paid', items: saleItems }); }
    catch (saleError) { console.error('Error creating sale record:', saleError); }

    await renderDebtors();
    if (typeof renderProfit === 'function') await renderProfit();
    if (typeof renderSales  === 'function') await renderSales();

    await customConfirm(`Debt successfully marked as paid!\n\nCustomer: ${customerName}\nAmount: ₱${amount.toFixed(2)}`, 'Payment Recorded', { icon:'✅', okText:'Great!', cancelText:'' });

  } catch (error) {
    console.error('Error marking as paid:', error);
    try {
      const refreshed = await DB.getDebtors();
      const isNowPaid = refreshed.find(d => d.id === debtorId)?.paid;
      if (isNowPaid) { await renderDebtors(); if (typeof renderProfit === 'function') await renderProfit(); if (typeof renderSales === 'function') await renderSales(); }
      else alert(`❌ Failed to mark as paid: ${error.message}`);
    } catch { alert(`❌ Failed to mark as paid: ${error.message}`); }
  }
}

async function deleteDebtor(debtorId) {
  try {
    const debtors = await DB.getDebtors();
    const debtor  = debtors.find(d => d.id === debtorId);
    if (!debtor) { alert('⚠️ Debtor not found!'); return; }

    const amount       = parseFloat(debtor.total_debt || 0);
    const customerName = debtor.name || 'Unknown';
    const isPaid       = debtor.paid || false;

    const confirmed = await customConfirm(
      `Are you sure you want to delete this debt record?\n\nCustomer: ${customerName}\nAmount: ₱${amount.toFixed(2)}\nStatus: ${isPaid ? 'Paid' : 'Unpaid'}\n\n${!isPaid ? '⚠️ WARNING: This debt is unpaid! The loaned items will NOT be returned to inventory automatically.\n\n' : ''}This action cannot be undone!`,
      'Delete Debt Record', { icon:'🗑️', okText:'Delete', cancelText:'Keep It' }
    );
    if (!confirmed) return;

    let returnToInventory = false;
    if (!isPaid) {
      returnToInventory = await customConfirm(
        `Do you want to return the loaned items back to inventory?\n\nClick "Return Items" to restore stock.\nClick "Don't Return" to keep inventory as is.`,
        'Return Items to Inventory?', { icon:'📦', okText:'Return Items', cancelText:"Don't Return" }
      );
    }

    if (returnToInventory && !isPaid) {
      const products = await DB.getProducts();
      for (const item of (debtor.items || [])) {
        const productId = item.product || item.product_id;
        const product   = products.find(p => p.id === productId);
        if (product) await DB.updateProduct(productId, { quantity: parseFloat(product.quantity || 0) + parseFloat(item.quantity || 0) });
      }
    }

    await DB.deleteDebtor(debtorId);
    await renderDebtors();
    if (returnToInventory && typeof renderInventory === 'function') await renderInventory();

    await customConfirm(
      returnToInventory ? `Debt record deleted and items returned to inventory!\n\nCustomer: ${customerName}` : `Debt record deleted.\n\nCustomer: ${customerName}`,
      'Record Deleted', { icon:'✅', okText:'Done', cancelText:'' }
    );

  } catch (error) {
    console.error('Error deleting debtor:', error);
    alert(`❌ Failed to delete debtor: ${error.message}`);
  }
}

async function clearAllPaidDebtors() {
  try {
    const debtors     = await DB.getDebtors();
    const paidDebtors = debtors.filter(d => d.paid);
    if (paidDebtors.length === 0) { await customConfirm('There are no paid debts to clear.', 'Nothing to Clear', { icon:'📭', okText:'OK', cancelText:'' }); return; }

    const confirmed = await customConfirm(
      `Are you sure you want to delete all ${paidDebtors.length} paid debt record${paidDebtors.length !== 1 ? 's' : ''}?\n\nThis action cannot be undone!`,
      'Clear All Paid Debts', { icon:'🧹', okText:'Clear All', cancelText:'Cancel' }
    );
    if (!confirmed) return;

    await DB.clearPaidDebtors();
    await renderDebtors();
    await customConfirm(`Successfully cleared ${paidDebtors.length} paid debt record${paidDebtors.length !== 1 ? 's' : ''}.`, 'Cleared!', { icon:'✅', okText:'Done', cancelText:'' });
  } catch (error) {
    console.error('Error clearing paid debtors:', error);
    alert(`❌ Failed to clear paid debtors: ${error.message}`);
  }
}

// =============================================================================
//  EXPORTS
// =============================================================================

window.addDebtor           = addDebtor;
window.markAsPaid          = markAsPaid;
window.deleteDebtor        = deleteDebtor;
window.clearAllPaidDebtors = clearAllPaidDebtors;

console.log('✅ debtors.js loaded — hide/show toggles, Add New Debtor section removed.');