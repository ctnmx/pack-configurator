// ============================================================
// APP - Point d'entrée principal
// ============================================================

import { OFFERS, CONFIG } from './data.js';
import { initUI, bindGlobalEvents } from './ui.js';

// Expose data globally for page mode access
window.__packData = { OFFERS };

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
  // Mode configurable via URL param: ?mode=page ou ?mode=drawer
  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get('mode');
  if (modeParam === 'page' || modeParam === 'drawer') {
    CONFIG.mode = modeParam;
  }

  // Adapter configurable via URL param: ?cart=shopify ou ?cart=mock
  const cartParam = params.get('cart');
  if (cartParam === 'shopify' || cartParam === 'mock') {
    CONFIG.cartAdapter = cartParam;
  }

  console.log(`[App] Mode: ${CONFIG.mode} | Cart: ${CONFIG.cartAdapter}`);

  initUI();
  bindGlobalEvents();
});
