/**
 * inventory.js — Inventory management page.
 */

console.log('📦 Loading inventory module...');

(function injectModernDialogStyles() {
    const styleId = 'modern-dialog-override-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        #customDialogOverlay{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;background:rgba(0,0,0,0.5)!important;backdrop-filter:blur(12px)!important;display:none!important;justify-content:center!important;align-items:center!important;z-index:20000!important;}
        #customDialogOverlay.active{display:flex!important;}
        #customDialogOverlay .dialog-box{background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.9))!important;border-radius:28px!important;padding:45px 40px 40px!important;width:90%!important;max-width:450px!important;box-shadow:0 30px 80px rgba(0,0,0,0.25)!important;text-align:center!important;position:relative!important;overflow:hidden!important;}
        #customDialogOverlay .dialog-icon-wrapper{width:90px!important;height:90px!important;margin:0 auto 28px!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:50%!important;background:linear-gradient(135deg,#cbdfbd,#a8c99c)!important;}
        #customDialogOverlay .dialog-icon{font-size:52px!important;}
        #customDialogOverlay .dialog-title{font-size:26px!important;font-weight:900!important;background:linear-gradient(135deg,#2d3748,#5D534A)!important;-webkit-background-clip:text!important;-webkit-text-fill-color:transparent!important;margin:0 0 14px 0!important;}
        #customDialogOverlay .dialog-message{font-size:16px!important;line-height:1.7!important;color:#718096!important;margin-bottom:35px!important;}
        #customDialogOverlay .dialog-buttons{display:flex!important;flex-direction:column!important;gap:14px!important;}
        #customDialogOverlay .dialog-btn{width:100%!important;padding:18px 28px!important;border:none!important;border-radius:16px!important;font-weight:800!important;font-size:16px!important;cursor:pointer!important;}
        #customDialogOverlay .dialog-btn-primary{background:linear-gradient(135deg,#cbdfbd,#a8c99c)!important;color:#2d5a3b!important;}
    `;
    document.head.appendChild(style);
})();

let selectedCategory = null;

if (typeof window.CATEGORIES === 'undefined') {
    window.CATEGORIES = [
        { id:'beverages',           name:'Beverages',                    icon:'🥤',  color:'linear-gradient(135deg,#e3b04b 0%,#d19a3d 100%)' },
        { id:'school',              name:'School Supplies',               icon:'📚',  color:'linear-gradient(135deg,#d48c2e 0%,#ba7a26 100%)' },
        { id:'snacks',              name:'Snacks',                        icon:'🍿',  color:'linear-gradient(135deg,#a44a3f 0%,#934635 100%)' },
        { id:'foods',               name:'Whole Foods',                   icon:'🍚',  color:'linear-gradient(135deg,#967751 0%,#92784f 100%)' },
        { id:'bath',                name:'Bath, Hygiene & Laundry Soaps', icon:'🧼',  color:'linear-gradient(135deg,#f3c291 0%,#e5b382 100%)' },
        { id:'wholesale_beverages', name:'Wholesale Beverages',           icon:'📦',  color:'linear-gradient(135deg,#cc8451 0%,#b87545 100%)' },
        { id:'liquor',              name:'Hard Liquors',                  icon:'🍺',  color:'linear-gradient(135deg,#e2e8b0 0%,#ced49d 100%)' },
    ];
}
var CATEGORIES = window.CATEGORIES;

function calculateMargin(cost, price) { return cost === 0 ? 0 : ((price - cost) / cost) * 100; }

function calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase(), s2 = str2.toLowerCase();
    if (s1 === s2) return 100;
    if (s1.includes(s2) || s2.includes(s1)) return 85;
    const longer  = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 100;
    return ((longer.length - getEditDistance(shorter, longer)) / longer.length) * 100;
}

function getEditDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) { costs[j] = j; }
            else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1))
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

window.renderInventory = async function () {
    const content = document.getElementById('inventoryContent');
    if (!content) { console.error('❌ inventoryContent not found!'); return; }

    content.innerHTML = `
        <div style="text-align:center;padding:40px;">
            <div style="font-size:48px;animation:spin 1s linear infinite;">⏳</div>
            <p style="color:#666;margin-top:10px;">Loading inventory...</p>
        </div>
        <style>@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
    `;

    try {
        if (typeof DB.getCategories === 'function') {
            const freshCats = await DB.getCategories();
            if (freshCats && freshCats.length) {
                window.CATEGORIES = freshCats;
                CATEGORIES = freshCats;
            }
        }

        if (!selectedCategory) {
            await renderCategorySelection(content);
        } else {
            await renderCategoryInventory(content, selectedCategory);
        }
    } catch (error) {
        console.error('❌ Error rendering inventory:', error);
        content.innerHTML = `
            <div style="text-align:center;padding:40px;color:#a44a3f;">
                <h2>⚠️ Error Loading Inventory</h2>
                <p>${error.message || 'An unexpected error occurred'}</p>
                <button onclick="window.renderInventory()" style="padding:12px 24px;background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#3e5235;border:none;border-radius:12px;cursor:pointer;font-weight:700;margin-top:20px;">Retry</button>
            </div>
        `;
    }
};

async function renderCategorySelection(content) {
    const products = await DB.getProducts();
    if (!Array.isArray(products)) throw new Error('Products data is not available');

    const lowStockLimit   = window.storeSettings?.lowStockLimit || 10;
    const totalProducts   = products.length;
    const totalLowStock   = products.filter(p => { const q = parseFloat(p.quantity||0); return q < lowStockLimit && q > 0; }).length;
    const totalOutOfStock = products.filter(p => parseFloat(p.quantity||0) === 0).length;

    let html = `
        <div style="text-align:center;margin-bottom:40px;">
            <h2 style="color:var(--text-primary,#5D534A);margin-bottom:8px;font-size:2rem;font-weight:800;">📦 Inventory Management</h2>
            <p style="color:var(--text-secondary,#9E9382);font-size:16px;">Select a category to manage products</p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:40px;">
            <div class="debtor-style-card" style="background:linear-gradient(135deg,rgba(139,92,84,0.3),rgba(139,92,84,0.15));border-left:4px solid #d4a373;">
                <div class="card-icon" style="background:linear-gradient(135deg,#d4a373,#bc8c5b);">💰</div>
                <div class="card-info"><span class="card-label">TOTAL PRODUCTS</span><span class="card-value">${totalProducts}</span></div>
            </div>
            <div class="debtor-style-card" style="background:linear-gradient(135deg,rgba(180,150,90,0.3),rgba(180,150,90,0.15));border-left:4px solid #e6c86e;">
                <div class="card-icon" style="background:linear-gradient(135deg,#e6c86e,#d4b85c);">⚠️</div>
                <div class="card-info"><span class="card-label">LOW STOCK</span><span class="card-value">${totalLowStock}</span></div>
            </div>
            <div class="debtor-style-card" style="background:linear-gradient(135deg,rgba(76,140,92,0.3),rgba(76,140,92,0.15));border-left:4px solid #5a9e6f;">
                <div class="card-icon" style="background:linear-gradient(135deg,#5a9e6f,#4a8c5f);">✅</div>
                <div class="card-info"><span class="card-label">OUT OF STOCK</span><span class="card-value">${totalOutOfStock}</span></div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;margin-bottom:30px;">
    `;

    CATEGORIES.forEach(cat => {
        const count = products.filter(p => (p.category||p.category_id) === cat.id).length;
        html += `
            <div class="category-card-compact" data-category="${cat.id}" style="border-left-color:${cat.color};position:relative;">
                <div class="cat-manage-btns" onclick="event.stopPropagation()">
                    <button class="cat-btn-edit" data-cat-pk="${cat.pk||''}" title="Edit">✏️</button>
                    <button class="cat-btn-delete"
                        data-cat-pk="${cat.pk||''}"
                        data-cat-id="${cat.id}"
                        data-cat-name="${encodeURIComponent(cat.name)}"
                        title="Delete">🗑️</button>
                </div>
                <div class="category-card-header-compact">
                    <div class="category-icon-box-compact" style="background:${cat.color};">
                        <span class="category-icon-compact">${cat.icon}</span>
                    </div>
                    <div class="category-details-compact">
                        <span class="category-name-compact">${cat.name}</span>
                        <span class="category-count-compact">${count} product${count===1?'':'s'}</span>
                    </div>
                    <span class="category-arrow-compact">→</span>
                </div>
            </div>
        `;
    });

    html += `
        <div class="category-card-add" id="btnAddCategory">
            <div style="font-size:36px;margin-bottom:8px;">➕</div>
            <div style="font-weight:700;font-size:15px;color:var(--text-primary,#5D534A);">Add Category</div>
            <div style="font-size:12px;color:var(--text-secondary,#9E9382);margin-top:4px;">Create a custom category</div>
        </div>
    `;

    html += `</div>
        <style>
            .debtor-style-card{display:flex;align-items:center;gap:16px;padding:20px;border-radius:14px;transition:all 0.3s ease;}
            .debtor-style-card .card-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.12);}
            .debtor-style-card .card-info{display:flex;flex-direction:column;gap:3px;}
            .debtor-style-card .card-label{font-size:11px;font-weight:700;letter-spacing:0.8px;color:var(--text-secondary,#9E9382);text-transform:uppercase;}
            .debtor-style-card .card-value{font-size:28px;font-weight:800;color:var(--text-primary,#5D534A);}
            .category-card-compact{background:rgba(255,255,255,0.8);border-radius:16px;padding:20px;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);border-left:4px solid;box-shadow:0 2px 8px rgba(0,0,0,0.06);}
            .category-card-compact:hover{transform:translateX(8px);box-shadow:0 8px 25px rgba(0,0,0,0.12);}
            .category-card-compact:active{transform:translateX(4px);}
            .category-card-header-compact{display:flex;align-items:center;gap:16px;}
            .category-icon-box-compact{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);flex-shrink:0;}
            .category-icon-compact{font-size:26px;}
            .category-details-compact{flex:1;display:flex;flex-direction:column;gap:4px;}
            .category-name-compact{font-size:16px;font-weight:700;color:var(--text-primary,#5D534A);}
            .category-count-compact{font-size:13px;color:var(--text-secondary,#9E9382);}
            .category-arrow-compact{color:var(--text-secondary,#9E9382);opacity:0.5;transition:all 0.3s ease;font-size:20px;}
            .category-card-compact:hover .category-arrow-compact{opacity:1;transform:translateX(4px);}
            .cat-manage-btns{position:absolute;top:10px;right:10px;display:flex;gap:4px;opacity:0;transition:opacity 0.2s ease;z-index:2;}
            .category-card-compact:hover .cat-manage-btns{opacity:1;}
            @media(max-width:768px){.cat-manage-btns{opacity:1;}}
            .cat-btn-edit,.cat-btn-delete{width:28px;height:28px;border:none;border-radius:7px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;}
            .cat-btn-edit{background:rgba(203,223,189,0.85);}
            .cat-btn-edit:hover{background:#a8c99c;transform:scale(1.12);}
            .cat-btn-delete{background:rgba(241,156,121,0.85);}
            .cat-btn-delete:hover{background:#ed8d68;transform:scale(1.12);}
            .category-card-add{background:rgba(255,255,255,0.5);border-radius:16px;padding:24px 20px;cursor:pointer;transition:all 0.3s ease;border:2px dashed rgba(93,83,74,0.25);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:95px;text-align:center;}
            .category-card-add:hover{background:rgba(203,223,189,0.15);border-color:#a8c99c;transform:translateY(-4px);box-shadow:0 8px 25px rgba(168,201,156,0.2);}
            body.dark-mode .debtor-style-card .card-label{color:#a0a0a0!important;}
            body.dark-mode .debtor-style-card .card-value{color:#f0f0f0!important;}
            body.dark-mode .category-card-compact{background:linear-gradient(135deg,rgba(40,50,60,0.9),rgba(30,40,50,0.8))!important;}
            body.dark-mode .category-card-compact:hover{background:linear-gradient(135deg,rgba(50,60,70,0.95),rgba(40,50,60,0.85))!important;box-shadow:0 8px 30px rgba(0,0,0,0.4)!important;}
            body.dark-mode .category-name-compact{color:#f0f0f0!important;}
            body.dark-mode .category-count-compact{color:#a0a0a0!important;}
            body.dark-mode .category-arrow-compact{color:#808080!important;}
            body.dark-mode .cat-btn-edit{background:rgba(60,90,65,0.8)!important;}
            body.dark-mode .cat-btn-delete{background:rgba(90,40,35,0.8)!important;}
            body.dark-mode .category-card-add{background:rgba(30,40,35,0.5)!important;border-color:rgba(168,201,156,0.2)!important;}
            body.dark-mode .category-card-add:hover{background:rgba(40,60,45,0.6)!important;border-color:rgba(168,201,156,0.4)!important;}
            body.dark-mode .category-card-add div{color:#c0d0c0!important;}
        </style>
    `;

    content.innerHTML = html;

    document.querySelectorAll('.category-card-compact').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.cat-manage-btns')) return;
            selectedCategory = this.getAttribute('data-category');
            window.renderInventory();
        });
    });

    document.querySelectorAll('.cat-btn-edit').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const pk  = this.getAttribute('data-cat-pk');
            const cat = CATEGORIES.find(c => String(c.pk) === String(pk));
            if (cat) showEditCategoryModal(cat);
        });
    });

    document.querySelectorAll('.cat-btn-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const pk   = this.getAttribute('data-cat-pk');
            const id   = this.getAttribute('data-cat-id');
            const name = decodeURIComponent(this.getAttribute('data-cat-name'));
            showDeleteCategoryModal(pk, id, name);
        });
    });

    document.getElementById('btnAddCategory')?.addEventListener('click', () => showAddCategoryModal());
}

async function renderCategoryInventory(content, categoryId) {
const isMobile = window.matchMedia('(max-width: 768px)').matches || window.innerWidth <= 768;
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) { selectedCategory = null; await window.renderInventory(); return; }

    const allProducts = await DB.getProducts();
    if (!Array.isArray(allProducts)) throw new Error('Products data is not available');

    const products      = allProducts.filter(p => (p.category||p.category_id) === categoryId);
    const lowStockLimit = window.storeSettings?.lowStockLimit || 10;
    const totalItems    = products.length;
    const lowStock      = products.filter(p => { const q = parseFloat(p.quantity||0); return q < lowStockLimit && q > 0; }).length;
    const outOfStock    = products.filter(p => parseFloat(p.quantity||0) === 0).length;
    const totalValue    = products.reduce((s, p) => s + (parseFloat(p.cost||0) * parseFloat(p.quantity||0)), 0);

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;flex-wrap:wrap;gap:15px;">
            <div>
                <h2 style="color:#5D534A;margin:0;font-size:1.8rem;font-weight:800;">${category.icon} ${category.name}</h2>
                <p style="color:#9E9382;margin:5px 0 0 0;font-size:14px;">Manage products in this category</p>
            </div>
            <button id="btnBackToCategories" style="padding:12px 24px;background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#3e5235;border:none;border-radius:12px;cursor:pointer;font-weight:700;font-size:14px;transition:all 0.3s ease;box-shadow:0 4px 15px rgba(203,223,189,0.4);">← Back to Categories</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-bottom:30px;">
            <div class="stat-card revenue"><div class="card-label">📦 Total Items</div><div class="card-amount">${totalItems}</div></div>
            <div class="stat-card yesterday"><div class="card-label">⚠️ Low Stock</div><div class="card-amount">${lowStock}</div></div>
            <div class="stat-card info"><div class="card-label">🚫 Out of Stock</div><div class="card-amount">${outOfStock}</div></div>
            <div class="stat-card profit"><div class="card-label">💰 Stock Value</div><div class="card-amount">₱${totalValue.toFixed(2)}</div></div>
        </div>

        <div class="add-product-form" style="padding:20px 25px;">
            <h3 class="form-title" style="font-size:15px;margin-bottom:14px;">➕ Add New Product</h3>

            <style>
                /* ── Add product form: responsive layout ── */
                .add-product-fields {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr auto;
                    gap: 12px;
                    align-items: end;
                }
                .add-product-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .add-product-field label {
                    font-weight: 700;
                    color: #5D534A;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .add-product-field input {
                    width: 100%;
                    padding: 10px 14px;
                    border: 2px solid rgba(93,83,74,0.2);
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 500;
                    height: 42px;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                    color: #5D534A;
                    background: white;
                }
                .add-product-field input:focus {
                    outline: none;
                    border-color: #cbdfbd;
                    box-shadow: 0 0 0 3px rgba(203,223,189,0.2);
                }
                #btnAddProduct {
                    padding: 10px 24px;
                    background: linear-gradient(135deg,#cbdfbd,#a8c99c);
                    color: #3e5235;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 13px;
                    height: 42px;
                    white-space: nowrap;
                    transition: all 0.3s ease;
                    box-shadow: 0 3px 10px rgba(203,223,189,0.4);
                    align-self: end;
                }
                #btnAddProduct:hover { transform: translateY(-1px); }

                /* ── Mobile: stack vertically ── */
                @media (max-width: 768px) {
                    .add-product-fields {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 14px !important;
                    }
                    .add-product-field {
                        width: 100% !important;
                    }
                    .add-product-field input {
                        height: 52px !important;
                        font-size: 16px !important;
                        padding: 14px 16px !important;
                        border-radius: 12px !important;
                        color: #5D534A !important;
                        -webkit-text-fill-color: #5D534A !important;
                    }
                    .add-product-field label {
                        font-size: 12px !important;
                    }
                    #btnAddProduct {
                        width: 100% !important;
                        height: 52px !important;
                        font-size: 15px !important;
                        border-radius: 12px !important;
                    }

                    /* Dark mode inputs on mobile */
                    body.dark-mode .add-product-field input {
                        background: #2d3748 !important;
                        color: #f0f0f0 !important;
                        -webkit-text-fill-color: #f0f0f0 !important;
                        border-color: #4a5568 !important;
                        caret-color: #a8c99c !important;
                    }
                    body.dark-mode .add-product-field input::placeholder {
                        color: #718096 !important;
                        -webkit-text-fill-color: #718096 !important;
                    }
                    body.dark-mode .add-product-field label {
                        color: #a0aec0 !important;
                        -webkit-text-fill-color: #a0aec0 !important;
                    }
                    body.dark-mode #btnAddProduct {
                        background: linear-gradient(135deg,#2a4a30,#1e3a24) !important;
                        color: #7aab8a !important;
                        -webkit-text-fill-color: #7aab8a !important;
                    }
                }

                /* Dark mode: desktop */
                body.dark-mode .add-product-field input {
                    background: #1f2937;
                    color: #e0e0e0;
                    border-color: #374151;
                }
                body.dark-mode .add-product-field label {
                    color: #b0c0b0;
                }
            </style>

<div class="add-product-fields" style="${isMobile ? 'display:flex;flex-direction:column;gap:14px;width:100%;' : ''}">
    <div class="add-product-field" style="${isMobile ? 'width:100%;' : ''}">
        <label>Product Name</label>
        <input type="text" id="newProductName" placeholder="e.g. Surf Powder 50g">
    </div>
    <div class="add-product-field" style="${isMobile ? 'width:100%;' : ''}">
        <label>Cost (₱)</label>
        <input type="number" id="newProductCost" placeholder="0.00" step="0.01">
    </div>
    <div class="add-product-field" style="${isMobile ? 'width:100%;' : ''}">
        <label>Price (₱)</label>
        <input type="number" id="newProductPrice" placeholder="0.00" step="0.01">
    </div>
    <div class="add-product-field" style="${isMobile ? 'width:100%;' : ''}">
        <label>Qty</label>
        <input type="number" id="newProductQty" placeholder="0">
    </div>
    <button id="btnAddProduct" style="${isMobile ? 'width:100%;height:52px;font-size:15px;' : ''}padding:10px 24px;background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#3e5235;border:none;border-radius:10px;cursor:pointer;font-weight:700;box-shadow:0 3px 10px rgba(203,223,189,0.4);">
        ➕ Add
    </button>
</div>

        <div class="pro-tip-box">
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:32px;">💡</span>
                <div>
                    <strong style="color:#5D534A;font-size:16px;">Pro Tip:</strong>
                    <p style="color:#9E9382;margin:5px 0 0 0;font-size:14px;">Use the +/- buttons for quick adjustments or type directly into the quantity field. Changes save automatically!</p>
                </div>
            </div>
        </div>

        <div id="inventoryProductsContainer">
    `;

    if (!products || products.length === 0) {
        html += `
            <div class="inv-empty-state">
                <div style="font-size:80px;margin-bottom:20px;opacity:0.3;">${category.icon}</div>
                <h3 class="inv-empty-title">No products yet</h3>
                <p class="inv-empty-sub">Add your first product using the form above!</p>
            </div>
        `;
    } else {
        const sorted   = [...products].sort((a,b) => (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase()));

        if (isMobile) {
            html += `<div class="inv-mobile-cards">`;
            sorted.forEach(p => {
                if (!p) return;
                const cost = parseFloat(p.cost||0), price = parseFloat(p.price||0), qty = parseFloat(p.quantity||0);
                const isOut = qty===0, isLow = !isOut && qty < lowStockLimit;
                const borderColor = isOut ? '#a44a3f' : isLow ? '#d4a726' : '#e0e8e0';
                const bgColor = isOut ? 'rgba(164,74,63,0.07)' : isLow ? 'rgba(212,167,38,0.07)' : 'rgba(255,255,255,0.95)';
                html += `
                    <div class="inv-card" data-out="${isOut}" data-low="${isLow}" style="border-left:4px solid ${borderColor};background:${bgColor};border-radius:14px;padding:14px 16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.07);border-top:1px solid rgba(0,0,0,0.04);border-right:1px solid rgba(0,0,0,0.04);border-bottom:1px solid rgba(0,0,0,0.04);">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:8px;">
                            <span class="inv-card-name" style="font-weight:800;font-size:16px;color:#3e5235;line-height:1.3;flex:1;word-break:break-word;">${p.name||'Unnamed Product'}</span>
                            <button class="btn-delete-modern" data-product-id="${p.id}" style="padding:7px 11px;font-size:15px;border-radius:8px;background:linear-gradient(135deg,#f19c79,#ed8d68);color:white;border:none;cursor:pointer;flex-shrink:0;margin-top:1px;">🗑️</button>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;margin-bottom:12px;border-radius:10px;overflow:hidden;border:1px solid rgba(0,0,0,0.07);">
                            <div class="inv-price-cell" style="padding:9px 8px;text-align:center;background:rgba(164,74,63,0.06);border-right:1px solid rgba(0,0,0,0.07);">
                                <div class="inv-price-label">Cost</div>
                                <div class="inv-price-value" style="color:#a44a3f;">₱${cost.toFixed(2)}</div>
                            </div>
                            <div class="inv-price-cell" style="padding:9px 8px;text-align:center;background:rgba(90,122,94,0.06);border-right:1px solid rgba(0,0,0,0.07);">
                                <div class="inv-price-label">Price</div>
                                <div class="inv-price-value" style="color:#3e6e48;">₱${price.toFixed(2)}</div>
                            </div>
                            <div class="inv-price-cell" style="padding:9px 8px;text-align:center;background:rgba(90,122,94,0.04);">
                                <div class="inv-price-label">Value</div>
                                <div class="inv-price-value" style="color:#3e6e48;">₱${(cost*qty).toFixed(2)}</div>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
                            <button class="btn-qty-modern" data-product-id="${p.id}" data-action="decrease" style="width:38px;height:38px;font-size:20px;border-radius:8px;background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#3e5235;border:none;cursor:pointer;font-weight:700;">−</button>
                            <input type="number" class="qty-input-modern" value="${qty}" data-product-id="${p.id}"
                                style="width:72px;padding:8px;text-align:center;border:2px solid rgba(93,83,74,0.18);border-radius:8px;font-weight:800;font-size:17px;background:transparent;">
                            <button class="btn-qty-modern" data-product-id="${p.id}" data-action="increase" style="width:38px;height:38px;font-size:20px;border-radius:8px;background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#3e5235;border:none;cursor:pointer;font-weight:700;">+</button>
                            ${isOut ? '<span style="margin-left:6px;font-size:11px;font-weight:700;color:#a44a3f;background:rgba(164,74,63,0.12);padding:3px 8px;border-radius:20px;">OUT</span>' : ''}
                            ${isLow && !isOut ? '<span style="margin-left:6px;font-size:11px;font-weight:700;color:#d4a726;background:rgba(212,167,38,0.12);padding:3px 8px;border-radius:20px;">LOW</span>' : ''}
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        } else {
            html += `
                <div class="inventory-table-wrapper">
                    <table class="inventory-table-modern">
                        <thead><tr>
                            <th style="text-align:left;">PRODUCT NAME</th>
                            <th>COST PRICE</th><th>SELLING PRICE</th>
                            <th>QUANTITY</th><th>STOCK VALUE</th><th>ACTIONS</th>
                        </tr></thead>
                        <tbody>
            `;
            sorted.forEach(p => {
                if (!p) return;
                const cost = parseFloat(p.cost||0), price = parseFloat(p.price||0), qty = parseFloat(p.quantity||0);
                const stockClass = qty===0 ? 'out-of-stock-modern' : (qty < lowStockLimit ? 'low-stock-modern' : '');
                html += `
                    <tr class="${stockClass}">
                        <td style="text-align:left;"><strong style="font-size:15px;color:#5D534A;">${p.name||'Unnamed Product'}</strong></td>
                        <td><span style="font-size:16px;font-weight:700;color:#a44a3f;">₱${cost.toFixed(2)}</span></td>
                        <td><span style="font-size:16px;font-weight:700;color:#5a7a5e;">₱${price.toFixed(2)}</span></td>
                        <td>
                            <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
                                <button class="btn-qty-modern" data-product-id="${p.id}" data-action="decrease">−</button>
                                <input type="number" class="qty-input-modern" value="${qty}" data-product-id="${p.id}"
                                    style="width:80px;padding:10px;text-align:center;border:2px solid rgba(93,83,74,0.2);border-radius:8px;font-weight:700;font-size:16px;transition:all 0.3s ease;">
                                <button class="btn-qty-modern" data-product-id="${p.id}" data-action="increase">+</button>
                            </div>
                        </td>
                        <td><span style="font-size:16px;font-weight:700;color:#5a7a5e;">₱${(cost*qty).toFixed(2)}</span></td>
                        <td><button class="btn-delete-modern" data-product-id="${p.id}"><span style="font-size:18px;">🗑️</span></button></td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
        }
    }

    html += `
        <style>
            .inventory-table-modern{width:100%;border-collapse:collapse;}
            .inventory-table-modern th{background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#3e5235;padding:20px 15px;text-align:center;font-weight:700;font-size:12px;letter-spacing:1.2px;}
            .inventory-table-modern td{padding:20px 15px;text-align:center;border-bottom:1px solid #F0F0F0;}
            .inventory-table-modern tr:hover{background:rgba(203,223,189,0.1);}
            .low-stock-modern{background:rgba(246,244,210,0.5)!important;border-left:5px solid #d4a726!important;}
            .out-of-stock-modern{background:rgba(241,156,121,0.15)!important;border-left:5px solid #a44a3f!important;}
            .btn-qty-modern{width:36px;height:36px;background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#3e5235;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:18px;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(203,223,189,0.3);}
            .btn-qty-modern:hover{transform:scale(1.1);box-shadow:0 4px 12px rgba(203,223,189,0.5);}
            .qty-input-modern:focus{outline:none;border-color:#cbdfbd!important;box-shadow:0 0 0 4px rgba(203,223,189,0.2);}
            .btn-delete-modern{padding:10px 16px;background:linear-gradient(135deg,#f19c79,#ed8d68);color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(241,156,121,0.3);}
            .btn-delete-modern:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(241,156,121,0.5);}
            .inv-price-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#9E9382;margin-bottom:3px;}
            .inv-price-value{font-size:14px;font-weight:800;}
            body.dark-mode .inventory-table-wrapper{background:#1a1a1a!important;}
            body.dark-mode .inventory-table-modern{background:#1a1a1a!important;}
            body.dark-mode .inventory-table-modern th{background:linear-gradient(135deg,#2d3e36,#1f2e28)!important;color:#f0f9f0!important;}
            body.dark-mode .inventory-table-modern td{border-bottom-color:#333!important;color:#e0e0e0!important;}
            body.dark-mode .inventory-table-modern tr:hover{background:rgba(90,122,94,0.15)!important;}
            body.dark-mode .inventory-table-modern td strong{color:#e0e0e0!important;}
            body.dark-mode .btn-qty-modern{background:linear-gradient(135deg,#2a3d30,#1e2e24)!important;color:#8ab89a!important;border:1px solid #3a5040!important;}
            body.dark-mode .btn-delete-modern{background:linear-gradient(135deg,#3d1f1a,#2e1410)!important;color:#e07060!important;border:1px solid #5a2a20!important;}
            body.dark-mode .inv-card{background:#1e2820!important;border-top-color:#2a3830!important;border-right-color:#2a3830!important;border-bottom-color:#2a3830!important;}
            body.dark-mode .inv-card[data-out="true"]{background:rgba(90,25,20,0.35)!important;border-left-color:#c44a3f!important;}
            body.dark-mode .inv-card[data-low="true"]{background:rgba(90,70,10,0.3)!important;border-left-color:#c49020!important;}
            body.dark-mode .inv-card-name{color:#a8d8b0!important;}
            body.dark-mode .inv-price-label{color:#808080!important;}
            body.dark-mode .inv-price-cell:nth-child(1){background:rgba(164,74,63,0.15)!important;}
            body.dark-mode .inv-price-cell:nth-child(2){background:rgba(90,122,94,0.15)!important;}
            body.dark-mode .inv-price-cell:nth-child(3){background:rgba(90,122,94,0.1)!important;}
            body.dark-mode .qty-input-modern{background:rgba(255,255,255,0.05)!important;color:#e0e0e0!important;border-color:#3a5040!important;}
        </style>
    </div>`;

    content.innerHTML = html;
    setupInventoryEventListeners(categoryId);
}

function setupInventoryEventListeners(categoryId) {
    document.getElementById('btnBackToCategories')?.addEventListener('click', () => {
        selectedCategory = null; window.renderInventory();
    });
    document.getElementById('btnAddProduct')?.addEventListener('click', () => addNewProduct(categoryId));

    document.getElementById('newProductName')?.addEventListener('input', function() {
        const btn = document.getElementById('btnAddProduct');
        if (btn) { btn.textContent = '➕ Add'; btn.setAttribute('data-edit-mode','false'); }
        window.editingProductId = null;
    });

    document.querySelectorAll('.qty-input-modern').forEach(input => {
        input.addEventListener('change', function() {
            updateQuantity(parseInt(this.getAttribute('data-product-id')), this.value);
        });
    });

    document.querySelectorAll('.btn-qty-modern').forEach(btn => {
        btn.addEventListener('click', async function() {
            const productId = parseInt(this.getAttribute('data-product-id'));
            const action    = this.getAttribute('data-action');
            const products  = await DB.getProducts();
            const product   = products.find(p => p.id === productId);
            if (product) {
                const qty = parseFloat(product.quantity||0);
                if (action==='decrease' && qty>0) await updateQuantity(productId, qty-1);
                else if (action==='increase')      await updateQuantity(productId, qty+1);
            }
        });
    });

    document.querySelectorAll('.btn-delete-modern').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteProduct(parseInt(this.getAttribute('data-product-id')));
        });
    });

    ['newProductName','newProductCost','newProductPrice','newProductQty'].forEach(id => {
        document.getElementById(id)?.addEventListener('keypress', e => {
            if (e.key === 'Enter') addNewProduct(categoryId);
        });
    });
}

window.handleSearchResultSelect = function(productId, productName, cost, price, quantity) {
    document.getElementById('newProductName').value  = productName;
    document.getElementById('newProductCost').value  = cost;
    document.getElementById('newProductPrice').value = price;
    document.getElementById('newProductQty').value   = quantity;
    const btn = document.getElementById('btnAddProduct');
    if (btn) { btn.textContent = `✎ Update "${productName}"`; btn.setAttribute('data-edit-mode','true'); }
    window.editingProductId = productId;
    const searchInput = document.getElementById('inventorySearchInput');
    const dropdown    = document.getElementById('inventorySearchDropdown');
    const clearBtn    = document.getElementById('clearInventorySearch');
    if (searchInput) searchInput.value = '';
    if (dropdown)    dropdown.style.display = 'none';
    if (clearBtn)    clearBtn.style.display = 'none';
    document.getElementById('newProductName').focus();
    document.getElementById('newProductName').scrollIntoView({ behavior:'smooth', block:'center' });
};

async function addNewProduct(categoryId) {
    const name     = document.getElementById('newProductName').value.trim();
    const cost     = parseFloat(document.getElementById('newProductCost').value);
    const price    = parseFloat(document.getElementById('newProductPrice').value);
    const quantity = parseInt(document.getElementById('newProductQty').value);
    const btn      = document.getElementById('btnAddProduct');
    const editMode = btn.getAttribute('data-edit-mode') === 'true';
    const editingProductId = window.editingProductId;

    if (!name)                           { showModernAlert('Please enter a product name!',         '📝'); document.getElementById('newProductName').focus();  return; }
    if (isNaN(cost)   || cost < 0)       { showModernAlert('Please enter a valid cost price!',     '💰'); document.getElementById('newProductCost').focus();  return; }
    if (isNaN(price)  || price < 0)      { showModernAlert('Please enter a valid selling price!',  '🏷️'); document.getElementById('newProductPrice').focus(); return; }
    if (isNaN(quantity) || quantity < 0) { showModernAlert('Please enter a valid quantity!',       '📦'); document.getElementById('newProductQty').focus();   return; }

    if (price < cost) {
        const ok = window.DialogSystem
            ? await DialogSystem.confirm('⚠️ Selling price is below cost — you will lose money on each sale. Continue anyway?','⚠️')
            : confirm('⚠️ Selling price is below cost. Continue?');
        if (!ok) return;
    } else {
        const margin    = calculateMargin(cost, price);
        const minMargin = window.storeSettings?.profitMargin || 20;
        if (margin < minMargin) {
            const recommended = (cost * (1 + minMargin / 100)).toFixed(2);
            await showModernWarningDialog({
                title: 'Profit Margin Too Low!', icon: '⚠️',
                details: [
                    { label:'Current margin',   value:`${margin.toFixed(1)}%`,       color:'#DC2626' },
                    { label:'Profit per unit',  value:`₱${(price-cost).toFixed(2)}`, color:'#DC2626' },
                    { label:'Required margin',  value:`${minMargin}%`,                color:'#059669' },
                    { label:'Recommended price',value:`₱${recommended}`,             color:'#059669' },
                ],
                message:`Your store requires a minimum ${minMargin}% profit margin. Please adjust the price to at least ₱${recommended}.`
            });
            document.getElementById('newProductPrice').focus();
            document.getElementById('newProductPrice').select();
            return;
        }
    }

    try {
        if (editMode && editingProductId) {
            await DB.updateProduct(editingProductId, { name, cost, price, quantity });
            showModernAlert(`✅ "${name}" updated!`, '✅');
        } else {
            await DB.addProduct({ name, cost, price, quantity, category: categoryId });
            showModernAlert(`✅ "${name}" added!`, '✅');
        }
        ['newProductName','newProductCost','newProductPrice','newProductQty'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        if (btn) { btn.textContent = '➕ Add'; btn.setAttribute('data-edit-mode','false'); }
        window.editingProductId = null;
        document.getElementById('newProductName')?.focus();
        await window.renderInventory();
        if (typeof window.renderPriceList === 'function') await window.renderPriceList();
    } catch (error) {
        console.error('❌ Error adding product:', error);
        showModernAlert('Failed to add product. Please try again.', '❌');
    }
}

async function updateQuantity(id, newQty) {
    const quantity = parseInt(newQty);
    if (isNaN(quantity) || quantity < 0) { alert('⚠️ Invalid quantity!'); await window.renderInventory(); return; }
    try {
        const products = await DB.getProducts();
        const product  = products.find(p => p.id === id);
        if (!product) { alert('⚠️ Product not found!'); return; }
        if (quantity === 0) {
            const ok = confirm(`⚠️ Set "${product.name}" to 0 units?\nThis marks it as out of stock.`);
            if (!ok) { await window.renderInventory(); return; }
        }
        await DB.updateProduct(id, {
            name:     product.name,
            category: product.category || product.category_id,
            cost:     product.cost,
            price:    product.price,
            quantity
        });
        await window.renderInventory();
        if (typeof window.renderPriceList === 'function') await window.renderPriceList();
    } catch (error) {
        console.error('❌ Error updating quantity:', error);
        alert('❌ Failed to update quantity. Please try again.');
    }
}

async function deleteProduct(id) {
    try {
        const products = await DB.getProducts();
        const product  = products.find(p => p.id === id);
        if (!product) { showModernAlert('Product not found!', '🔍'); return; }

        const qty    = parseFloat(product.quantity||0);
        const isDark = document.body.classList.contains('dark-mode');

        const cancelBtnStyle = isDark
            ? 'flex:1;padding:14px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;background:rgba(50,30,28,0.9);color:#d08070;border:1px solid rgba(120,50,40,0.5);'
            : 'flex:1;padding:14px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#FEE2E2,#FECACA);color:#DC2626;border:1px solid #fca5a5;';

        const confirmDelete = await new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,${isDark?'0.75':'0.6'});backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:25000;`;
            overlay.innerHTML = `
                <div style="background:${isDark?'linear-gradient(135deg,#1c2120,#151a19)':'linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,248,243,0.96))'};border-radius:28px;padding:50px 40px;max-width:480px;width:90%;box-shadow:0 30px 80px rgba(0,0,0,0.3);animation:dlgSU 0.4s cubic-bezier(0.34,1.56,0.64,1);position:relative;overflow:hidden;">
                    <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#EF4444,#DC2626,#EF4444);"></div>
                    <div style="text-align:center;margin-bottom:24px;"><div style="width:90px;height:90px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#FEE2E2,#FCA5A5);display:flex;align-items:center;justify-content:center;font-size:44px;">🗑️</div></div>
                    <h3 style="text-align:center;font-size:22px;font-weight:800;margin:0 0 14px 0;background:linear-gradient(135deg,#DC2626,#991B1B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Delete "${product.name}"?</h3>
                    <p style="text-align:center;font-size:14px;color:${isDark?'#888':'#9E9382'};margin:0 0 24px 0;">⚠️ This action cannot be undone.</p>
                    <div style="display:flex;gap:12px;">
                        <button id="cancelDelBtn" style="${cancelBtnStyle}">Cancel</button>
                        <button id="confirmDelBtn" style="flex:1;padding:14px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#EF4444,#DC2626);color:white;border:none;box-shadow:0 6px 20px rgba(239,68,68,0.4);">Delete</button>
                    </div>
                    <style>@keyframes dlgSU{from{transform:translateY(40px) scale(0.9);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}</style>
                </div>`;
            document.body.appendChild(overlay);
            document.getElementById('cancelDelBtn').addEventListener('click',  () => { overlay.remove(); resolve(false); });
            document.getElementById('confirmDelBtn').addEventListener('click', () => { overlay.remove(); resolve(true);  });
            overlay.addEventListener('click', e => { if (e.target===overlay) { overlay.remove(); resolve(false); } });
        });

        if (!confirmDelete) return;

        if (qty > 0) {
            const cancelBtnStyle2 = isDark
                ? 'flex:1;padding:14px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;background:rgba(50,30,28,0.9);color:#d08070;border:1px solid rgba(120,50,40,0.5);'
                : 'flex:1;padding:14px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#FEE2E2,#FECACA);color:#DC2626;border:1px solid #fca5a5;';

            const confirmStock = await new Promise(resolve => {
                const overlay = document.createElement('div');
                overlay.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,${isDark?'0.8':'0.65'});backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:25000;`;
                overlay.innerHTML = `
                    <div style="background:${isDark?'linear-gradient(135deg,#1c2120,#151a19)':'linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,248,243,0.96))'};border-radius:28px;padding:50px 40px;max-width:480px;width:90%;box-shadow:0 30px 80px rgba(0,0,0,0.3);animation:dlgSU2 0.4s cubic-bezier(0.34,1.56,0.64,1);position:relative;overflow:hidden;">
                        <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#DC2626,#EF4444,#DC2626);"></div>
                        <div style="text-align:center;margin-bottom:24px;"><div style="font-size:56px;">⚠️</div></div>
                        <h3 style="text-align:center;font-size:24px;font-weight:900;margin:0 0 14px 0;color:${isDark?'#ff6b6b':'#7F1D1D'};">FINAL WARNING!</h3>
                        <p style="text-align:center;font-size:15px;font-weight:600;color:#DC2626;margin:0 0 24px 0;">"${product.name}" still has <strong>${qty} units</strong> in stock.</p>
                        <div style="display:flex;gap:12px;">
                            <button id="cancelDelStk" style="${cancelBtnStyle2}">Go Back</button>
                            <button id="confirmDelStk" style="flex:1;padding:14px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#DC2626,#991B1B);color:white;border:none;">Delete Anyway</button>
                        </div>
                        <style>@keyframes dlgSU2{from{transform:translateY(40px) scale(0.9);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}</style>
                    </div>`;
                document.body.appendChild(overlay);
                document.getElementById('cancelDelStk').addEventListener('click',  () => { overlay.remove(); resolve(false); });
                document.getElementById('confirmDelStk').addEventListener('click', () => { overlay.remove(); resolve(true);  });
                overlay.addEventListener('click', e => { if (e.target===overlay) { overlay.remove(); resolve(false); } });
            });
            if (!confirmStock) return;
        }

        await DB.deleteProduct(id);
        showModernAlert(`"${product.name}" has been deleted.`, '✅');
        await window.renderInventory();
        if (typeof window.renderPriceList === 'function') await window.renderPriceList();

    } catch (error) {
        console.error('❌ Error deleting product:', error);
        showModernAlert('Failed to delete product. Please try again.', '❌');
    }
}

// =============================================================================
//  CATEGORY MANAGEMENT
// =============================================================================

const EMOJI_LIST = [
    '🥤','🧃','☕','🍵','🍺','🍻','🥛','🍶','🍹','🧊',
    '🍚','🍞','🥚','🧈','🥩','🥦','🌽','🥕','🧄','🍅',
    '🍿','🍪','🍫','🍬','🍭','🍩','🧁','🎂','🍎','🍌',
    '🧼','🧴','🪥','🧻','🧹','💊','🩺','🪒','🧽','🫧',
    '📚','✏️','📐','📏','✂️','📎','📌','🖊️','📓','🎒',
    '📦','🛒','🏪','🏬','💰','🪙','💵','💳','🏷️','🧾',
    '🍾','🥃','🍷','🥂','🍸','🍴','🥄','🍽️','🫙','🥫',
    '🌿','🍃','🌱','🌾','🌸','🌻','🎋','🍀','🪴','🌵',
];

const PRESET_COLORS = [
    { label:'Gold',   value:'linear-gradient(135deg,#e3b04b 0%,#d19a3d 100%)' },
    { label:'Brown',  value:'linear-gradient(135deg,#d48c2e 0%,#ba7a26 100%)' },
    { label:'Red',    value:'linear-gradient(135deg,#a44a3f 0%,#934635 100%)' },
    { label:'Tan',    value:'linear-gradient(135deg,#967751 0%,#92784f 100%)' },
    { label:'Peach',  value:'linear-gradient(135deg,#f3c291 0%,#e5b382 100%)' },
    { label:'Copper', value:'linear-gradient(135deg,#cc8451 0%,#b87545 100%)' },
    { label:'Olive',  value:'linear-gradient(135deg,#e2e8b0 0%,#ced49d 100%)' },
    { label:'Green',  value:'linear-gradient(135deg,#a8c99c 0%,#8ab88a 100%)' },
    { label:'Teal',   value:'linear-gradient(135deg,#7bc4be 0%,#5da8a2 100%)' },
    { label:'Blue',   value:'linear-gradient(135deg,#7ba8c9 0%,#5d8aab 100%)' },
    { label:'Purple', value:'linear-gradient(135deg,#9a7bc4 0%,#7c5da8 100%)' },
    { label:'Pink',   value:'linear-gradient(135deg,#c97ba8 0%,#ab5d8a 100%)' },
];

function showCategoryModal({ title, icon = '📦', name = '', color = '', submitLabel, onSubmit }) {
    const isDark = document.body.classList.contains('dark-mode');

    const emojiButtons = EMOJI_LIST.map(e =>
        `<button type="button"
            onclick="(function(b){document.getElementById('catEmojiInput').value='${e}';document.getElementById('emojiPreview').textContent='${e}';document.querySelectorAll('.ep-btn').forEach(x=>x.style.background='transparent');b.style.background='rgba(203,223,189,0.45)';})(this)"
            class="ep-btn" style="padding:4px;border:none;cursor:pointer;border-radius:6px;font-size:20px;background:transparent;transition:all 0.15s ease;">${e}</button>`
    ).join('');

    const colorSwatches = PRESET_COLORS.map(c =>
        `<button type="button"
            onclick="(function(b){document.getElementById('catColorInput').value='${encodeURIComponent(c.value)}';document.querySelectorAll('.cp-swatch').forEach(x=>{x.style.outline='none';x.style.transform='scale(1)'});b.style.outline='3px solid #3e5235';b.style.transform='scale(1.15)';})(this)"
            class="cp-swatch"
            title="${c.label}"
            style="height:30px;border-radius:8px;border:none;cursor:pointer;background:${c.value};transition:all 0.2s ease;${color===c.value?'outline:3px solid #3e5235;transform:scale(1.15);':''}"></button>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.id = 'catModalOverlay';
    overlay.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,${isDark?'0.75':'0.62'});backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:30000;padding:16px;overflow-y:auto;`;

    overlay.innerHTML = `
        <div style="background:${isDark?'linear-gradient(135deg,#1e2420,#151a18)':'linear-gradient(135deg,rgba(255,255,255,0.98),rgba(250,252,248,0.96))'};border:${isDark?'1px solid #2e3d30':'none'};border-radius:24px;padding:32px;max-width:520px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,0.3);animation:cmIn 0.4s cubic-bezier(0.34,1.56,0.64,1);position:relative;">
            <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#cbdfbd,#a8c99c,#d4e09b,#f3c291,#cbdfbd);border-radius:24px 24px 0 0;"></div>
            <h2 style="font-size:20px;font-weight:800;margin:0 0 22px 0;color:${isDark?'#e0f0e0':'#3e5235'};">${title}</h2>
            <div style="margin-bottom:18px;">
                <label style="display:block;margin-bottom:6px;font-weight:700;color:${isDark?'#b0c0b0':'#5D534A'};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Category Name *</label>
                <input id="catNameInput" type="text" value="${name}" placeholder="e.g. Frozen Goods" maxlength="80" autofocus
                    style="width:100%;padding:12px 14px;border:2px solid ${isDark?'#3a4a40':'rgba(93,83,74,0.2)'};border-radius:10px;font-size:16px;font-weight:600;box-sizing:border-box;background:${isDark?'#1a2420':'white'};color:${isDark?'#e0e0e0':'#5D534A'};transition:all 0.3s ease;"
                    onfocus="this.style.borderColor='#a8c99c'"
                    onblur="this.style.borderColor='${isDark?'#3a4a40':'rgba(93,83,74,0.2)'}'">
            </div>
            <div style="margin-bottom:18px;">
                <label style="display:block;margin-bottom:8px;font-weight:700;color:${isDark?'#b0c0b0':'#5D534A'};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Icon</label>
                <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
                    <div id="emojiPreview" style="width:50px;height:50px;border-radius:12px;background:linear-gradient(135deg,#cbdfbd,#a8c99c);display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 4px 12px rgba(0,0,0,0.12);">${icon}</div>
                    <input id="catEmojiInput" type="text" value="${icon}" maxlength="4"
                        style="width:72px;padding:10px;border:2px solid ${isDark?'#3a4a40':'rgba(93,83,74,0.2)'};border-radius:10px;font-size:22px;text-align:center;background:${isDark?'#1a2420':'white'};color:${isDark?'#e0e0e0':'#5D534A'};transition:all 0.3s ease;"
                        onfocus="this.style.borderColor='#a8c99c'"
                        onblur="this.style.borderColor='${isDark?'#3a4a40':'rgba(93,83,74,0.2)'}'"
                        oninput="document.getElementById('emojiPreview').textContent=this.value||'📦'">
                    <span style="font-size:12px;color:${isDark?'#888':'#9E9382'};">Type or pick →</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:3px;padding:6px;border:1px solid ${isDark?'#2e3d38':'rgba(93,83,74,0.1)'};border-radius:10px;background:${isDark?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.5)'};max-height:130px;overflow-y:auto;">
                    ${emojiButtons}
                </div>
            </div>
            <div style="margin-bottom:22px;">
                <label style="display:block;margin-bottom:8px;font-weight:700;color:${isDark?'#b0c0b0':'#5D534A'};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Card Color <span style="font-weight:400;opacity:0.6;">(optional)</span></label>
                <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:8px;">
                    ${colorSwatches}
                </div>
                <input type="hidden" id="catColorInput" value="${color?encodeURIComponent(color):''}">
                <button type="button"
                    onclick="document.getElementById('catColorInput').value='';document.querySelectorAll('.cp-swatch').forEach(b=>{b.style.outline='none';b.style.transform='scale(1)'});"
                    style="padding:5px 12px;border:none;background:${isDark?'rgba(255,255,255,0.07)':'rgba(93,83,74,0.08)'};border-radius:8px;cursor:pointer;font-size:12px;color:${isDark?'#a0a0a0':'#9E9382'};font-weight:600;">
                    ✕ Auto-assign color
                </button>
            </div>
            <div style="display:flex;gap:12px;">
                <button id="catModalCancel" style="flex:1;padding:14px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;background:${isDark?'rgba(50,30,28,0.9)':'linear-gradient(135deg,#FEE2E2,#FECACA)'};color:${isDark?'#d08070':'#DC2626'};border:1px solid ${isDark?'rgba(120,50,40,0.5)':'#fca5a5'};transition:all 0.2s ease;">Cancel</button>
                <button id="catModalSubmit" style="flex:2;padding:14px;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#3e5235;border:none;box-shadow:0 4px 15px rgba(203,223,189,0.4);transition:all 0.2s ease;">${submitLabel}</button>
            </div>
        </div>
        <style>
            @keyframes cmIn{from{transform:scale(0.88) translateY(30px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
            #catModalSubmit:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(203,223,189,0.5);}
            #catModalCancel:hover{filter:brightness(1.06);}
        </style>
    `;

    document.body.appendChild(overlay);
    document.getElementById('catModalCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target===overlay) overlay.remove(); });

    document.getElementById('catModalSubmit').addEventListener('click', async () => {
        const catName  = document.getElementById('catNameInput').value.trim();
        const catEmoji = document.getElementById('catEmojiInput').value.trim() || '📦';
        const rawColor = document.getElementById('catColorInput').value;
        const catColor = rawColor ? decodeURIComponent(rawColor) : '';

        if (!catName) {
            document.getElementById('catNameInput').style.borderColor = '#EF4444';
            document.getElementById('catNameInput').focus();
            return;
        }

        const submitBtn = document.getElementById('catModalSubmit');
        submitBtn.textContent = '⏳ Saving…';
        submitBtn.disabled = true;

        try {
            await onSubmit({ name: catName, icon: catEmoji, color: catColor });
            overlay.remove();
            await window.renderInventory();
            if (typeof window.renderPriceList === 'function') await window.renderPriceList();
        } catch (err) {
            submitBtn.textContent = submitLabel;
            submitBtn.disabled = false;
            showModernAlert(`Error: ${err.message}`, '❌');
        }
    });
}

function showAddCategoryModal() {
    showCategoryModal({
        title:       '➕ New Category',
        icon:        '📦',
        submitLabel: '➕ Add Category',
        onSubmit:    ({ name, icon, color }) => DB.addCategory({ name, icon, color }),
    });
}

function showEditCategoryModal(cat) {
    showCategoryModal({
        title:       `✏️ Edit "${cat.name}"`,
        icon:        cat.icon,
        name:        cat.name,
        color:       cat.color,
        submitLabel: '💾 Save Changes',
        onSubmit:    ({ name, icon, color }) => DB.updateCategory(cat.pk, { name, icon, color }),
    });
}

async function showDeleteCategoryModal(pk, id, name) {
    const isDark = document.body.classList.contains('dark-mode');
    const allProducts  = await DB.getProducts();
    const productCount = allProducts.filter(p => (p.category||p.category_id) === id).length;
    const otherCats    = CATEGORIES.filter(c => c.id !== id);

    const overlay = document.createElement('div');
    overlay.id = 'catDelOverlay';
    overlay.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,${isDark?'0.78':'0.65'});backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:30000;padding:16px;`;

    let productHTML = '';
    if (productCount > 0) {
        const opts = otherCats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
        productHTML = `
            <div style="background:${isDark?'rgba(239,68,68,0.1)':'rgba(239,68,68,0.07)'};border:1px solid rgba(239,68,68,0.3);border-radius:14px;padding:16px;margin-bottom:20px;">
                <div style="font-size:14px;font-weight:700;color:${isDark?'#f87171':'#DC2626'};margin-bottom:14px;">
                    ⚠️ This category has <strong>${productCount} product${productCount!==1?'s':''}</strong>. What happens to them?
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
                        <input type="radio" name="delAction" value="reassign" id="radioReassign" checked style="margin-top:3px;width:16px;height:16px;accent-color:#5a9e6f;">
                        <span style="font-size:14px;font-weight:600;color:${isDark?'#d0d0d0':'#5D534A'};">Move products to another category</span>
                    </label>
                    <div id="reassignSection" style="padding-left:26px;">
                        <select id="reassignTarget" style="width:100%;padding:9px;border:2px solid ${isDark?'#3a4a40':'rgba(93,83,74,0.2)'};border-radius:10px;font-size:14px;font-weight:600;background:${isDark?'#1a2420':'white'};color:${isDark?'#e0e0e0':'#5D534A'};">
                            ${opts}
                        </select>
                    </div>
                    <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
                        <input type="radio" name="delAction" value="delete" id="radioDeleteProds" style="margin-top:3px;width:16px;height:16px;accent-color:#DC2626;">
                        <span style="font-size:14px;font-weight:600;color:${isDark?'#d0d0d0':'#5D534A'};">Permanently delete all products in this category</span>
                    </label>
                </div>
            </div>
        `;
    }

    const cancelBtnStyle = isDark
        ? 'flex:1;padding:14px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;background:rgba(50,30,28,0.9);color:#d08070;border:1px solid rgba(120,50,40,0.5);'
        : 'flex:1;padding:14px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#FEE2E2,#FECACA);color:#DC2626;border:1px solid #fca5a5;';

    overlay.innerHTML = `
        <div style="background:${isDark?'linear-gradient(135deg,#1c2120,#151a19)':'linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,248,243,0.96))'};border:${isDark?'1px solid #2e3d38':'none'};border-radius:24px;padding:32px;max-width:480px;width:100%;box-shadow:0 30px 80px rgba(0,0,0,0.3);animation:cdIn 0.4s cubic-bezier(0.34,1.56,0.64,1);position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#EF4444,#DC2626,#EF4444);border-radius:24px 24px 0 0;"></div>
            <div style="text-align:center;margin-bottom:20px;">
                <div style="font-size:52px;margin-bottom:10px;">🗑️</div>
                <h3 style="font-size:20px;font-weight:800;margin:0 0 6px 0;background:linear-gradient(135deg,#DC2626,#991B1B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Delete "${name}"?</h3>
                <p style="font-size:13px;color:${isDark?'#888':'#9E9382'};margin:0;">This action cannot be undone.</p>
            </div>
            ${productHTML}
            <div style="display:flex;gap:12px;">
                <button id="catDelCancel" style="${cancelBtnStyle}">Cancel</button>
                <button id="catDelConfirm" style="flex:2;padding:14px;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#EF4444,#DC2626);color:white;border:none;box-shadow:0 4px 15px rgba(239,68,68,0.4);">🗑️ Delete Category</button>
            </div>
        </div>
        <style>@keyframes cdIn{from{transform:scale(0.88) translateY(30px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}</style>
    `;

    document.body.appendChild(overlay);

    if (productCount > 0) {
        document.querySelectorAll('input[name="delAction"]').forEach(r => {
            r.addEventListener('change', () => {
                const rs = document.getElementById('reassignSection');
                if (rs) rs.style.display = r.value==='reassign' ? 'block' : 'none';
            });
        });
    }

    document.getElementById('catDelCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target===overlay) overlay.remove(); });

    document.getElementById('catDelConfirm').addEventListener('click', async () => {
        const btn = document.getElementById('catDelConfirm');
        btn.textContent = '⏳ Deleting…';
        btn.disabled = true;
        try {
            let reassignTo  = null;
            let deleteProds = false;
            if (productCount > 0) {
                const action = document.querySelector('input[name="delAction"]:checked')?.value;
                if (action === 'reassign') {
                    reassignTo = document.getElementById('reassignTarget')?.value || null;
                } else {
                    deleteProds = true;
                }
            }
            await DB.deleteCategory(pk, reassignTo, deleteProds);
            overlay.remove();
            if (selectedCategory === id) selectedCategory = null;
            await window.renderInventory();
            if (typeof window.renderPriceList === 'function') await window.renderPriceList();
            showModernAlert(`Category "${name}" deleted.`, '✅');
        } catch (err) {
            btn.textContent = '🗑️ Delete Category';
            btn.disabled = false;
            showModernAlert(`Error: ${err.message}`, '❌');
        }
    });
}

// =============================================================================
//  ALERT & WARNING DIALOGS
// =============================================================================

function showModernAlert(message, icon = '✅') {
    const existing = document.getElementById('modernAlertOverlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'modernAlertOverlay';
    overlay.innerHTML = `
        <div class="modern-alert-box">
            <div class="modern-alert-shimmer"></div>
            <div class="modern-alert-icon-wrapper"><span class="modern-alert-icon">${icon}</span></div>
            <h3 class="modern-alert-title">Notice</h3>
            <div class="modern-alert-message">${message}</div>
            <button class="modern-alert-btn" onclick="document.getElementById('modernAlertOverlay').remove()">Got it!</button>
        </div>
        <style>
            #modernAlertOverlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(12px);display:flex;justify-content:center;align-items:center;z-index:99999;animation:maFadeIn 0.3s ease;}
            .modern-alert-box{background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.9));border-radius:28px;padding:45px 40px 40px;width:90%;max-width:450px;box-shadow:0 30px 80px rgba(0,0,0,0.25);animation:maSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1);text-align:center;position:relative;overflow:hidden;}
            .modern-alert-shimmer{position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg,#cbdfbd,#a8c99c,#d4e09b,#f3c291,#cbdfbd);animation:maShimmer 3s linear infinite;}
            @keyframes maShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
            .modern-alert-icon-wrapper{width:90px;height:90px;margin:0 auto 28px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,#cbdfbd,#a8c99c);box-shadow:0 12px 35px rgba(203,223,189,0.5);}
            .modern-alert-icon{font-size:52px;}
            .modern-alert-title{font-size:26px;font-weight:900;background:linear-gradient(135deg,#2d3748,#5D534A);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0 0 14px 0;}
            .modern-alert-message{font-size:16px;line-height:1.7;color:#718096;font-weight:500;margin-bottom:35px;}
            .modern-alert-btn{width:100%;padding:18px 28px;background:linear-gradient(135deg,#cbdfbd,#a8c99c);color:#2d5a3b;border:none;border-radius:16px;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 6px 20px rgba(203,223,189,0.5);transition:all 0.3s ease;}
            .modern-alert-btn:hover{transform:translateY(-3px);}
            @keyframes maFadeIn{from{opacity:0}to{opacity:1}}
            @keyframes maSlideIn{from{transform:scale(0.8) translateY(30px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
        </style>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => {
        const el = document.getElementById('modernAlertOverlay');
        if (el) {
            el.style.animation = 'maFadeOut 0.3s ease forwards';
            if (!document.querySelector('style[data-inv-fadeout]')) {
                const s = document.createElement('style');
                s.setAttribute('data-inv-fadeout','true');
                s.textContent = '@keyframes maFadeOut{from{opacity:1}to{opacity:0}}';
                document.head.appendChild(s);
            }
            setTimeout(() => el.remove(), 300);
        }
    }, 3000);
}

function showModernWarningDialog({ title, icon = '⚠️', details = [], message }) {
    return new Promise(resolve => {
        const existing = document.getElementById('modernWarningOverlay');
        if (existing) existing.remove();

        let detailsHTML = '';
        if (details.length) {
            detailsHTML = '<div class="warning-details-grid">';
            details.forEach((d, i) => {
                const cls = d.color==='#DC2626' ? 'detail-card-negative' : d.color==='#059669' ? 'detail-card-positive' : 'detail-card-neutral';
                detailsHTML += `<div class="${cls}" style="animation-delay:${0.4+i*0.05}s;"><div class="detail-label">${d.label}</div><div class="detail-value" style="color:${d.color||'#111'};">${d.value}</div></div>`;
            });
            detailsHTML += '</div>';
        }

        const overlay = document.createElement('div');
        overlay.id = 'modernWarningOverlay';
        overlay.innerHTML = `
            <div class="modern-warning-box">
                <div class="modern-warning-accent"></div>
                <div class="modern-warning-icon-container">
                    <div class="modern-warning-icon-wrapper"><span class="modern-warning-icon">${icon}</span></div>
                </div>
                <h3 class="modern-warning-title">${title}</h3>
                ${detailsHTML}
                <div class="modern-warning-message">${message}</div>
                <button class="modern-warning-btn" id="modernWarningOkBtn"><span>Got it!</span><span>✓</span></button>
            </div>
            <style>
                #modernWarningOverlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(15px);display:flex;justify-content:center;align-items:center;z-index:99999;animation:wFadeIn 0.4s ease;}
                @keyframes wFadeIn{from{opacity:0}to{opacity:1}}
                .modern-warning-box{background:linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,251,247,0.96));border-radius:32px;width:92%;max-width:540px;box-shadow:0 40px 100px rgba(0,0,0,0.3);animation:wSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1);position:relative;overflow:hidden;}
                @keyframes wSlideIn{from{transform:scale(0.85) translateY(50px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
                .modern-warning-accent{position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#FEF3C7,#FBBF24,#F59E0B,#DC2626,#F59E0B,#FBBF24);background-size:200% 100%;animation:wAccent 3s linear infinite;}
                @keyframes wAccent{0%{background-position:0%}100%{background-position:200%}}
                .modern-warning-icon-container{position:relative;width:120px;height:120px;margin:50px auto 30px;}
                .modern-warning-icon-wrapper{width:120px;height:120px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,#FBBF24,#F59E0B,#EF4444);box-shadow:0 15px 40px rgba(251,191,36,0.5);}
                .modern-warning-icon{font-size:64px;}
                .modern-warning-title{font-size:30px;font-weight:900;background:linear-gradient(135deg,#DC2626,#EF4444,#F59E0B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0 0 25px;padding:0 40px;text-align:center;}
                .warning-details-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:0 35px;margin-bottom:28px;}
                .detail-card-negative,.detail-card-positive,.detail-card-neutral{padding:18px 16px;border-radius:16px;text-align:center;}
                .detail-card-negative{background:linear-gradient(135deg,rgba(254,226,226,0.9),rgba(252,165,165,0.7));border:2px solid rgba(220,38,38,0.3);}
                .detail-card-positive{background:linear-gradient(135deg,rgba(209,250,229,0.9),rgba(167,243,208,0.7));border:2px solid rgba(5,150,105,0.3);}
                .detail-card-neutral{background:linear-gradient(135deg,rgba(249,250,251,0.9),rgba(243,244,246,0.7));border:2px solid rgba(17,24,39,0.1);}
                .detail-label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin-bottom:8px;}
                .detail-value{font-size:20px;font-weight:900;}
                .modern-warning-message{font-size:16px;line-height:1.8;color:#4B5563;font-weight:500;margin-bottom:35px;padding:0 40px;text-align:center;}
                .modern-warning-btn{width:calc(100% - 70px);margin:0 35px 35px;padding:20px 32px;background:linear-gradient(135deg,#3B82F6,#2563EB,#1D4ED8);color:white;border:none;border-radius:18px;font-weight:900;font-size:17px;cursor:pointer;box-shadow:0 8px 25px rgba(59,130,246,0.4);transition:all 0.3s ease;display:flex;align-items:center;justify-content:center;gap:10px;}
                .modern-warning-btn:hover{transform:translateY(-4px);box-shadow:0 15px 40px rgba(59,130,246,0.5);}
            </style>
        `;
        document.body.appendChild(overlay);
        document.getElementById('modernWarningOkBtn').addEventListener('click', () => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => { overlay.remove(); resolve(); }, 300);
        });
    });
}

// =============================================================================
//  DARK MODE STYLES
// =============================================================================

(function applyInventoryDarkModeStyles() {
    const styleId = 'inventory-dark-mode-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        body.dark-mode * { color: #e0e0e0 !important; }
        body.dark-mode h1, body.dark-mode h2, body.dark-mode h3,
        body.dark-mode h4, body.dark-mode h5, body.dark-mode h6 { color: #f0f9f0 !important; }
        body.dark-mode label { color: #d0d0d0 !important; }
        body.dark-mode input[type="text"], body.dark-mode input[type="number"],
        body.dark-mode input[type="date"], body.dark-mode select, body.dark-mode textarea {
            background: #1f1f1f !important; color: #e0e0e0 !important; border-color: #444 !important;
        }
        body.dark-mode input::placeholder { color: #666 !important; }
        body.dark-mode button { color: white !important; }
        body.dark-mode .btn-qty-modern { background: linear-gradient(135deg,#2a3d30,#1e2e24) !important; color: #8ab89a !important; border: 1px solid #3a5040 !important; }
        body.dark-mode .btn-delete-modern { background: linear-gradient(135deg,#3d1f1a,#2e1410) !important; color: #e07060 !important; border: 1px solid #5a2a20 !important; }
        body.dark-mode #btnBackToCategories { background: linear-gradient(135deg,#1e2e22,#162019) !important; color: #7aab8a !important; border: 1px solid #2d4a33 !important; }
        body.dark-mode #btnAddProduct { background: linear-gradient(135deg,#1e2e22,#162019) !important; color: #7aab8a !important; border: 1px solid #2d4a33 !important; }
        body.dark-mode .add-product-form { background: linear-gradient(135deg,#1a2420,#141c18) !important; border: 1px solid #2a3830 !important; }
        body.dark-mode .pro-tip-box { background: linear-gradient(135deg,#1e2a20,#171f18) !important; border-left-color: #3a5a3a !important; }
        body.dark-mode .low-stock-modern   { background: rgba(212,167,38,0.2)  !important; }
        body.dark-mode .out-of-stock-modern{ background: rgba(241,156,121,0.15) !important; }
        body.dark-mode .modern-alert-box { background: #1a1a1a !important; }
        body.dark-mode .modern-alert-box * { color: #e0e0e0 !important; }
        body.dark-mode .inv-card { background: #1a2420 !important; border-top-color: #2a3830 !important; border-right-color: #2a3830 !important; border-bottom-color: #2a3830 !important; }
        body.dark-mode .inv-card[data-out="true"] { background: rgba(80,20,15,0.5) !important; border-left-color: #c44a3f !important; }
        body.dark-mode .inv-card[data-low="true"] { background: rgba(80,60,5,0.4) !important; border-left-color: #c09020 !important; }
        body.dark-mode .inv-card-name { color: #a8dbb5 !important; }
        body.dark-mode .inv-price-label { color: #888 !important; }
        body.dark-mode .inv-price-cell { background: rgba(255,255,255,0.04) !important; border-color: #2a3830 !important; }
        body.dark-mode .qty-input-modern { background: rgba(255,255,255,0.05) !important; color: #e0e0e0 !important; border-color: #3a5040 !important; }
        .inv-empty-state { background: white; border-radius: 16px; padding: 60px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .inv-empty-title { color: #9E9382; margin-bottom: 10px; font-size: 1.5rem; }
        .inv-empty-sub   { color: #BDC3C7; font-size: 15px; margin: 0; }
        .inventory-table-wrapper { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        body.dark-mode .inv-empty-state { background: #1a2420 !important; box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important; }
        body.dark-mode .inv-empty-title { color: #6a8a70 !important; }
        body.dark-mode .inv-empty-sub   { color: #4a6050 !important; }
        body.dark-mode .inventory-table-wrapper { background: #1a1a1a !important; box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important; }
        body.dark-mode .inv-card div[style*="border-bottom"] { border-bottom-color: #333 !important; }
        body.dark-mode .inv-card div[style*="border-top"]    { border-top-color:    #333 !important; }

        /* Dark mode: add product fields */
        body.dark-mode .add-product-field input {
            background: #2d3748 !important;
            color: #f0f0f0 !important;
            -webkit-text-fill-color: #f0f0f0 !important;
            border-color: #4a5568 !important;
            caret-color: #a8c99c !important;
        }
        body.dark-mode .add-product-field input::placeholder {
            color: #718096 !important;
            -webkit-text-fill-color: #718096 !important;
        }
        body.dark-mode .add-product-field label {
            color: #a0aec0 !important;
            -webkit-text-fill-color: #a0aec0 !important;
        }
    `;
    document.head.appendChild(style);
})();

console.log('📦 Inventory module loaded!');