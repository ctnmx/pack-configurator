// ============================================================
// APP OPTION 3 - Entry point Tableau comparatif
// ============================================================

import { CONFIG } from './data.js';
import { initPricingUI, bindPricingEvents } from './ui-option3.js';

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const cartParam = params.get('cart');
  if (cartParam === 'shopify' || cartParam === 'mock') {
    CONFIG.cartAdapter = cartParam;
  }

  console.log(`[App Option3] Cart: ${CONFIG.cartAdapter}`);
  initPricingUI();
  bindPricingEvents();
});
