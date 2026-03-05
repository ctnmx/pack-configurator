// ============================================================
// APP OPTION 2 - Entry point Builder tout-en-un
// ============================================================

import { CONFIG } from './data.js';
import { initBuilderUI, bindBuilderEvents } from './ui-option2.js';

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const cartParam = params.get('cart');
  if (cartParam === 'shopify' || cartParam === 'mock') {
    CONFIG.cartAdapter = cartParam;
  }

  console.log(`[App Option2] Cart: ${CONFIG.cartAdapter}`);
  initBuilderUI();
  bindBuilderEvents();
});
