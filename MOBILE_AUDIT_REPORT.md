# 📱 Mobile Responsiveness Audit Report

**Sari-Sari Store App — Comprehensive Audit**  
_Covers all 7 templates, 13 CSS files, and 9 JS files_

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Per-Page Structural Summaries](#2-per-page-structural-summaries)
3. [Inline Grid Layouts That Don't Collapse](#3-inline-grid-layouts-that-dont-collapse)
4. [JS-Created Dialogs & Modals](#4-js-created-dialogs--modals)
5. [Fixed/Absolute Positioned Elements & Z-Index Map](#5-fixedabsolute-positioned-elements--z-index-map)
6. [Inline Styles Causing Overflow Risk](#6-inline-styles-causing-overflow-risk)
7. [What mobile-responsive.css Covers (and Doesn't)](#7-what-mobile-responsivecss-covers-and-doesnt)
8. [Inventory Delete Dialogs — Special Focus](#8-inventory-delete-dialogs--special-focus)
9. [Actionable Recommendations](#9-actionable-recommendations)

---

## 1. Executive Summary

| Metric | Status |
|--------|--------|
| Templates with structural issues | 0 / 7 (HTML is clean) |
| CSS files with responsive rules | 4 / 13 have breakpoints |
| JS files creating inline-styled modals | **7 / 9** |
| JS files with mobile media queries in injected styles | 4 / 7 |
| Unique z-index values in use | **12+** (some conflicting) |
| Inline `grid-template-columns` that won't collapse | **~14 instances** |
| Dialogs missing dark mode support | **3** (inventory delete dialogs, profit alerts) |

**Overall:** The app has a solid `mobile-responsive.css` safety net that catches most issues via an `auto-fit` grid override rule. However, several JS files create dialogs/layouts with inline styles that bypass CSS media queries. The biggest gaps are in `inventory.js`, `profit.js`, and `price_list.js`.

---

## 2. Per-Page Structural Summaries

### Dashboard (`dashboard.html` — main shell)
- **Structure:** SPA shell with fixed top nav + 7 toggled `.page` sections
- **CSS classes used:** `.top-nav`, `.nav-links`, `.page-container`, `.page`, `.active-page`
- **Responsive handling:** `navigations.css` has breakpoints at 1199px, 991px, 768px, 480px, 380px
- **Issues:** None — nav stacks vertically on mobile correctly

### Inventory Page (`inventory.html` fragment, rendered by `inventory.js`)
- **Structure:** Category selection grid → category detail with add-product form + table
- **CSS classes used:** `.category-card-modern`, `.inventory-table-modern`, `.form-grid` (inline only)
- **Responsive handling:** `mobile-responsive.css` converts table to card layout at 768px ✅
- **Issues:**
  - Add-product form uses inline `grid-template-columns: 1fr 1fr` — won't collapse ❌
  - Stats grid inline `minmax(220px, 1fr)` — caught by auto-fit override ✅
  - Category cards inline `minmax(280px, 1fr)` — caught by auto-fit override ✅

### Cart Page (rendered by `cart.js`)
- **Structure:** Floating button → slide-in search panel → cart items → checkout modals
- **CSS classes used:** `.floating-cart`, `.search-panel`, `.neo-cart-item`, `.neo-modal`, `.neo-modal-overlay`
- **Responsive handling:** `cart-system.css` + `mobile-responsive.css` + injected styles all have breakpoints ✅
- **Issues:** 
  - Search panel goes fullscreen on mobile (480px) — good ✅
  - Checkout modal becomes bottom sheet on 480px — good ✅
  - Minor: cart overlay created with inline z-index (9998), could conflict with nav (9999)

### Price List Page (rendered by `price_list.js`)
- **Structure:** Category selection grid → price table with editable inputs
- **CSS classes used:** `.price-category-card-modern`, `.price-table-modern`
- **Responsive handling:** `mobile-responsive.css` converts table to card layout ✅
- **Issues:**
  - Category cards inline `minmax(320px, 1fr)` — caught by auto-fit override ✅
  - Price input inline `width: 110px` — may need responsive adjustment on very small screens
  - Warning dialog has no mobile media query (but uses 90% width, generally OK)

### Debtors Page (rendered by `debtors.js`)
- **Structure:** Summary cards → add debtor form → loan product selector → debtor cards grid
- **CSS classes used:** `.debtors-summary-cards`, `.debtors-grid`, `.product-grid`, `.debtor-card`
- **Responsive handling:** Injected `<style>` block has `@media (max-width: 768px)` and `@media (max-width: 480px)` ✅
- **Issues:** Well-handled — grids go 1fr, loan items stack vertically ✅

### Profit Page (rendered by `profit.js`)
- **Structure:** Header → period cards (Today/This Week/This Month) → recent sales grid
- **CSS classes used:** Minimal — heavy inline styles
- **Responsive handling:** None in JS; relies entirely on `mobile-responsive.css` auto-fit override
- **Issues:**
  - Period card availability grids: inline `1fr 1fr` — NOT caught by auto-fit override ❌
  - Recent sales grid: inline `repeat(auto-fill, minmax(350px, 1fr))` — NOT caught (uses `auto-fill` not `auto-fit`) ❌
  - Alert/confirm dialogs have no mobile media query ❌

### Settings Page (rendered by `settings.js`)
- **Structure:** Settings grid with control groups (theme, business rules, store info)
- **CSS classes used:** Mostly inline, some via injected `<style>`
- **Responsive handling:** Injected styles have `@media (max-width: 768px)` ✅
- **Issues:**
  - Settings grid inline `minmax(400px, 1fr)` — caught by auto-fit override ✅
  - Success dialog has no mobile media query (but uses 90% width, generally OK)

---

## 3. Inline Grid Layouts That Don't Collapse

These are `grid-template-columns` values set via inline styles in JS `innerHTML` strings that could cause horizontal overflow on mobile screens.

### ❌ NOT Caught by `mobile-responsive.css` auto-fit rule

| File | Line(s) | Inline Value | Problem |
|------|---------|-------------|---------|
| `inventory.js` | ~400 | `grid-template-columns: 1fr 1fr` (add-product form) | Won't collapse to single column |
| `inventory.js` | ~1380 | `grid-template-columns: 1fr 1fr` (delete dialog details) | Cramped on mobile |
| `inventory.js` | ~1410 | `display: flex; gap: 12px` (delete dialog buttons) | Won't stack vertically |
| `inventory.js` | ~1580 | `display: flex; gap: 12px` (stock warning buttons) | Won't stack vertically |
| `profit.js` | ~450 | `grid-template-columns: 1fr 1fr` (period card dates) | Won't collapse |
| `profit.js` | ~550 | `grid-template-columns: 1fr 1fr` (availability info) | Won't collapse |
| `profit.js` | ~700 | `repeat(auto-fill, minmax(350px, 1fr))` (sales cards) | `auto-fill` not matched by CSS rule; 350px min too wide |

### ✅ Caught by `mobile-responsive.css` auto-fit → 1fr rule at 768px

| File | Inline Value | Reason |
|------|-------------|--------|
| `inventory.js` | `repeat(auto-fit, minmax(280px, 1fr))` (category cards) | Uses `auto-fit` |
| `inventory.js` | `repeat(auto-fit, minmax(220px, 1fr))` (stats grid) | Uses `auto-fit` |
| `price_list.js` | `repeat(auto-fit, minmax(320px, 1fr))` (category cards) | Uses `auto-fit` |
| `price_list.js` | `repeat(auto-fit, minmax(280px, 1fr))` (price stats) | Uses `auto-fit` |
| `price_list.js` | `repeat(auto-fit, minmax(200px, 1fr))` (category stats) | Uses `auto-fit` |
| `settings.js` | `repeat(auto-fit, minmax(400px, 1fr))` (settings grid) | Uses `auto-fit` |

---

## 4. JS-Created Dialogs & Modals

### Dialog Inventory

| Dialog | File | Creation Method | Width | Mobile Query | Dark Mode |
|--------|------|----------------|-------|--------------|-----------|
| DialogSystem V5 | `dialog-system.js` | `<style>` injection | `90%, max 450px` | ✅ 480px | ✅ |
| Dialog override styles | `inventory.js` L5–160 | `<style>` injection + `!important` | Overrides above | ❌ **NONE** | Partial |
| Delete confirm (#1) | `inventory.js` ~L1309 | `createElement` + inline styles | `90%, max 480px` | ❌ NONE | ❌ **NONE** |
| Delete confirm (#2 - stock) | `inventory.js` ~L1500 | `createElement` + inline styles | `90%, max 480px` | ❌ NONE | ❌ **NONE** |
| Modern Alert | `inventory.js` ~L1800 | `createElement` + `<style>` | `90%, max 450px` | ❌ NONE | ❌ NONE |
| Modern Warning | `inventory.js` ~L1900 | `createElement` + `<style>` | `92%, max 540px` | ✅ 640px | ❌ NONE |
| Clear cart confirm | `cart.js` ~L400 | `createElement` + `<style>` | `.neo-modal` class | ✅ 480px | ✅ via vars |
| Checkout modal | `cart.js` | `createElement` + class | `.neo-modal` class | ✅ 768px, 480px | ✅ via vars |
| Change calculator | `cart.js` ~L900 | `createElement` + `<style>` | `max 450px` | ✅ 480px | ✅ |
| Sale success | `cart.js` ~L1000 | `createElement` + inline | `90%, max 400px` | Via class | ✅ via vars |
| Modern Alert | `profit.js` ~L1050 | `createElement` + inline | `90%, max 450px` | ❌ NONE | ❌ NONE |
| Modern Confirm | `profit.js` ~L1100 | `createElement` + inline | `90%, max 450px` | ❌ NONE | ❌ NONE |
| Custom Confirm | `debtors.js` ~L1300 | `createElement` + `<style>` | `90%, max 500px` | ✅ 600px | ✅ inline |
| Warning dialog | `price_list.js` ~L1200 | `createElement` + inline | `90%, max 500px` | ❌ NONE | ❌ NONE |
| Success dialog | `settings.js` ~L700 | `createElement` + inline | `90%, max 480px` | ❌ NONE | ❌ NONE |

### Critical Finding: `inventory.js` Dialog Override Styles

Lines 5–160 of `inventory.js` inject a `<style id="modern-dialog-override-styles">` block that duplicates and overrides `dialog-system.js` styles with `!important` rules. **This override block has NO mobile media query**, which means it overrides the `@media (max-width: 480px)` breakpoint from `dialog-system.js`.

**Impact:** When DialogSystem V5 dialogs (alert, confirm, prompt) are triggered from inventory context, the mobile-responsive adjustments from `dialog-system.js` are negated by the `!important` overrides.

---

## 5. Fixed/Absolute Positioned Elements & Z-Index Map

```
Z-INDEX STACK (low → high):
─────────────────────────────────────────
   1000  │ Transaction cleanup indicator  │ dashboard.js    │ fixed bottom-right
   9998  │ Cart overlay (#cartOverlay)    │ cart.js          │ fixed fullscreen
   9999  │ Top navigation                │ navigations.css  │ fixed top
  10000  │ Cart floating button          │ cart-system.css  │ fixed bottom-right
  10000  │ Checkout modal overlay        │ cart.js          │ fixed fullscreen
  10001  │ Search panel                  │ cart-system.css  │ fixed right
  10002  │ Dark mode toggle              │ darkmode.css     │ fixed top-left
  20000  │ DialogSystem overlay          │ dialog-system.js │ fixed fullscreen
  25000  │ Inventory dialog overrides    │ inventory.js     │ —
  25000  │ Delete confirm overlays       │ inventory.js     │ fixed fullscreen
  50000  │ Debtors confirm overlay       │ debtors.js       │ fixed fullscreen
  99999  │ Dialog overlay (.dialog-box)  │ navigations.css  │ fixed fullscreen
  99999  │ Modern alert overlays         │ inventory.js     │ fixed fullscreen
  99999  │ Modern warning overlays       │ inventory.js     │ fixed fullscreen
```

### Z-Index Conflicts

1. **Dark mode toggle (10002) overlaps search panel (10001) and cart button (10000)** — on mobile, the toggle button may visually overlap the cart's search panel when open. Both are always visible.

2. **Transaction cleanup indicator (1000) is below everything** — will be hidden behind any overlay, including the cart floating button (10000). May also be obscured by the floating cart button at bottom-right.

3. **Multiple overlays at 99999** — if both a dialog and a modern alert trigger simultaneously, they'll occupy the same z-layer. Not likely in practice but fragile.

4. **Nav (9999) vs cart overlay (9998)** — cart overlay renders BEHIND the nav, so the nav peeks through on top of the dimmed overlay on mobile. This may be intentional but looks odd.

---

## 6. Inline Styles Causing Overflow Risk

### Width-Related

| File | Element | Inline Style | Risk |
|------|---------|-------------|------|
| `inventory.js` | Qty input (table rows) | `width: 80px; padding: 10px` | OK on most screens |
| `inventory.js` | Form inputs | `height: 70px; padding: 22px 24px; font-size: 17px` | Large but touch-friendly |
| `price_list.js` | Price input | `width: 110px; padding: 12px 16px` | May overflow on 320px screens when combined with label |
| `inventory.js` | Delete dialog icon | `width: 100px; height: 100px` / `width: 120px; height: 120px` | Large on small screens |
| `profit.js` | Period card "coming soon" | Large padding + fixed font sizes | Takes significant viewport on mobile |

### Font-Size Related

| File | Element | Size | Impact |
|------|---------|------|--------|
| `inventory.js` | Delete dialog title | `26px` fixed | OK as headline |
| `inventory.js` | Stock warning title | `26px` fixed | OK |
| `inventory.js` | Modern alert title | `26px` fixed | OK, auto-closed after 3s |
| `inventory.js` | Warning dialog title | `32px` fixed | Large on < 375px screens |
| `profit.js` | Period card amount | `2.5rem` inline | Large but OK |

---

## 7. What `mobile-responsive.css` Covers (and Doesn't)

### ✅ Covered

| Feature | Breakpoint | Rule |
|---------|-----------|------|
| Global overflow-x hidden | 768px | `body { overflow-x: hidden }` |
| Input font-size 16px (prevents iOS zoom) | Global | `input { font-size: 16px !important }` |
| Nav fixed top + stacking | 968px, 768px | `.top-nav` repositioned |
| Content padding-top for nav | 768px | `.page-container` padding |
| Cart search panel fullscreen | 480px | `.search-panel { width: 100% }` |
| Cart items card layout | 480px | `.cart-item { display: block }` |
| Inventory table → card layout | 768px | `thead { display: none }`, `td::before` labels |
| Price table → card layout | 768px | Same pattern |
| Debtors grid → 1fr | 768px | `.debtors-grid` etc. |
| **Auto-fit grid override** | **768px** | **`div[style*="auto-fit"] { 1fr !important }`** |
| Modal/dialog generic | 600px | `.custom-confirm-modal { width: 95% }` + column buttons |
| Touch-action: manipulation | Global | All interactive elements |
| Safe area insets | `@supports` | `.floating-cart` |
| Very small phones | 375px | Reduced font sizes, padding |
| Landscape mode | 968px landscape | Grid to `repeat(2, 1fr)` |
| Dark mode mobile colors | 768px | Nav, inputs, cart items, tables |
| Neomorphism shadow reduction | 768px, 480px | Lighter shadows on mobile |
| Min touch target sizes | 768px | `button { min-height: 44px; min-width: 44px }` |
| Print styles | `@media print` | Hide nav, buttons |
| Reduced motion | `prefers-reduced-motion` | Disable animations |

### ❌ NOT Covered

| Gap | Why | Impact |
|-----|-----|--------|
| `grid-template-columns: 1fr 1fr` inline | CSS selector only targets `auto-fit` | Inventory form, profit period cards, delete dialog grids stay 2-column |
| `repeat(auto-fill, ...)` inline | CSS selector only targets `auto-fit` | Profit recent sales grid (350px min) could overflow |
| Inventory delete dialog responsive | Fully inline styles, no CSS classes | Buttons don't stack, padding doesn't reduce, no dark mode |
| profit.js modern alerts | Fully inline styles, no CSS classes | No font/padding reduction |
| price_list.js warning dialog buttons | Inline, no responsive | Buttons stay side-by-side |
| Inventory dialog override `!important` | Overrides dialog-system.js responsive | DialogSystem mobile rules negated in inventory |

---

## 8. Inventory Delete Dialogs — Special Focus

_Per user request: "styled delete dialogs that were recently added"_

### Dialog 1: Delete Product Confirmation (~line 1309)

**Creation:** `document.createElement('div')` with full inline `style.cssText` + inner HTML with inline styles

**Layout on Mobile (<480px):**
```
┌──────────────────────────────┐
│ 🗑️  (100×100 icon)           │  ← Large icon, OK
│ "Delete Product?"            │  ← 26px font, OK
│ ┌────────────┬─────────────┐ │
│ │ Product    │ Name        │ │  ← 1fr 1fr grid, CRAMPED
│ │ Price      │ ₱XX.XX      │ │  ← Text may truncate
│ │ Stock      │ XX units    │ │
│ │ Margin     │ XX%         │ │
│ └────────────┴─────────────┘ │
│ ┌──────────┐ ┌─────────────┐ │
│ │ Cancel   │ │ Delete      │ │  ← flex row, buttons CRAMPED
│ └──────────┘ └─────────────┘ │
└──────────────────────────────┘
```

**Issues Found:**
1. ❌ **No `@media` query** — all styles are inline, no responsive adjustment
2. ❌ **No dark mode** — hardcoded light colors (`#F9FAFB`, `#FFFFFF`, `#374151`)
3. ❌ **Detail grid `1fr 1fr`** stays two-column at any width
4. ❌ **Buttons stay side-by-side** via `display: flex` — should stack on mobile
5. ⚠️ **Large icon** (100×100) in 480px viewport takes ~21% of width
6. ⚠️ **Padding** (50px 40px) wastes space on small screens

### Dialog 2: Stock Warning (Second Confirmation, ~line 1500)

**Same structural issues PLUS:**
1. ❌ **Even larger icon** (120×120)  
2. ❌ **Animated pulse ring** adds visual noise on small screens
3. ❌ **6px accent bar animation** creates slight performance concern on low-end devices
4. ❌ **`<ul>` inside the warning box** doesn't have reduced font size for mobile
5. ⚠️ **Max-width 480px** means on a 375px phone (after margins), the content area is ~335px

### `showModernAlert()` (~line 1800)

1. ❌ **No mobile media query** in the injected `<style>` block
2. ❌ **No dark mode** support
3. ✅ Width `90%, max-width 450px` is responsive

### `showModernWarningDialog()` (~line 1900)

1. ✅ **Has `@media (max-width: 640px)`** — detail grid goes 1fr, padding reduces
2. ❌ **No dark mode** — hardcoded light background gradient
3. ✅ Width `92%, max-width 540px` is responsive

### Inventory Dialog Override Styles (lines 5–160)

This injected `<style>` block overrides `dialog-system.js` globally:
- Uses `!important` on font sizes, padding, backgrounds, borders, shadows
- **Does NOT include** the `@media (max-width: 480px)` breakpoint that exists in `dialog-system.js`
- **Effect:** When DialogSystem alert/confirm/prompt is called from any page (since the styles are global), the mobile responsive adjustments are overridden

---

## 9. Actionable Recommendations

### 🔴 Critical (Mobile-Breaking)

#### C1. Fix auto-fill grid in `profit.js` recent sales
```
File: profit.js, ~line 700
Current: repeat(auto-fill, minmax(350px, 1fr))
Fix:     repeat(auto-fit, minmax(280px, 1fr))
Why:     auto-fill not caught by CSS override; 350px too wide for mobile
```

#### C2. Add mobile media query to `inventory.js` dialog override styles
```
File: inventory.js, lines 5–160
Fix:     Add @media (max-width: 480px) block matching dialog-system.js breakpoints
Why:     !important overrides negate all DialogSystem mobile responsiveness
```

#### C3. Make inventory delete dialogs responsive
```
File: inventory.js, deleteProduct function (~lines 1309–1600)
Fix:     Add injected <style> with @media (max-width: 480px) rules:
         - Detail grid: grid-template-columns: 1fr (instead of 1fr 1fr)
         - Buttons: flex-direction: column
         - Padding: reduce from 50px 40px to 30px 20px
         - Icon: reduce to 80px on mobile
```

#### C4. Make inventory add-product form responsive
```
File: inventory.js, renderCategoryInventory() (~line 400)
Current: grid-template-columns: 1fr 1fr (inline)
Fix:     Use a CSS class instead, or change to repeat(auto-fit, minmax(250px, 1fr))
```

### 🟡 Important (Degraded Experience)

#### I1. Add dark mode to inventory delete dialogs
Both delete confirmation dialogs use hardcoded light-theme colors. Check `document.body.classList.contains('dark-mode')` and apply dark backgrounds/text colors (like `debtors.js` `customConfirm()` does).

#### I2. Fix profit.js period card grids
```
File: profit.js, renderPeriodCard()
Current: grid-template-columns: 1fr 1fr (inline, ~2 instances)
Fix:     Use repeat(auto-fit, minmax(150px, 1fr)) or add CSS class
```

#### I3. Add mobile media query to profit.js showModernAlert/showModernConfirm
Both functions inject `<style>` blocks without mobile breakpoints. Add:
```css
@media (max-width: 480px) {
    .modern-alert-box, .confirm-box { 
        padding: 30px 20px; 
    }
    .modern-alert-title, .confirm-title { 
        font-size: 22px; 
    }
    .modern-alert-btn, .confirm-btn { 
        padding: 14px 20px; 
        font-size: 14px; 
    }
}
```

#### I4. Update `mobile-responsive.css` auto-fit rule to also catch auto-fill
```css
/* Current */
div[style*="grid-template-columns: repeat(auto-fit"] {
    grid-template-columns: 1fr !important;
}
/* Updated */
div[style*="grid-template-columns: repeat(auto-fit"],
div[style*="grid-template-columns: repeat(auto-fill"] {
    grid-template-columns: 1fr !important;
}
```

#### I5. Resolve nav/cart z-index stacking
Cart overlay (9998) renders behind nav (9999). Either: make cart overlay 10000+ or hide nav when cart is open via CSS `.cart-open .top-nav { display: none }`.

### 🟢 Minor (Polish)

#### M1. Price input width on very small screens
`price_list.js` price inputs are `width: 110px` inline. On 320px screens in card layout, add CSS override to `width: 100%`.

#### M2. Transaction cleanup indicator overlap
`dashboard.js` creates a fixed indicator at bottom-right z-index 1000, same position as floating cart button (z-index 10000). May be hidden. Either move indicator position or increase z-index.

#### M3. Consolidate dialog implementations
There are **5 different dialog implementations** across the codebase:
1. `dialog-system.js` DialogSystem V5 (alert/confirm/prompt)
2. `inventory.js` showModernAlert + showModernWarningDialog + delete dialogs
3. `cart.js` clearCart confirm + change calculator
4. `profit.js` showModernAlert + showModernConfirm  
5. `debtors.js` customConfirm

Consider consolidating into DialogSystem V5 with theming support, which already has the best responsive handling.

#### M4. Reduce neomorphism shadow complexity on mobile
`navigations.css` defines multi-layer box-shadows at every breakpoint (up to 4 shadow layers on 380px screens). On low-end Android devices, this can cause scroll jank. `mobile-responsive.css` already reduces page element shadows — extend this to nav buttons.

---

## Appendix A: CSS File Responsive Breakpoint Map

| CSS File | Breakpoints |
|----------|-------------|
| `navigations.css` | 1199px, 991px, 768px, 480px, 380px |
| `mobile-responsive.css` | 968px, 768px, 600px, 480px, 375px |
| `calendar.css` | Has responsive rules for calendar grid |
| `cart-system.css` | Has responsive rules for cart panel |
| `variables.css` | None (custom properties only) |
| `pages.css` | None |
| `cards.css` | None |
| `tables-forms.css` | None |
| `product.css` | None |
| `badges.css` | None |
| `utilities.css` | None |
| `darkmode.css` | None |
| `reset.css` | None |

## Appendix B: JS File Injected Styles Summary

| JS File | Injects `<style>` | Mobile `@media` | Lines |
|---------|-------------------|-----------------|-------|
| `dialog-system.js` | Yes (1 block) | ✅ 480px | ~50 lines |
| `inventory.js` | Yes (4 blocks) | ❌ (1 of 4 has 640px) | ~500+ lines |
| `cart.js` | Yes (3 blocks) | ✅ 768px, 480px | ~300+ lines |
| `profit.js` | Yes (2 blocks) | ❌ None | ~100 lines |
| `debtors.js` | Yes (1 block in getStyles + 1 in confirm) | ✅ 768px, 480px, 600px | ~200+ lines |
| `price_list.js` | Yes (2 blocks) | Partial (768px for one) | ~150 lines |
| `settings.js` | Yes (1 block) | ✅ 768px | ~80 lines |
| `calendar.js` | No (uses CSS classes) | N/A | N/A |
| `dashboard.js` | No (inline only) | N/A | N/A |

---

_End of audit. Generated by reviewing all source files in the workspace._
