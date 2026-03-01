/**
 * debtors.js — Complete with GLASSMORPHIC NEOMORPHIC styling + FUNCTIONAL implementations
 */

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

    let totalOutstanding = 0; unpaidDebtors.forEach(d => { totalOutstanding += parseFloat(d.total_debt || 0); });
    let totalCollected   = 0; paidDebtors.forEach(d   => { totalCollected   += parseFloat(d.total_debt || 0); });
    let surchargeCollected = 0; paidDebtors.forEach(d  => { surchargeCollected += parseFloat(d.surcharge_amount || 0); });
    let surchargePending   = 0; unpaidDebtors.forEach(d => { surchargePending   += parseFloat(d.surcharge_amount || 0); });
    const highestDebt     = unpaidDebtors.length > 0 ? Math.max(...unpaidDebtors.map(d => parseFloat(d.total_debt || 0))) : 0;
    const totalEverLoaned = totalOutstanding + totalCollected;
    const collectionRate  = totalEverLoaned > 0 ? Math.round((totalCollected / totalEverLoaned) * 100) : 0;

    let html = `
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

      <!-- ⚠️ WARNING BANNER -->
      <div class="debt-warning-banner">
        <span class="debt-warning-icon">⚠️</span>
        <div class="debt-warning-body">
          <div class="debt-warning-title">Stats Will Reset on Deletion</div>
          <div class="debt-warning-text">
            Deleting <strong>paid</strong> or <strong>unpaid</strong> debt records will permanently reset the summary cards above
            (Total Outstanding, Total Collected, Collection Rate, Surcharge totals, and Highest Unpaid Debt).
            Debt payments are still recorded in the <strong>Calendar</strong>, but these cards will reflect zero until new debts are added.
          </div>
        </div>
      </div>

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
        <div class="debtor-card-inner">
          <div class="debtor-header">
            <div class="debtor-name">${customerName}</div>
            <span class="status-badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}">
              ${isPaid ? '✓ PAID' : '⚠ UNPAID'}
            </span>
          </div>
          <div class="debtor-details">
            <div class="detail-row"><span class="detail-label">📅 Date:</span><span class="detail-value">${formattedDate}</span></div>
            <div class="detail-row"><span class="detail-label">🕐 Time:</span><span class="detail-value">${formattedTime}</span></div>
          </div>
          <div class="debtor-items">
            <div class="items-label">Items:</div>
            <div class="items-list">${itemsList}</div>
          </div>
          <div class="debtor-amount ${isPaid ? 'amount-paid' : 'amount-unpaid'}">
            ₱${totalDebt.toFixed(2)}
          </div>
          <div class="debtor-amount-breakdown ${isPaid ? 'amount-paid' : 'amount-unpaid'}">
            <div class="breakdown-row"><span class="breakdown-label">Original:</span><span class="breakdown-value">₱${originalTotal.toFixed(2)}</span></div>
            ${hasSurcharge ? `<div class="breakdown-row surcharge-row"><span class="breakdown-label">Surcharge (${surchargeP}%):</span><span class="breakdown-value surcharge-value">₱${surchargeAmt.toFixed(2)}</span></div>` : ''}
            <div class="breakdown-divider"></div>
            <div class="breakdown-row total-row"><span class="total-label-text">Total Debt:</span><span class="total-value">₱${totalDebt.toFixed(2)}</span></div>
          </div>
          ${hasSurcharge ? `<div class="surcharge-note"><strong>⚡ Surcharge:</strong> This debt includes a ${surchargeP}% surcharge.</div>` : ''}
          <div class="debtor-actions">
            ${isPaid
              ? `<div class="paid-info">Paid on ${debtor.date_paid ? new Date(debtor.date_paid).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</div>`
              : `<button class="action-btn btn-mark-paid" data-debtor-id="${debtor.id}"><span>✅</span>Mark as Paid</button>`
            }
            <button class="action-btn btn-delete-debtor" data-debtor-id="${debtor.id}"><span>🗑️</span>Delete</button>
          </div>
          ${isPaid && debtor.date_paid ? `<div class="auto-delete-countdown">Auto-deletes after 7 days</div>` : ''}
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

function getDebtorStyles() {
  return `
    <style>
      .debtors-summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
      @media (max-width: 900px) { .debtors-summary-cards { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 560px) { .debtors-summary-cards { grid-template-columns: 1fr; } }

      /* ── Warning Banner ── */
      .debt-warning-banner {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 28px;
        padding: 14px 18px;
        background: linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.10));
        border: 1.5px solid rgba(245,158,11,0.45);
        border-left: 5px solid #f59e0b;
        border-radius: 14px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      .debt-warning-icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
      .debt-warning-body { flex: 1; }
      .debt-warning-title {
        font-size: 13px;
        font-weight: 800;
        color: #92400e;
        margin-bottom: 4px;
        letter-spacing: 0.3px;
      }
      .debt-warning-text {
        font-size: 12px;
        color: #78350f;
        line-height: 1.65;
      }
      .debt-warning-text strong { color: #92400e; }

      body.dark-mode .debt-warning-banner {
        background: linear-gradient(135deg, rgba(120,80,0,0.25), rgba(100,60,0,0.15));
        border-color: rgba(245,158,11,0.35);
        border-left-color: #f59e0b;
      }
      body.dark-mode .debt-warning-title { color: #fcd34d; }
      body.dark-mode .debt-warning-text  { color: #fde68a; }
      body.dark-mode .debt-warning-text strong { color: #fbbf24; }

      .summary-card {
        border-radius: 20px; padding: 18px 20px; position: relative; overflow: hidden;
        transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease;
        display: flex; align-items: flex-start; gap: 12px;
        backdrop-filter: blur(18px) saturate(1.6); -webkit-backdrop-filter: blur(18px) saturate(1.6);
        border: 1.5px solid rgba(255,255,255,0.55);
        box-shadow: 0 8px 32px rgba(80,140,75,0.22), 0 2px 8px rgba(80,140,75,0.12), 0 -2px 0 rgba(255,255,255,0.9) inset, 0 1px 0 rgba(80,140,75,0.15) inset;
      }
      .summary-card::before { content: ''; position: absolute; inset: 0; border-radius: 20px; background: linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 40%, transparent 70%); pointer-events: none; z-index: 0; }
      .summary-card::after { content: ''; position: absolute; top: 0; left: 20px; right: 20px; height: 2px; border-radius: 0 0 4px 4px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent); z-index: 0; }
      .summary-card:hover { transform: translateY(-6px) scale(1.01); box-shadow: 0 16px 48px rgba(80,140,75,0.28), 0 4px 14px rgba(80,140,75,0.16), 0 -2px 0 rgba(255,255,255,0.95) inset; }

      .card-icon { font-size: 2rem; flex-shrink: 0; position: relative; z-index: 1; line-height: 1; }
      .card-content { flex: 1; min-width: 0; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 3px; }
      .card-label { font-size: 0.64rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; opacity: 0.75; line-height: 1.1; }
      .card-value { font-size: 1.4rem; font-weight: 800; line-height: 1.1; letter-spacing: -0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.08); }
      .card-sub { font-size: 0.68rem; font-weight: 600; opacity: 0.65; line-height: 1.2; }

      .debt-card-red { background: linear-gradient(135deg, #d4e09b 0%, #c5d68d 100%); border-color: #c0cf88; }
      .debt-card-red .card-label, .debt-card-red .card-sub { color: #4a5a2a; }
      .debt-card-red .card-value { color: #3d4a23; }

      .debt-card-green { background: linear-gradient(135deg, #cbdfbd 0%, #bdd4ae 100%); border-color: #b5cca8; }
      .debt-card-green .card-label, .debt-card-green .card-sub { color: #3e5235; }
      .debt-card-green .card-value { color: #32422b; }

      .debt-card-blue { background: linear-gradient(135deg, #f6f4d2 0%, #eee9c4 100%); border-color: #e5e0ba; }
      .debt-card-blue .card-label, .debt-card-blue .card-sub { color: #6b6438; }
      .debt-card-blue .card-value { color: #5a5230; }

      .debt-card-amber { background: linear-gradient(135deg, #f6e4d8 0%, #f0d9cc 100%); border-color: #e8d0c0; }
      .debt-card-amber .card-label, .debt-card-amber .card-sub { color: #8a6a55; }
      .debt-card-amber .card-value { color: #6b5245; }

      .debt-card-orange { background: linear-gradient(135deg, #f5e8d4 0%, #efdcc0 100%); border-color: #e8dcc8; }
      .debt-card-orange .card-label, .debt-card-orange .card-sub { color: #8a7050; }
      .debt-card-orange .card-value { color: #6a5840; }

      .debt-card-purple { background: linear-gradient(135deg, #f6e4d8 0%, #f0d9cc 100%); border-color: #e8d0c0; }
      .debt-card-purple .card-label, .debt-card-purple .card-sub { color: #8a6a55; }
      .debt-card-purple .card-value { color: #6b5245; }

      .debtors-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
      .debtor-card { border-radius: 20px; overflow: hidden; position: relative; transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease; backdrop-filter: blur(16px) saturate(1.5); -webkit-backdrop-filter: blur(16px) saturate(1.5); border: 1.5px solid rgba(255,255,255,0.5); box-shadow: 0 8px 32px rgba(80,140,75,0.18), 0 2px 8px rgba(80,140,75,0.1), 0 -1px 0 rgba(255,255,255,0.8) inset; }
      .debtor-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; z-index: 2; }
      .debtor-card.unpaid::before { background: linear-gradient(180deg, #e74c3c, #c41e3a); }
      .debtor-card.paid::before { background: linear-gradient(180deg, #7db89f, #a8d4ba); }
      .debtor-card-inner { padding: 18px; position: relative; z-index: 1; background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 50%); }
      .debtor-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1.5px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent); z-index: 1; pointer-events: none; }
      .debtor-card:hover { transform: translateY(-6px) scale(1.01); box-shadow: 0 14px 40px rgba(80,140,75,0.24), 0 4px 12px rgba(80,140,75,0.12), 0 -1px 0 rgba(255,255,255,0.9) inset; }

      .debtor-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.6); position: relative; z-index: 2; }
      .debtor-name { font-size: 1.1rem; font-weight: 700; color: #2d3748; }
      .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
      .badge-unpaid { background: linear-gradient(135deg, #e74c3c, #c41e3a); color: #ffffff; border: 1px solid rgba(231,76,60,0.6); }
      .badge-paid { background: linear-gradient(135deg, #c8efd9, #a8e6c8); color: #2d5238; border: 1px solid rgba(255,255,255,0.6); }

      .debtor-details { margin-bottom: 12px; position: relative; z-index: 2; }
      .detail-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.85rem; }
      .detail-label { color: #6a7a6a; font-weight: 600; }
      .detail-value { color: #2d3748; font-weight: 600; }

      .debtor-items { background: rgba(255,255,255,0.4); backdrop-filter: blur(8px); padding: 10px; border-radius: 10px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.5); position: relative; z-index: 2; }
      .items-label { font-size: 0.7rem; text-transform: uppercase; color: #6a7a6a; font-weight: 700; margin-bottom: 5px; letter-spacing: 0.5px; }
      .items-list { color: #2d3748; font-size: 0.85rem; line-height: 1.4; }

      .debtor-amount { font-size: 1.6rem; font-weight: 800; text-align: center; padding: 14px; border-radius: 10px; margin-bottom: 12px; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.5); position: relative; z-index: 2; }
      .amount-unpaid { background: linear-gradient(135deg, #e74c3c, #c41e3a); color: #ffffff; }
      .amount-paid { background: linear-gradient(135deg, #c8efd9, #a8e6c8); color: #2d5238; }

      .debtor-amount-breakdown { padding: 12px; border-radius: 10px; margin-bottom: 10px; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.5); position: relative; z-index: 2; }
      .amount-unpaid.debtor-amount-breakdown { background: linear-gradient(135deg, #e74c3c, #c41e3a); color: #ffffff; }
      .amount-paid.debtor-amount-breakdown { background: linear-gradient(135deg, #c8efd9, #a8e6c8); }

      .breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 0.9rem; }
      .breakdown-label { color: inherit; opacity: 0.8; font-weight: 600; }
      .breakdown-value { font-weight: 700; }
      .surcharge-row .breakdown-label { opacity: 1; }
      .surcharge-value { color: #d4945c !important; font-weight: 700; }
      .breakdown-divider { border-top: 1px dashed currentColor; opacity: 0.25; margin: 6px 0; }
      .total-row { padding-top: 4px; }
      .total-label-text { opacity: 1; font-weight: 800; font-size: 1rem; }
      .total-value { font-size: 1.3rem; font-weight: 900; }

      .surcharge-note { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; padding: 10px 12px; background: linear-gradient(135deg, #fff5eb, #fef3c7); border: 1px solid rgba(253,230,138,0.6); border-left: 4px solid #ddb74a; border-radius: 8px; font-size: 12px; color: #8a6a30; font-weight: 600; line-height: 1.4; position: relative; z-index: 2; }
      .surcharge-note strong { color: #b67a2a; font-size: 13px; }

      .debtor-actions { display: flex; gap: 10px; position: relative; z-index: 3; }
      .action-btn { flex: 1; padding: 11px; border: none; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 5px; backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.5); position: relative; z-index: 3; }
      .btn-mark-paid { background: linear-gradient(135deg, #a8d4ba, #98c8aa); color: #2d5238; }
      .btn-mark-paid:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(125,184,159,0.25); }
      .btn-delete-debtor { background: linear-gradient(135deg, #e74c3c, #c41e3a); color: #ffffff; border: 1px solid rgba(231,76,60,0.4); }
      .btn-delete-debtor:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(231,76,60,0.3); }

      .paid-info { text-align: center; padding: 11px; background: linear-gradient(135deg, #c8efd9, #a8e6c8); border-radius: 8px; color: #2d5238; font-weight: 600; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.5); backdrop-filter: blur(6px); position: relative; z-index: 2; }
      .auto-delete-countdown { text-align: center; padding: 8px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 8px; color: #8a6a30; font-weight: 600; font-size: 0.75rem; margin-top: 8px; border: 1px solid rgba(253,230,138,0.6); position: relative; z-index: 2; }

      .section-header-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
      .toggle-section-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: 20px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Quicksand', sans-serif; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.12); position: relative; z-index: 10; }
      .toggle-btn-red { background: linear-gradient(135deg, #e74c3c, #c41e3a); color: #ffffff; border: 1px solid rgba(231,76,60,0.4); }
      .toggle-btn-green { background: linear-gradient(135deg, #a8d4ba, #98c8aa); color: #2d5238; }

      .btn-clear-paid { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: linear-gradient(135deg, #e74c3c, #c41e3a); color: #ffffff; border: 1px solid rgba(231,76,60,0.4); border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.3s ease; font-family: 'Quicksand', sans-serif; position: relative; z-index: 10; }
      .btn-clear-paid:hover { background: linear-gradient(135deg, #c41e3a, #a61828); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(231,76,60,0.3); }

      .auto-delete-notice { font-size: 12px; color: #6a8060; margin: 8px 0 12px 0; padding: 8px 12px; background: rgba(216,243,230,0.5); border-radius: 8px; border-left: 3px solid #a8d4ba; font-style: italic; backdrop-filter: blur(4px); position: relative; z-index: 2; }

      .modern-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border: none; border-radius: 12px; font-size: 0.95rem; font-weight: 700; font-family: 'Quicksand', sans-serif; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 3px 8px rgba(0,0,0,0.1); }

      .debts-section { margin-bottom: 36px; }
      .section-header { font-size: 1.2rem; font-weight: 700; color: #2d3748; display: flex; align-items: center; gap: 10px; }
      .unpaid-header { color: #c95a6a; }
      .paid-header { color: #4a8a6a; }

      .no-data { text-align: center; padding: 48px 20px; background: rgba(248,248,248,0.6); border-radius: 12px; color: #a0a0a0; font-size: 1rem; font-weight: 600; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.5); }

      @media (max-width: 768px) {
        .debtors-grid { grid-template-columns: 1fr; }
        .debtor-actions { flex-direction: column; }
        .summary-card { padding: 15px 16px; gap: 10px; }
        .card-icon { font-size: 1.8rem; }
        .card-value { font-size: 1.2rem; }
        .debt-warning-banner { padding: 12px 14px; gap: 10px; }
        .debt-warning-icon { font-size: 18px; }
        .debt-warning-title { font-size: 12px; }
        .debt-warning-text { font-size: 11px; }
      }
    </style>
  `;
}

function setupDebtorEventListeners() {
  document.querySelectorAll('.btn-mark-paid').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const debtorId = parseInt(this.getAttribute('data-debtor-id'));
      console.log('Mark as paid clicked:', debtorId);
      markAsPaid(debtorId);
    });
  });
  document.querySelectorAll('.btn-delete-debtor').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const debtorId = parseInt(this.getAttribute('data-debtor-id'));
      console.log('Delete clicked:', debtorId);
      deleteDebtor(debtorId);
    });
  });
  const btnClearAllPaid = document.getElementById('btnClearAllPaid');
  if (btnClearAllPaid) {
    btnClearAllPaid.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Clear all paid clicked');
      clearAllPaidDebtors();
    });
  }
}

// ─── FUNCTIONAL IMPLEMENTATIONS ───────────────────────────────────────────────

async function markAsPaid(debtorId) {
  try {
    const debtors = await DB.getDebtors();
    const debtor  = debtors.find(d => parseInt(d.id) === parseInt(debtorId));
    if (!debtor) { alert('⚠️ Debtor not found!'); return; }

    const amount       = parseFloat(debtor.total_debt || 0);
    const customerName = debtor.name || 'Unknown';

    const confirmed = await showModernConfirm(
      `Mark this debt as paid?\n\nCustomer: ${customerName}\nAmount: ₱${amount.toFixed(2)}\n\nThis will record the payment and move it to paid debts.`,
      '💰',
      'Yes'
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

    try { await DB.addSale({ total: amount, profit: totalProfit, payment_method: 'credit-paid', customer_name: customerName, items: saleItems }); }
    catch (saleError) { console.error('Error creating sale record:', saleError); }

    await renderDebtors();
    if (typeof renderProfit === 'function') await renderProfit();
    if (typeof renderSales  === 'function') await renderSales();

    await showModernAlert(`Debt successfully marked as paid!\n\nCustomer: ${customerName}\nAmount: ₱${amount.toFixed(2)}`, '✅');

  } catch (error) {
    console.error('Error marking as paid:', error);
    await showModernAlert(`Failed to mark as paid: ${error.message}`, '❌');
  }
}

async function deleteDebtor(debtorId) {
  try {
    const debtors = await DB.getDebtors();
    const debtor  = debtors.find(d => parseInt(d.id) === parseInt(debtorId));
    if (!debtor) { alert('⚠️ Debtor not found!'); return; }

    const amount       = parseFloat(debtor.total_debt || 0);
    const customerName = debtor.name || 'Unknown';
    const isPaid       = debtor.paid || false;

    const confirmed = await showModernConfirm(
      `Are you sure you want to delete this debt record?\n\nCustomer: ${customerName}\nAmount: ₱${amount.toFixed(2)}\nStatus: ${isPaid ? 'Paid' : 'Unpaid'}\n\n${!isPaid ? '⚠️ WARNING: This debt is unpaid! The loaned items will NOT be returned to inventory automatically.\n\n' : ''}This action cannot be undone!`,
      '🗑️',
      'Yes'
    );
    if (!confirmed) return;

    let returnToInventory = false;
    if (!isPaid) {
      returnToInventory = await showModernConfirm(
        `Do you want to return the loaned items back to inventory?\n\nClick "Confirm" to restore stock.\nClick "Cancel" to keep inventory as is.`,
        '📦',
        'Confirm'
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

    await showModernAlert(
      returnToInventory
        ? `Debt record deleted and items returned to inventory!\n\nCustomer: ${customerName}`
        : `Debt record deleted.\n\nCustomer: ${customerName}`,
      '✅'
    );

  } catch (error) {
    console.error('Error deleting debtor:', error);
    await showModernAlert(`Failed to delete debtor: ${error.message}`, '❌');
  }
}

async function clearAllPaidDebtors() {
  try {
    const debtors     = await DB.getDebtors();
    const paidDebtors = debtors.filter(d => d.paid);
    if (paidDebtors.length === 0) { await showModernAlert('There are no paid debts to clear.', '📭'); return; }

    const confirmed = await showModernConfirm(
      `Are you sure you want to delete all ${paidDebtors.length} paid debt record${paidDebtors.length !== 1 ? 's' : ''}?\n\nThis action cannot be undone!`,
      '🧹',
      'Yes'
    );
    if (!confirmed) return;

    await DB.clearPaidDebtors();
    await renderDebtors();
    await showModernAlert(`Successfully cleared ${paidDebtors.length} paid debt record${paidDebtors.length !== 1 ? 's' : ''}.`, '✅');
  } catch (error) {
    console.error('Error clearing paid debtors:', error);
    await showModernAlert(`Failed to clear paid debtors: ${error.message}`, '❌');
  }
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
window.renderDebtors       = renderDebtors;
window.markAsPaid          = markAsPaid;
window.deleteDebtor        = deleteDebtor;
window.clearAllPaidDebtors = clearAllPaidDebtors;
window.toggleDebtSection   = toggleDebtSection;

console.log('✅ debtors.js loaded — FULLY FUNCTIONAL + GLASSMORPHIC');