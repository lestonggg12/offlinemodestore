console.log('💰 Loading profit module (FIXED VERSION)...');



async function renderProfit() {
  const content = document.getElementById('profitContent');
  
  content.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="font-size: 48px; animation: spin 1s linear infinite;">⏳</div>
      <p style="color: #666; margin-top: 10px;">Loading sales data...</p>
    </div>
    <style>
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    </style>
  `;

  try {
    const periods = await DB.getPeriodTotals();
    const products = await DB.getProducts();
    const sales = await DB.getSales();

    console.log('📊 Period data:', periods);

    let potentialProfit = 0;
    products.forEach(product => {
      const price    = parseFloat(product.price    || product.selling_price) || 0;
      const cost     = parseFloat(product.cost     || product.cost_price)    || 0;
      const quantity = parseFloat(product.quantity || product.stock)         || 0;
      potentialProfit += (price - cost) * quantity;
    });

    let html = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: var(--text-primary, #5D534A); margin-bottom: 8px; font-size: 1.8rem;">📊 Sales Performance</h2>
        <p style="color: var(--text-secondary, #9E9382); font-size: 14px;">Period totals update automatically at midnight</p>
      </div>

      <div class="period-section">
        <h3 style="color: var(--text-primary, #5D534A); margin-bottom: 20px; font-size: 1.2rem; font-weight: 700;">💰 Today's Sales</h3>
        <div class="profit-summary">
          ${renderPeriodCard('🍃 TODAY\'S PERFORMANCE','today',periods.today.revenue,periods.today.profit,periods.today.sales_count,periods.today.has_data)}
        </div>
      </div>

      <div class="period-section">
        <h3 style="color: var(--text-primary, #5D534A); margin: 30px 0 20px 0; font-size: 1.2rem; font-weight: 700;">📅 Yesterday's Sales</h3>
        <div class="profit-summary">
          ${renderPeriodCard('🍂 YESTERDAY\'S PERFORMANCE','yesterday',periods.yesterday.revenue,periods.yesterday.profit,periods.yesterday.sales_count,periods.yesterday.has_data,periods.yesterday.period_start,periods.yesterday.period_end)}
        </div>
      </div>

      <div class="period-section">
        <h3 style="color: var(--text-primary, #5D534A); margin: 30px 0 20px 0; font-size: 1.2rem; font-weight: 700;">📊 Last Week's Sales</h3>
        <div class="profit-summary">
          ${renderPeriodCard('🌿 LAST WEEK\'S PERFORMANCE','week',periods.last_week.revenue,periods.last_week.profit,periods.last_week.sales_count,periods.last_week.has_data,periods.last_week.period_start,periods.last_week.period_end,periods.last_week.visibility_start,periods.last_week.visibility_end)}
        </div>
      </div>

      <div class="period-section">
        <h3 style="color: var(--text-primary, #5D534A); margin: 30px 0 20px 0; font-size: 1.2rem; font-weight: 700;">📆 Last Month's Sales</h3>
        <div class="profit-summary">
          ${renderPeriodCard('🍁 LAST MONTH\'S PERFORMANCE','month',periods.last_month.revenue,periods.last_month.profit,periods.last_month.sales_count,periods.last_month.has_data,periods.last_month.period_start,periods.last_month.period_end,periods.last_month.visibility_start,periods.last_month.visibility_end)}
        </div>
      </div>

      <div class="period-section">
        <h3 style="color: var(--text-primary, #5D534A); margin: 30px 0 20px 0; font-size: 1.2rem; font-weight: 700;">📈 Last Year's Sales</h3>
        <div class="profit-summary">
          ${renderPeriodCard('🍂 LAST YEAR\'S PERFORMANCE','year',periods.last_year.revenue,periods.last_year.profit,periods.last_year.sales_count,periods.last_year.has_data,periods.last_year.period_start,periods.last_year.period_end,periods.last_year.visibility_start,periods.last_year.visibility_end)}
        </div>
      </div>

      <div class="period-section">
        <h3 style="color: var(--text-primary, rgb(148, 111, 80)); margin: 30px 0 20px 0; font-size: 1.2rem; font-weight: 700;">💎 Potential Profit</h3>
        <div class="profit-summary">
          <div class="profit-card potential">
            <h3>💎 INVENTORY VALUE</h3>
            <div class="profit-card-revenue">
              <div class="profit-card-label" style="color: white !important;">Potential Profit from Current Stock</div>
              <div class="profit-amount">₱${potentialProfit.toFixed(2)}</div>
              <small style="color: white !important;">if all inventory sells at current prices</small>
            </div>
          </div>
        </div>
      </div>

      <div class="recent-sales-section" style="margin-top: 50px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <h3 style="margin: 0; color: var(--text-primary, #6e4a2a); font-size: 1.2rem; font-weight: 700;">📝 Recent Sales</h3>
            <button id="btnToggleSales" onclick="toggleRecentSales()" style="
              display: inline-flex; align-items: center; gap: 6px;
              padding: 7px 16px;
              background: linear-gradient(135deg, #a8c99c, #87B382);
              color: white;
              border: none;
              border-radius: 20px;
              cursor: pointer;
              font-size: 13px;
              font-weight: 700;
              box-shadow: 0 3px 10px rgba(135,179,130,0.4);
              transition: all 0.2s ease;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <span id="toggleSalesIcon">🙈</span>
              <span id="toggleSalesLabel">Hide</span>
            </button>
          </div>
        ${sales.length > 0 ? `
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
    <p style="font-size:12px;color:#9E9382;margin:0;text-align:right;">
      🗑️ Transactions older than 2 days can be deleted.<br>Do this regularly to free up space.
    </p>
    <button class="btn-clear-history" id="btnClearHistory" style="background: linear-gradient(135deg, #EF4444, #DC2626) !important; color: white !important;">🗑️ Clear Transaction History</button>
  </div>` : ''}
    `;

    content.innerHTML = html;
    document.getElementById('btnClearHistory')?.addEventListener('click', clearTransactionHistory);
    setupMidnightRefresh();
    
  } catch (error) {
    console.error('❌ Error rendering profit page:', error);
    content.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #DC2626;">
        <h2>⚠️ Error Loading Data</h2>
        <p>${error.message}</p>
        <button onclick="renderProfit()" style="padding: 12px 24px; background: #87B382; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 700; margin-top: 15px;">Retry</button>
      </div>
    `;
  }
}



function toggleRecentSales() {
  const container = document.getElementById('recentSalesContainer');
  const icon      = document.getElementById('toggleSalesIcon');
  const label     = document.getElementById('toggleSalesLabel');
  if (!container) return;

  const isVisible = container.style.maxHeight !== '0px';

  if (isVisible) {
    // Collapse
    container.style.maxHeight = container.scrollHeight + 'px'; // set explicit height first
    requestAnimationFrame(() => {
      container.style.maxHeight  = '0px';
      container.style.opacity    = '0';
      container.style.marginTop  = '0px';
    });
    icon.textContent  = '👁️';
    label.textContent = 'Show';
  } else {
    // Expand
    container.style.maxHeight  = container.scrollHeight + 'px';
    container.style.opacity    = '1';
    container.style.marginTop  = '';
    icon.textContent  = '🙈';
    label.textContent = 'Hide';
    // After animation, remove fixed maxHeight so content can resize freely
    setTimeout(() => { container.style.maxHeight = 'none'; }, 380);
  }
}



function renderPeriodCard(title, cardClass, revenue, profit, salesCount, hasData, periodStart=null, periodEnd=null, visibilityStart=null, visibilityEnd=null) {

  function buildPeriodInfo(start, end) {
    if (!start || !end) return '';
    try {
      const s = new Date(start), e = new Date(end);
      if (isNaN(s) || isNaN(e)) return '';
      return `<small style="display: block; margin-bottom: 12px; color: var(--text-secondary); font-weight: 600;">
        📅 ${s.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} - 
        ${e.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
      </small>`;
    } catch(e) { return ''; }
  }


  if (cardClass === 'today' || cardClass === 'yesterday') {
    if (!hasData) {
      return `
        <div class="profit-card ${cardClass}">
          <h3>${title}</h3>
          <div class="profit-card-revenue">
            <div class="profit-card-label">No sales recorded</div>
            <div class="profit-amount" style="font-size: 1.2rem; opacity: 0.6;">—</div>
            <small style="opacity: 0.7;">Check back later for data</small>
          </div>
        </div>`;
    }
    return `
      <div class="profit-card ${cardClass}">
        <h3>${title}</h3>
        ${buildPeriodInfo(periodStart, periodEnd)}
        <div class="profit-card-revenue">
          <div class="profit-card-label">Revenue</div>
          <div class="profit-amount">₱${revenue.toFixed(2)}</div>
          <small>${salesCount} ${salesCount === 1 ? 'sale' : 'sales'}</small>
        </div>
        <div class="profit-card-profit">
          <div class="profit-card-profit-label">Profit Earned</div>
          <div class="profit-card-profit-amount">₱${profit.toFixed(2)}</div>
        </div>
      </div>`;
  }


  if (hasData) {
    let visibilityBadge = '';
    if (visibilityEnd) {
      const visEnd = new Date(visibilityEnd);
      if (!isNaN(visEnd)) {
        const days = Math.ceil((visEnd - new Date()) / 86400000);
        visibilityBadge = `
          <div style="margin-top: 12px; padding: 10px 14px; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.3); border-radius: 10px; font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; text-align: center;">
            ⏰ Visible for ${days} more day${days === 1 ? '' : 's'}<br>
            <small style="opacity: 0.8;">Until ${visEnd.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</small>
          </div>`;
      }
    }
    return `
      <div class="profit-card ${cardClass}">
        <h3>${title}</h3>
        ${buildPeriodInfo(periodStart, periodEnd)}
        <div class="profit-card-revenue">
          <div class="profit-card-label">Revenue</div>
          <div class="profit-amount">₱${revenue.toFixed(2)}</div>
          <small>${salesCount} ${salesCount === 1 ? 'sale' : 'sales'}</small>
        </div>
        <div class="profit-card-profit">
          <div class="profit-card-profit-label">Profit Earned</div>
          <div class="profit-card-profit-amount">₱${profit.toFixed(2)}</div>
        </div>
        ${visibilityBadge}
      </div>`;
  }


  let availabilityHtml = '';
  if (visibilityStart && visibilityEnd) {
    try {
      const s = new Date(visibilityStart), e = new Date(visibilityEnd);
      if (!isNaN(s) && !isNaN(e)) {
        availabilityHtml = `
          <div style="margin-top: 12px; padding: 12px 16px; background: rgba(66,133,244,0.08); border: 1px solid rgba(66,133,244,0.2); border-radius: 12px; font-size: 0.85rem; color: var(--text-primary); font-weight: 600;">
            <div style="margin-bottom: 8px;">📅 Visible from: ${s.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} at 12am</div>
            <div>⏰ Until: ${e.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} at 12am</div>
          </div>`;
      }
    } catch(e) {}
  }
  return `
    <div class="profit-card ${cardClass}">
      <h3>${title}</h3>
      <div class="profit-card-revenue">
        <div class="profit-card-label">No sales recorded for this period</div>
        <div class="profit-amount" style="font-size: 1.2rem; opacity: 0.6;">—</div>
        <small style="opacity: 0.7;">Check back during visibility window</small>
        ${availabilityHtml}
      </div>
    </div>`;
}



function renderRecentSales(recentSales) {
  if (!Array.isArray(recentSales) || recentSales.length === 0) {
    return `
      <div style="text-align: center; padding: 60px 20px; background: #F8F7F4; border-radius: 20px;">
        <h3 style="font-size: 24px; margin-bottom: 10px; color: #5D534A;">📭 No Sales Yet</h3>
        <p style="font-size: 16px; margin: 0; color: #9E9382;">Start making sales to see them here!</p>
      </div>`;
  }

  let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">';

  recentSales.forEach(sale => {
    const date = new Date(sale.date || sale.created_at);
    const formattedDate = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    
    let itemsList = 'N/A';
    try {
      const items = Array.isArray(sale.items) ? sale.items :
                    typeof sale.items === 'string' ? JSON.parse(sale.items) : [];
      itemsList = items.map(i => `${i.product_name || i.name || 'Item'} (×${i.quantity})`).join(', ');
    } catch(e) {}

    const total         = parseFloat(sale.total) || 0;
    const profit        = parseFloat(sale.profit || sale.total_profit) || 0;
    const paymentMethod = sale.paymentType || sale.payment_method || 'cash';

    let badgeStyle = 'background: linear-gradient(135deg, #10B981, #34D399);';
    if (paymentMethod.toLowerCase() === 'gcash')  badgeStyle = 'background: linear-gradient(135deg, #3B82F6, #60A5FA);';
    if (paymentMethod.toLowerCase() === 'credit') badgeStyle = 'background: linear-gradient(135deg, #F59E0B, #FBBF24);';

    html += `
      <div class="sale-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 2px solid #F0EAE0;">
          <div>
            <div style="font-size: 16px; font-weight: 700; color: #5D534A;">${formattedDate}</div>
            <div style="font-size: 13px; color: #9E9382; margin-top: 2px;">${formattedTime}</div>
          </div>
          <span style="padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: white; ${badgeStyle}">${paymentMethod}</span>
        </div>
        <div style="margin-bottom: 15px;">
          <div style="font-size: 12px; color: #9E9382; text-transform: uppercase; font-weight: 600; margin-bottom: 8px; letter-spacing: 0.5px;">Items Purchased</div>
          <div style="font-size: 14px; color: #5D534A; line-height: 1.6;">${itemsList}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 2px solid #F0EAE0;">
          <div>
            <div style="font-size: 11px; color: #9E9382; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; letter-spacing: 0.5px;">Total</div>
            <div style="font-size: 20px; font-weight: 700; color: #5D534A;">₱${total.toFixed(2)}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #9E9382; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; letter-spacing: 0.5px;">Profit</div>
            <div style="font-size: 20px; font-weight: 700; color: #059669;">₱${profit.toFixed(2)}</div>
          </div>
        </div>
      </div>`;
  });

  html += '</div>';
  return html;
}



async function clearTransactionHistory() {
  try {
    const sales = await DB.getSales();
    if (!Array.isArray(sales) || sales.length === 0) {
      showModernAlert('No transactions to clear.', 'ℹ️');
      return;
    }

    const now        = new Date();
    const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
    const oldSales   = sales.filter(s => new Date(s.date || s.created_at) < twoDaysAgo);

    if (oldSales.length === 0) {
      showModernAlert('No old transactions to delete.<br><br>✅ Today and Yesterday are always protected!<br><br>Only transactions older than 2 days can be deleted.', 'ℹ️');
      return;
    }

    const ok1 = await showModernConfirm(
      `Delete ${oldSales.length} transaction record${oldSales.length === 1 ? '' : 's'}?<br><br>✅ <strong>PROTECTED:</strong><br>• Today's transactions will NOT be deleted<br>• Yesterday's transactions will NOT be deleted<br><br>⚠️ <strong>WILL BE DELETED:</strong><br>• ${oldSales.length} transaction(s) older than 2 days<br><br>Historical totals will be preserved in summaries.`,
      '🛡️'
    );
    if (!ok1) return;

    const ok2 = await showModernConfirm(
      `<strong>FINAL CONFIRMATION</strong><br><br>Delete old transaction records?<br><br>🛡️ <strong>PROTECTED (NEVER DELETED):</strong><br>• Today's transactions<br>• Yesterday's transactions<br><br>🗑️ <strong>WILL BE DELETED:</strong><br>• ${oldSales.length} old transaction record(s)<br><br>✅ <strong>PRESERVED:</strong><br>• All period totals<br>• Daily summaries<br><br>This action cannot be undone!`,
      '🚨'
    );
    if (!ok2) return;

    await DB.cleanupOldTransactions(2);
    showModernAlert(`✅ Old transaction records deleted!<br><br>• ${oldSales.length} old transaction(s) removed<br>• Today's transactions preserved<br>• Yesterday's transactions preserved<br>• All sales totals preserved`, '✅');
    await renderProfit();

  } catch (error) {
    console.error('Error clearing transaction history:', error);
    showModernAlert('An error occurred while clearing transaction history.', '❌');
  }
}



function setupMidnightRefresh() {
  const now      = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const msLeft   = tomorrow - now;

  if (window.midnightTimeout) clearTimeout(window.midnightTimeout);

  window.midnightTimeout = setTimeout(async () => {
    console.log('🕛 Midnight! Updating periods and refreshing...');
    try {
      await DB.updatePeriods();
      const profitPage = document.getElementById('profitPage');
      if (profitPage && profitPage.classList.contains('active-page')) await renderProfit();
    } catch (error) {
      console.error('❌ Error updating periods at midnight:', error);
    }
    setupMidnightRefresh();
  }, msLeft);

  console.log(`⏰ Midnight refresh scheduled in ${Math.round(msLeft / 60000)} minutes`);
}



function showModernAlert(message, icon = '✅') {
  document.getElementById('modernAlertOverlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'modernAlertOverlay';
  overlay.innerHTML = `
    <div class="modern-alert-box">
      <div class="modern-alert-shimmer"></div>
      <div class="modern-alert-icon-wrapper">
        <div class="modern-alert-icon-ring"></div>
        <span class="modern-alert-icon">${icon}</span>
      </div>
      <h3 class="modern-alert-title">Notice</h3>
      <div class="modern-alert-message">${message.replace(/\n/g, '<br>')}</div>
      <button class="modern-alert-btn" onclick="document.getElementById('modernAlertOverlay').remove()">Got it!</button>
    </div>
    <style>
      #modernAlertOverlay { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(12px);display:flex;justify-content:center;align-items:center;z-index:99999;animation:ma_fadeIn 0.3s ease; }
      .modern-alert-box { background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.9));border-radius:28px;padding:45px 40px 40px;width:90%;max-width:450px;box-shadow:0 30px 80px rgba(0,0,0,0.25);animation:ma_slideIn 0.4s cubic-bezier(0.34,1.56,0.64,1);text-align:center;position:relative;overflow:hidden; }
      body.dark-mode .modern-alert-box { background:linear-gradient(135deg,rgba(45,55,72,0.95),rgba(45,55,72,0.9)); }
      .modern-alert-shimmer { position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg,#cbdfbd,#a8c99c,#d4e09b,#f3c291,#cbdfbd);animation:ma_shimmer 3s linear infinite; }
      .modern-alert-icon-wrapper { width:90px;height:90px;margin:0 auto 28px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,#cbdfbd,#a8c99c);box-shadow:0 12px 35px rgba(203,223,189,0.5);position:relative; }
      .modern-alert-icon-ring { position:absolute;inset:-8px;border-radius:50%;border:2px solid rgba(203,223,189,0.5);animation:ma_rotate 3s linear infinite; }
      .modern-alert-icon { font-size:52px; }
      .modern-alert-title { font-size:26px;font-weight:900;background:linear-gradient(135deg,#2d3748,#5D534A);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 14px; }
      body.dark-mode .modern-alert-title { background:linear-gradient(135deg,#f7fafc,#cbd5e0);-webkit-background-clip:text;-webkit-text-fill-color:transparent; }
      .modern-alert-message { font-size:16px;line-height:1.7;color:#718096;font-weight:500;margin-bottom:35px; }
      body.dark-mode .modern-alert-message { color:#cbd5e0; }
      .modern-alert-btn { width:100%;padding:18px 28px;background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#2d5a3b;border:none;border-radius:16px;font-weight:800;font-size:16px;cursor:pointer;transition:all 0.3s ease; }
      .modern-alert-btn:hover { transform:translateY(-3px); }
      @keyframes ma_fadeIn { from{opacity:0}to{opacity:1} }
      @keyframes ma_slideIn { from{transform:scale(0.8) translateY(30px);opacity:0}to{transform:scale(1) translateY(0);opacity:1} }
      @keyframes ma_shimmer { 0%{transform:translateX(-100%)}100%{transform:translateX(100%)} }
      @keyframes ma_rotate { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
    </style>`;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('modernAlertOverlay')?.remove(), 3000);
}

function showModernConfirm(message, icon = '⚠️') {
  return new Promise(resolve => {
    document.getElementById('modernConfirmOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'modernConfirmOverlay';
    overlay.innerHTML = `
      <div class="modern-confirm-box">
        <div class="modern-confirm-shimmer"></div>
        <div class="modern-confirm-icon-wrapper">
          <div class="modern-confirm-icon-ring"></div>
          <span class="modern-confirm-icon">${icon}</span>
        </div>
        <h3 class="modern-confirm-title">Confirm Action</h3>
        <div class="modern-confirm-message">${message.replace(/\n/g, '<br>')}</div>
        <div class="modern-confirm-buttons">
          <button class="modern-confirm-btn modern-confirm-btn-danger" id="confirmYesBtn">Yes, Delete</button>
          <button class="modern-confirm-btn modern-confirm-btn-cancel"  id="confirmNoBtn">Cancel</button>
        </div>
      </div>
      <style>
        #modernConfirmOverlay { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(12px);display:flex;justify-content:center;align-items:center;z-index:99999;animation:mc_fadeIn 0.3s ease; }
        .modern-confirm-box { background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.9));border-radius:28px;padding:45px 40px 40px;width:90%;max-width:450px;box-shadow:0 30px 80px rgba(0,0,0,0.25);animation:mc_slideIn 0.4s cubic-bezier(0.34,1.56,0.64,1);text-align:center;position:relative;overflow:hidden; }
        body.dark-mode .modern-confirm-box { background:linear-gradient(135deg,rgba(45,55,72,0.95),rgba(45,55,72,0.9)); }
        .modern-confirm-shimmer { position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg,#EF4444,#DC2626,#B91C1C,#DC2626,#EF4444);animation:mc_shimmer 3s linear infinite; }
        .modern-confirm-icon-wrapper { width:90px;height:90px;margin:0 auto 28px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,#FEE2E2,#FECACA);box-shadow:0 12px 35px rgba(239,68,68,0.3);position:relative; }
        .modern-confirm-icon-ring { position:absolute;inset:-8px;border-radius:50%;border:2px solid rgba(239,68,68,0.5);animation:mc_rotate 3s linear infinite; }
        .modern-confirm-icon { font-size:52px; }
        .modern-confirm-title { font-size:26px;font-weight:900;background:linear-gradient(135deg,#2d3748,#5D534A);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 14px; }
        body.dark-mode .modern-confirm-title { background:linear-gradient(135deg,#f7fafc,#cbd5e0);-webkit-background-clip:text;-webkit-text-fill-color:transparent; }
        .modern-confirm-message { font-size:16px;line-height:1.7;color:#718096;font-weight:500;margin-bottom:35px; }
        body.dark-mode .modern-confirm-message { color:#cbd5e0; }
        .modern-confirm-buttons { display:flex;flex-direction:column;gap:14px; }
        .modern-confirm-btn { width:100%;padding:18px 28px;border:none;border-radius:16px;font-weight:800;font-size:16px;cursor:pointer;transition:all 0.3s ease; }
        .modern-confirm-btn-danger { background:linear-gradient(135deg,#EF4444,#DC2626);color:white;box-shadow:0 6px 20px rgba(239,68,68,0.4); }
        .modern-confirm-btn-danger:hover { transform:translateY(-3px); }
        .modern-confirm-btn-cancel { background:linear-gradient(135deg,#FEE2E2,#FECACA);color:#DC2626;border:2px solid #fca5a5; }
        .modern-confirm-btn-cancel:hover { background:linear-gradient(135deg,#FECACA,#FCA5A5);color:#B91C1C;transform:translateY(-2px); }
        body.dark-mode .modern-confirm-btn-cancel { background:rgba(127,29,29,0.4);color:#f87171;border-color:rgba(248,113,113,0.3); }
        @keyframes mc_fadeIn  { from{opacity:0}to{opacity:1} }
        @keyframes mc_slideIn { from{transform:scale(0.8) translateY(30px);opacity:0}to{transform:scale(1) translateY(0);opacity:1} }
        @keyframes mc_shimmer { 0%{transform:translateX(-100%)}100%{transform:translateX(100%)} }
        @keyframes mc_rotate  { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
      </style>`;
    document.body.appendChild(overlay);
    document.getElementById('confirmYesBtn').onclick = () => { overlay.remove(); resolve(true);  };
    document.getElementById('confirmNoBtn').onclick  = () => { overlay.remove(); resolve(false); };
  });
}



(function applyProfitStyles() {
    const styleId = 'profit-dark-mode-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        
        .profit-card::before,
        .profit-card::after,
        .sale-card::before,
        .sale-card::after,
        .period-section::before,
        .period-section::after {
            content: none !important;
            display: none !important;
        }

        /* ── Dark mode text ── */
        body.dark-mode .period-label,
        body.dark-mode [style*="color: #8E7C5E"],
        body.dark-mode [style*="color:#8E7C5E"],
        body.dark-mode .performance-label,
        body.dark-mode .today-label,
        body.dark-mode .yesterday-label,
        body.dark-mode .week-label,
        body.dark-mode .month-label { color: #f0f9f0 !important; }

        body.dark-mode .profit-card { background: #2a2a2a !important; color: #e0e0e0 !important; border-color: #444 !important; }
        body.dark-mode .profit-card h3 { color: #f0f9f0 !important; }
        body.dark-mode .profit-card-label,
        body.dark-mode .profit-label { color: #b0b0b0 !important; }
        body.dark-mode .profit-amount,
        body.dark-mode .profit-value { color: #ffd966 !important; }

        body.dark-mode .period-card-today,
        body.dark-mode .period-card-week,
        body.dark-mode .period-card-month { background: #2a2a2a !important; }
        body.dark-mode .period-card-today h3,
        body.dark-mode .period-card-week h3,
        body.dark-mode .period-card-month h3 { color: #f0f9f0 !important; }

        body.dark-mode .card-section { border-bottom-color: #444 !important; }
        body.dark-mode .card-label { color: #888 !important; }
        body.dark-mode .card-value { color: #e0e0e0 !important; }

        body.dark-mode .sale-card { background: #2a2a2a !important; }
        body.dark-mode .sale-card h4 { color: #f0f9f0 !important; }
        body.dark-mode .sale-details { color: #b0b0b0 !important; }

        body.dark-mode .empty-state-message,
        body.dark-mode .no-data-message { color: #888 !important; }
        body.dark-mode .info-text { color: #b0b0b0 !important; }
        body.dark-mode .available-text { color: #d0d0d0 !important; }

        /* ── Recent Sales toggle container ── */
        #recentSalesContainer {
            max-height: none;
            opacity: 1;
            transition: max-height 0.35s ease, opacity 0.3s ease;
        }
    `;
    document.head.appendChild(style);
})();

console.log('✅ profit.js loaded successfully (FIXED VERSION)!');