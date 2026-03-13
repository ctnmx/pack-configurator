// ============================================================
// APP OPTION 5 - Entry point Guided Flow (shadcn/ui)
// ============================================================

import { CONFIG } from './data.js';
import { initGuidedUI, bindGuidedEvents } from './ui-option5.js';

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const cartParam = params.get('cart');
  if (cartParam === 'shopify' || cartParam === 'mock') {
    CONFIG.cartAdapter = cartParam;
  }

  console.log(`[App Option5] Cart: ${CONFIG.cartAdapter}`);
  initGuidedUI();
  bindGuidedEvents();
});
