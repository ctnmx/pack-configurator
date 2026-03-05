// ============================================================
// UI OPTION 3 - Tableau comparatif / Pricing table
// Colonnes côte à côte avec dropdowns
// ============================================================

import { ZOOMS, COFFRETS, OFFERS, CONFIG } from './data.js';
import {
  PackConfigurator,
  formatPrice,
  getCardOffers,
  getCardDisplayPrice,
} from './logic.js';
import {
  trackOfferCardClick,
  trackConfigOpen,
  trackZoomSelected,
  trackCoffretSelected,
  trackAddToCart,
  trackAddToCartSuccess,
  trackAddToCartError,
} from './tracking.js';
import { createCartAdapter } from './adapters.js';

// --- État : un configurateur par colonne ---
const configurators = new Map(); // offerCode -> PackConfigurator
let cartAdapter = null;

// ============================================================
// INIT
// ============================================================

export function initPricingUI() {
  cartAdapter = createCartAdapter(CONFIG.cartAdapter);
  const offers = getCardOffers();

  offers.forEach((offer) => {
    configurators.set(offer.code, new PackConfigurator(offer));
  });

  renderPricingTable(offers);
  renderMockCartPanel();
}

// ============================================================
// PRICING TABLE
// ============================================================

function renderPricingTable(offers) {
  const container = document.getElementById('pricing-table');
  if (!container) return;

  container.innerHTML = offers.map((offer) => renderPricingColumn(offer)).join('');
}

function renderPricingColumn(offer) {
  const price = getCardDisplayPrice(offer);
  const isPack = offer.packPrice !== null;
  const isFeatured = offer.badge === 'Meilleure offre';
  const isPopular = offer.badge === 'Populaire';

  // Badge
  let badgeHtml = '';
  if (offer.badge) {
    const badgeClass = isFeatured ? 'pricing-column__badge--best' : 'pricing-column__badge--popular';
    badgeHtml = `<div class="pricing-column__badge ${badgeClass}">${offer.badge}</div>`;
  }

  // Price block
  let priceBlockHtml = `
    <div class="pricing-column__price-block">
      ${!isPack ? '<span class="pricing-column__price-prefix">À partir de</span>' : ''}
      <span class="pricing-column__price" data-price-display="${offer.code}">${formatPrice(price)}</span>
      ${offer.originalPrice ? `<span class="pricing-column__original-price">${formatPrice(offer.originalPrice)}</span>` : ''}
      ${offer.reductionText ? `<span class="pricing-column__reduction">${offer.reductionText}</span>` : ''}
    </div>
  `;

  // Shipping
  const shippingFree = offer.expectedShipping === 0;
  let shippingHtml = `
    <div class="pricing-column__shipping ${shippingFree ? 'pricing-column__shipping--free' : ''}">
      ${shippingFree ? '🎉 Livraison offerte' : `Livraison : ${formatPrice(offer.expectedShipping)}`}
    </div>
  `;

  // Contents list
  let contentsHtml = '<ul class="pricing-column__contents">';
  for (let i = 0; i < offer.zoomCount; i++) {
    contentsHtml += `<li class="pricing-column__contents-item">
      <span class="pricing-column__contents-icon">✓</span>
      1 Guide Zoom au choix
    </li>`;
  }
  if (offer.coffretCount > 0) {
    contentsHtml += `<li class="pricing-column__contents-item">
      <span class="pricing-column__contents-icon">✓</span>
      1 Coffret au choix
    </li>`;
  }
  contentsHtml += '</ul>';

  // Dropdown selectors
  let selectorsHtml = '<div class="pricing-column__selectors">';
  for (let slot = 0; slot < offer.zoomCount; slot++) {
    const label = offer.zoomCount > 1 ? `Zoom ${slot + 1}` : 'Zoom';
    selectorsHtml += `
      <label class="pricing-column__label">
        ${label}
        <select class="pricing-column__select"
                data-offer="${offer.code}"
                data-type="zoom"
                data-slot="${slot}"
                aria-label="${label}">
          <option value="">— Choisir un Zoom —</option>
          ${ZOOMS.map((z) => `<option value="${z.id}">${z.title} — ${z.subtitle}</option>`).join('')}
        </select>
      </label>
    `;
  }
  if (offer.coffretCount > 0) {
    selectorsHtml += `
      <label class="pricing-column__label">
        Coffret
        <select class="pricing-column__select"
                data-offer="${offer.code}"
                data-type="coffret"
                data-slot="0"
                aria-label="Coffret">
          <option value="">— Choisir un Coffret —</option>
          ${COFFRETS.map((c) => `<option value="${c.id}">${c.title} — ${c.subtitle}</option>`).join('')}
        </select>
      </label>
    `;
  }
  selectorsHtml += '</div>';

  // Status
  let statusHtml = `<div class="pricing-column__status" data-status="${offer.code}">
    Sélectionnez vos produits
  </div>`;

  // CTA
  let ctaHtml = `
    <button class="btn btn--primary pricing-column__cta"
            data-offer="${offer.code}"
            disabled>
      Ajouter au panier
    </button>
  `;

  return `
    <div class="pricing-column ${isFeatured ? 'pricing-column--featured' : ''}" data-column="${offer.code}">
      ${badgeHtml}
      <h3 class="pricing-column__title">${offer.title}</h3>
      <p class="pricing-column__subtitle">${offer.subtitle}</p>
      ${priceBlockHtml}
      ${shippingHtml}
      ${contentsHtml}
      ${selectorsHtml}
      ${statusHtml}
      ${ctaHtml}
    </div>
  `;
}

// ============================================================
// DROPDOWN HANDLING
// ============================================================

function handleDropdownChange(selectEl) {
  const offerCode = selectEl.dataset.offer;
  const type = selectEl.dataset.type;
  const slot = parseInt(selectEl.dataset.slot, 10);
  const value = selectEl.value;
  const configurator = configurators.get(offerCode);
  if (!configurator) return;

  if (type === 'zoom') {
    if (value) {
      configurator.selectZoom(slot, value);
      trackZoomSelected(value, slot);
    } else {
      configurator.clearZoom(slot);
    }
  } else if (type === 'coffret') {
    if (value) {
      configurator.selectCoffret(value);
      trackCoffretSelected(value);
    } else {
      configurator.selectedCoffret = null;
    }
  }

  // Update filled state on select
  selectEl.classList.toggle('is-filled', !!value);

  updateColumnState(offerCode);
}

// ============================================================
// COLUMN STATE UPDATE
// ============================================================

function updateColumnState(offerCode) {
  const configurator = configurators.get(offerCode);
  if (!configurator) return;

  const column = document.querySelector(`[data-column="${offerCode}"]`);
  if (!column) return;

  const isComplete = configurator.isComplete();
  const ctaBtn = column.querySelector('.pricing-column__cta');
  const statusEl = column.querySelector('.pricing-column__status');

  // Enable/disable CTA
  ctaBtn.disabled = !isComplete;

  // Update status text
  if (isComplete) {
    statusEl.textContent = '✓ Prêt à ajouter au panier';
    statusEl.className = 'pricing-column__status pricing-column__status--ready';
  } else {
    const remaining = [];
    if (!configurator.allZoomsSelected()) remaining.push('Zoom');
    if (configurator.offer.coffretCount > 0 && !configurator.selectedCoffret) remaining.push('Coffret');
    statusEl.textContent = `Choisissez : ${remaining.join(' + ')}`;
    statusEl.className = 'pricing-column__status';
  }

  // Dynamic price for zoom-seul
  if (!configurator.offer.packPrice) {
    const priceDisplay = column.querySelector(`[data-price-display="${offerCode}"]`);
    const price = configurator.getPrice();
    if (priceDisplay) {
      priceDisplay.textContent = price > 0 ? formatPrice(price) : formatPrice(getCardDisplayPrice(configurator.offer));
    }
  }
}

// ============================================================
// ADD TO CART
// ============================================================

async function handleColumnAddToCart(offerCode) {
  const configurator = configurators.get(offerCode);
  if (!configurator || !configurator.isComplete()) return;

  const payload = configurator.getCartPayload();
  const recap = configurator.getRecap();

  trackAddToCart(offerCode, {
    zooms: recap.zooms.map((z) => z.id),
    coffret: recap.coffret?.id || null,
  });

  const column = document.querySelector(`[data-column="${offerCode}"]`);
  const ctaBtn = column?.querySelector('.pricing-column__cta');

  if (ctaBtn) {
    ctaBtn.disabled = true;
    ctaBtn.textContent = 'Ajout en cours…';
  }

  try {
    const result = await cartAdapter.addToCart(payload);
    if (result.ok) {
      trackAddToCartSuccess(offerCode, payload);
      showToast('Ajouté au panier !');

      // Reset column
      configurator.reset();
      resetColumnDropdowns(offerCode);
      updateColumnState(offerCode);
      updateMockCartDisplay();
    } else {
      throw new Error(result.error || 'Erreur inconnue');
    }
  } catch (err) {
    trackAddToCartError(offerCode, err);
    showToast('Erreur lors de l\'ajout', 'error');
  } finally {
    if (ctaBtn) {
      ctaBtn.textContent = 'Ajouter au panier';
      ctaBtn.disabled = !configurator.isComplete();
    }
  }
}

function resetColumnDropdowns(offerCode) {
  const column = document.querySelector(`[data-column="${offerCode}"]`);
  if (!column) return;
  column.querySelectorAll('.pricing-column__select').forEach((sel) => {
    sel.value = '';
    sel.classList.remove('is-filled');
  });
}

// ============================================================
// GLOBAL EVENTS
// ============================================================

export function bindPricingEvents() {
  const table = document.getElementById('pricing-table');
  if (!table) return;

  // Dropdown changes
  table.addEventListener('change', (e) => {
    const select = e.target.closest('.pricing-column__select');
    if (!select) return;
    handleDropdownChange(select);
  });

  // Add to cart buttons
  table.addEventListener('click', (e) => {
    const btn = e.target.closest('.pricing-column__cta');
    if (!btn) return;
    handleColumnAddToCart(btn.dataset.offer);
  });
}

// ============================================================
// TOAST
// ============================================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast--error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('is-visible'));

  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ============================================================
// MOCK CART DISPLAY
// ============================================================

function renderMockCartPanel() {
  if (CONFIG.cartAdapter !== 'mock') return;
  const container = document.getElementById('mock-cart');
  if (!container) return;

  container.innerHTML = `
    <div class="mock-cart__panel">
      <h3 class="mock-cart__title">🛒 Panier (mode développement)</h3>
      <div id="mock-cart-items">
        <p class="mock-cart__empty">Panier vide</p>
      </div>
    </div>
  `;
}

function updateMockCartDisplay() {
  if (CONFIG.cartAdapter !== 'mock' || !cartAdapter.getItems) return;
  const itemsEl = document.getElementById('mock-cart-items');
  if (!itemsEl) return;

  const items = cartAdapter.getItems();
  if (items.length === 0) {
    itemsEl.innerHTML = '<p class="mock-cart__empty">Panier vide</p>';
    return;
  }

  itemsEl.innerHTML = items
    .map(
      (item) => `
    <div class="mock-cart__item">
      <p class="mock-cart__item-title">${item.properties.offer_title || 'Produit'} (variant: ${item.variantId})</p>
      <div class="mock-cart__item-props">
        ${Object.entries(item.properties)
          .filter(([k]) => !k.endsWith('_id') && k !== 'offer_code' && k !== 'offer_title')
          .map(([k, v]) => `<span>${k}: ${v}</span>`)
          .join(' · ')}
      </div>
    </div>
  `
    )
    .join('');
}
