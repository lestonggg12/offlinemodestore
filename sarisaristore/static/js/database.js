/**
 * database.js — Central API-client layer for the Sari-Sari Store SPA.
 *
 * CHANGES (Category Management Update):
 *  - apiCall() now sends body for DELETE requests too (needed for
 *    category deletion with reassign_to payload).
 *  - Added DB.getCategories(), addCategory(), updateCategory(), deleteCategory().
 *  - window.CATEGORIES is populated by getCategories() for backward compat.
 */

console.log('📦 Loading database.js...');

// =============================================================================
//  MODERN CONFIRMATION MODAL
// =============================================================================
function showModernConfirm(message, icon = '❓') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);
      backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;
      z-index:10000;animation:fadeIn 0.2s ease;
    `;
    const modal = document.createElement('div');
    modal.style.cssText = `
      background:white;border-radius:20px;padding:40px;max-width:450px;width:90%;
      box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:slideUp 0.3s ease;
      font-family:'Quicksand',sans-serif;
    `;
    modal.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:64px;margin-bottom:20px;animation:bounce 0.5s ease;">${icon}</div>
        <div style="font-size:1.1rem;color:#5D534A;line-height:1.6;margin-bottom:30px;white-space:pre-line;">${message}</div>
        <div style="display:flex;gap:15px;justify-content:center;">
          <button id="confirmNo" style="flex:1;padding:15px 30px;border:none;
            background:var(--btn-red-bg);color:var(--btn-red-text);border-radius:12px;
            font-size:1rem;font-weight:700;cursor:pointer;transition:all 0.2s ease;
            font-family:'Quicksand',sans-serif;">Cancel</button>
          <button id="confirmYes" style="flex:1;padding:15px 30px;border:none;
            background:var(--btn-red-bg);color:var(--btn-red-text);
            border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;
            transition:all 0.2s ease;box-shadow:var(--btn-red-shadow);
            font-family:'Quicksand',sans-serif;">Confirm</button>
        </div>
      </div>
      <style>
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        #confirmNo:hover{background:var(--btn-red-hover);transform:translateY(-2px);}
        #confirmYes:hover{transform:translateY(-2px);box-shadow:var(--btn-red-shadow-hover);}
      </style>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const cleanup = (result) => {
      overlay.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => { if (document.body.contains(overlay)) document.body.removeChild(overlay); resolve(result); }, 200);
    };
    document.getElementById('confirmYes').onclick = () => cleanup(true);
    document.getElementById('confirmNo').onclick  = () => cleanup(false);
    overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };
  });
}

// =============================================================================
//  MODERN ALERT MODAL
// =============================================================================
function showModernAlert(message, icon = '✓') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);
      backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;
      z-index:10000;animation:fadeIn 0.2s ease;
    `;
    const modal = document.createElement('div');
    modal.style.cssText = `
      background:white;border-radius:20px;padding:40px;max-width:400px;width:90%;
      box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:slideUp 0.3s ease;
      font-family:'Quicksand',sans-serif;
    `;
    const isSuccess = icon==='✅'||icon==='✓';
    const isError = icon==='❌';
    const btnBg = isSuccess ? 'var(--btn-green-bg)' : isError ? 'var(--btn-red-bg)' : 'linear-gradient(135deg,#F59E0B 0%,#D97706 100%)';
    const btnHoverBg = isSuccess ? 'var(--btn-green-hover)' : isError ? 'var(--btn-red-hover)' : 'linear-gradient(135deg,#D97706 0%,#B45309 100%)';
    const btnText = isSuccess ? 'var(--btn-green-text)' : isError ? 'var(--btn-red-text)' : '#fff';
    const btnShadow = isSuccess ? 'var(--btn-green-shadow)' : isError ? 'var(--btn-red-shadow)' : '0 4px 12px rgba(245,158,11,0.3)';
    const btnShadowHover = isSuccess ? 'var(--btn-green-shadow-hover)' : isError ? 'var(--btn-red-shadow-hover)' : '0 6px 16px rgba(245,158,11,0.5)';
    modal.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:64px;margin-bottom:20px;animation:bounce 0.5s ease;">${icon}</div>
        <div style="font-size:1.1rem;color:#5D534A;line-height:1.6;margin-bottom:30px;white-space:pre-line;">${message}</div>
        <button id="alertOk" style="width:100%;padding:15px;border:none;
          background:${btnBg};color:${btnText};
          border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;
          transition:all 0.2s ease;box-shadow:${btnShadow};
          font-family:'Quicksand',sans-serif;">OK</button>
      </div>
      <style>
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        @keyframes fadeOut{from{opacity:1}to{opacity:0}}
        #alertOk:hover{transform:translateY(-2px);box-shadow:${btnShadowHover};}
      </style>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const cleanup = () => {
      overlay.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => { if (document.body.contains(overlay)) document.body.removeChild(overlay); resolve(); }, 200);
    };
    document.getElementById('alertOk').onclick = cleanup;
    overlay.onclick = (e) => { if (e.target === overlay) cleanup(); };
  });
}

window.showModernConfirm = showModernConfirm;
window.showModernAlert   = showModernAlert;

// =============================================================================
//  OFFLINE QUEUE (IndexedDB)
// =============================================================================
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sarisari-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function enqueueOfflineMutation(url, method, headers, body) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').add({ url, method, headers, body, timestamp: Date.now() });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    console.log(`📴 Queued offline ${method} ${url}`);
    // Request Background Sync if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      if (reg.sync) await reg.sync.register('replay-offline-queue');
    }
  } catch (e) { console.error('❌ Failed to enqueue offline mutation:', e); }
}

async function replayOfflineQueue() {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('queue', 'readonly');
    const all = await new Promise((res, rej) => {
      const r = tx.objectStore('queue').getAll();
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
    if (!all.length) return;
    console.log(`🔄 Replaying ${all.length} queued offline requests…`);
    for (const entry of all) {
      try {
        const resp = await fetch(entry.url, {
          method: entry.method, headers: entry.headers,
          body: entry.body, credentials: 'include',
        });
        if (resp.ok || resp.status < 500) {
          const delTx = db.transaction('queue', 'readwrite');
          delTx.objectStore('queue').delete(entry.id);
        }
      } catch { break; } // still offline
    }
  } catch (e) { console.error('❌ Replay failed:', e); }
}

// Replay queued requests when the browser signals we're back online
window.addEventListener('online', () => {
  console.log('🌐 Back online — replaying queued requests…');
  replayOfflineQueue().then(() => {
    if (typeof DB !== 'undefined') DB.syncUI();
  });
});

// =============================================================================
//  DB — Main API Client Object
// =============================================================================
const DB = {

  API_URL: '/api',

  getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
           document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
  },

  async apiCall(endpoint, method = 'GET', data = null) {
    const url = `${this.API_URL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', 'X-CSRFToken': this.getCsrfToken() };
    const options = { method, headers, credentials: 'include' };
    // ← Send body for POST, PUT, PATCH, and DELETE (needed for category delete with reassign)
    if (data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      options.body = JSON.stringify(data);
    }
    try {
      console.log(`🌐 API ${method} ${url}`, data || '');
      const response = await fetch(url, options);
      if (method === 'DELETE' && response.status === 204) {
        console.log('✅ DELETE successful (204)');
        return { success: true };
      }
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch { errorData = { detail: errorText }; }
        console.error(`❌ API Error (${response.status}):`, errorData);
        throw new Error(`API Error ${response.status}: ${JSON.stringify(errorData)}`);
      }
      const result = await response.json();
      console.log(`✅ API ${method} response:`, result);
      return result;
    } catch (error) {
      // ── Offline fallback for mutations ──────────────────────────────────
      const isNetworkError = !navigator.onLine || error.name === 'TypeError';
      if (isNetworkError && method !== 'GET') {
        await enqueueOfflineMutation(url, method, headers, options.body || null);
        return { _offline: true, message: 'Queued for sync when back online' };
      }
      console.error('❌ API Call Failed:', error);
      throw error;
    }
  },

  async syncUI() {
    console.log('🔄 Syncing all UI components...');
    try {
      if (typeof window.renderInventory  === 'function') await window.renderInventory();
      if (typeof window.renderPriceList  === 'function') await window.renderPriceList();
      if (typeof renderProfit            === 'function') await renderProfit();
      if (typeof renderDebtors           === 'function') await renderDebtors();
      if (typeof updateCartDisplay       === 'function') updateCartDisplay();
    } catch (error) { console.error('❌ Error during UI sync:', error); }
  },

  // ---------------------------------------------------------------------------
  //  CATEGORIES  ← NEW
  // ---------------------------------------------------------------------------

  /**
   * Fetch all categories from the API.
   * Also updates window.CATEGORIES for backward-compatible modules (cart.js etc.).
   */
  async getCategories() {
    try {
      const cats = await this.apiCall('/categories/');
      // Normalise to the same shape the old hardcoded array used
      const normalised = cats.map(c => ({
        id:         c.slug,          // inventory.js uses category.id as slug
        slug:       c.slug,
        pk:         c.id,            // DB primary key
        name:       c.name,
        icon:       c.icon,
        color:      c.color,
        is_default: c.is_default,
        order:      c.order,
        product_count: c.product_count,
      }));
      // Keep global in sync for any module still using window.CATEGORIES
      window.CATEGORIES = normalised;
      return normalised;
    } catch (error) {
      console.error('❌ Failed to fetch categories:', error);
      // Graceful fallback — return whatever is cached globally
      return window.CATEGORIES || [];
    }
  },

  /** Create a new custom category. */
  async addCategory({ name, icon = '📦', color = '' }) {
    try {
      const data   = { name, icon: icon || '📦' };
      if (color) data.color = color;
      const result = await this.apiCall('/categories/', 'POST', data);
      // Refresh global cache
      await this.getCategories();
      return result;
    } catch (error) {
      console.error('❌ Failed to add category:', error);
      throw error;
    }
  },

  /** Update an existing category (name / icon / color only — slug is immutable). */
  async updateCategory(pk, { name, icon, color }) {
    try {
      const data   = {};
      if (name  !== undefined) data.name  = name;
      if (icon  !== undefined) data.icon  = icon;
      if (color !== undefined) data.color = color;
      const result = await this.apiCall(`/categories/${pk}/`, 'PUT', data);
      await this.getCategories();
      return result;
    } catch (error) {
      console.error('❌ Failed to update category:', error);
      throw error;
    }
  },

  /**
   * Delete a category.
   * @param {number}  pk          - Category primary key (integer DB id).
   * @param {string?} reassignTo  - Slug of the category to move products into.
   *                                Pass null + deleteProducts=true to remove them.
   * @param {boolean} deleteProducts - If true, delete all products in the category.
   */
  async deleteCategory(pk, reassignTo = null, deleteProducts = false) {
    try {
      const body = {};
      if (reassignTo)     body.reassign_to     = reassignTo;
      if (deleteProducts) body.delete_products = true;
      const result = await this.apiCall(`/categories/${pk}/`, 'DELETE', body);
      await this.getCategories();
      return result;
    } catch (error) {
      console.error('❌ Failed to delete category:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------------------------
  //  PRODUCTS
  // ---------------------------------------------------------------------------

  async getProducts() {
    try {
      const products = await this.apiCall('/products/');
      return products.map(p => ({
        id:           p.id,
        name:         p.name,
        category:     p.category,
        category_id:  p.category,
        cost:         parseFloat(p.cost),
        cost_price:   parseFloat(p.cost),
        price:        parseFloat(p.price),
        selling_price:parseFloat(p.price),
        quantity:     parseInt(p.quantity),
        stock:        parseInt(p.quantity),
        created_at:   p.created_at,
        updated_at:   p.updated_at,
      }));
    } catch (error) {
      console.error('❌ Failed to fetch products:', error);
      return [];
    }
  },

  async addProduct(product) {
    try {
      const productData = {
        name:     product.name,
        category: product.category || product.category_id,
        cost:     parseFloat(product.cost     || product.cost_price   || 0),
        price:    parseFloat(product.price    || product.selling_price || 0),
        quantity: parseInt(product.quantity  || product.stock         || 0),
      };
      const newProduct = await this.apiCall('/products/', 'POST', productData);
      await this.syncUI();
      return newProduct;
    } catch (error) {
      console.error('❌ Failed to add product:', error);
      throw error;
    }
  },

  async updateProduct(id, updates) {
    try {
      const products       = await this.getProducts();
      const currentProduct = products.find(p => p.id === id);
      if (!currentProduct) throw new Error('Product not found');
      const updateData = {
        name:     updates.name     !== undefined ? updates.name     : currentProduct.name,
        category: updates.category !== undefined ? updates.category :
                  (updates.category_id !== undefined ? updates.category_id : currentProduct.category),
        cost:     updates.cost     !== undefined ? parseFloat(updates.cost)  :
                  (updates.cost_price !== undefined ? parseFloat(updates.cost_price) : parseFloat(currentProduct.cost)),
        price:    updates.price    !== undefined ? parseFloat(updates.price) :
                  (updates.selling_price !== undefined ? parseFloat(updates.selling_price) : parseFloat(currentProduct.price)),
        quantity: updates.quantity !== undefined ? parseInt(updates.quantity) :
                  (updates.stock !== undefined ? parseInt(updates.stock) : parseInt(currentProduct.quantity)),
      };
      const updatedProduct = await this.apiCall(`/products/${id}/`, 'PUT', updateData);
      await this.syncUI();
      return updatedProduct;
    } catch (error) {
      console.error('❌ Failed to update product:', error);
      throw error;
    }
  },

  async deleteProduct(id) {
    try {
      await this.apiCall(`/products/${id}/`, 'DELETE');
      await this.syncUI();
      return true;
    } catch (error) {
      console.error('❌ Failed to delete product:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------------------------
  //  SALES
  // ---------------------------------------------------------------------------

  async getSales() {
    try {
      const sales = await this.apiCall('/sales/');
      return sales.map(s => ({
  id:             s.id,
  date:           s.date,
  total:          parseFloat(s.total),
  profit:         parseFloat(s.profit || 0),
  paymentType:    s.payment_method,
  payment_method: s.payment_method,
  customer_name:  s.customer_name || '',  
  items:          s.items || [],
}));
    } catch (error) {
      console.error('❌ Failed to fetch sales:', error);
      return [];
    }
  },

  async addSale(sale) {
    try {
      const allProducts = await this.getProducts();
      let totalProfit   = 0;
      const paymentMethod = (sale.paymentType || sale.payment_method || 'cash').toLowerCase().trim();
      const rawCustomerName = String(sale.customer_name || '').trim();
      let normalizedCustomerName = rawCustomerName;

      if (paymentMethod === 'cash' && !normalizedCustomerName) {
        normalizedCustomerName = 'N/A';
      }

      if (paymentMethod.startsWith('credit') && !normalizedCustomerName) {
        throw new Error('Customer name is required for credit transactions.');
      }

      const itemsWithCost = sale.items.map(item => {
        const product   = allProducts.find(p => p.id === (item.id || item.productId || item.product_id));
        const itemCost  = item.cost != null ? parseFloat(item.cost) : (product ? parseFloat(product.cost) : 0);
        const itemPrice = parseFloat(item.price || item.selling_price || (product ? product.price : 0));
        const quantity  = parseInt(item.quantity || 0);
        totalProfit    += (itemPrice - itemCost) * quantity;
        return { product_id: item.id || item.productId || item.product_id, quantity, price: itemPrice, cost: itemCost };
      });
     const saleData = {
  total:          parseFloat(sale.total.toFixed(2)),
  profit:         parseFloat(totalProfit.toFixed(2)),
  payment_method: paymentMethod,
  customer_name:  normalizedCustomerName,
  items:          itemsWithCost,
};
      const newSale = await this.apiCall('/sales/', 'POST', saleData);
      await this.syncUI();
      return newSale;
    } catch (error) {
      console.error('❌ Failed to add sale:', error);
      throw error;
    }
  },

  async clearAllSales() {
    try {
      const [currentTotals, sales] = await Promise.all([this.getAccumulatedTotals(), this.getSales()]);
      const todayRevenue = sales.reduce((s, x) => s + parseFloat(x.total),  0);
      const todayProfit  = sales.reduce((s, x) => s + parseFloat(x.profit), 0);
      await this.updateAccumulatedTotals(currentTotals.revenue + todayRevenue, currentTotals.profit + todayProfit);
      await this.apiCall('/sales/clear/', 'DELETE');
      await this.syncUI();
      return true;
    } catch (error) {
      console.error('❌ Failed to clear sales:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------------------------
  //  PERIOD TOTALS
  // ---------------------------------------------------------------------------

  async getPeriodTotals() {
    try {
      const data = await this.apiCall('/period-totals/');
      const norm = (k) => ({
        revenue:          parseFloat(data[k]?.revenue          || 0),
        profit:           parseFloat(data[k]?.profit           || 0),
        sales_count:      parseInt(data[k]?.sales_count        || 0),
        has_data:         data[k]?.has_data                    || false,
        period_start:     data[k]?.period_start,
        period_end:       data[k]?.period_end,
        visibility_start: data[k]?.visibility_start,
        visibility_end:   data[k]?.visibility_end,
      });
      return { today: norm('today'), yesterday: norm('yesterday'), last_week: norm('last_week'),
               last_month: norm('last_month'), last_year: norm('last_year') };
    } catch (error) {
      console.error('❌ Failed to fetch period totals:', error);
      const empty = { revenue: 0, profit: 0, sales_count: 0, has_data: false };
      return { today: {...empty}, yesterday: {...empty}, last_week: {...empty},
               last_month: {...empty}, last_year: {...empty} };
    }
  },

  async updatePeriods() {
    try   { return await this.apiCall('/update-periods/', 'POST'); }
    catch (error) { console.error('❌ Failed to update periods:', error); throw error; }
  },

  // ---------------------------------------------------------------------------
  //  CALENDAR
  // ---------------------------------------------------------------------------

  async getCalendarData(year, month) {
    try   { return await this.apiCall(`/calendar/?year=${year}&month=${month}`); }
    catch (error) { console.error('❌ Failed to fetch calendar data:', error); return { year, month, summaries: [] }; }
  },

  async getDateDetails(dateStr) {
    try   { return await this.apiCall(`/calendar/${dateStr}/`); }
    catch (error) { console.error('❌ Failed to fetch date details:', error); return null; }
  },

  // ---------------------------------------------------------------------------
  //  DEBTORS
  // ---------------------------------------------------------------------------

  async getDebtors() {
    try {
      const debtors = await this.apiCall('/debtors/');
      return debtors.map(d => ({
        id:               d.id,
        name:             d.name,
        contact:          d.contact || '',
        totalAmount:      parseFloat(d.total_debt),
        total_debt:       parseFloat(d.total_debt),
        original_total:   parseFloat(d.original_total   || 0),
        surcharge_percent:parseFloat(d.surcharge_percent || 0),
        surcharge_amount: parseFloat(d.surcharge_amount  || 0),
        date:             d.date_borrowed,
        date_borrowed:    d.date_borrowed,
        paid:             d.paid || false,
        date_paid:        d.date_paid,
        products:         d.items || [],
        items:            d.items || [],
      }));
    } catch (error) {
      console.error('❌ Failed to fetch debtors:', error);
      return [];
    }
  },

  async addDebtor(debtor) {
    try {
      const debtorData = {
        name:              debtor.name,
        contact:           debtor.contact || '',
        total_debt:        parseFloat(debtor.total_debt || debtor.totalAmount),
        original_total:    debtor.original_total !== undefined
                             ? parseFloat(debtor.original_total)
                             : parseFloat(debtor.total_debt || debtor.totalAmount),
        surcharge_percent: parseFloat(debtor.surcharge_percent || 0),
        surcharge_amount:  parseFloat(debtor.surcharge_amount  || 0),
        items: (debtor.products || debtor.items || []).map(item => ({
          product_id: item.id || item.productId || item.product_id,
          quantity:   parseInt(item.quantity),
          price:      parseFloat(item.price),
          cost:       parseFloat(item.cost || 0),
        })),
      };
      const newDebtor = await this.apiCall('/debtors/', 'POST', debtorData);
      await this.syncUI();
      return newDebtor;
    } catch (error) {
      console.error('❌ Failed to add debtor:', error);
      throw error;
    }
  },

  async updateDebtor(id, updates) {
    try {
      // Only send fields that are allowed by the backend and required for the update
      const updateData = {};
      if (updates.paid !== undefined) updateData.paid = updates.paid;
      if (updates.date_paid !== undefined) updateData.date_paid = updates.date_paid;
      // Optionally add more fields if needed by your backend
      const updatedDebtor = await this.apiCall(`/debtors/${id}/`, 'PUT', updateData);
      await this.syncUI();
      return updatedDebtor;
    } catch (error) {
      console.error('❌ Failed to update debtor:', error);
      throw error;
    }
  },

  async deleteDebtor(id) {
    try { await this.apiCall(`/debtors/${id}/`, 'DELETE'); await this.syncUI(); return true; }
    catch (error) { console.error('❌ Failed to delete debtor:', error); throw error; }
  },

  async clearPaidDebtors() {
    try { const r = await this.apiCall('/debtors/clear-paid/', 'DELETE'); await this.syncUI(); return r; }
    catch (error) { console.error('❌ Failed to clear paid debtors:', error); throw error; }
  },

  async autoCleanupPaidDebtors() {
    try { return await this.apiCall('/debtors/auto-cleanup/', 'POST'); }
    catch (error) { console.error('❌ Failed to auto-cleanup paid debtors:', error); return { count: 0 }; }
  },

  // ---------------------------------------------------------------------------
  //  ACCUMULATED TOTALS
  // ---------------------------------------------------------------------------

  async getAccumulatedTotals() {
    try {
      const data = await this.apiCall('/accumulated-totals/');
      return { revenue: parseFloat(data.accumulated_revenue || 0),
               profit:  parseFloat(data.accumulated_profit  || 0),
               lastCleared: data.last_cleared };
    } catch (error) { return { revenue: 0, profit: 0, lastCleared: null }; }
  },

  async updateAccumulatedTotals(revenue, profit) {
    try {
      return await this.apiCall('/accumulated-totals/', 'POST', {
        accumulated_revenue: revenue, accumulated_profit: profit,
        last_cleared: new Date().toISOString(),
      });
    } catch (error) { throw error; }
  },

  // ---------------------------------------------------------------------------
  //  INITIALISATION
  // ---------------------------------------------------------------------------

  async init() {
    console.log('✅ Django API Database Ready');
    // Warm the SW cache — fetch key data so it's available offline
    if (navigator.onLine) {
      this._warmCache();
    }
    return Promise.resolve();
  },

  /** Pre-fetch all key API endpoints so the service worker caches them. */
  async _warmCache() {
    try {
      console.log('📦 Warming offline cache…');
      const now = new Date();
      await Promise.allSettled([
        this.getProducts(),
        this.getCategories(),
        this.getSales(),
        this.getDebtors(),
        this.getPeriodTotals(),
        this.getAccumulatedTotals(),
        this.apiCall('/get-settings/'),
        this.getCalendarData(now.getFullYear(), now.getMonth() + 1),
      ]);
      console.log('✅ Offline cache warmed');
    } catch (e) { console.warn('⚠️ Cache warm-up partial failure:', e); }
  },

  // ---------------------------------------------------------------------------
  //  TRANSACTION AUTO-CLEANUP
  // ---------------------------------------------------------------------------

  async cleanupOldTransactions(days = 1) {
    try   { return await this.apiCall('/transactions/cleanup-old/', 'POST', { days }); }
    catch (error) { console.error('❌ Cleanup error:', error); throw error; }
  },

  async cleanupOldRecords() {
    try   { return await this.apiCall('/calendar/cleanup/', 'POST'); }
    catch (error) { console.error('❌ Old records cleanup error:', error); return { deleted_count: 0 }; }
  },

  async runAllCleanups() {
    const results = {};
    try { results.transactions = await this.cleanupOldTransactions(2); } catch(e) { console.error('❌ Transaction cleanup:', e); }
    try { results.debtors      = await this.autoCleanupPaidDebtors();  } catch(e) { console.error('❌ Debtor cleanup:', e); }
    try { results.oldRecords   = await this.cleanupOldRecords();       } catch(e) { console.error('❌ Old records cleanup:', e); }
    return results;
  },

  scheduleAutoCleanup() {
    const now  = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (window.autoCleanupTimeout) clearTimeout(window.autoCleanupTimeout);
    window.autoCleanupTimeout = setTimeout(async () => {
      try {
        console.log('🧹 Midnight auto-cleanup running...');
        const results = await this.runAllCleanups();
        console.log('✅ Midnight cleanup complete:', results);
        if (typeof renderProfit === 'function') await renderProfit();
      } catch (e) { console.error('❌ Scheduled cleanup failed:', e); }
      this.scheduleAutoCleanup();
    }, next - now);
    console.log(`⏰ Next cleanup at midnight (${Math.round((next - now) / 60000)} min)`);
  },
};

window.DB = DB;
console.log('✅ database.js loaded successfully!');