// ============================================================
// APP OPTION 4 - Entry point Page produit + CTAs pack
// ============================================================

import { CONFIG } from './data.js';
import { initProductUI, bindProductEvents } from './ui-option4.js';

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const cartParam = params.get('cart');
  if (cartParam === 'shopify' || cartParam === 'mock') {
    CONFIG.cartAdapter = cartParam;
  }

  console.log(`[App Option4] Cart: ${CONFIG.cartAdapter}`);
  initProductUI();
  bindProductEvents();
});
