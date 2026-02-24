// =============================================================================
//  PRICE LIST MODULE
//  UPDATED: getCategories() now async — fetches from DB.getCategories()
//           so dynamic/custom categories appear automatically.
// =============================================================================

// =============================================================================
//  1. GLOBAL VARIABLES & CONSTANTS
// =============================================================================

let selectedPriceCategory = null;

/**
 * Returns categories array.
 * Tries DB.getCategories() first; falls back to window.CATEGORIES.
 */
async function getCategories() {
    try {
        if (typeof DB !== 'undefined' && typeof DB.getCategories === 'function') {
            const cats = await DB.getCategories();
            if (cats && cats.length) {
                window.CATEGORIES = cats;   // keep global in sync
                return cats;
            }
        }
    } catch (e) {
        console.warn('⚠️ DB.getCategories() failed, using window.CATEGORIES fallback:', e);
    }

    if (window.CATEGORIES && Array.isArray(window.CATEGORIES)) {
        return window.CATEGORIES;
    }

    // Last resort — hardcoded defaults
    console.warn('⚠️ No categories found, using hardcoded defaults');
    const defaults = [
        { id:'beverages',           name:'Beverages',                    icon:'🥤',  color:'linear-gradient(135deg,#e3b04b 0%,#d19a3d 100%)' },
        { id:'school',              name:'School Supplies',               icon:'📚',  color:'linear-gradient(135deg,#d48c2e 0%,#ba7a26 100%)' },
        { id:'snacks',              name:'Snacks',                        icon:'🍿',  color:'linear-gradient(135deg,#a44a3f 0%,#934635 100%)' },
        { id:'foods',               name:'Whole Foods',                   icon:'🍚',  color:'linear-gradient(135deg,#967751 0%,#92784f 100%)' },
        { id:'bath',                name:'Bath, Hygiene & Laundry Soaps', icon:'🧼',  color:'linear-gradient(135deg,#f3c291 0%,#e5b382 100%)' },
        { id:'wholesale_beverages', name:'Wholesale Beverages',           icon:'📦',  color:'linear-gradient(135deg,#cc8451 0%,#b87545 100%)' },
        { id:'liquor',              name:'Hard Liquors',                  icon:'🍺',  color:'linear-gradient(135deg,#e2e8b0 0%,#ced49d 100%)' },
    ];
    window.CATEGORIES = defaults;
    return defaults;
}

// =============================================================================
//  2. INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Price list module initializing...');
    loadPriceList();
});

// =============================================================================
//  3. MAIN LOADING FUNCTION
// =============================================================================

async function loadPriceList() {
    console.log('📋 Loading price list...');

    const content = document.getElementById('priceListContent');
    if (!content) { console.error('❌ priceListContent element not found!'); return; }

    content.innerHTML = `
        <div style="text-align:center;padding:40px;">
            <div style="font-size:48px;animation:spin 1s linear infinite;">⏳</div>
            <p style="color:#666;margin-top:10px;">Loading price list...</p>
        </div>
        <style>@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
    `;

    try {
        const products = await DB.getProducts();
        if (!products || products.length === 0) {
            content.innerHTML = `
                <div style="margin:40px auto;max-width:500px;background:#fff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                    <div style="font-size:48px;margin-bottom:16px;">❌</div>
                    <h3 style="color:#a44a3f;margin-bottom:12px;">No products found</h3>
                    <p style="color:#a44a3f;">Add products in the Inventory page first.</p>
                </div>
            `;
            return;
        }

        if (!selectedPriceCategory) {
            await renderPriceCategorySelection(content);
        } else {
            await renderCategoryPriceList(content, selectedPriceCategory);
        }
    } catch (error) {
        console.error('❌ Error loading price list:', error);
        content.innerHTML = `
            <div style="margin:40px auto;max-width:500px;background:#fff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                <div style="font-size:48px;margin-bottom:16px;">❌</div>
                <h3 style="color:#a44a3f;margin-bottom:12px;">Error loading price list</h3>
                <p style="color:#a44a3f;">${error.message || error}</p>
                <button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;background:#cbdfbd;color:#3e5235;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Reload Page</button>
            </div>
        `;
    }
}

// =============================================================================
//  4. RENDER CATEGORY SELECTION GRID
// =============================================================================

async function renderPriceCategorySelection(content) {
    console.log('🎨 Building category selection grid...');

    const categories = await getCategories();

    if (!categories.length) {
        content.innerHTML = `<div style="text-align:center;padding:60px;"><h3 style="color:#a44a3f;">No categories defined</h3></div>`;
        return;
    }

    const allProducts = await DB.getProducts();
    let totalProducts = 0, avgProfit = 0, lowMargin = 0, highMargin = 0;

    if (Array.isArray(allProducts) && allProducts.length > 0) {
        totalProducts = allProducts.length;
        avgProfit = allProducts.reduce((sum, p) => {
            return sum + (parseFloat(p.price||p.selling_price||0) - parseFloat(p.cost||p.cost_price||0));
        }, 0) / allProducts.length;

        lowMargin = allProducts.filter(p => {
            const cost = parseFloat(p.cost||p.cost_price||0);
            const price = parseFloat(p.price||p.selling_price||0);
            return cost > 0 && ((price-cost)/cost*100) < 20;
        }).length;

        highMargin = allProducts.filter(p => {
            const cost = parseFloat(p.cost||p.cost_price||0);
            const price = parseFloat(p.price||p.selling_price||0);
            return cost > 0 && ((price-cost)/cost*100) > 50;
        }).length;
    }

    let html = `
        <div style="text-align:center;margin-bottom:30px;">
            <h2 class="page-title">Select a Category</h2>
            <p class="page-subtitle">Choose a category to manage prices</p>
        </div>

        <style>
            body.dark-mode .summary-stat-card{background:linear-gradient(135deg,#232323,#23282e)!important;box-shadow:0 2px 10px rgba(0,0,0,0.18)!important;}
            body.dark-mode .summary-stat-card .stat-label{color:#b0b0b0!important;}
            body.dark-mode .summary-stat-card .stat-value{color:#fff!important;}
        </style>
        <div style="display:flex;gap:16px;margin-bottom:32px;flex-wrap:wrap;justify-content:center;">
            <div class="summary-stat-card" style="display:flex;align-items:center;background:linear-gradient(135deg,#f7f4ef,#f3ede3);border-radius:16px;padding:18px 24px;min-width:180px;flex:1;max-width:280px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
                <span style="font-size:32px;margin-right:16px;">📦</span>
                <div><div class="stat-label" style="font-size:11px;font-weight:700;color:#9E9382;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">TOTAL PRODUCTS</div><div class="stat-value" style="font-size:26px;font-weight:900;color:#5D534A;">${totalProducts}</div></div>
            </div>
            <div class="summary-stat-card" style="display:flex;align-items:center;background:linear-gradient(135deg,#eaf7ef,#e3f3ed);border-radius:16px;padding:18px 24px;min-width:180px;flex:1;max-width:280px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
                <span style="font-size:32px;margin-right:16px;">💰</span>
                <div><div class="stat-label" style="font-size:11px;font-weight:700;color:#9E9382;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">AVG PROFIT</div><div class="stat-value" style="font-size:26px;font-weight:900;color:#5a7a5e;">₱${avgProfit.toFixed(2)}</div></div>
            </div>
            <div class="summary-stat-card" style="display:flex;align-items:center;background:linear-gradient(135deg,#f7f6e3,#f3f1d3);border-radius:16px;padding:18px 24px;min-width:180px;flex:1;max-width:280px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
                <span style="font-size:32px;margin-right:16px;">⚠️</span>
                <div><div class="stat-label" style="font-size:11px;font-weight:700;color:#9E9382;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">LOW MARGIN</div><div class="stat-value" style="font-size:26px;font-weight:900;color:#b8960e;">${lowMargin}</div></div>
            </div>
            <div class="summary-stat-card" style="display:flex;align-items:center;background:linear-gradient(135deg,#eaf7ef,#e3f3ed);border-radius:16px;padding:18px 24px;min-width:180px;flex:1;max-width:280px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
                <span style="font-size:32px;margin-right:16px;">✨</span>
                <div><div class="stat-label" style="font-size:11px;font-weight:700;color:#9E9382;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">HIGH MARGIN</div><div class="stat-value" style="font-size:26px;font-weight:900;color:#3e8245;">${highMargin}</div></div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;margin-bottom:30px;">
    `;

    for (const cat of categories) {
        html += `
            <div class="category-card-debtor" data-category="${cat.id}" style="border-left-color:${cat.color};">
                <div class="category-card-header">
                    <div class="category-icon-box" style="background:${cat.color};"><span class="category-icon">${cat.icon}</span></div>
                    <div class="category-details">
                        <span class="category-name">${cat.name}</span>
                        <span class="category-count">Click to view prices</span>
                    </div>
                    <span class="category-arrow">→</span>
                </div>
            </div>
        `;
    }

    html += '</div>';
    html += getSharedStyles();
    content.innerHTML = html;

    document.querySelectorAll('.category-card-debtor').forEach(card => {
        card.addEventListener('click', function() {
            selectedPriceCategory = this.getAttribute('data-category');
            loadPriceList();
        });
    });
}

// =============================================================================
//  5. RENDER CATEGORY PRICE LIST
// =============================================================================

async function renderCategoryPriceList(content, categoryId) {
    console.log('📊 Rendering price list for:', categoryId);

    const categories = await getCategories();
    const category   = categories.find(c => c.id === categoryId);

    if (!category) {
        console.error('❌ Category not found:', categoryId);
        selectedPriceCategory = null;
        await loadPriceList();
        return;
    }

    const allProducts = await DB.getProducts();
    if (!Array.isArray(allProducts)) throw new Error('Products data is not available');

    const products = allProducts.filter(p => (p.category||p.category_id) === categoryId);
    console.log(`✅ Found ${products.length} products for '${categoryId}'`);

    const totalItems = products.length;
    const avgProfit  = products.length ? products.reduce((s, p) => {
        return s + (parseFloat(p.price||p.selling_price||0) - parseFloat(p.cost||p.cost_price||0));
    }, 0) / products.length : 0;

    const lowMargin  = products.filter(p => { const cost=parseFloat(p.cost||p.cost_price||0),price=parseFloat(p.price||p.selling_price||0); return cost>0 && ((price-cost)/cost*100)<20; }).length;
    const highMargin = products.filter(p => { const cost=parseFloat(p.cost||p.cost_price||0),price=parseFloat(p.price||p.selling_price||0); return cost>0 && ((price-cost)/cost*100)>50; }).length;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:15px;">
            <div>
                <h2 class="page-title">${category.icon} ${category.name}</h2>
                <p class="page-subtitle">Manage prices in this category</p>
            </div>
            <button id="btnBackToPriceCategories" class="back-btn">← Back to Categories</button>
        </div>

        <div style="display:flex;gap:14px;margin-bottom:24px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(212,163,115,0.18),rgba(188,140,91,0.08));border-radius:12px;padding:12px 20px;border-left:3px solid #d4a373;flex:1;min-width:150px;">
                <span style="font-size:22px;">📦</span>
                <div><div style="font-size:10px;font-weight:700;color:#9E9382;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Products</div><div style="font-size:20px;font-weight:800;color:#5D534A;">${totalItems}</div></div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(90,158,111,0.14),rgba(74,140,95,0.06));border-radius:12px;padding:12px 20px;border-left:3px solid #5a9e6f;flex:1;min-width:150px;">
                <span style="font-size:22px;">💰</span>
                <div><div style="font-size:10px;font-weight:700;color:#9E9382;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Avg Profit</div><div style="font-size:20px;font-weight:800;color:#5a7a5e;">₱${avgProfit.toFixed(2)}</div></div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(230,200,110,0.18),rgba(212,184,92,0.08));border-radius:12px;padding:12px 20px;border-left:3px solid #e6c86e;flex:1;min-width:150px;">
                <span style="font-size:22px;">⚠️</span>
                <div><div style="font-size:10px;font-weight:700;color:#9E9382;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Low Margin</div><div style="font-size:20px;font-weight:800;color:#b8960e;">${lowMargin}</div></div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(123,196,127,0.14),rgba(90,158,111,0.06));border-radius:12px;padding:12px 20px;border-left:3px solid #7bc47f;flex:1;min-width:150px;">
                <span style="font-size:22px;">✨</span>
                <div><div style="font-size:10px;font-weight:700;color:#9E9382;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">High Margin</div><div style="font-size:20px;font-weight:800;color:#3e8245;">${highMargin}</div></div>
            </div>
        </div>

        <div style="background:linear-gradient(135deg,rgba(203,223,189,0.15),rgba(203,223,189,0.08));border-left:3px solid #cbdfbd;padding:14px 18px;margin-bottom:24px;border-radius:10px;display:flex;align-items:center;gap:10px;">
            <span style="font-size:24px;">💡</span>
            <p style="margin:0;font-size:13px;color:#9E9382;"><strong style="color:#5D534A;">Pro Tip:</strong> Click on any price field to edit. Changes save automatically!</p>
        </div>
    `;

    if (products.length === 0) {
        html += `
            <div style="background:white;border-radius:16px;padding:60px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                <div style="font-size:80px;margin-bottom:20px;opacity:0.3;">${category.icon}</div>
                <h3 style="color:#9E9382;margin-bottom:10px;font-size:1.5rem;">No products in this category</h3>
                <p style="color:#BDC3C7;font-size:15px;">Add products in the Inventory page first!</p>
            </div>
        `;
    } else {
        const sorted = [...products].sort((a, b) => (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase()));

        if (isMobile) {
            html += '<div class="price-mobile-cards">';
            sorted.forEach(product => {
                const cost   = parseFloat(product.cost||product.cost_price||0);
                const price  = parseFloat(product.price||product.selling_price||0);
                const qty    = parseFloat(product.quantity||product.stock||0);
                const profit = price - cost;
                const margin = cost > 0 ? ((profit/cost)*100) : 0;
                const isOut  = qty===0, isLow = !isOut && qty<10;
                const borderL = isOut ? 'border-left:4px solid #a44a3f;' : isLow ? 'border-left:4px solid #d4a726;' : '';
                const cardBg  = isOut ? 'background:rgba(241,156,121,0.08);' : isLow ? 'background:rgba(246,244,210,0.3);' : 'background:white;';
                const marginBg = margin<20 ? 'background:linear-gradient(135deg,#e8dcc8,#d9cdb8);color:#3d3822;'
                               : margin>50 ? 'background:linear-gradient(135deg,#b8c999,#9db384);color:#1f3a1f;'
                               : 'background:linear-gradient(135deg,#c9d99a,#b8c686);color:#2d3a1a;';
                html += `
                    <div class="price-card" style="${cardBg}${borderL}border-radius:12px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 6px rgba(0,0,0,0.06);border:1px solid #e8e8e8;">
                        <div style="font-weight:700;font-size:15px;color:#3e5235;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #f0f0f0;">${product.name}</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                            <div style="text-align:center;"><div style="font-size:11px;color:#9E9382;font-weight:600;margin-bottom:4px;">COST PRICE</div>
                                <input type="number" value="${cost.toFixed(2)}" class="price-input cost-input" data-product-id="${product.id}" step="0.01" min="0" style="width:100%;padding:8px;text-align:center;border-radius:8px;font-weight:700;font-size:14px;background:rgba(241,156,121,0.15);border:2px solid #f19c79;color:#5D534A;box-sizing:border-box;"/>
                            </div>
                            <div style="text-align:center;"><div style="font-size:11px;color:#9E9382;font-weight:600;margin-bottom:4px;">SELL PRICE</div>
                                <input type="number" value="${price.toFixed(2)}" class="price-input sell-input" data-product-id="${product.id}" step="0.01" min="0" style="width:100%;padding:8px;text-align:center;border-radius:8px;font-weight:700;font-size:14px;background:rgba(203,223,189,0.2);border:2px solid #cbdfbd;color:#5D534A;box-sizing:border-box;"/>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;">
                            <div style="padding:6px 4px;border-radius:6px;${profit>0?'background:rgba(203,223,189,0.2);color:#5a7a5e;':'background:rgba(241,156,121,0.15);color:#a44a3f;'}">
                                <div style="font-size:10px;font-weight:600;opacity:0.7;margin-bottom:2px;">PROFIT</div>
                                <div style="font-weight:700;font-size:14px;">₱${profit.toFixed(2)}</div>
                            </div>
                            <div style="padding:6px 4px;border-radius:6px;${marginBg}">
                                <div style="font-size:10px;font-weight:600;opacity:0.7;margin-bottom:2px;">MARGIN</div>
                                <div style="font-weight:700;font-size:14px;">${margin.toFixed(1)}%</div>
                            </div>
                            <div style="padding:6px 4px;border-radius:6px;background:rgba(158,147,130,0.1);">
                                <div style="font-size:10px;font-weight:600;color:#9E9382;margin-bottom:2px;">STOCK</div>
                                <div style="font-weight:700;font-size:14px;color:#5D534A;">${qty}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        } else {
            html += `
                <div class="table-container">
                    <table class="price-table-modern">
                        <thead><tr>
                            <th style="text-align:left;">PRODUCT NAME</th>
                            <th>COST PRICE</th><th>SELLING PRICE</th>
                            <th>PROFIT/UNIT</th><th>MARGIN %</th><th>STOCK</th>
                        </tr></thead>
                        <tbody>
            `;
            sorted.forEach(product => {
                const cost   = parseFloat(product.cost||product.cost_price||0);
                const price  = parseFloat(product.price||product.selling_price||0);
                const qty    = parseFloat(product.quantity||product.stock||0);
                const profit = price - cost;
                const margin = cost > 0 ? ((profit/cost)*100) : 0;
                const stockClass  = qty===0 ? 'out-of-stock-row' : qty<10 ? 'low-stock-row' : '';
                const marginClass = margin<20 ? 'margin-low' : margin>50 ? 'margin-high' : 'margin-normal';
                html += `
                    <tr class="${stockClass}">
                        <td style="text-align:left;"><strong class="product-name">${product.name}</strong></td>
                        <td><input type="number" value="${cost.toFixed(2)}" class="price-input cost-input" data-product-id="${product.id}" step="0.01" min="0"/></td>
                        <td><input type="number" value="${price.toFixed(2)}" class="price-input sell-input" data-product-id="${product.id}" step="0.01" min="0"/></td>
                        <td><div class="profit-badge ${profit>0?'profit-positive':'profit-negative'}">₱${profit.toFixed(2)}</div></td>
                        <td><div class="margin-badge ${marginClass}">${margin.toFixed(1)}%</div></td>
                        <td><span class="stock-text">${qty} units</span></td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
        }
    }

    html += getSharedStyles();
    html += getPriceListStyles();
    content.innerHTML = html;

    document.getElementById('btnBackToPriceCategories')?.addEventListener('click', () => {
        selectedPriceCategory = null;
        loadPriceList();
    });

    document.querySelectorAll('.cost-input').forEach(input => {
        input.addEventListener('change', function() { updatePrice(parseInt(this.getAttribute('data-product-id')), 'cost', this.value); });
        input.addEventListener('focus', function() { this.select(); });
    });

    document.querySelectorAll('.sell-input').forEach(input => {
        input.addEventListener('change', function() { updatePrice(parseInt(this.getAttribute('data-product-id')), 'price', this.value); });
        input.addEventListener('focus', function() { this.select(); });
    });
}

// =============================================================================
//  6. UPDATE PRICE
// =============================================================================

async function updatePrice(id, field, newValue) {
    const value = parseFloat(newValue);
    if (isNaN(value) || value < 0) {
        if (typeof window.showModernAlert === 'function') window.showModernAlert('Price must be 0 or greater.', '⚠️');
        else alert('Price must be 0 or greater.');
        await loadPriceList();
        return;
    }

    try {
        const products = await DB.getProducts();
        const product  = products.find(p => p.id === id);
        if (!product) { alert('Product not found!'); return; }

        const cost     = parseFloat(product.cost||product.cost_price||0);
        const price    = parseFloat(product.price||product.selling_price||0);
        const newCost  = field==='cost'  ? value : cost;
        const newPrice = field==='price' ? value : price;

        // Selling below cost?
        if (newPrice < newCost) {
            const lossPerUnit = (newCost - newPrice).toFixed(2);
            const isDark = document.body.classList.contains('dark-mode');

            const confirmed = await new Promise(resolve => {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:10000;';
                overlay.innerHTML = `
                    <div style="background:${isDark?'linear-gradient(135deg,#2a2a2a,#1e1e1e)':'linear-gradient(135deg,#fff,#fef9f5)'};border-radius:24px;padding:0;max-width:480px;width:90%;box-shadow:0 25px 70px rgba(164,74,63,0.4);animation:lossIn 0.4s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden;border:3px solid ${isDark?'#ff6b6b':'#a44a3f'};">
                        <div style="background:linear-gradient(135deg,#a44a3f,#8b3a31);padding:28px 32px;text-align:center;">
                            <div style="font-size:64px;margin-bottom:12px;">🚨</div>
                            <h2 style="color:#fff;margin:0;font-size:1.8rem;font-weight:900;">LOSS ALERT!</h2>
                        </div>
                        <div style="padding:28px 32px;">
                            <div style="background:${isDark?'rgba(241,156,121,0.1)':'rgba(241,156,121,0.15)'};border-left:4px solid #f19c79;border-radius:12px;padding:20px;margin-bottom:22px;">
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                    <div style="text-align:center;padding:10px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.7)'};border-radius:8px;">
                                        <div style="font-size:11px;font-weight:700;color:${isDark?'#b0b0b0':'#9E9382'};text-transform:uppercase;margin-bottom:6px;">Cost Price</div>
                                        <div style="font-size:22px;font-weight:900;color:${isDark?'#ff8a7a':'#a44a3f'};">₱${newCost.toFixed(2)}</div>
                                    </div>
                                    <div style="text-align:center;padding:10px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.7)'};border-radius:8px;">
                                        <div style="font-size:11px;font-weight:700;color:${isDark?'#b0b0b0':'#9E9382'};text-transform:uppercase;margin-bottom:6px;">Sell Price</div>
                                        <div style="font-size:22px;font-weight:900;color:${isDark?'#ff8a7a':'#a44a3f'};">₱${newPrice.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div style="text-align:center;padding:14px;background:linear-gradient(135deg,#a44a3f,#8b3a31);border-radius:10px;">
                                    <div style="font-size:11px;color:rgba(255,255,255,0.9);font-weight:700;text-transform:uppercase;margin-bottom:6px;">Loss Per Unit</div>
                                    <div style="font-size:30px;font-weight:900;color:#fff;">₱${lossPerUnit}</div>
                                </div>
                            </div>
                            <p style="text-align:center;font-size:15px;font-weight:600;color:${isDark?'#f0f0f0':'#5D534A'};margin:0 0 22px;">Are you sure you want to proceed?</p>
                            <div style="display:flex;gap:12px;">
                                <button id="lossCancel" style="flex:1;padding:14px;border-radius:12px;font-weight:700;background:linear-gradient(135deg,${isDark?'#2d5a3d':'#7bc47f'},${isDark?'#1f3e2a':'#5a9e6f'});color:${isDark?'#a8e6aa':'white'};border:none;cursor:pointer;">✓ Cancel</button>
                                <button id="lossConfirm" style="flex:1;padding:14px;border-radius:12px;font-weight:700;background:linear-gradient(135deg,#a44a3f,#8b3a31);color:white;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(164,74,63,0.4);">⚠️ Proceed</button>
                            </div>
                        </div>
                        <style>@keyframes lossIn{from{transform:translateY(50px) scale(0.9);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}</style>
                    </div>
                `;
                document.body.appendChild(overlay);
                const cleanup = r => { overlay.remove(); resolve(r); };
                document.getElementById('lossConfirm').onclick = () => cleanup(true);
                document.getElementById('lossCancel').onclick  = () => cleanup(false);
                overlay.onclick = e => { if (e.target===overlay) cleanup(false); };
            });

            if (!confirmed) { await loadPriceList(); return; }

        } else {
            // Check margin — warn but allow proceeding
            const margin    = ((newPrice - newCost) / newCost) * 100;
            const minMargin = window.storeSettings?.profitMargin || 20;
            if (newCost > 0 && margin < minMargin) {
                const recommended   = (newCost * (1 + minMargin / 100)).toFixed(2);
                const profitPerUnit = (newPrice - newCost).toFixed(2);
                const isDark = document.body.classList.contains('dark-mode');

                const choice = await new Promise(resolve => {
                    const overlay = document.createElement('div');
                    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:10000;';
                    overlay.innerHTML = `
                        <div style="background:${isDark?'linear-gradient(135deg,#2a2a2a,#1e1e1e)':'linear-gradient(135deg,#fff,#fef9f5)'};border-radius:24px;padding:0;max-width:480px;width:90%;overflow:hidden;border:3px solid ${isDark?'#e6c86e':'#d4a726'};animation:margIn2 0.4s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 25px 70px rgba(212,167,38,0.4);">
                            <div style="background:linear-gradient(135deg,#d4a726,#b8960e);padding:22px 28px;text-align:center;">
                                <div style="font-size:52px;margin-bottom:6px;">⚠️</div>
                                <h2 style="color:#fff;margin:0;font-size:1.5rem;font-weight:900;">LOW PROFIT MARGIN</h2>
                                <p style="color:rgba(255,255,255,0.85);margin:5px 0 0;font-size:13px;">Below your ${minMargin}% store requirement</p>
                            </div>
                            <div style="padding:22px 24px;">
                                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
                                    <div style="text-align:center;padding:10px 6px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.8)'};border-radius:10px;">
                                        <div style="font-size:10px;font-weight:700;color:${isDark?'#b0b0b0':'#9E9382'};text-transform:uppercase;margin-bottom:5px;">Your Margin</div>
                                        <div style="font-size:19px;font-weight:900;color:${isDark?'#e6c86e':'#d4a726'};">${margin.toFixed(1)}%</div>
                                    </div>
                                    <div style="text-align:center;padding:10px 6px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.8)'};border-radius:10px;">
                                        <div style="font-size:10px;font-weight:700;color:${isDark?'#b0b0b0':'#9E9382'};text-transform:uppercase;margin-bottom:5px;">Required</div>
                                        <div style="font-size:19px;font-weight:900;color:${isDark?'#7bc47f':'#5a9e6f'};">${minMargin}%</div>
                                    </div>
                                    <div style="text-align:center;padding:10px 6px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.8)'};border-radius:10px;">
                                        <div style="font-size:10px;font-weight:700;color:${isDark?'#b0b0b0':'#9E9382'};text-transform:uppercase;margin-bottom:5px;">Profit/Unit</div>
                                        <div style="font-size:19px;font-weight:900;color:${isDark?'#f0f0f0':'#5D534A'};">₱${profitPerUnit}</div>
                                    </div>
                                </div>
                                <div style="text-align:center;padding:12px;background:linear-gradient(135deg,${isDark?'rgba(45,90,61,0.5)':'rgba(203,223,189,0.3)'},${isDark?'rgba(30,62,42,0.4)':'rgba(168,201,156,0.2)'});border:1px solid ${isDark?'rgba(90,158,111,0.3)':'rgba(168,201,156,0.5)'};border-radius:12px;margin-bottom:16px;">
                                    <div style="font-size:10px;font-weight:700;color:${isDark?'#7bc47f':'#3e5235'};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">💡 Recommended Price</div>
                                    <div style="font-size:24px;font-weight:900;color:${isDark?'#a8e6aa':'#2d5a3b'};">₱${recommended}</div>
                                    <div style="font-size:11px;color:${isDark?'#7bc47f':'#5a7a5e'};margin-top:3px;">achieves exactly ${minMargin}% margin</div>
                                </div>
                                <div style="display:flex;gap:8px;">
                                    <button id="margAdjust" style="flex:1.3;padding:13px 8px;border-radius:11px;font-weight:800;font-size:13px;cursor:pointer;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;box-shadow:0 4px 12px rgba(239,68,68,0.4);">✓ Use ₱${recommended}</button>
                                    <button id="margProceed" style="flex:1;padding:13px 8px;border-radius:11px;font-weight:700;font-size:12px;cursor:pointer;background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#2d5a3b;border:none;box-shadow:0 4px 12px rgba(203,223,189,0.4);">Keep ₱${newPrice.toFixed(2)}</button>
                                </div>
                            </div>
                            <style>@keyframes margIn2{from{transform:translateY(50px) scale(0.9);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}</style>
                        </div>
                    `;
                    document.body.appendChild(overlay);
                    document.getElementById('margAdjust').onclick  = () => { overlay.remove(); resolve('adjust');  };
                    document.getElementById('margProceed').onclick = () => { overlay.remove(); resolve('proceed'); };
                    overlay.onclick = e => { if (e.target === overlay) { overlay.remove(); resolve('cancel'); } };
                });

                if (choice === 'adjust') {
                    await DB.updateProduct(id, { price: parseFloat(recommended) });
                    await loadPriceList();
                    if (typeof renderProfit === 'function') await renderProfit();
                    return;
                } else if (choice === 'cancel') {
                    await loadPriceList();
                    return;
                }
                // 'proceed' — falls through to the normal save below
            }
        }

        await DB.updateProduct(id, { [field]: value });
        console.log(`✅ Price updated for product ${id}: ${field}=₱${value.toFixed(2)}`);
        await loadPriceList();
        if (typeof renderProfit === 'function') await renderProfit();

    } catch (error) {
        console.error('❌ Error updating price:', error);
        const msg = 'Failed to update price. Please try again.';
        if (typeof window.showModernAlert === 'function') window.showModernAlert(msg, '❌');
        else alert(msg);
    }
}

// =============================================================================
//  7. SHARED STYLES
// =============================================================================

function getSharedStyles() {
    return `
        <style>
            .page-title{color:#5D534A;margin-bottom:8px;font-size:2rem;font-weight:800;}
            .page-subtitle{color:#9E9382;font-size:16px;}
            .category-card-debtor{background:rgba(255,255,255,0.8);border-radius:16px;padding:20px;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);border-left:4px solid;box-shadow:0 2px 8px rgba(0,0,0,0.06);}
            .category-card-debtor:hover{transform:translateX(8px);box-shadow:0 8px 25px rgba(0,0,0,0.12);}
            .category-card-debtor:active{transform:translateX(4px);}
            .category-card-header{display:flex;align-items:center;gap:16px;}
            .category-icon-box{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);flex-shrink:0;}
            .category-icon{font-size:26px;}
            .category-details{flex:1;display:flex;flex-direction:column;gap:4px;}
            .category-name{font-size:16px;font-weight:700;color:#5D534A;}
            .category-count{font-size:13px;color:#9E9382;}
            .category-arrow{color:#9E9382;opacity:0.5;transition:all 0.3s ease;font-size:20px;}
            .category-card-debtor:hover .category-arrow{opacity:1;transform:translateX(4px);}
            .back-btn{padding:12px 24px;background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#3e5235;border:none;border-radius:12px;cursor:pointer;font-weight:700;font-size:14px;transition:all 0.3s ease;box-shadow:0 4px 15px rgba(203,223,189,0.4);}
            .back-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(203,223,189,0.5);}
            body.dark-mode .page-title{color:#f0f0f0!important;}
            body.dark-mode .page-subtitle{color:#a0a0a0!important;}
            body.dark-mode .category-card-debtor{background:linear-gradient(135deg,rgba(40,50,60,0.9),rgba(30,40,50,0.8))!important;}
            body.dark-mode .category-card-debtor:hover{background:linear-gradient(135deg,rgba(50,60,70,0.95),rgba(40,50,60,0.85))!important;box-shadow:0 8px 30px rgba(0,0,0,0.4)!important;}
            body.dark-mode .category-name{color:#f0f0f0!important;}
            body.dark-mode .category-count{color:#a0a0a0!important;}
            body.dark-mode .back-btn{background:linear-gradient(135deg,#1e2e22,#162019)!important;color:#7aab8a!important;box-shadow:0 4px 12px rgba(0,0,0,0.4)!important;border:1px solid #2d4a33!important;}
            body.dark-mode .back-btn:hover{background:linear-gradient(135deg,#253828,#1c2a20)!important;box-shadow:0 6px 16px rgba(0,0,0,0.5)!important;}
        </style>
    `;
}

function getPriceListStyles() {
    return `
        <style>
            .table-container{background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
            .price-table-modern{width:100%;border-collapse:collapse;}
            .price-table-modern th{background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#3e5235;padding:20px 15px;text-align:center;font-weight:700;font-size:12px;letter-spacing:1.2px;}
            .price-table-modern td{padding:20px 15px;text-align:center;border-bottom:1px solid #F0F0F0;}
            .price-table-modern tr:hover{background:rgba(203,223,189,0.1);}
            .product-name{font-size:15px;color:#5D534A;}
            .price-input{width:110px;padding:12px 16px;text-align:center;border-radius:10px;font-weight:700;font-size:16px;transition:all 0.3s ease;}
            .price-input:focus{outline:none;transform:scale(1.05);box-shadow:0 0 0 4px rgba(203,223,189,0.2);}
            .cost-input{background:rgba(241,156,121,0.15);border:2px solid #f19c79;color:#5D534A;}
            .cost-input:hover{border-color:#ed8d68;}
            .sell-input{background:rgba(203,223,189,0.2);border:2px solid #cbdfbd;color:#5D534A;}
            .sell-input:hover{border-color:#a8c99c;}
            .profit-badge{display:inline-block;padding:8px 16px;border-radius:8px;font-weight:700;font-size:15px;}
            .profit-positive{background:rgba(203,223,189,0.2);color:#5a7a5e;}
            .profit-negative{background:rgba(241,156,121,0.15);color:#a44a3f;}
            .margin-badge{display:inline-block;padding:8px 16px;border-radius:8px;font-weight:700;font-size:15px;min-width:70px;}
            .margin-low{background:linear-gradient(135deg,#e8dcc8,#d9cdb8);color:#3d3822;}
            .margin-normal{background:linear-gradient(135deg,#c9d99a,#b8c686);color:#2d3a1a;}
            .margin-high{background:linear-gradient(135deg,#b8c999,#9db384);color:#1f3a1f;}
            .stock-text{font-size:16px;font-weight:600;color:#9E9382;}
            .low-stock-row{background:rgba(246,244,210,0.5)!important;border-left:5px solid #d4a726!important;}
            .out-of-stock-row{background:rgba(241,156,121,0.15)!important;border-left:5px solid #a44a3f!important;}
            body.dark-mode .table-container{background:#1a1a1a!important;}
            body.dark-mode .price-table-modern th{background:linear-gradient(135deg,#2d3e36,#1f2e28)!important;color:#a8c99c!important;}
            body.dark-mode .price-table-modern td{border-bottom-color:#333!important;}
            body.dark-mode .price-table-modern tr:hover{background:rgba(90,122,94,0.15)!important;}
            body.dark-mode .product-name{color:#f0f0f0!important;}
            body.dark-mode .cost-input{background:rgba(241,156,121,0.1)!important;color:#ffb399!important;border-color:#a44a3f!important;}
            body.dark-mode .sell-input{background:rgba(203,223,189,0.1)!important;color:#b8e6aa!important;border-color:#5a9e6f!important;}
            body.dark-mode .profit-positive{background:rgba(90,158,111,0.2)!important;color:#7bc47f!important;}
            body.dark-mode .profit-negative{background:rgba(164,74,63,0.2)!important;color:#ff8a7a!important;}
            body.dark-mode .margin-low{background:#2a2520!important;color:#e6c86e!important;}
            body.dark-mode .margin-normal{background:#1f2a1f!important;color:#a8c99c!important;}
            body.dark-mode .margin-high{background:#1a2a1a!important;color:#7bc47f!important;}
            body.dark-mode .stock-text{color:#a0a0a0!important;}
            body.dark-mode .low-stock-row{background:rgba(180,150,90,0.15)!important;}
            body.dark-mode .out-of-stock-row{background:rgba(164,74,63,0.15)!important;}
            body.dark-mode .price-card{background:#1e1e1e!important;border-color:#333!important;}
            @media(max-width:768px){.page-title{font-size:1.5rem;}}
        </style>
    `;
}

// =============================================================================
//  8. EXPORTS
// =============================================================================

window.renderPriceList = loadPriceList;
window.updatePrice     = updatePrice;