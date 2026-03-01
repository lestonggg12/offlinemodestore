/**
 * loading.js — Global Network Loading Indicator
 *
 * Shows a loading bar + connection status indicator on EVERY API call.
 * Works on both mobile and PC.
 *
 * HOW IT WORKS:
 *  - Wraps window.fetch so ALL requests (including DB.apiCall) are intercepted.
 *  - Shows a top progress bar + a small floating pill with connection speed.
 *  - Measures response time to estimate connection quality:
 *      Fast  : < 500ms   → 🟢 Fast
 *      Medium: < 1500ms  → 🟡 Slow
 *      Slow  : >= 1500ms → 🔴 Very Slow
 *
 * LOAD ORDER:
 *  Load this BEFORE database.js and all other scripts.
 *  (Add <script src="loading.js"></script> early in <head> or top of <body>.)
 *
 * No dependencies. Pure vanilla JS.
 */

(function () {
    'use strict';

    // =========================================================================
    //  CONFIG
    // =========================================================================

    const CFG = {
        fastThreshold:   500,    // ms — below this = Fast
        slowThreshold:   1500,   // ms — above this = Very Slow
        minShowTime:     300,    // ms — keep bar visible at least this long
        hideDelay:       800,    // ms — linger after complete before hiding
        pillHideDelay:   3000,   // ms — connection pill auto-hides after this
    };

    // =========================================================================
    //  STATE
    // =========================================================================

    let activeRequests = 0;
    let barTimer       = null;
    let pillTimer      = null;
    let startTime      = null;

    // =========================================================================
    //  INJECT STYLES
    // =========================================================================

    (function injectStyles() {
        if (document.getElementById('loading-indicator-styles')) return;

        const style = document.createElement('style');
        style.id    = 'loading-indicator-styles';
        style.textContent = `

            /* ── TOP PROGRESS BAR ── */
            #netLoadingBar {
                position: fixed;
                top: 0; left: 0;
                height: 3px;
                width: 0%;
                z-index: 999999;
                pointer-events: none;
                background: linear-gradient(90deg,
                    #a8c99c 0%,
                    #cbdfbd 40%,
                    #d4e09b 70%,
                    #a8c99c 100%
                );
                background-size: 200% 100%;
                transition: width 0.25s ease, opacity 0.4s ease;
                opacity: 0;
                box-shadow: 0 0 8px rgba(168, 201, 156, 0.8),
                            0 0 20px rgba(168, 201, 156, 0.4);
            }

            #netLoadingBar.active {
                opacity: 1;
                animation: loadingShimmer 1.4s linear infinite;
            }

            #netLoadingBar.complete {
                width: 100% !important;
                opacity: 1;
                transition: width 0.15s ease, opacity 0.4s ease;
            }

            #netLoadingBar.hide {
                opacity: 0;
                transition: opacity 0.4s ease;
            }

            @keyframes loadingShimmer {
                0%   { background-position: 200% center; }
                100% { background-position: -200% center; }
            }

            /* ── CONNECTION STATUS PILL ── */
            #netStatusPill {
                position: fixed;
                bottom: 80px;
                right: 16px;
                z-index: 999998;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 9px 14px;
                border-radius: 999px;
                font-family: 'Quicksand', sans-serif;
                font-size: 13px;
                font-weight: 700;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transform: translateY(12px) scale(0.92);
                transition: opacity 0.3s cubic-bezier(0.4,0,0.2,1),
                            transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                box-shadow: 0 4px 20px rgba(0,0,0,0.18),
                            0 1px 4px rgba(0,0,0,0.10);
                border: 1px solid rgba(255,255,255,0.18);
                max-width: calc(100vw - 32px);
            }

            /* Mobile: anchor to bottom-center above nav */
            @media (max-width: 768px) {
                #netStatusPill {
                    bottom: 72px;
                    left: 50%;
                    right: auto;
                    transform: translateX(-50%) translateY(12px) scale(0.92);
                }
                #netStatusPill.visible {
                    transform: translateX(-50%) translateY(0) scale(1) !important;
                }
            }

            #netStatusPill.visible {
                opacity: 1;
                transform: translateY(0) scale(1);
            }

            /* Colour themes */
            #netStatusPill.loading {
                background: rgba(168, 201, 156, 0.92);
                color: #2d5a3b;
                border-color: rgba(203, 223, 189, 0.6);
            }
            #netStatusPill.fast {
                background: rgba(209, 250, 229, 0.92);
                color: #065f46;
                border-color: rgba(52, 211, 153, 0.4);
            }
            #netStatusPill.medium {
                background: rgba(254, 243, 199, 0.92);
                color: #78350f;
                border-color: rgba(251, 191, 36, 0.4);
            }
            #netStatusPill.slow {
                background: rgba(254, 226, 226, 0.92);
                color: #7f1d1d;
                border-color: rgba(248, 113, 113, 0.4);
            }

            /* Dark mode overrides */
            body.dark-mode #netStatusPill.loading {
                background: rgba(45, 74, 52, 0.95);
                color: #a8e6b0;
                border-color: rgba(168, 201, 156, 0.25);
            }
            body.dark-mode #netStatusPill.fast {
                background: rgba(20, 60, 40, 0.95);
                color: #6ee7b7;
                border-color: rgba(52, 211, 153, 0.25);
            }
            body.dark-mode #netStatusPill.medium {
                background: rgba(60, 45, 10, 0.95);
                color: #fcd34d;
                border-color: rgba(251, 191, 36, 0.25);
            }
            body.dark-mode #netStatusPill.slow {
                background: rgba(60, 20, 20, 0.95);
                color: #fca5a5;
                border-color: rgba(248, 113, 113, 0.25);
            }

            #netStatusPill .pill-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }

            #netStatusPill.loading  .pill-dot { background: #3e8251; animation: pillPulse 0.9s ease-in-out infinite; }
            #netStatusPill.fast     .pill-dot { background: #10b981; }
            #netStatusPill.medium   .pill-dot { background: #f59e0b; }
            #netStatusPill.slow     .pill-dot { background: #ef4444; animation: pillPulse 0.7s ease-in-out infinite; }

            @keyframes pillPulse {
                0%, 100% { transform: scale(1);   opacity: 1; }
                50%       { transform: scale(1.5); opacity: 0.6; }
            }

            /* ── SPINNER inside pill (while loading) ── */
            #netStatusPill .pill-spinner {
                width: 13px;
                height: 13px;
                border: 2px solid currentColor;
                border-top-color: transparent;
                border-radius: 50%;
                animation: pillSpin 0.7s linear infinite;
                flex-shrink: 0;
                opacity: 0.7;
            }
            @keyframes pillSpin {
                to { transform: rotate(360deg); }
            }

            /* ── OFFLINE BANNER ── */
            #netOfflineBanner {
                position: fixed;
                top: 0; left: 0; right: 0;
                z-index: 1000000;
                padding: 10px 20px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                font-family: 'Quicksand', sans-serif;
                font-size: 14px;
                font-weight: 700;
                text-align: center;
                display: none;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-shadow: 0 2px 12px rgba(239,68,68,0.4);
            }
            #netOfflineBanner.show {
                display: flex;
                animation: bannerSlideDown 0.3s ease;
            }
            @keyframes bannerSlideDown {
                from { transform: translateY(-100%); opacity: 0; }
                to   { transform: translateY(0);     opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    })();

    // =========================================================================
    //  CREATE DOM ELEMENTS
    // =========================================================================

    function createElements() {
        if (document.getElementById('netLoadingBar')) return;

        // Progress bar
        const bar = document.createElement('div');
        bar.id    = 'netLoadingBar';
        document.body.appendChild(bar);

        // Status pill
        const pill = document.createElement('div');
        pill.id    = 'netStatusPill';
        pill.innerHTML = `
            <div class="pill-spinner"></div>
            <span class="pill-text">Loading…</span>
        `;
        document.body.appendChild(pill);

        // Offline banner
        const banner = document.createElement('div');
        banner.id    = 'netOfflineBanner';
        banner.innerHTML = `📡 No internet connection — please check your network`;
        document.body.appendChild(banner);
    }

    // Wait for body to exist (script may load in <head>)
    if (document.body) {
        createElements();
    } else {
        document.addEventListener('DOMContentLoaded', createElements);
    }

    // =========================================================================
    //  BAR CONTROLS
    // =========================================================================

    function barStart() {
        const bar = document.getElementById('netLoadingBar');
        if (!bar) return;
        clearTimeout(barTimer);
        bar.classList.remove('complete', 'hide');
        bar.classList.add('active');
        bar.style.width = '20%';

        // Fake incremental progress
        let pct = 20;
        barTimer = setInterval(() => {
            if (pct < 85) {
                pct += Math.random() * 8;
                bar.style.width = Math.min(pct, 85) + '%';
            }
        }, 300);
    }

    function barFinish() {
        const bar = document.getElementById('netLoadingBar');
        if (!bar) return;
        clearTimeout(barTimer);
        bar.classList.add('complete');
        setTimeout(() => {
            bar.classList.add('hide');
            setTimeout(() => {
                bar.classList.remove('active', 'complete', 'hide');
                bar.style.width = '0%';
            }, 400);
        }, CFG.hideDelay);
    }

    // =========================================================================
    //  PILL CONTROLS
    // =========================================================================

    function pillShow(state, text) {
        const pill = document.getElementById('netStatusPill');
        if (!pill) return;

        clearTimeout(pillTimer);

        pill.className    = 'visible ' + state;
        const isLoading   = state === 'loading';

        pill.innerHTML = isLoading
            ? `<div class="pill-spinner"></div><span class="pill-text">${text}</span>`
            : `<div class="pill-dot"></div><span class="pill-text">${text}</span>`;
    }

    function pillHide() {
        const pill = document.getElementById('netStatusPill');
        if (!pill) return;

        pillTimer = setTimeout(() => {
            pill.classList.remove('visible');
        }, CFG.pillHideDelay);
    }

    // =========================================================================
    //  REQUEST TRACKING
    // =========================================================================

    function onRequestStart() {
        activeRequests++;
        if (activeRequests === 1) {
            startTime = Date.now();
            barStart();
            pillShow('loading', 'Loading…');
        }
    }

    function onRequestEnd(durationMs) {
        activeRequests = Math.max(0, activeRequests - 1);
        if (activeRequests > 0) return; // still others in flight

        barFinish();

        // Determine connection quality
        let state, label;
        if (durationMs < CFG.fastThreshold) {
            state = 'fast';
            label = `🟢 Fast  (${durationMs}ms)`;
        } else if (durationMs < CFG.slowThreshold) {
            state = 'medium';
            label = `🟡 Slow  (${durationMs}ms)`;
        } else {
            state = 'slow';
            label = `🔴 Very Slow  (${(durationMs / 1000).toFixed(1)}s)`;
        }

        pillShow(state, label);
        pillHide();
    }

    function onRequestError() {
        activeRequests = Math.max(0, activeRequests - 1);
        if (activeRequests > 0) return;

        barFinish();
        pillShow('slow', '⚠️ Request failed');
        pillHide();
    }

    // =========================================================================
    //  INTERCEPT fetch()
    //  Wraps the global fetch so every DB.apiCall and plain fetch is captured.
    // =========================================================================

    const _originalFetch = window.fetch;

    window.fetch = function (...args) {
        // Only track /api/ calls (avoids noise from CDNs, fonts, etc.)
        const url = (typeof args[0] === 'string' ? args[0] : args[0]?.url) || '';
        const track = url.includes('/api/') || url.startsWith('/api');

        if (track) onRequestStart();

        const t0 = Date.now();

        return _originalFetch.apply(this, args).then(
            (response) => {
                if (track) onRequestEnd(Date.now() - t0);
                return response;
            },
            (error) => {
                if (track) onRequestError();
                throw error;
            }
        );
    };

    // =========================================================================
    //  OFFLINE / ONLINE DETECTION
    // =========================================================================

    function updateOnlineStatus() {
        const banner = document.getElementById('netOfflineBanner');
        if (!banner) return;

        if (!navigator.onLine) {
            banner.classList.add('show');
            pillShow('slow', '📡 No internet');
        } else {
            banner.classList.remove('show');
        }
    }

    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check on load too
    document.addEventListener('DOMContentLoaded', updateOnlineStatus);

    // =========================================================================
    //  EXPOSE MANUAL API (optional — lets other modules trigger the indicator)
    // =========================================================================

    window.LoadingIndicator = {
        start:  onRequestStart,
        finish: (ms) => onRequestEnd(ms ?? 0),
        error:  onRequestError,
    };

    console.log('✅ loading.js — network loading indicator active');

})();