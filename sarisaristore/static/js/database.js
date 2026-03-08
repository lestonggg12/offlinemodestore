/**
 * database.js — OFFLINE VERSION (IndexedDB only)
 *
 * For: github.com/lestonggg12/offlinemodestore
 *
 * All data is stored locally on the device using IndexedDB.
 * No internet connection required. No Railway. No API calls.
 * All method signatures are identical to the online version
 * so cart.js, inventory.js, dashboard.js etc. work unchanged.
 */

console.log('📦 Loading database.js [OFFLINE MODE]...');

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
    const isError   = icon==='❌';
    const btnBg     = isSuccess ? 'var(--btn-green-bg)' : isError ? 'var(--btn-red-bg)' : 'linear-gradient(135deg,#F59E0B 0%,#D97706 100%)';
    const btnText   = isSuccess ? 'var(--btn-green-text)' : isError ? 'var(--btn-red-text)' : '#fff';
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
//  INDEXEDDB CORE
// =============================================================================

const DB_NAME    = 'sarisari-local';
const DB_VERSION = 1;

const STORES = {
  PRODUCTS:     'products',
  CATEGORIES:   'categories',
  SALES:        'sales',
  SALE_ITEMS:   'sale_items',
  DEBTORS:      'debtors',
  DEBTOR_ITEMS: 'debtor_items',
  SETTINGS:     'settings',
  ACCUMULATED:  'accumulated_totals',
};

const DEFAULT_CATEGORIES = [
  { id:1, slug:'beverages',           name:'Beverages',                     icon:'🥤', color:'linear-gradient(135deg,#e3b04b 0%,#d19a3d 100%)', is_default:true, order:1 },
  { id:2, slug:'school',              name:'School Supplies',               icon:'📚', color:'linear-gradient(135deg,#d48c2e 0%,#ba7a26 100%)', is_default:true, order:2 },
  { id:3, slug:'snacks',              name:'Snacks',                        icon:'🍿', color:'linear-gradient(135deg,#a44a3f 0%,#934635 100%)', is_default:true, order:3 },
  { id:4, slug:'foods',               name:'Whole Foods',                   icon:'🍚', color:'linear-gradient(135deg,#967751 0%,#92784f 100%)', is_default:true, order:4 },
  { id:5, slug:'bath',                name:'Bath, Hygiene & Laundry Soaps', icon:'🧼', color:'linear-gradient(135deg,#f3c291 0%,#e5b382 100%)', is_default:true, order:5 },
  { id:6, slug:'wholesale_beverages', name:'Wholesale Beverages',           icon:'📦', color:'linear-gradient(135deg,#cc8451 0%,#b87545 100%)', is_default:true, order:6 },
  { id:7, slug:'liquor',              name:'Hard Liquors',                  icon:'🍺', color:'linear-gradient(135deg,#e2e8b0 0%,#ced49d 100%)', is_default:true, order:7 },
];

const DEFAULT_SETTINGS = {
  id: 1, profit_margin: 20.00, low_stock_limit: 5, theme: 'light', debt_surcharge: 0.00,
};

const DEFAULT_ACCUMULATED = {
  id: 1, accumulated_revenue: 0, accumulated_profit: 0, last_cleared: null,
};

const AUTO_COLORS = [
  'linear-gradient(135deg,#a8c99c 0%,#8ab88a 100%)',
  'linear-gradient(135deg,#7bc4be 0%,#5da8a2 100%)',
  'linear-gradient(135deg,#7ba8c9 0%,#5d8aab 100%)',
  'linear-gradient(135deg,#9a7bc4 0%,#7c5da8 100%)',
  'linear-gradient(135deg,#c97ba8 0%,#ab5d8a 100%)',
  'linear-gradient(135deg,#c9a87b 0%,#ab8a5d 100%)',
  'linear-gradient(135deg,#c4c47b 0%,#a8a85d 100%)',
  'linear-gradient(135deg,#7bc47b 0%,#5da85d 100%)',
];

// ── IDB helpers ──────────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const s = db.createObjectStore(STORES.PRODUCTS, { keyPath:'id', autoIncrement:true });
        s.createIndex('category','category',{ unique:false });
      }
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        const s = db.createObjectStore(STORES.CATEGORIES, { keyPath:'id', autoIncrement:true });
        s.createIndex('slug','slug',{ unique:true });
      }
      if (!db.objectStoreNames.contains(STORES.SALES)) {
        const s = db.createObjectStore(STORES.SALES, { keyPath:'id', autoIncrement:true });
        s.createIndex('date','date',{ unique:false });
      }
      if (!db.objectStoreNames.contains(STORES.SALE_ITEMS)) {
        const s = db.createObjectStore(STORES.SALE_ITEMS, { keyPath:'id', autoIncrement:true });
        s.createIndex('sale_id','sale_id',{ unique:false });
      }
      if (!db.objectStoreNames.contains(STORES.DEBTORS)) {
        db.createObjectStore(STORES.DEBTORS, { keyPath:'id', autoIncrement:true });
      }
      if (!db.objectStoreNames.contains(STORES.DEBTOR_ITEMS)) {
        const s = db.createObjectStore(STORES.DEBTOR_ITEMS, { keyPath:'id', autoIncrement:true });
        s.createIndex('debtor_id','debtor_id',{ unique:false });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS))    db.createObjectStore(STORES.SETTINGS,    { keyPath:'id' });
      if (!db.objectStoreNames.contains(STORES.ACCUMULATED)) db.createObjectStore(STORES.ACCUMULATED, { keyPath:'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

const idb = {
  getAll(db, store) {
    return new Promise((res, rej) => {
      const r = db.transaction(store,'readonly').objectStore(store).getAll();
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  get(db, store, key) {
    return new Promise((res, rej) => {
      const r = db.transaction(store,'readonly').objectStore(store).get(key);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  put(db, store, value) {
    return new Promise((res, rej) => {
      const r = db.transaction(store,'readwrite').objectStore(store).put(value);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  add(db, store, value) {
    return new Promise((res, rej) => {
      const r = db.transaction(store,'readwrite').objectStore(store).add(value);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  delete(db, store, key) {
    return new Promise((res, rej) => {
      const r = db.transaction(store,'readwrite').objectStore(store).delete(key);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  byIndex(db, store, index, value) {
    return new Promise((res, rej) => {
      const r = db.transaction(store,'readonly').objectStore(store).index(index).getAll(value);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  clear(db, store) {
    return new Promise((res, rej) => {
      const r = db.transaction(store,'readwrite').objectStore(store).clear();
      r.onsuccess = () => res(); r.onerror = () => rej(r.error);
    });
  },
};

// =============================================================================
//  DB — Main Client Object
// =============================================================================
const DB = {

  _db: null,

  async getDB() {
    if (!this._db) this._db = await openDB();
    return this._db;
  },

  async syncUI() {
    try {
      if (typeof window.renderInventory  === 'function') await window.renderInventory();
      if (typeof window.renderPriceList  === 'function') await window.renderPriceList();
      if (typeof renderProfit            === 'function') await renderProfit();
      if (typeof renderDebtors           === 'function') await renderDebtors();
      if (typeof updateCartDisplay       === 'function') updateCartDisplay();
    } catch (e) { console.error('❌ syncUI error:', e); }
  },

  // ---------------------------------------------------------------------------
  //  CATEGORIES
  // ---------------------------------------------------------------------------

  async getCategories() {
    try {
      const db   = await this.getDB();
      const cats = await idb.getAll(db, STORES.CATEGORIES);
      const normalised = cats
        .sort((a,b) => (a.order||99)-(b.order||99))
        .map(c => ({
          id: c.slug, slug: c.slug, pk: c.id,
          name: c.name, icon: c.icon, color: c.color,
          is_default: c.is_default||false, order: c.order||99,
          product_count: c.product_count||0,
        }));
      window.CATEGORIES = normalised;
      return normalised;
    } catch (e) {
      console.error('❌ getCategories:', e);
      return window.CATEGORIES || [];
    }
  },

  async addCategory({ name, icon='📦', color='' }) {
    try {
      const db   = await this.getDB();
      const cats = await idb.getAll(db, STORES.CATEGORIES);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') + '_' + Date.now();
      const col  = color || AUTO_COLORS[cats.filter(c=>!c.is_default).length % AUTO_COLORS.length];
      const id   = await idb.add(db, STORES.CATEGORIES, { slug, name, icon:icon||'📦', color:col, is_default:false, order:100+cats.length });
      await this.getCategories();
      return { id, slug, name, icon, color:col };
    } catch (e) { console.error('❌ addCategory:', e); throw e; }
  },

  async updateCategory(pk, { name, icon, color }) {
    try {
      const db  = await this.getDB();
      const cat = await idb.get(db, STORES.CATEGORIES, pk);
      if (!cat) throw new Error('Category not found');
      if (name  !== undefined) cat.name  = name;
      if (icon  !== undefined) cat.icon  = icon;
      if (color !== undefined) cat.color = color;
      await idb.put(db, STORES.CATEGORIES, cat);
      await this.getCategories();
      return cat;
    } catch (e) { console.error('❌ updateCategory:', e); throw e; }
  },

  async deleteCategory(pk, reassignTo=null, deleteProducts=false) {
    try {
      const db       = await this.getDB();
      const cat      = await idb.get(db, STORES.CATEGORIES, pk);
      if (!cat) throw new Error('Category not found');
      const products = await idb.getAll(db, STORES.PRODUCTS);
      for (const p of products.filter(p => p.category===cat.slug)) {
        if (deleteProducts) await idb.delete(db, STORES.PRODUCTS, p.id);
        else if (reassignTo) { p.category = reassignTo; await idb.put(db, STORES.PRODUCTS, p); }
      }
      await idb.delete(db, STORES.CATEGORIES, pk);
      await this.getCategories();
      return { success:true };
    } catch (e) { console.error('❌ deleteCategory:', e); throw e; }
  },

  // ---------------------------------------------------------------------------
  //  PRODUCTS
  // ---------------------------------------------------------------------------

  async getProducts() {
    try {
      const db  = await this.getDB();
      const all = await idb.getAll(db, STORES.PRODUCTS);
      return all.sort((a,b)=>a.name.localeCompare(b.name)).map(p => ({
        id:            p.id,
        name:          p.name,
        category:      p.category,
        category_id:   p.category,
        cost:          parseFloat(p.cost  ||0),
        cost_price:    parseFloat(p.cost  ||0),
        price:         parseFloat(p.price ||0),
        selling_price: parseFloat(p.price ||0),
        quantity:      parseInt(p.quantity||0),
        stock:         parseInt(p.quantity||0),
        created_at:    p.created_at,
        updated_at:    p.updated_at,
      }));
    } catch (e) { console.error('❌ getProducts:', e); return []; }
  },

  async addProduct(product) {
    try {
      const db  = await this.getDB();
      const now = new Date().toISOString();
      const row = {
        name:       product.name,
        category:   product.category || product.category_id || 'uncategorized',
        cost:       parseFloat(product.cost    || product.cost_price    || 0),
        price:      parseFloat(product.price   || product.selling_price || 0),
        quantity:   parseInt(product.quantity || product.stock          || 0),
        created_at: now, updated_at: now,
      };
      const id = await idb.add(db, STORES.PRODUCTS, row);
      await this.syncUI();
      return { ...row, id };
    } catch (e) { console.error('❌ addProduct:', e); throw e; }
  },

  async updateProduct(id, updates) {
    try {
      const db  = await this.getDB();
      const p   = await idb.get(db, STORES.PRODUCTS, id);
      if (!p) throw new Error('Product not found');
      if (updates.name          !== undefined) p.name     = updates.name;
      if (updates.category      !== undefined) p.category = updates.category;
      if (updates.category_id   !== undefined) p.category = updates.category_id;
      if (updates.cost          !== undefined) p.cost     = parseFloat(updates.cost);
      if (updates.cost_price    !== undefined) p.cost     = parseFloat(updates.cost_price);
      if (updates.price         !== undefined) p.price    = parseFloat(updates.price);
      if (updates.selling_price !== undefined) p.price    = parseFloat(updates.selling_price);
      if (updates.quantity      !== undefined) p.quantity = parseInt(updates.quantity);
      if (updates.stock         !== undefined) p.quantity = parseInt(updates.stock);
      p.updated_at = new Date().toISOString();
      await idb.put(db, STORES.PRODUCTS, p);
      await this.syncUI();
      return p;
    } catch (e) { console.error('❌ updateProduct:', e); throw e; }
  },

  async deleteProduct(id) {
    try {
      const db = await this.getDB();
      await idb.delete(db, STORES.PRODUCTS, id);
      await this.syncUI();
      return true;
    } catch (e) { console.error('❌ deleteProduct:', e); throw e; }
  },

  // ---------------------------------------------------------------------------
  //  SALES
  // ---------------------------------------------------------------------------

  async getSales() {
    try {
      const db    = await this.getDB();
      const sales = await idb.getAll(db, STORES.SALES);
      const result = [];
      for (const s of sales) {
        const items = await idb.byIndex(db, STORES.SALE_ITEMS, 'sale_id', s.id);
        result.push({
          id: s.id, date: s.date,
          total:          parseFloat(s.total  ||0),
          profit:         parseFloat(s.profit ||0),
          paymentType:    s.payment_method,
          payment_method: s.payment_method,
          customer_name:  s.customer_name||'',
          items: items.map(i => ({ product_id:i.product_id, quantity:i.quantity, price:parseFloat(i.price||0), cost:parseFloat(i.cost||0) })),
        });
      }
      return result.sort((a,b) => new Date(b.date)-new Date(a.date));
    } catch (e) { console.error('❌ getSales:', e); return []; }
  },

  async addSale(sale) {
    try {
      const db       = await this.getDB();
      const products = await this.getProducts();
      let totalProfit = 0;
      const paymentMethod        = (sale.paymentType||sale.payment_method||'cash').toLowerCase().trim();
      const rawCustomerName      = String(sale.customer_name||'').trim();
      let   normalizedCustomerName = rawCustomerName;
      if (paymentMethod==='cash' && !normalizedCustomerName) normalizedCustomerName = 'N/A';
      if (paymentMethod.startsWith('credit') && !normalizedCustomerName) throw new Error('Customer name is required for credit transactions.');

      const itemsWithCost = sale.items.map(item => {
        const product  = products.find(p => p.id===(item.id||item.productId||item.product_id));
        const itemCost = item.cost!=null ? parseFloat(item.cost) : (product ? parseFloat(product.cost) : 0);
        const itemPrice= parseFloat(item.price||item.selling_price||(product?product.price:0));
        const qty      = parseInt(item.quantity||0);
        totalProfit   += (itemPrice-itemCost)*qty;
        return { product_id:item.id||item.productId||item.product_id, quantity:qty, price:itemPrice, cost:itemCost };
      });

      // Deduct stock
      for (const item of itemsWithCost) {
        const p = await idb.get(db, STORES.PRODUCTS, item.product_id);
        if (p) { p.quantity = Math.max(0, parseInt(p.quantity)-item.quantity); p.updated_at=new Date().toISOString(); await idb.put(db, STORES.PRODUCTS, p); }
      }

      const newSale = { date:new Date().toISOString(), total:parseFloat(sale.total.toFixed(2)), profit:parseFloat(totalProfit.toFixed(2)), payment_method:paymentMethod, customer_name:normalizedCustomerName };
      const saleId  = await idb.add(db, STORES.SALES, newSale);
      for (const item of itemsWithCost) await idb.add(db, STORES.SALE_ITEMS, { sale_id:saleId, ...item });
      await this.syncUI();
      return { ...newSale, id:saleId, items:itemsWithCost };
    } catch (e) { console.error('❌ addSale:', e); throw e; }
  },

  async clearAllSales() {
    try {
      const db = await this.getDB();
      const [totals, sales] = await Promise.all([this.getAccumulatedTotals(), this.getSales()]);
      await this.updateAccumulatedTotals(
        totals.revenue + sales.reduce((a,s)=>a+parseFloat(s.total),0),
        totals.profit  + sales.reduce((a,s)=>a+parseFloat(s.profit),0)
      );
      await idb.clear(db, STORES.SALES);
      await idb.clear(db, STORES.SALE_ITEMS);
      await this.syncUI();
      return true;
    } catch (e) { console.error('❌ clearAllSales:', e); throw e; }
  },

  // ---------------------------------------------------------------------------
  //  PERIOD TOTALS
  // ---------------------------------------------------------------------------

  async getPeriodTotals() {
    try {
      const sales = await this.getSales();
      const now   = new Date();
      const range = (s, e) => {
        const sub = sales.filter(x => { const d=new Date(x.date); return d>=s && d<=e; });
        return { revenue:sub.reduce((a,x)=>a+parseFloat(x.total),0), profit:sub.reduce((a,x)=>a+parseFloat(x.profit),0), sales_count:sub.length, has_data:sub.length>0 };
      };
      const tod  = new Date(now); tod.setHours(0,0,0,0);
      const todE = new Date(now); todE.setHours(23,59,59,999);
      const yest = new Date(now); yest.setDate(yest.getDate()-1); yest.setHours(0,0,0,0);
      const yestE= new Date(now); yestE.setDate(yestE.getDate()-1); yestE.setHours(23,59,59,999);
      const lwS  = new Date(now); lwS.setDate(lwS.getDate()-lwS.getDay()-7); lwS.setHours(0,0,0,0);
      const lwE  = new Date(lwS.getTime()+6*24*60*60*1000);
      const lmS  = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const lmE  = new Date(now.getFullYear(), now.getMonth(), 0);
      const lyS  = new Date(now.getFullYear()-1, 0, 1);
      const lyE  = new Date(now.getFullYear()-1, 11, 31);
      return { today:range(tod,todE), yesterday:range(yest,yestE), last_week:range(lwS,lwE), last_month:range(lmS,lmE), last_year:range(lyS,lyE) };
    } catch (e) {
      const empty = { revenue:0, profit:0, sales_count:0, has_data:false };
      return { today:{...empty}, yesterday:{...empty}, last_week:{...empty}, last_month:{...empty}, last_year:{...empty} };
    }
  },

  async updatePeriods() { return { success:true }; },

  // ---------------------------------------------------------------------------
  //  CALENDAR
  // ---------------------------------------------------------------------------

  async getCalendarData(year, month) {
    try {
      const sales     = await this.getSales();
      const summaries = {};
      sales.forEach(s => {
        const d = new Date(s.date);
        if (d.getFullYear()!==year || d.getMonth()+1!==month) return;
        const key = d.toISOString().split('T')[0];
        if (!summaries[key]) summaries[key] = { date:key, total_revenue:0, total_profit:0, transaction_count:0 };
        summaries[key].total_revenue     += parseFloat(s.total);
        summaries[key].total_profit      += parseFloat(s.profit);
        summaries[key].transaction_count += 1;
      });
      return { year, month, summaries:Object.values(summaries) };
    } catch (e) { return { year, month, summaries:[] }; }
  },

  async getDateDetails(dateStr) {
    try {
      const sales    = await this.getSales();
      const daySales = sales.filter(s => s.date.startsWith(dateStr));
      return { date:dateStr, sales:daySales, total_revenue:daySales.reduce((a,s)=>a+parseFloat(s.total),0), total_profit:daySales.reduce((a,s)=>a+parseFloat(s.profit),0), transaction_count:daySales.length };
    } catch (e) { return null; }
  },

  // ---------------------------------------------------------------------------
  //  DEBTORS
  // ---------------------------------------------------------------------------

  async getDebtors() {
    try {
      const db      = await this.getDB();
      const debtors = await idb.getAll(db, STORES.DEBTORS);
      const result  = [];
      for (const d of debtors) {
        const items = await idb.byIndex(db, STORES.DEBTOR_ITEMS, 'debtor_id', d.id);
        result.push({
          id:d.id, name:d.name, contact:d.contact||'',
          totalAmount:       parseFloat(d.total_debt       ||0),
          total_debt:        parseFloat(d.total_debt       ||0),
          original_total:    parseFloat(d.original_total   ||0),
          surcharge_percent: parseFloat(d.surcharge_percent||0),
          surcharge_amount:  parseFloat(d.surcharge_amount ||0),
          date:          d.date_borrowed,
          date_borrowed: d.date_borrowed,
          paid:      d.paid     ||false,
          date_paid: d.date_paid||null,
          products:items, items,
        });
      }
      return result.sort((a,b)=>{ if(a.paid!==b.paid) return a.paid?1:-1; return new Date(b.date_borrowed)-new Date(a.date_borrowed); });
    } catch (e) { console.error('❌ getDebtors:', e); return []; }
  },

  async addDebtor(debtor) {
    try {
      const db  = await this.getDB();
      const now = new Date().toISOString();
      const row = {
        name:debtor.name, contact:debtor.contact||'',
        total_debt:        parseFloat(debtor.total_debt||debtor.totalAmount||0),
        original_total:    parseFloat(debtor.original_total!==undefined?debtor.original_total:(debtor.total_debt||debtor.totalAmount||0)),
        surcharge_percent: parseFloat(debtor.surcharge_percent||0),
        surcharge_amount:  parseFloat(debtor.surcharge_amount ||0),
        paid:false, date_borrowed:now, date_paid:null,
      };
      const id = await idb.add(db, STORES.DEBTORS, row);
      for (const item of (debtor.products||debtor.items||[])) {
        await idb.add(db, STORES.DEBTOR_ITEMS, { debtor_id:id, product_id:item.id||item.productId||item.product_id, quantity:parseInt(item.quantity), price:parseFloat(item.price), cost:parseFloat(item.cost||0) });
      }
      await this.syncUI();
      return { ...row, id };
    } catch (e) { console.error('❌ addDebtor:', e); throw e; }
  },

  async updateDebtor(id, updates) {
    try {
      const db = await this.getDB();
      const d  = await idb.get(db, STORES.DEBTORS, id);
      if (!d) throw new Error('Debtor not found');
      if (updates.paid      !== undefined) d.paid      = updates.paid;
      if (updates.date_paid !== undefined) d.date_paid = updates.date_paid;
      await idb.put(db, STORES.DEBTORS, d);
      await this.syncUI();
      return d;
    } catch (e) { console.error('❌ updateDebtor:', e); throw e; }
  },

  async deleteDebtor(id) {
    try {
      const db    = await this.getDB();
      const items = await idb.byIndex(db, STORES.DEBTOR_ITEMS, 'debtor_id', id);
      for (const i of items) await idb.delete(db, STORES.DEBTOR_ITEMS, i.id);
      await idb.delete(db, STORES.DEBTORS, id);
      await this.syncUI();
      return true;
    } catch (e) { console.error('❌ deleteDebtor:', e); throw e; }
  },

  async clearPaidDebtors() {
    try {
      const paid = (await this.getDebtors()).filter(d=>d.paid);
      for (const d of paid) await this.deleteDebtor(d.id);
      await this.syncUI();
      return { count:paid.length };
    } catch (e) { throw e; }
  },

  async autoCleanupPaidDebtors() {
    try {
      const cutoff  = new Date(); cutoff.setFullYear(cutoff.getFullYear()-1);
      const expired = (await this.getDebtors()).filter(d=>d.paid&&d.date_paid&&new Date(d.date_paid)<cutoff);
      for (const d of expired) await this.deleteDebtor(d.id);
      return { count:expired.length };
    } catch (e) { return { count:0 }; }
  },

  // ---------------------------------------------------------------------------
  //  ACCUMULATED TOTALS
  // ---------------------------------------------------------------------------

  async getAccumulatedTotals() {
    try {
      const db  = await this.getDB();
      const row = await idb.get(db, STORES.ACCUMULATED, 1) || DEFAULT_ACCUMULATED;
      return { revenue:parseFloat(row.accumulated_revenue||0), profit:parseFloat(row.accumulated_profit||0), lastCleared:row.last_cleared||null };
    } catch (e) { return { revenue:0, profit:0, lastCleared:null }; }
  },

  async updateAccumulatedTotals(revenue, profit) {
    try {
      const db  = await this.getDB();
      const row = { id:1, accumulated_revenue:revenue, accumulated_profit:profit, last_cleared:new Date().toISOString() };
      await idb.put(db, STORES.ACCUMULATED, row);
      return row;
    } catch (e) { throw e; }
  },

  // ---------------------------------------------------------------------------
  //  SETTINGS
  // ---------------------------------------------------------------------------

  async getSettings() {
    try {
      const db = await this.getDB();
      return await idb.get(db, STORES.SETTINGS, 1) || DEFAULT_SETTINGS;
    } catch (e) { return DEFAULT_SETTINGS; }
  },

  async saveSettings(settings) {
    try {
      const db  = await this.getDB();
      const row = { id:1, ...settings };
      await idb.put(db, STORES.SETTINGS, row);
      return row;
    } catch (e) { throw e; }
  },

  // apiCall stub — keeps compatibility if any file calls it directly
  async apiCall(endpoint, method='GET', data=null) {
    console.warn(`⚠️ apiCall(${method} ${endpoint}) → routing to local IndexedDB`);
    if (endpoint==='/get-settings/')   return this.getSettings();
    if (endpoint==='/save-settings/')  return this.saveSettings(data);
    if (endpoint==='/accumulated-totals/' && method==='GET')  return this.getAccumulatedTotals();
    if (endpoint==='/accumulated-totals/' && method==='POST') return this.updateAccumulatedTotals(data.accumulated_revenue, data.accumulated_profit);
    if (endpoint==='/categories/' && method==='GET') return this.getCategories();
    if (endpoint==='/products/'   && method==='GET') return this.getProducts();
    if (endpoint==='/sales/'      && method==='GET') return this.getSales();
    if (endpoint==='/debtors/'    && method==='GET') return this.getDebtors();
    if (endpoint==='/period-totals/')  return this.getPeriodTotals();
    if (endpoint==='/update-periods/') return { success:true };
    const ym = endpoint.match(/\/calendar\/\?year=(\d+)&month=(\d+)/);
    if (ym) return this.getCalendarData(parseInt(ym[1]),parseInt(ym[2]));
    const ds = endpoint.match(/\/calendar\/(\d{4}-\d{2}-\d{2})\//);
    if (ds) return this.getDateDetails(ds[1]);
    return null;
  },

  // ---------------------------------------------------------------------------
  //  INIT
  // ---------------------------------------------------------------------------

  async init() {
    console.log('🗄️ Initialising local IndexedDB...');
    try {
      const db = await this.getDB();

      // Seed categories
      const cats = await idb.getAll(db, STORES.CATEGORIES);
      if (cats.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) await idb.add(db, STORES.CATEGORIES, cat);
        console.log('🌱 Default categories seeded');
      }

      // Seed settings
      if (!await idb.get(db, STORES.SETTINGS, 1))    await idb.put(db, STORES.SETTINGS,    DEFAULT_SETTINGS);

      // Seed accumulated totals
      if (!await idb.get(db, STORES.ACCUMULATED, 1)) await idb.put(db, STORES.ACCUMULATED, DEFAULT_ACCUMULATED);

      console.log('✅ Offline Database Ready — all data lives on this device');
    } catch (e) { console.error('❌ DB init failed:', e); }
    return Promise.resolve();
  },

  // ---------------------------------------------------------------------------
  //  CLEANUP STUBS (kept for compatibility)
  // ---------------------------------------------------------------------------
  async cleanupOldTransactions() { return { deleted_count:0 }; },
  async cleanupOldRecords()      { return { deleted_count:0 }; },
  async runAllCleanups()         { await this.autoCleanupPaidDebtors(); return { success:true }; },

  scheduleAutoCleanup() {
    const now  = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);
    if (window.autoCleanupTimeout) clearTimeout(window.autoCleanupTimeout);
    window.autoCleanupTimeout = setTimeout(async () => {
      await this.runAllCleanups();
      this.scheduleAutoCleanup();
    }, next - now);
    console.log(`⏰ Next cleanup at midnight (${Math.round((next-now)/60000)} min)`);
  },
};

window.DB = DB;
console.log('✅ database.js [OFFLINE MODE] loaded!');