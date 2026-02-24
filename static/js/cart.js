/**
 * cart.js — Shopping-cart state, checkout flows, and search UI.
 *
 * Sections:
 *  1. Cart Operations   — addToCart, removeFromCart, updateCartQuantity,
 *                          setCartQuantity, clearCart
 *  2. Cart Display       — updateCartDisplay, toggleCartPanel, ensureCartPanelClosed,
 *                          overlay management
 *  3. Checkout Flow      — handleCheckout (payment picker), showChangeCalculator
 *                          (cash flow), processDebtCheckout → completeDebtSale,
 *                          completeSale (records sale + decrements stock)
 *  4. Search             — handleSearch, clearSearch, setupSearchClearButton
 *  5. Initialisation     — initializeCart, DOMContentLoaded wiring
 *  6. Style Injectors    — injectCartNeomorphismStyles, injectCheckoutNeomorphismStyles,
 *                          injectDebtNeomorphismStyles (CSS-in-JS for modal overlays)
 *
 * State: `cart` — a module-level array of { id, name, price, cost, quantity }.
 * Dependencies: database.js (DB), dialog-system.js (DialogSystem)
 *
 * FIX (2026-02-20):
 *   - completeDebtSale() success dialog shows surcharge breakdown.
 *   - neo-btn-qty-minus now matches neo-btn-qty-plus (green, both modes).
 */


console.log('🔄 Cart.js loaded - Version 8');

/** In-memory cart item array — synced to window.cart for global access. */
let cart = [];

// =============================================================================
//  1. CART OPERATIONS
// =============================================================================


window.addToCart = async function(productId) {
    const products = await DB.getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product || product.quantity === 0) {
        await DialogSystem.alert('Product not available!', '⚠️');
        return;
    }

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        const qtyInput = document.querySelector(`input[data-cart-id="${productId}"]`);
        if (qtyInput) {
            qtyInput.style.transform = 'scale(1.2)';
            qtyInput.style.transition = 'transform 0.3s ease';
            setTimeout(() => {
                qtyInput.style.transform = 'scale(1)';
                qtyInput.focus();
                qtyInput.select();
            }, 300);
        }
        return;
    }

    cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        cost: product.cost,
        quantity: 1
    });

    updateCartDisplay();
    clearSearch();
    
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.style.transform = 'scale(1.4)';
        setTimeout(() => { cartCount.style.transform = 'scale(1)'; }, 300);
    }
    
    setTimeout(() => {
        const qtyInput = document.querySelector(`input[data-cart-id="${productId}"]`);
        if (qtyInput) { qtyInput.focus(); qtyInput.select(); }
    }, 100);
};

window.removeFromCart = async function(productId) {
    const itemElements = document.querySelectorAll('.neo-cart-item');
    let targetElement = null;
    
    itemElements.forEach(el => {
        const removeBtn = el.querySelector(`[data-product-id="${productId}"]`);
        if (removeBtn) targetElement = el;
    });
    
    if (targetElement) {
        targetElement.style.transform = 'translateX(100%)';
        targetElement.style.opacity = '0';
        targetElement.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            cart = cart.filter(item => item.id !== productId);
            updateCartDisplay();
            if (document.getElementById('generalSearch')) handleSearch();
        }, 300);
    } else {
        cart = cart.filter(item => item.id !== productId);
        updateCartDisplay();
        if (document.getElementById('generalSearch')) handleSearch();
    }
};

window.updateCartQuantity = async function(productId, change) {
    const item = cart.find(item => item.id === productId);
    const products = await DB.getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!item || !product) return;

    const newQty = item.quantity + change;
    
    if (newQty <= 0) { await removeFromCart(productId); return; }

    if (newQty > product.quantity) {
        await DialogSystem.alert(`Not enough stock! Only ${product.quantity} available.`, '⚠️');
        return;
    }

    item.quantity = newQty;
    updateCartDisplay();
    if (document.getElementById('generalSearch')) handleSearch();
};

window.setCartQuantity = async function(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    const products = await DB.getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!item || !product) return;

    const qty = parseInt(quantity);
    
    if (isNaN(qty) || qty < 0) {
        await DialogSystem.alert('Invalid quantity!', '⚠️');
        updateCartDisplay();
        return;
    }

    if (qty === 0) { await removeFromCart(productId); return; }

    if (qty > product.quantity) {
        await DialogSystem.alert(`Not enough stock! Only ${product.quantity} available.`, '⚠️');
        item.quantity = product.quantity;
        updateCartDisplay();
        return;
    }

    item.quantity = qty;
    updateCartDisplay();
    if (document.getElementById('generalSearch')) handleSearch();
};

window.clearCart = async function() {
    if (cart.length === 0) return;
    
    const confirmDialog = document.createElement('div');
    confirmDialog.innerHTML = `
        <div class="neo-modal-overlay" style="animation: fadeIn 0.3s ease;">
            <div class="neo-modal neo-clear-confirm" style="animation: slideUp 0.3s ease; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%) !important;">
                <div class="neo-clear-icon">🗑️</div>
                <h2 class="neo-clear-title" style="color: #ffffff !important;">Clear All Items?</h2>
                <p class="neo-clear-desc" style="color: #cccccc !important;">This will remove all <strong>${cart.length}</strong> item${cart.length > 1 ? 's' : ''} from your cart. This action cannot be undone.</p>
                <div class="neo-clear-buttons">
                    <button id="confirmClear" class="neo-btn-primary neo-btn-danger">Yes, Clear All</button>
                    <button id="cancelClear" class="neo-btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
        <style>
            .neo-clear-confirm { max-width: 420px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%) !important; border: 1px solid #333 !important; }
            .neo-clear-icon { width: 80px; height: 80px; background: linear-gradient(135deg, var(--danger-400) 0%, var(--danger-600) 100%); filter: brightness(0.85) saturate(0.7); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; font-size: 40px; animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); box-shadow: var(--neo-shadow-medium); }
            .neo-clear-title { margin: 0 0 15px 0; color: #ffffff !important; font-size: var(--font-size-xl); font-weight: 800; letter-spacing: -0.5px; }
            .neo-clear-desc { color: #cccccc !important; margin: 0 0 30px 0; font-size: var(--font-size-sm); line-height: 1.6; }
            .neo-clear-buttons { display: grid; gap: 12px; }
            .neo-btn-danger { background: var(--danger-500); border: 1px solid var(--danger-600); filter: brightness(0.85) saturate(0.7); }
            .neo-btn-danger:hover { background: var(--danger-600); border-color: var(--danger-700); filter: brightness(0.8) saturate(0.6); }
            @keyframes bounceIn { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
            @media (max-width: 480px) {
                .neo-clear-icon { width: 70px; height: 70px; font-size: 36px; margin-bottom: 20px; }
                .neo-clear-title { font-size: var(--font-size-lg); }
                .neo-clear-desc { font-size: 13px; }
            }
        </style>
    `;

    document.body.appendChild(confirmDialog);
    injectCheckoutNeomorphismStyles();

    document.getElementById('confirmClear').onclick = () => {
        document.body.removeChild(confirmDialog);
        cart = [];
        updateCartDisplay();
        if (document.getElementById('generalSearch')) handleSearch();
    };
    document.getElementById('cancelClear').onclick = () => { document.body.removeChild(confirmDialog); };
};

// =============================================================================
//  2. CART DISPLAY & PANEL TOGGLE
// =============================================================================

window.updateCartDisplay = function() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');

    if (cartCount) {
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = itemCount;
        cartCount.style.display = itemCount > 0 ? 'flex' : 'none';
    }

    if (!cartItems || !cartTotal) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">🛒 Cart is empty<br><small>Search and click products to add</small></p>';
        cartTotal.textContent = '0.00';
        return;
    }

    let total = 0;
    let html = '<div class="neo-cart-header" style="background: transparent !important;"><strong>Items in Cart:</strong></div><div class="neo-cart-list" style="background: transparent !important;">';

    const reversedCart = [...cart].reverse();

    reversedCart.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;

        html += `
            <div class="neo-cart-item" style="animation-delay: ${index * 0.05}s;">
                <div class="neo-cart-item-header">
                    <strong class="neo-cart-item-name">${item.name}</strong>
                    <button class="neo-btn-remove neo-btn-cart-remove" data-product-id="${item.id}" title="Remove">✕</button>
                </div>
                <div class="neo-cart-item-details">
                    <span class="neo-cart-item-price">₱${item.price.toFixed(2)} each</span>
                </div>
                <div class="neo-cart-controls">
                    <div class="neo-qty-controls">
                        <button class="neo-btn-qty neo-btn-qty-minus" data-product-id="${item.id}" title="Decrease">−</button>
                        <input type="number" value="${item.quantity}" min="1" class="neo-qty-input" data-cart-id="${item.id}">
                        <button class="neo-btn-qty neo-btn-qty-plus" data-product-id="${item.id}" title="Increase">+</button>
                    </div>
                    <div class="neo-cart-subtotal">
                        <span class="neo-subtotal-amount">₱${subtotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>`;
    });

    html += `</div>
        <button class="neo-btn-clear-cart" onclick="clearCart()">🗑️ Clear All</button>
        <button class="neo-btn-checkout" onclick="handleCheckout()">💳 CHECKOUT</button>
        <style>
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideInRight { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes successPop { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
            @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-20px); } 60% { transform: translateY(-10px); } }
        </style>
    `;
    
    cartItems.innerHTML = html;
    cartTotal.textContent = total.toFixed(2);

    setupCartEventListeners();
    injectCartNeomorphismStyles();
};

function setupCartEventListeners() {
    document.querySelectorAll('.neo-btn-qty-minus').forEach(btn => {
        btn.onclick = () => updateCartQuantity(parseInt(btn.dataset.productId), -1);
    });
    document.querySelectorAll('.neo-btn-qty-plus').forEach(btn => {
        btn.onclick = () => updateCartQuantity(parseInt(btn.dataset.productId), 1);
    });
    document.querySelectorAll('.neo-btn-cart-remove').forEach(btn => {
        btn.onclick = () => removeFromCart(parseInt(btn.dataset.productId));
    });
    document.querySelectorAll('.neo-qty-input').forEach(input => {
        input.onchange = () => setCartQuantity(parseInt(input.dataset.cartId), input.value);
    });
}

let isCartPanelOpen = false;
let cartPanelToggling = false;
let lastToggleTime = 0;

window.toggleCartPanel = function() {
    const now = Date.now();
    if (now - lastToggleTime < 350 && lastToggleTime !== 0) return;
    lastToggleTime = now;
    
    if (cartPanelToggling) return;
    cartPanelToggling = true;
    
    const searchPanel = document.getElementById('searchPanel');
    if (!searchPanel) { cartPanelToggling = false; return; }

    if (isCartPanelOpen) {
        searchPanel.classList.remove('open');
        hideCartOverlay();
        document.body.classList.remove('cart-open');
        document.body.style.overflow = 'auto';
        setTimeout(() => { cartPanelToggling = false; }, 400);
        isCartPanelOpen = false;
    } else {
        showCartOverlay();
        document.body.classList.add('cart-open');
        document.body.style.overflow = 'hidden';
        searchPanel.classList.add('open');
        setTimeout(() => {
            const searchInput = document.getElementById('generalSearch');
            if (searchInput) searchInput.focus();
            cartPanelToggling = false;
        }, 50);
        isCartPanelOpen = true;
    }
};

function ensureCartPanelClosed() {
    const searchPanel = document.getElementById('searchPanel');
    if (searchPanel) {
        searchPanel.classList.remove('open');
        isCartPanelOpen = false;
        document.body.classList.remove('cart-open');
        hideCartOverlay();
    }
}

let cartOverlay = null;

function createCartOverlay() {
    if (!cartOverlay) {
        cartOverlay = document.createElement('div');
        cartOverlay.id = 'cartOverlay';
        cartOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
            z-index: 9998; display: none; pointer-events: auto; cursor: pointer;
        `;
        cartOverlay.addEventListener('click', function(e) {
            const searchPanel = document.getElementById('searchPanel');
            if (e.target === cartOverlay && isCartPanelOpen && searchPanel) {
                e.preventDefault();
                e.stopPropagation();
                toggleCartPanel();
            }
        }, true);
        document.body.appendChild(cartOverlay);
    }
    return cartOverlay;
}

function showCartOverlay() {
    const overlay = createCartOverlay();
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function hideCartOverlay() {
    const overlay = document.getElementById('cartOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

// =============================================================================
//  3. CHECKOUT FLOW
// =============================================================================

window.handleCheckout = async function() {
    if (cart.length === 0) {
        await DialogSystem.alert('Cart is empty! Add products first.', '🛒');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalCost = cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    const profit = total - totalCost;

    const paymentDialog = document.createElement('div');
    paymentDialog.innerHTML = `
        <div class="neo-modal-overlay" style="animation: fadeIn 0.3s ease;">
            <div class="neo-modal neo-payment-confirm" style="animation: slideUp 0.3s ease;">
                <div class="neo-modal-header">
                    <div style="font-size: 64px; margin-bottom: 15px;">💳</div>
                    <h2>Payment Method</h2>
                    <p>How would you like to pay?</p>
                </div>
                <div class="neo-checkout-amount" style="overflow: hidden !important; margin-bottom: 30px !important; position: relative; z-index: 1; border-radius: 16px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <span>Total Amount:</span>
                        <span style="font-size: 24px; font-weight: 800;">₱${total.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px solid #444;">
                        <span>Expected Profit:</span>
                        <span style="font-size: 18px; font-weight: 700;">₱${profit.toFixed(2)}</span>
                    </div>
                </div>
                <div class="neo-checkout-buttons" style="background: none !important; box-shadow: none !important; position: relative; z-index: 2; display: flex; flex-direction: column; gap: 16px;">
                    <button id="payCash" class="neo-btn-primary neo-btn-success">
                        <span style="font-size: 24px;">💵</span>
                        <span>Cash Payment</span>
                    </button>
                    <button id="payDebt" class="neo-btn-primary neo-btn-warning">
                        <span style="font-size: 24px;">📝</span>
                        <span>Add to Debt List</span>
                    </button>
                </div>
                <button id="cancelCheckout" class="neo-btn-red" style="margin-top: 18px;">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(paymentDialog);
    injectCheckoutNeomorphismStyles();

    document.getElementById('payCash').onclick = () => {
        document.body.removeChild(paymentDialog);
        processCheckout('cash', total, profit);
    };
    document.getElementById('payDebt').onclick = () => {
        document.body.removeChild(paymentDialog);
        processDebtCheckout(total, profit);
    };
    document.getElementById('cancelCheckout').onclick = () => { document.body.removeChild(paymentDialog); };
};

async function processCheckout(paymentMethod, total, profit) {
    try {
        const products = await DB.getProducts();
        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (!product || product.quantity < item.quantity) {
                await DialogSystem.alert(`Not enough stock for ${item.name}!\nAvailable: ${product ? product.quantity : 0}`, '⚠️');
                return;
            }
        }
        if (paymentMethod === 'cash') await showChangeCalculator(total, profit, products);
    } catch (error) {
        console.error('Checkout error:', error);
        await DialogSystem.alert('Checkout failed! Please try again.', '❌');
    }
}

async function processDebtCheckout(total, profit) {
    const debtDialog = document.createElement('div');
    debtDialog.innerHTML = `
        <div class="neo-modal-overlay" style="animation: fadeIn 0.3s ease;">
            <div class="neo-modal neo-modal-smaller" style="animation: slideUp 0.3s ease;">
                <div class="neo-modal-header">
                    <div style="font-size: 64px; margin-bottom: 15px;">📝</div>
                    <h2>Add to Debt List</h2>
                    <p>Enter customer name</p>
                </div>
                <div class="neo-debt-amount">
                    <div style="font-size: 14px; opacity: 0.8; margin-bottom: 8px;">Debt Amount</div>
                    <div style="font-size: 36px; font-weight: 800;">₱${total.toFixed(2)}</div>
                </div>
                <div class="neo-form-group">
                    <label>Customer Name:</label>
                    <input list="debtCustomerNameList" type="text" id="debtCustomerName" placeholder="Enter customer name" class="neo-input-field" autocomplete="off"/>
                    <datalist id="debtCustomerNameList"></datalist>
                </div>
                <button id="confirmDebt" class="neo-btn-primary neo-btn-warning" style="margin-bottom: 14px;">Add to Debt List</button>
                <button id="cancelDebt" class="neo-btn-secondary neo-btn-cancel">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(debtDialog);
    injectDebtNeomorphismStyles();

    const customerNameInput = document.getElementById('debtCustomerName');
    customerNameInput.focus();

    try {
        const debtors = await DB.getDebtors();
        const unpaidDebtors = debtors.filter(d => !d.paid);
        const datalist = document.getElementById('debtCustomerNameList');
        if (datalist) datalist.innerHTML = unpaidDebtors.map(d => `<option value="${d.name}"></option>`).join('');
    } catch (e) { /* fail silently */ }

    document.getElementById('confirmDebt').onclick = async () => {
        const customerName = customerNameInput.value.trim();
        if (!customerName) { alert('⚠️ Please enter customer name!'); customerNameInput.focus(); return; }
        document.body.removeChild(debtDialog);
        await completeDebtSale(customerName, total, profit);
    };
    document.getElementById('cancelDebt').onclick = () => { document.body.removeChild(debtDialog); };
}

async function completeDebtSale(customerName, total, profit) {
    try {
        const products = await DB.getProducts();
        
        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (!product || product.quantity < item.quantity) {
                await DialogSystem.alert(`Not enough stock for ${item.name}!\nAvailable: ${product ? product.quantity : 0}`, '⚠️');
                return;
            }
        }

        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                try {
                    await DB.updateProduct(product.id, { ...product, quantity: product.quantity - item.quantity });
                } catch (error) {
                    console.error(`Failed to update product ${product.name}:`, error);
                }
            }
        }

        const surchargePercent = parseFloat(window.storeSettings?.debtSurcharge || 0);
        const surchargeAmount  = parseFloat(((surchargePercent / 100) * total).toFixed(2));
        const grandTotal       = parseFloat((total + surchargeAmount).toFixed(2));
        const hasSurcharge     = surchargePercent > 0 && surchargeAmount > 0;

        const debtorData = {
            name:              customerName,
            contact:           '',
            items:             cart.map(item => ({
                product_id: item.id, name: item.name,
                price: item.price, cost: item.cost, quantity: item.quantity
            })),
            original_total:    total,
            surcharge_percent: surchargePercent,
            surcharge_amount:  surchargeAmount,
            total_debt:        grandTotal,
            date_borrowed:     new Date().toISOString(),
            paid:              false
        };

        await DB.addDebtor(debtorData);

        const successDialog = document.createElement('div');
        successDialog.innerHTML = `
            <div class="neo-modal-overlay" style="animation: fadeIn 0.3s ease;">
                <div class="neo-modal neo-modal-success" style="animation: successPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);">
                    <div class="neo-success-icon">✅</div>
                    <h2 class="neo-success-title">Debt Recorded!</h2>

                    <div class="neo-success-info">
                        <div class="neo-success-item">
                            <span>👤 Customer:</span>
                            <span class="neo-success-value">${customerName}</span>
                        </div>

                        <div style="border-top: 1px dashed var(--border-light); margin: 10px 0;"></div>

                        ${hasSurcharge ? `
                        <div class="neo-success-item">
                            <span>🧾 Original Price:</span>
                            <span class="neo-success-value">₱${total.toFixed(2)}</span>
                        </div>
                        <div class="neo-success-item neo-surcharge-row">
                            <span>⚡ Added Surcharge&nbsp;<span class="neo-surcharge-badge">${surchargePercent}%</span>:</span>
                            <span class="neo-success-value neo-surcharge-value">+₱${surchargeAmount.toFixed(2)}</span>
                        </div>
                        <div style="border-top: 2px solid var(--border-light); margin: 10px 0;"></div>
                        <div class="neo-success-item neo-total-row">
                            <span>💰 Total Amount of Debt:</span>
                            <span class="neo-success-value neo-grand-total">₱${grandTotal.toFixed(2)}</span>
                        </div>
                        ` : `
                        <div class="neo-success-item neo-total-row">
                            <span>💰 Total Amount of Debt:</span>
                            <span class="neo-success-value neo-grand-total">₱${grandTotal.toFixed(2)}</span>
                        </div>
                        `}

                        <div style="border-top: 1px dashed var(--border-light); margin: 10px 0;"></div>
                        <div class="neo-success-item">
                            <span>📈 Expected Profit:</span>
                            <span class="neo-success-value neo-success-profit">₱${profit.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="neo-success-badge">📝 Added to Debt List</div>
                    <button id="closeSuccess" class="neo-success-btn">Done</button>
                </div>
            </div>
            <style>
                .neo-surcharge-badge { display: inline-block; background: linear-gradient(135deg, #F59E0B, #D97706); color: white; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 20px; vertical-align: middle; margin-left: 2px; }
                .neo-surcharge-value { color: #D97706 !important; font-weight: 800 !important; }
                body.dark-mode .neo-surcharge-value { color: #FBBF24 !important; }
                .neo-total-row span:first-child { font-weight: 700; color: var(--text-primary); opacity: 1 !important; }
                .neo-grand-total { font-size: 20px !important; color: #DC2626 !important; font-weight: 900 !important; }
                body.dark-mode .neo-grand-total { color: #f87171 !important; }
                .neo-success-profit { color: #059669 !important; }
                body.dark-mode .neo-success-profit { color: #34d399 !important; }
            </style>
        `;

        document.body.appendChild(successDialog);
        injectCheckoutNeomorphismStyles();

        document.getElementById('closeSuccess').onclick = () => { document.body.removeChild(successDialog); };

        cart = [];
        updateCartDisplay();
        if (document.getElementById('generalSearch')) handleSearch();
        if (typeof renderDebtors === 'function') await renderDebtors();

        console.log('✅ Debt recorded successfully!');

    } catch (error) {
        console.error('❌ Debt recording error:', error);
        await DialogSystem.alert('Failed to record debt! Please try again.', '❌');

        try {
            const refreshed = await DB.getProducts();
            for (const item of cart) {
                const product = refreshed.find(p => p.id === item.id);
                if (product) await DB.updateProduct(item.id, { ...product, quantity: product.quantity + item.quantity });
            }
        } catch (restoreError) {
            console.error('Failed to restore product quantities:', restoreError);
        }
    }
}

async function showChangeCalculator(total, profit, products) {
    const changeDialog = document.createElement('div');
    changeDialog.innerHTML = `
        <div class="neo-modal-overlay" style="animation: fadeIn 0.3s ease;">
            <div class="neo-modal neo-change-modal" style="animation: slideUp 0.3s ease;">
                <div class="neo-modal-header">
                    <div style="font-size: 64px; margin-bottom: 15px;">💵</div>
                    <h2>Cash Payment</h2>
                    <p>Enter amount received</p>
                </div>
                <div class="neo-change-amount">
                    <div style="font-size: 14px; margin-bottom: 8px;">Total Amount</div>
                    <div style="font-size: 36px; font-weight: 800;">₱${total.toFixed(2)}</div>
                </div>
                <div class="neo-form-group">
                    <label>Cash Received:</label>
                    <input type="number" id="cashReceived" placeholder="0.00" class="neo-input-field neo-input-cash" step="0.01" min="0"/>
                </div>
                <div id="changeDisplay" class="neo-change-display" style="display: none;">
                    <div class="neo-change-label">Change to Return:</div>
                    <div id="changeAmount" class="neo-change-amount-value">₱0.00</div>
                </div>
                <button id="confirmCash" class="neo-btn-primary neo-btn-success" disabled style="opacity: 0.5; margin-bottom: 14px;">Complete Sale</button>
                <button id="cancelCash" class="neo-btn-red">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(changeDialog);
    injectCheckoutNeomorphismStyles();

    const cashInput     = document.getElementById('cashReceived');
    const confirmBtn    = document.getElementById('confirmCash');
    const changeDisplay = document.getElementById('changeDisplay');
    const changeAmount  = document.getElementById('changeAmount');

    setTimeout(() => cashInput.focus(), 100);

    function updateChangeCalc() {
        const received = parseFloat(cashInput.value) || 0;
        const change   = received - total;
        if (received >= total) {
            confirmBtn.disabled = false; confirmBtn.style.opacity = '1'; confirmBtn.style.cursor = 'pointer';
            changeDisplay.style.display = 'block';
            changeAmount.textContent = `₱${change.toFixed(2)}`;
            changeAmount.classList.remove('insufficient');
        } else if (received > 0) {
            confirmBtn.disabled = true; confirmBtn.style.opacity = '0.5'; confirmBtn.style.cursor = 'not-allowed';
            changeDisplay.style.display = 'block';
            changeAmount.textContent = `Insufficient: ₱${Math.abs(change).toFixed(2)} short`;
            changeAmount.classList.add('insufficient');
        } else {
            confirmBtn.disabled = true; confirmBtn.style.opacity = '0.5'; confirmBtn.style.cursor = 'not-allowed';
            changeDisplay.style.display = 'none';
        }
    }

    cashInput.addEventListener('input',  updateChangeCalc);
    cashInput.addEventListener('keyup',  updateChangeCalc);
    cashInput.addEventListener('change', updateChangeCalc);
    cashInput.addEventListener('blur',   updateChangeCalc);

    let saleInProgress = false;
    confirmBtn.onclick = async () => {
        if (saleInProgress) return;
        saleInProgress = true;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing...';
        try { document.body.removeChild(changeDialog); await completeSale('cash', total, profit, products); }
        catch (e) { saleInProgress = false; }
    };
    document.getElementById('cancelCash').onclick = () => { document.body.removeChild(changeDialog); };
}

async function completeSale(paymentMethod, total, profit, products) {
    try {
        const saleData = {
    date: new Date().toISOString(),
    total: parseFloat(total.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
            payment_method: paymentMethod, paymentType: paymentMethod,
            items: cart.map(item => ({
                id: item.id, product_id: item.id, productId: item.id,
                name: item.name, product_name: item.name, quantity: item.quantity,
                price: item.price || 0, selling_price: item.price || 0,
                cost: item.cost || 0, cost_price: item.cost || 0
            }))
        };

        await DB.addSale(saleData);

        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                try { await DB.updateProduct(product.id, { ...product, quantity: product.quantity - item.quantity }); }
                catch (error) { console.error(`Failed to update product ${product.name}:`, error); }
            }
        }

        const successDialog = document.createElement('div');
        successDialog.innerHTML = `
            <div class="neo-modal-overlay" style="animation: fadeIn 0.3s ease;">
                <div class="neo-modal neo-modal-success" style="animation: successPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);">
                    <div class="neo-success-icon">✅</div>
                    <h2 class="neo-success-title">Sale Complete!</h2>
                    <div class="neo-success-info">
                        <div class="neo-success-item">
                            <span>Total:</span>
                            <span class="neo-success-value">₱${total.toFixed(2)}</span>
                        </div>
                        <div class="neo-success-item">
                            <span>Profit:</span>
                            <span class="neo-success-value neo-success-profit">₱${profit.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="neo-success-badge">💵 Cash Payment</div>
                    <button id="closeSuccess" class="neo-success-btn">Done</button>
                </div>
            </div>
        `;
        document.body.appendChild(successDialog);
        injectCheckoutNeomorphismStyles();
        document.getElementById('closeSuccess').onclick = () => { document.body.removeChild(successDialog); };

        cart = [];
        updateCartDisplay();
        if (document.getElementById('generalSearch')) handleSearch();

    } catch (error) {
        console.error('❌ Sale completion error:', error);
        await DialogSystem.alert('Failed to complete sale! Please try again.', '❌');
    }
}

// =============================================================================
//  4. PRODUCT SEARCH
// =============================================================================

window.handleSearch = async function() {
    const searchInput   = document.getElementById('generalSearch');
    const searchResults = document.getElementById('searchResults');
    const clearBtn      = document.querySelector('.clear-search-btn');
    
    if (!searchInput || !searchResults) return;

    const query = searchInput.value.toLowerCase().trim();
    if (clearBtn) clearBtn.classList.toggle('visible', query !== '');

    if (query === '') { searchResults.innerHTML = ''; return; }

    try {
        const products = await DB.getProducts();
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(query) && (p.quantity || p.stock || 0) > 0
        );
        
        if (filtered.length === 0) {
            searchResults.innerHTML = `<div style="padding: 20px; text-align: center; color: #999;"><p>😔 No products found for "${query}"</p></div>`;
            return;
        }
        
        let html = '<div class="search-results-list">';
        filtered.forEach((product, index) => {
            const inCart      = cart.find(item => item.id === product.id);
            const buttonText  = inCart ? '✓ In Cart' : '+ Add';
            const buttonClass = inCart ? 'btn-in-cart' : 'btn-add-search';
            const price       = product.price || product.selling_price || 0;
            const stock       = product.quantity || product.stock || 0;
            html += `
                <div class="search-result-item" style="padding:15px; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between; align-items:center; transition:background 0.2s; animation:fadeInUp 0.3s ease; animation-delay:${index*0.05}s; animation-fill-mode:both;">
                    <div style="flex:1;">
                        <div style="font-weight:700; color:#2C3E50; margin-bottom:5px;">${product.name}</div>
                        <div style="font-size:14px; color:#7F8C8D;">₱${parseFloat(price).toFixed(2)} • Stock: ${stock}</div>
                    </div>
                    <button class="${buttonClass}" onclick="addToCart(${product.id})" style="padding:8px 16px; background:${inCart ? '#27AE60' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:13px; transition:all 0.2s;">${buttonText}</button>
                </div>`;
        });
        html += `</div><style>@keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } } .search-result-item:hover { background:#f8f9fa; }</style>`;
        searchResults.innerHTML = html;
        
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = `<div style="padding:20px; text-align:center; color:#E74C3C;"><p>⚠️ Error searching products: ${error.message}</p></div>`;
    }
};

window.clearSearch = function() {
    const searchInput   = document.getElementById('generalSearch');
    const clearBtn      = document.querySelector('.clear-search-btn');
    const searchResults = document.getElementById('searchResults');
    if (searchInput) { searchInput.value = ''; searchInput.focus(); }
    if (clearBtn)      clearBtn.classList.remove('visible');
    if (searchResults) searchResults.innerHTML = '';
};

function setupSearchClearButton() {
    const searchInput = document.getElementById('generalSearch');
    const clearBtn    = document.querySelector('.clear-search-btn');
    if (searchInput && clearBtn) {
        clearBtn.onclick = clearSearch;
        searchInput.addEventListener('input', function() { clearBtn.classList.toggle('visible', this.value !== ''); });
    }
}

// =============================================================================
//  5. INITIALISATION
// =============================================================================

let cartInitialized = false;

function initializeCart() {
    if (cartInitialized) return;
    cartInitialized = true;
    
    ensureCartPanelClosed();
    
    const cartBtn     = document.getElementById('floatingCart');
    const searchPanel = document.getElementById('searchPanel');

    if (cartBtn && searchPanel) {
        cartBtn.onclick = null;
        cartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleCartPanel();
            return false;
        }, false);
    } else {
        console.error('❌ CRITICAL: Cart button or search panel not found!');
        return;
    }

    const searchInput = document.getElementById('generalSearch');
    if (searchInput) searchInput.addEventListener('input', handleSearch);

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.onclick = () => { if (typeof handleCheckout === 'function') handleCheckout(); };

    setupSearchClearButton();
    updateCartDisplay();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCart);
} else {
    initializeCart();
}

window.cart = cart;

// =============================================================================
//  6. CSS-IN-JS STYLE INJECTORS
// =============================================================================

function injectCartNeomorphismStyles() {
    if (document.getElementById('neo-cart-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'neo-cart-styles';
    style.textContent = `
        .neo-cart-header {
            font-weight: 700; padding: 12px 16px; color: var(--text-primary);
            background: var(--bg-surface); border-bottom: 1px solid var(--border-light);
            margin-bottom: 12px; font-size: var(--font-size-base); border-radius: 12px 12px 0 0;
        }
        .neo-cart-list { animation: fadeIn 0.3s ease; }
        .neo-cart-item {
            background: var(--bg-surface); border: 1.5px solid var(--border-light);
            border-radius: 18px; padding: 18px 16px; margin-bottom: 14px;
            box-shadow: var(--neo-shadow-light); transition: all var(--transition-base);
            animation: slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
            position: relative;
        }
        .neo-cart-item:hover { box-shadow: var(--neo-shadow-medium); transform: translateY(-2px); border-color: var(--primary-500); }
        body:not(.dark-mode) .neo-cart-item {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5);
        }
        body:not(.dark-mode) .neo-cart-item:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6); border-color: #27AE60; }
        body:not(.dark-mode) .neo-cart-item-name  { color: #2C3E50; }
        body:not(.dark-mode) .neo-cart-item-price { color: #27AE60; }
        body:not(.dark-mode) .neo-subtotal-amount  { color: #27AE60; }
        body.dark-mode .neo-cart-item {
            background: linear-gradient(135deg, #3a3835 0%, #2f2d2a 100%);
            border: 1px solid #4a4641;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        body.dark-mode .neo-cart-item:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12); border-color: #4ade80; }
        body.dark-mode .neo-cart-item-name  { color: #f5f5f4; }
        body.dark-mode .neo-cart-item-price { color: #4ade80; }
        body.dark-mode .neo-subtotal-amount  { color: #4ade80; }
        .neo-cart-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px; }
        .neo-cart-item-name { font-weight: 700; font-size: var(--font-size-base); flex: 1; word-break: break-word; }
        .neo-btn-remove { width: 36px; height: 36px; min-width: 36px; min-height: 36px; border-radius: var(--radius-full); border: none; background: var(--danger-500); color: white; font-size: 18px; cursor: pointer; transition: all var(--transition-base); box-shadow: var(--neo-shadow-light); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .neo-btn-remove:hover { background: var(--danger-600); transform: rotate(90deg) scale(1.1); }
        .neo-cart-item-details { color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: 12px; }
        .neo-cart-item-price { font-weight: 600; }
        .neo-cart-controls { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 12px; flex-wrap: wrap; }
        .neo-qty-controls { display: flex; gap: 8px; align-items: center; flex-shrink: 0; min-height: 44px; }

        /* ── Quantity buttons — both minus and plus are green ── */
        .neo-btn-qty {
            width: 44px; height: 44px; min-width: 44px; min-height: 44px;
            border-radius: var(--radius-full); font-size: 18px; font-weight: 700;
            cursor: pointer; transition: all var(--transition-fast);
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .neo-btn-qty-minus {
            background: var(--primary-500);
            color: white;
            border: 1px solid var(--primary-600);
            box-shadow: var(--neo-shadow-light);
        }
        .neo-btn-qty-minus:hover {
            background: var(--primary-600);
            border-color: var(--primary-700);
            transform: scale(1.05);
        }
        .neo-btn-qty-plus {
            background: var(--primary-500);
            color: white;
            border: 1px solid var(--primary-600);
            box-shadow: var(--neo-shadow-light);
        }
        .neo-btn-qty-plus:hover {
            background: var(--primary-600);
            border-color: var(--primary-700);
            transform: scale(1.05);
        }
        .neo-btn-qty:active { transform: scale(0.95); }

        .neo-qty-input { width: 70px; height: 44px; text-align: center; border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 8px 4px; font-weight: 700; font-size: var(--font-size-base); background: var(--bg-surface); color: var(--text-primary); box-shadow: var(--neo-inset-light); transition: all var(--transition-base); flex-shrink: 0; }
        .neo-qty-input:focus { border-color: var(--primary-400); box-shadow: var(--neo-inset-light), 0 0 0 3px rgba(34,197,94,0.1); outline: none; }
        .neo-cart-subtotal { flex-shrink: 0; text-align: right; min-width: 90px; }
        .neo-subtotal-amount { font-weight: 800; font-size: 18px; letter-spacing: -0.5px; }
        .neo-btn-clear-cart { width: calc(100% - 32px); padding: 14px 16px; background: var(--danger-500); border: 1px solid var(--danger-600); border-radius: var(--radius-lg); color: white; font-size: var(--font-size-base); font-weight: 700; cursor: pointer; transition: all var(--transition-base); margin: 16px 16px 12px 16px; box-shadow: var(--neo-shadow-medium); min-height: 48px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1px; }
        .neo-btn-clear-cart:hover { background: var(--danger-600); transform: translateY(-2px); box-shadow: var(--neo-shadow-elevated); }
        .neo-btn-checkout { width: calc(100% - 32px); padding: 18px 16px; background: linear-gradient(135deg, #27AE60 0%, #229954 100%); color: white; border: none; border-radius: var(--radius-lg); font-size: var(--font-size-base); font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; cursor: pointer; transition: all var(--transition-base); box-shadow: var(--neo-shadow-medium); min-height: 54px; display: flex; align-items: center; justify-content: center; margin: 0 16px 16px 16px; }
        .neo-btn-checkout:hover { background: linear-gradient(135deg, #229954 0%, #1e8449 100%); transform: translateY(-3px); }
        .neo-btn-checkout:active { transform: translateY(0); }
        body.dark-mode .neo-btn-checkout { background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); }
        body.dark-mode .neo-btn-checkout:hover { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
        @media (max-width: 768px) {
            .neo-cart-item { padding: 14px 12px; margin-bottom: 12px; border-radius: 14px; }
            .neo-qty-controls { gap: 6px; width: 100%; justify-content: flex-start; }
            .neo-cart-subtotal { width: 100%; margin-top: 8px; text-align: left; }
            .neo-btn-qty { width: 40px; height: 40px; min-width: 40px; min-height: 40px; font-size: 16px; }
            .neo-qty-input { width: 65px; height: 40px; }
        }
        @media (max-width: 480px) {
            .neo-cart-item { padding: 12px 10px; border-radius: 12px; }
            .neo-cart-item-name { font-size: 14px; }
            .neo-cart-item-details { font-size: 12px; }
            .neo-btn-qty { width: 38px; height: 38px; min-width: 38px; min-height: 38px; font-size: 14px; }
            .neo-qty-input { width: 60px; height: 38px; font-size: 14px; }
            .neo-subtotal-amount { font-size: 16px; }
        }
    `;
    document.head.appendChild(style);
}

function injectCheckoutNeomorphismStyles() {
    if (document.getElementById('neo-checkout-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'neo-checkout-styles';
    style.textContent = `
        .neo-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 16px; overflow-y: auto; }
        body.dark-mode .neo-modal-overlay { background: rgba(0,0,0,0.7); }
        .neo-modal { background: var(--bg-surface); border-radius: var(--radius-2xl); border: 1px solid var(--border-light); padding: 40px 32px; max-width: 500px; width: 100%; box-shadow: var(--neo-shadow-elevated); max-height: 90vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        .neo-modal-smaller { max-width: 450px; }
        .neo-modal-header { text-align: center; margin-bottom: 30px; }
        .neo-modal-header h2 { margin: 0 0 10px 0; color: var(--text-primary); font-size: var(--font-size-2xl); font-weight: 800; }
        .neo-modal-header p  { color: var(--text-secondary); margin: 0; font-size: var(--font-size-sm); }
        .neo-checkout-amount { background: var(--primary-50); border: 1px solid var(--primary-200); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 30px; box-shadow: var(--neo-shadow-light); }
        body.dark-mode .neo-checkout-amount { background: var(--primary-900); border-color: var(--primary-800); }
        .neo-checkout-amount > div { display: flex; justify-content: space-between; font-size: var(--font-size-base); color: var(--text-secondary); font-weight: 600; }
        .neo-debt-amount { background: var(--warning-50); border: 1px solid var(--warning-200); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 25px; text-align: center; box-shadow: var(--neo-shadow-light); }
        body.dark-mode .neo-debt-amount { background: var(--warning-900); border-color: var(--warning-800); }
        .neo-checkout-buttons { display: grid; gap: 12px; margin-bottom: 20px; }
        .neo-btn-primary { width: 100%; padding: 18px 20px; border: none; border-radius: var(--radius-lg); color: white; font-size: var(--font-size-base); font-weight: 700; cursor: pointer; transition: all var(--transition-base); box-shadow: var(--neo-shadow-medium); display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 48px; }
        .neo-btn-primary:hover { transform: translateY(-3px); box-shadow: var(--neo-shadow-elevated); }
        .neo-btn-primary:active { transform: translateY(-1px); }
        .neo-btn-success { background: var(--primary-500); border: 1px solid var(--primary-600); }
        .neo-btn-success:hover { background: var(--primary-600); border-color: var(--primary-700); }
        .neo-btn-warning { background: var(--warning-500); border: 1px solid var(--warning-600); }
        .neo-btn-warning:hover { background: var(--warning-600); border-color: var(--warning-700); }
        .neo-btn-secondary { width: 100%; padding: 14px 20px; background: linear-gradient(135deg, #fee2e2, #fecaca); border: 1px solid #f87171; border-radius: var(--radius-lg); color: #dc2626; font-size: var(--font-size-base); font-weight: 600; cursor: pointer; transition: all var(--transition-base); box-shadow: var(--neo-shadow-light); min-height: 44px; display: flex; align-items: center; justify-content: center; }
        .neo-btn-secondary:hover { background: linear-gradient(135deg, #fecaca, #fca5a5); border-color: #ef4444; }
        .neo-form-group { margin-bottom: 20px; }
        .neo-form-group label { display: block; margin-bottom: 8px; font-weight: 700; color: var(--text-primary); font-size: var(--font-size-sm); }
        .neo-input-field { width: 100%; padding: 14px 16px; font-size: var(--font-size-base); font-weight: 600; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-surface); color: var(--text-primary); box-shadow: var(--neo-inset-light); transition: all var(--transition-base); box-sizing: border-box; min-height: 44px; }
        .neo-input-field:focus { border-color: var(--primary-400); box-shadow: var(--neo-inset-light), 0 0 0 3px rgba(34,197,94,0.1); outline: none; }
        .neo-input-field::placeholder { color: var(--text-tertiary); }
        .neo-input-cash { font-size: 24px !important; text-align: center; font-weight: 700 !important; border-radius: 18px !important; }
        .neo-change-modal { max-width: 450px; }
        .neo-change-amount { background: linear-gradient(135deg, var(--primary-50, #f0fdf4) 80%, #e0f7e9 100%); border: 1.5px solid var(--primary-200, #bbf7d0); border-radius: 22px; padding: 22px 18px 18px 18px; margin-bottom: 25px; text-align: center; box-shadow: 0 4px 18px 0 rgba(39,174,96,0.10), var(--neo-shadow-light); color: var(--primary-700); font-weight: 700; }
        body.dark-mode .neo-change-amount { background: linear-gradient(135deg, #1f4620 0%, #2a5a30 100%); border-color: #3d6f3d; color: #dcfce7; }
        .neo-change-display { background: linear-gradient(135deg, var(--warning-50, #fffbeb) 80%, #fef3c7 100%); border: 1.5px solid var(--warning-200, #fde68a); border-radius: 22px; padding: 22px 18px 18px 18px; text-align: center; margin-bottom: 20px; animation: slideDown 0.3s ease; box-shadow: 0 4px 18px 0 rgba(251,191,36,0.10), var(--neo-shadow-light); }
        body.dark-mode .neo-change-display { background: linear-gradient(135deg, #4a3a00 0%, #5a4a10 100%); border-color: #6a5a20; }
        .neo-change-label { font-size: 15px; color: var(--warning-800); font-weight: 700; margin-bottom: 10px; }
        body.dark-mode .neo-change-label { color: #fde68a; }
        .neo-change-amount-value { font-size: 36px; font-weight: 800; color: var(--primary-600); }
        body.dark-mode .neo-change-amount-value { color: #4ade80; }
        .neo-change-amount-value.insufficient { color: var(--danger-600); font-size: 24px; }
        .neo-modal-success { max-width: 440px; text-align: center; padding: 50px 40px; }
        .neo-success-icon { font-size: 64px; margin-bottom: 15px; display: block; }
        .neo-success-title { color: var(--warning-600); margin: 0 0 20px 0; font-size: var(--font-size-2xl); font-weight: 800; }
        .neo-success-info { background: var(--neutral-100); border-radius: var(--radius-lg); padding: 20px; margin: 25px 0; box-shadow: var(--neo-shadow-light); text-align: left; }
        body.dark-mode .neo-success-info { background: var(--neutral-800); border: 1px solid var(--neutral-700); }
        .neo-success-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; color: var(--text-secondary); gap: 12px; flex-wrap: wrap; }
        .neo-success-item:last-child { margin-bottom: 0; }
        .neo-success-value { color: var(--text-primary); font-weight: 700; font-size: var(--font-size-base); text-align: right; }
        .neo-success-badge { background: var(--warning-100); color: var(--warning-800); padding: 12px 16px; border-radius: var(--radius-lg); margin-bottom: 25px; font-weight: 600; border: 1px solid var(--warning-300); box-shadow: var(--neo-shadow-light); }
        body.dark-mode .neo-success-badge { background: var(--warning-900); color: var(--warning-200); border-color: var(--warning-800); }
        .neo-success-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #27AE60 0%, #229954 100%); color: white; border: none; border-radius: var(--radius-lg); font-size: var(--font-size-base); font-weight: 800; cursor: pointer; transition: all var(--transition-base); box-shadow: var(--neo-shadow-medium); }
        .neo-success-btn:hover { background: linear-gradient(135deg, #229954 0%, #1e8449 100%); transform: translateY(-2px); }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
            .neo-modal { padding: 28px 24px; }
            .neo-modal-header { margin-bottom: 24px; }
            .neo-modal-header h2 { font-size: var(--font-size-xl); }
            .neo-btn-primary { padding: 16px 18px; font-size: var(--font-size-sm); gap: 10px; }
        }
        @media (max-width: 480px) {
            .neo-modal-overlay { padding: 12px; align-items: flex-end; }
            .neo-modal { width: 100%; max-height: 80vh; padding: 24px 16px; border-radius: 24px 24px 0 0; }
            .neo-input-cash { font-size: 18px !important; }
            .neo-change-amount-value { font-size: 28px; }
        }
    `;
    document.head.appendChild(style);
}

function injectDebtNeomorphismStyles() {
    injectCheckoutNeomorphismStyles();
}