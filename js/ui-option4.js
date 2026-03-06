// ============================================================
// UI OPTION 4 - CRO Redesign
// Inline configurator with tabs, live recap, sticky CTA
// No modal — all configuration happens on page
// ============================================================

import { ZOOMS, COFFRETS, OFFERS, CONFIG } from './data.js';
import {
  PackConfigurator,
  formatPrice,
  getCardOffers,
  getCardDisplayPrice,
  getZoomById,
  getCoffretById,
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

let currentConfigurator = null;
let cartAdapter = null;
let selectedOfferCode = 'explorer'; // Pre-select Pack Explorer (highest CRO value)

// ============================================================
// INIT
// ============================================================

export function initProductUI() {
  cartAdapter = createCartAdapter(CONFIG.cartAdapter);
  renderPackTabs();
  selectOffer(selectedOfferCode);
  renderSocialProof();
  renderMockCartPanel();
}

// ============================================================
// PACK TABS (radio selector — replaces modal CTA cards)
// ============================================================

function renderPackTabs() {
  const container = document.getElementById('pack-tabs');
  if (!container) return;

  const offers = getCardOffers();

  container.innerHTML = offers.map((offer) => {
    const price = getCardDisplayPrice(offer);
    const isSelected = offer.code === selectedOfferCode;
    const isPack = offer.packPrice !== null;

    let badgeHtml = '';
    if (offer.badge) {
      const cls = offer.badge === 'Meilleure offre' ? '' : 'pack-tab__badge--green';
      badgeHtml = `<span class="pack-tab__badge ${cls}">${offer.badge}</span>`;
    }

    return `
      <button class="pack-tab ${isSelected ? 'pack-tab--selected' : ''}"
              role="radio" aria-checked="${isSelected}"
              aria-label="${offer.title}"
              data-offer="${offer.code}">
        ${badgeHtml}
        <span class="pack-tab__title">${offer.cardTitle}</span>
        <span class="pack-tab__subtitle">${offer.cardSubtitle}</span>
        <div class="pack-tab__pricing">
          ${offer.originalPrice ? `<span class="pack-tab__original-price">${formatPrice(offer.originalPrice)}</span>` : ''}
          <span class="pack-tab__price">${isPack ? '' : 'Dès '}${formatPrice(price)}</span>
        </div>
        ${offer.reductionText ? `<span class="pack-tab__savings">${offer.reductionText}</span>` : ''}
      </button>
    `;
  }).join('');
}

// ============================================================
// OFFER SELECTION (tab switching)
// ============================================================

function selectOffer(offerCode) {
  const offer = OFFERS.find((o) => o.code === offerCode);
  if (!offer) return;

  selectedOfferCode = offerCode;
  currentConfigurator = new PackConfigurator(offer);

  trackOfferCardClick(offerCode);
  trackConfigOpen(offerCode);

  renderPackTabs();
  renderInlineSelection();
  renderInlineRecap();
  updateCTAButton();
  updateStickyCTA();
}

// ============================================================
// INLINE PRODUCT SELECTION (zoom + coffret grids on page)
// ============================================================

function renderInlineSelection() {
  const container = document.getElementById('pack-selection');
  if (!container || !currentConfigurator) return;

  const c = currentConfigurator;
  let html = '';

  // Zoom section
  const zoomsDone = c.allZoomsSelected();
  const zoomsSelected = c.selectedZooms.filter((z) => z !== null).length;

  html += '<div class="pack-selection__section">';
  html += `<h4 class="pack-selection__title">
    Sélectionnez ${c.offer.zoomCount > 1 ? 'vos guides' : 'votre guide'}
    <span class="pack-selection__counter ${zoomsDone ? 'pack-selection__counter--done' : ''}">${zoomsSelected}/${c.offer.zoomCount}</span>
  </h4>`;
  html += `<p class="pack-selection__hint">${c.offer.zoomCount} guide${c.offer.zoomCount > 1 ? 's' : ''} à sélectionner</p>`;

  for (let slot = 0; slot < c.offer.zoomCount; slot++) {
    if (c.offer.zoomCount > 1) {
      html += `<p class="pack-selection__slot-label">Guide ${slot + 1}</p>`;
    }
    html += '<div class="product-grid">';
    html += ZOOMS.map((z) => renderProductOption(z, c.selectedZooms[slot] === z.id, 'zoom', slot)).join('');
    html += '</div>';
  }
  html += '</div>';

  // Coffret section
  if (c.offer.coffretCount > 0) {
    const coffretDone = c.selectedCoffret !== null;
    html += '<div class="pack-selection__section">';
    html += `<h4 class="pack-selection__title">
      Sélectionnez votre coffret
      <span class="pack-selection__counter ${coffretDone ? 'pack-selection__counter--done' : ''}">${coffretDone ? '1' : '0'}/1</span>
    </h4>`;
    html += '<p class="pack-selection__hint">1 coffret à sélectionner</p>';
    html += '<div class="product-grid">';
    html += COFFRETS.map((co) =>
      renderProductOption(co, c.selectedCoffret === co.id, 'coffret', 0)
    ).join('');
    html += '</div></div>';
  }

  container.innerHTML = html;
  bindInlineSelectionEvents();
}

// ============================================================
// INLINE RECAP (live price summary with anchoring)
// ============================================================

function renderInlineRecap() {
  const container = document.getElementById('pack-recap-inline');
  if (!container || !currentConfigurator) {
    if (container) container.innerHTML = '';
    return;
  }

  const c = currentConfigurator;
  const price = c.getPrice();
  const shipping = c.getShipping();
  const hasSelections = c.selectedZooms.some((z) => z !== null) || c.selectedCoffret;

  if (!hasSelections) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="pack-recap-inline__card">';

  // Selected items as chips
  const selectedZooms = c.selectedZooms
    .map((id) => id ? getZoomById(id) : null)
    .filter(Boolean);

  if (selectedZooms.length > 0 || c.selectedCoffret) {
    html += '<div class="pack-recap-inline__items">';
    selectedZooms.forEach((z) => {
      html += `<span class="pack-recap-inline__item">✓ ${z.title}</span>`;
    });
    if (c.selectedCoffret) {
      const coffret = getCoffretById(c.selectedCoffret);
      html += `<span class="pack-recap-inline__item">✓ ${coffret.title}</span>`;
    }
    html += '</div>';
  }

  // Price anchoring
  html += '<div class="pack-recap-inline__price-line">';
  if (c.offer.originalPrice) {
    html += `<span class="pack-recap-inline__original">${formatPrice(c.offer.originalPrice)}</span>`;
    html += `<span class="pack-recap-inline__current">${formatPrice(price)}</span>`;
    const savings = c.offer.originalPrice - price;
    if (savings > 0) {
      html += `<span class="pack-recap-inline__savings">-${formatPrice(savings)}</span>`;
    }
  } else {
    html += `<span class="pack-recap-inline__current">${formatPrice(price)}</span>`;
  }
  html += '</div>';

  // Shipping
  const isFree = shipping.price === 0;
  html += `<span class="pack-recap-inline__shipping ${isFree ? 'pack-recap-inline__shipping--free' : ''}">
    Livraison : ${isFree ? 'offerte ✓' : formatPrice(shipping.price)}
  </span>`;

  html += '</div>';
  container.innerHTML = html;
}

// ============================================================
// CTA BUTTON UPDATE (price in button)
// ============================================================

function updateCTAButton() {
  const btn = document.getElementById('pack-add-to-cart');
  if (!btn || !currentConfigurator) return;

  const isComplete = currentConfigurator.isComplete();
  const price = currentConfigurator.getPrice();

  btn.disabled = !isComplete;

  if (isComplete) {
    btn.textContent = `Ajouter au panier — ${formatPrice(price)}`;
  } else {
    const c = currentConfigurator;
    const zoomsLeft = c.selectedZooms.filter((z) => z === null).length;
    const coffretLeft = c.offer.coffretCount > 0 && !c.selectedCoffret ? 1 : 0;

    if (zoomsLeft > 0) {
      btn.textContent = `Sélectionnez ${zoomsLeft} guide${zoomsLeft > 1 ? 's' : ''} pour continuer`;
    } else if (coffretLeft > 0) {
      btn.textContent = 'Sélectionnez un coffret pour continuer';
    }
  }
}

// ============================================================
// STICKY CTA BAR
// ============================================================

function updateStickyCTA() {
  const titleEl = document.getElementById('sticky-cta-title');
  const priceEl = document.getElementById('sticky-cta-price');
  const btn = document.getElementById('sticky-cta-btn');
  if (!titleEl || !currentConfigurator) return;

  titleEl.textContent = currentConfigurator.offer.title;
  const price = currentConfigurator.getPrice();
  priceEl.textContent = formatPrice(price);

  const isComplete = currentConfigurator.isComplete();
  btn.disabled = !isComplete;
  btn.textContent = isComplete
    ? `Ajouter au panier — ${formatPrice(price)}`
    : 'Complétez votre sélection';
}

function initStickyObserver() {
  const mainCTA = document.getElementById('pack-add-to-cart');
  const stickyBar = document.getElementById('sticky-cta-bar');
  if (!mainCTA || !stickyBar) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        stickyBar.classList.remove('is-visible');
        stickyBar.setAttribute('aria-hidden', 'true');
      } else {
        stickyBar.classList.add('is-visible');
        stickyBar.setAttribute('aria-hidden', 'false');
      }
    },
    { threshold: 0, rootMargin: '0px' }
  );
  observer.observe(mainCTA);
}

// ============================================================
// INLINE SELECTION EVENTS
// ============================================================

function bindInlineSelectionEvents() {
  const container = document.getElementById('pack-selection');
  if (!container) return;

  container.querySelectorAll('.product-option').forEach((el) => {
    el.addEventListener('click', handleProductSelectInline);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleProductSelectInline(e);
      }
    });
  });
}

function handleProductSelectInline(e) {
  const option = e.target.closest('.product-option');
  if (!option || !currentConfigurator) return;

  const type = option.dataset.productType;
  const id = option.dataset.productId;
  const slot = parseInt(option.dataset.slot, 10);

  if (type === 'zoom') {
    currentConfigurator.selectZoom(slot, id);
    trackZoomSelected(id, slot);
  } else if (type === 'coffret') {
    currentConfigurator.selectCoffret(id);
    trackCoffretSelected(id);
  }

  renderInlineSelection();
  renderInlineRecap();
  updateCTAButton();
  updateStickyCTA();
}

// ============================================================
// ADD TO CART (shared by main CTA + sticky CTA)
// ============================================================

async function handleAddToCart() {
  if (!currentConfigurator || !currentConfigurator.isComplete()) return;

  const payload = currentConfigurator.getCartPayload();
  const recap = currentConfigurator.getRecap();

  trackAddToCart(currentConfigurator.offer.code, {
    zooms: recap.zooms.map((z) => z.id),
    coffret: recap.coffret?.id || null,
  });

  // Disable both CTAs
  const mainBtn = document.getElementById('pack-add-to-cart');
  const stickyBtn = document.getElementById('sticky-cta-btn');
  if (mainBtn) { mainBtn.disabled = true; mainBtn.textContent = 'Ajout en cours…'; }
  if (stickyBtn) { stickyBtn.disabled = true; stickyBtn.textContent = 'Ajout en cours…'; }

  try {
    const result = await cartAdapter.addToCart(payload);
    if (result.ok) {
      trackAddToCartSuccess(currentConfigurator.offer.code, payload);
      showToast('Ajouté au panier !');
      updateMockCartDisplay();
      // Re-enable with price
      updateCTAButton();
      updateStickyCTA();
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    trackAddToCartError(currentConfigurator.offer.code, err);
    showToast('Erreur lors de l\'ajout au panier', 'error');
    updateCTAButton();
    updateStickyCTA();
  }
}

// ============================================================
// PRODUCT OPTION (reused from original — unchanged)
// ============================================================

function renderProductOption(product, isSelected, type, slot) {
  return `
    <div class="product-option ${isSelected ? 'is-selected' : ''}"
         tabindex="0" role="button" aria-pressed="${isSelected}"
         aria-label="${product.title}"
         data-product-type="${type}" data-product-id="${product.id}" data-slot="${slot}">
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
// SOCIAL PROOF (static review cards)
// ============================================================

function renderSocialProof() {
  const container = document.getElementById('social-proof-reviews');
  if (!container) return;

  const reviews = [
    { name: 'Marie L.', text: 'Carte magnifique et super bien pensée. Les itinéraires sont vraiment testés et approuvés, on sent le vécu !', stars: 5 },
    { name: 'Thomas B.', text: 'Le Pack Explorer est le meilleur rapport qualité-prix. 2 Zooms + Coffret, tout ce qu\'il faut pour planifier ses vacances.', stars: 5 },
    { name: 'Sophie R.', text: 'Offert à mon conjoint pour Noël, il a adoré. Les tracés GPS sont un vrai plus par rapport aux autres guides.', stars: 5 },
  ];

  container.innerHTML = reviews.map((r) => `
    <div class="social-proof__review">
      <div class="social-proof__stars">${'★'.repeat(r.stars)}</div>
      <p class="social-proof__review-text">"${r.text}"</p>
      <span class="social-proof__reviewer">— ${r.name}</span>
    </div>
  `).join('');
}

// ============================================================
// GLOBAL EVENTS
// ============================================================

export function bindProductEvents() {
  // Tab clicks (event delegation)
  document.getElementById('pack-tabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.pack-tab');
    if (!tab) return;
    const code = tab.dataset.offer;
    if (code && code !== selectedOfferCode) {
      selectOffer(code);
    }
  });

  // Tab keyboard
  document.getElementById('pack-tabs')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tab = e.target.closest('.pack-tab');
    if (!tab) return;
    e.preventDefault();
    const code = tab.dataset.offer;
    if (code && code !== selectedOfferCode) {
      selectOffer(code);
    }
  });

  // Main CTA
  document.getElementById('pack-add-to-cart')?.addEventListener('click', handleAddToCart);

  // Sticky CTA button
  document.getElementById('sticky-cta-btn')?.addEventListener('click', handleAddToCart);

  // Init sticky bar observer
  initStickyObserver();
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
  }, 3500);
}

// ============================================================
// MOCK CART
// ============================================================

function renderMockCartPanel() {
  if (CONFIG.cartAdapter !== 'mock') return;
  const container = document.getElementById('mock-cart');
  if (!container) return;
  container.innerHTML = `<div class="mock-cart__panel">
    <h3 class="mock-cart__title">🛒 Panier (mode développement)</h3>
    <div id="mock-cart-items"><p class="mock-cart__empty">Panier vide</p></div>
  </div>`;
}

function updateMockCartDisplay() {
  if (CONFIG.cartAdapter !== 'mock' || !cartAdapter.getItems) return;
  const el = document.getElementById('mock-cart-items');
  if (!el) return;
  const items = cartAdapter.getItems();
  if (!items.length) { el.innerHTML = '<p class="mock-cart__empty">Panier vide</p>'; return; }
  el.innerHTML = items.map((item) => `
    <div class="mock-cart__item">
      <p class="mock-cart__item-title">${item.properties.offer_title || 'Produit'} (variant: ${item.variantId})</p>
      <div class="mock-cart__item-props">
        ${Object.entries(item.properties)
          .filter(([k]) => !k.endsWith('_id') && k !== 'offer_code' && k !== 'offer_title')
          .map(([k, v]) => `<span>${k}: ${v}</span>`).join(' · ')}
      </div>
    </div>
  `).join('');
}
