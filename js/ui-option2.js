// ============================================================
// UI OPTION 2 - Builder tout-en-un
// Tabs + grilles inline + sticky bottom bar
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

// --- État ---
let currentConfigurator = null;
let cartAdapter = null;
let currentOfferCode = null;

// ============================================================
// INIT
// ============================================================

export function initBuilderUI() {
  cartAdapter = createCartAdapter(CONFIG.cartAdapter);
  const offers = getCardOffers();
  currentOfferCode = offers.length > 1 ? offers[1].code : offers[0].code; // default to Starter
  renderTabs(offers);
  switchOffer(currentOfferCode);
  renderMockCartPanel();
}

// ============================================================
// TABS
// ============================================================

function renderTabs(offers) {
  const container = document.querySelector('.builder-tabs');
  if (!container) return;

  container.innerHTML = offers
    .map((offer) => {
      const price = getCardDisplayPrice(offer);
      const isActive = offer.code === currentOfferCode;
      const isPack = offer.packPrice !== null;
      const badgeClass =
        offer.badge === 'Meilleure offre' ? 'builder-tab__badge--best' : '';

      return `
      <button class="builder-tab ${isActive ? 'is-active' : ''}"
              role="tab"
              aria-selected="${isActive}"
              aria-label="${offer.title}"
              data-offer="${offer.code}">
        ${offer.badge ? `<span class="builder-tab__badge ${badgeClass}">${offer.badge}</span>` : ''}
        <div class="builder-tab__title">${offer.cardTitle}</div>
        <div class="builder-tab__subtitle">${offer.cardSubtitle}</div>
        <div class="builder-tab__price">
          ${!isPack ? '<span class="builder-tab__price-prefix">Dès </span>' : ''}${formatPrice(price)}
          ${offer.originalPrice ? `<span class="builder-tab__original-price">${formatPrice(offer.originalPrice)}</span>` : ''}
        </div>
      </button>
    `;
    })
    .join('');
}

function updateActiveTabs() {
  document.querySelectorAll('.builder-tab').forEach((tab) => {
    const isActive = tab.dataset.offer === currentOfferCode;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

// ============================================================
// SWITCH OFFER
// ============================================================

function switchOffer(code) {
  const offer = OFFERS.find((o) => o.code === code);
  if (!offer) return;

  currentOfferCode = code;
  currentConfigurator = new PackConfigurator(offer);

  trackOfferCardClick(code);
  trackConfigOpen(code);

  updateActiveTabs();
  renderZoomSection();
  renderCoffretSection();
  refreshUI();
}

// ============================================================
// ZOOM SECTION
// ============================================================

function renderZoomSection() {
  const section = document.getElementById('builder-zoom-section');
  if (!section || !currentConfigurator) return;

  const { offer } = currentConfigurator;
  const title = section.querySelector('.builder-section__title');
  const hint = section.querySelector('.builder-section__hint');
  const grid = document.getElementById('builder-zoom-grid');

  title.textContent = offer.zoomCount > 1 ? 'Choisissez vos Zooms' : 'Choisissez votre Zoom';
  hint.textContent = `${offer.zoomCount} guide${offer.zoomCount > 1 ? 's' : ''} à sélectionner`;

  let html = '';
  for (let slot = 0; slot < offer.zoomCount; slot++) {
    if (offer.zoomCount > 1) {
      html += `<p class="builder-section__slot-label">Zoom ${slot + 1}</p>`;
    }
    html += '<div class="product-grid">';
    html += ZOOMS.map((zoom) =>
      renderProductOption(zoom, currentConfigurator.selectedZooms[slot] === zoom.id, 'zoom', slot)
    ).join('');
    html += '</div>';
  }

  grid.innerHTML = html;
}

// ============================================================
// COFFRET SECTION
// ============================================================

function renderCoffretSection() {
  const section = document.getElementById('builder-coffret-section');
  if (!section || !currentConfigurator) return;

  if (currentConfigurator.offer.coffretCount === 0) {
    section.classList.add('is-hidden');
    return;
  }

  section.classList.remove('is-hidden');
  const grid = document.getElementById('builder-coffret-grid');

  grid.innerHTML = COFFRETS.map((coffret) =>
    renderProductOption(coffret, currentConfigurator.selectedCoffret === coffret.id, 'coffret', 0)
  ).join('');
}

// ============================================================
// PRODUCT OPTION (shared rendering)
// ============================================================

function renderProductOption(product, isSelected, type, slotIndex) {
  return `
    <div class="product-option ${isSelected ? 'is-selected' : ''}"
         tabindex="0" role="button"
         aria-pressed="${isSelected}"
         aria-label="${product.title}"
         data-product-type="${type}"
         data-product-id="${product.id}"
         data-slot="${slotIndex}">
      <span class="product-option__check" aria-hidden="true">✓</span>
      <img class="product-option__image" src="${product.image}" alt="${product.title}" loading="lazy" />
      <div class="product-option__info">
        <p class="product-option__title">${product.title}</p>
        <p class="product-option__subtitle">${product.subtitle}</p>
      </div>
    </div>
  `;
}

// ============================================================
// INLINE RECAP
// ============================================================

function renderInlineRecap() {
  const container = document.getElementById('builder-recap');
  if (!container || !currentConfigurator) return;

  const recap = currentConfigurator.getRecap();
  const hasSelections = recap.zooms.length > 0 || recap.coffret;

  if (!hasSelections) {
    container.classList.add('is-hidden');
    return;
  }

  container.classList.remove('is-hidden');

  let pillsHtml = '';

  // Zoom pills
  for (let i = 0; i < currentConfigurator.offer.zoomCount; i++) {
    const zoom = recap.zooms[i];
    if (zoom) {
      pillsHtml += `<span class="builder-recap__pill">✓ ${zoom.title}</span>`;
    } else {
      pillsHtml += `<span class="builder-recap__pill builder-recap__pill--empty">Zoom ${i + 1} à choisir</span>`;
    }
  }

  // Coffret pill
  if (currentConfigurator.offer.coffretCount > 0) {
    if (recap.coffret) {
      pillsHtml += `<span class="builder-recap__pill">✓ ${recap.coffret.title}</span>`;
    } else {
      pillsHtml += `<span class="builder-recap__pill builder-recap__pill--empty">Coffret à choisir</span>`;
    }
  }

  let priceInfoHtml = '';
  if (recap.reductionText) {
    priceInfoHtml = `<span class="builder-recap__reduction">${recap.reductionText}</span>`;
  }

  container.innerHTML = `
    <p class="builder-recap__title">Votre sélection</p>
    <div class="builder-recap__items">${pillsHtml}</div>
    <div class="builder-recap__price-info">${priceInfoHtml}</div>
  `;
}

// ============================================================
// BOTTOM BAR
// ============================================================

function updateBottomBar() {
  if (!currentConfigurator) return;

  const nameEl = document.getElementById('bar-pack-name');
  const priceEl = document.getElementById('bar-price');
  const originalEl = document.getElementById('bar-original');
  const shippingEl = document.getElementById('bar-shipping');
  const ctaBtn = document.getElementById('builder-add-to-cart');

  const price = currentConfigurator.getPrice();
  const shipping = currentConfigurator.getShipping();
  const offer = currentConfigurator.offer;

  nameEl.textContent = offer.title;
  priceEl.textContent = price > 0 ? formatPrice(price) : '—';

  if (originalEl) {
    originalEl.textContent = offer.originalPrice ? formatPrice(offer.originalPrice) : '';
    originalEl.style.display = offer.originalPrice ? '' : 'none';
  }

  shippingEl.textContent = shipping.price === 0
    ? 'Livraison offerte'
    : `Livraison : ${formatPrice(shipping.price)}`;

  ctaBtn.disabled = !currentConfigurator.isComplete();
}

// ============================================================
// REFRESH UI (after selection change)
// ============================================================

function refreshUI() {
  // Re-render selections state in grids
  renderZoomSection();
  renderCoffretSection();
  renderInlineRecap();
  updateBottomBar();
}

// ============================================================
// EVENT HANDLING
// ============================================================

function handleProductSelect(optionEl) {
  if (!currentConfigurator) return;

  const type = optionEl.dataset.productType;
  const id = optionEl.dataset.productId;
  const slot = parseInt(optionEl.dataset.slot, 10);

  if (type === 'zoom') {
    currentConfigurator.selectZoom(slot, id);
    trackZoomSelected(id, slot);
  } else if (type === 'coffret') {
    currentConfigurator.selectCoffret(id);
    trackCoffretSelected(id);
  }

  refreshUI();
}

async function handleAddToCart() {
  if (!currentConfigurator || !currentConfigurator.isComplete()) return;

  const payload = currentConfigurator.getCartPayload();
  const recap = currentConfigurator.getRecap();

  trackAddToCart(currentConfigurator.offer.code, {
    zooms: recap.zooms.map((z) => z.id),
    coffret: recap.coffret?.id || null,
  });

  const btn = document.getElementById('builder-add-to-cart');
  btn.disabled = true;
  btn.textContent = 'Ajout en cours…';

  try {
    const result = await cartAdapter.addToCart(payload);
    if (result.ok) {
      trackAddToCartSuccess(currentConfigurator.offer.code, payload);
      showToast('Ajouté au panier !');
      // Reset configurator
      currentConfigurator.reset();
      refreshUI();
      updateMockCartDisplay();
    } else {
      throw new Error(result.error || 'Erreur inconnue');
    }
  } catch (err) {
    trackAddToCartError(currentConfigurator.offer.code, err);
    showToast('Erreur lors de l\'ajout', 'error');
  } finally {
    btn.textContent = 'Ajouter au panier';
    btn.disabled = !currentConfigurator.isComplete();
  }
}

// ============================================================
// GLOBAL EVENTS
// ============================================================

export function bindBuilderEvents() {
  // Tab clicks
  document.querySelector('.builder-tabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.builder-tab');
    if (!tab) return;
    switchOffer(tab.dataset.offer);
  });

  // Product option clicks (delegation on content area)
  document.getElementById('builder-content')?.addEventListener('click', (e) => {
    const option = e.target.closest('.product-option');
    if (!option) return;
    handleProductSelect(option);
  });

  // Product option keyboard
  document.getElementById('builder-content')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const option = e.target.closest('.product-option');
    if (!option) return;
    e.preventDefault();
    handleProductSelect(option);
  });

  // Add to cart
  document.getElementById('builder-add-to-cart')?.addEventListener('click', handleAddToCart);
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
