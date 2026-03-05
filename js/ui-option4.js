// ============================================================
// UI OPTION 4 - Page produit Recto Verso + CTAs pack intégrés
// Modal configurateur dans le style de la marque
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

// ============================================================
// INIT
// ============================================================

export function initProductUI() {
  cartAdapter = createCartAdapter(CONFIG.cartAdapter);
  renderPackCTAs();
  renderMockCartPanel();
}

// ============================================================
// PACK CTA CARDS (embedded in product page)
// ============================================================

function renderPackCTAs() {
  const container = document.getElementById('pack-cta-cards');
  if (!container) return;

  const offers = getCardOffers();

  container.innerHTML = offers.map((offer) => {
    const price = getCardDisplayPrice(offer);
    const isPack = offer.packPrice !== null;
    const isFeatured = offer.badge === 'Meilleure offre';
    const isPopular = offer.badge === 'Populaire';

    let badgeHtml = '';
    if (offer.badge) {
      const cls = isFeatured ? '' : 'pack-cta-card__badge--green';
      badgeHtml = `<span class="pack-cta-card__badge ${cls}">${offer.badge}</span>`;
    }

    // Icon based on content
    let icon = '📖';
    if (offer.zoomCount >= 2) icon = '📚';
    if (offer.coffretCount > 0 && offer.zoomCount === 1) icon = '🎁';

    return `
      <div class="pack-cta-card ${isFeatured ? 'pack-cta-card--featured' : ''}"
           tabindex="0" role="button"
           aria-label="Configurer ${offer.title}"
           data-offer="${offer.code}">
        ${badgeHtml}
        <div class="pack-cta-card__icon">${icon}</div>
        <div class="pack-cta-card__title">${offer.cardTitle}</div>
        <div class="pack-cta-card__contents">${offer.cardSubtitle}</div>
        <div class="pack-cta-card__pricing">
          <span class="pack-cta-card__price">${isPack ? '' : 'Dès '}${formatPrice(price)}</span>
          ${offer.originalPrice ? `<span class="pack-cta-card__original-price">${formatPrice(offer.originalPrice)}</span>` : ''}
        </div>
        ${offer.reductionText ? `<div class="pack-cta-card__reduction">${offer.reductionText}</div>` : '<div style="height:18px"></div>'}
        <span class="pack-cta-card__cta-btn">Composer →</span>
        <div class="pack-cta-card__shipping">Livraison : ${offer.expectedShipping === 0 ? 'offerte' : formatPrice(offer.expectedShipping)}</div>
      </div>
    `;
  }).join('');
}

// ============================================================
// MODAL CONFIGURATOR
// ============================================================

function openModal(offerCode) {
  const offer = OFFERS.find((o) => o.code === offerCode);
  if (!offer) return;

  currentConfigurator = new PackConfigurator(offer);
  trackOfferCardClick(offerCode);
  trackConfigOpen(offerCode);

  const overlay = document.getElementById('rv-modal-overlay');
  const title = document.getElementById('rv-modal-title');
  const body = document.getElementById('rv-modal-body');
  const footer = document.getElementById('rv-modal-footer');

  title.textContent = offer.title;
  renderModalContent();

  overlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // Focus trap
  const modal = document.getElementById('rv-modal');
  const firstFocusable = modal.querySelector('button, [tabindex]');
  if (firstFocusable) firstFocusable.focus();
}

function closeModal() {
  const overlay = document.getElementById('rv-modal-overlay');
  overlay.classList.remove('is-open');
  document.body.style.overflow = '';
  currentConfigurator = null;
}

function renderModalContent() {
  if (!currentConfigurator) return;

  const body = document.getElementById('rv-modal-body');
  const footer = document.getElementById('rv-modal-footer');
  const step = currentConfigurator.currentStep;

  let bodyHtml = '';
  let footerHtml = '';

  // Step indicator
  bodyHtml += renderStepIndicator();

  // Error container
  bodyHtml += '<div class="config-error" id="config-error"></div>';

  if (step === 'zoom') {
    bodyHtml += renderZoomStep();
    footerHtml = `
      <button class="rv-btn rv-btn--primary" id="config-next"
              ${currentConfigurator.allZoomsSelected() ? '' : 'disabled'}>
        ${currentConfigurator.offer.coffretCount > 0 ? 'Choisir le coffret →' : 'Voir le récapitulatif →'}
      </button>
    `;
  } else if (step === 'coffret') {
    bodyHtml += renderCoffretStep();
    footerHtml = `
      <div class="rv-config-nav">
        <button class="rv-btn rv-btn--text" id="config-prev">← Retour</button>
        <button class="rv-btn rv-btn--primary" id="config-next"
                ${currentConfigurator.selectedCoffret ? '' : 'disabled'}>
          Récapitulatif →
        </button>
      </div>
    `;
  } else if (step === 'recap') {
    bodyHtml += renderRecapStep();
    footerHtml = `
      <div class="rv-config-nav">
        <button class="rv-btn rv-btn--text" id="config-prev">← Modifier</button>
        <button class="rv-btn rv-btn--primary" id="config-add-to-cart">
          Ajouter au panier
        </button>
      </div>
    `;
  }

  body.innerHTML = bodyHtml;
  footer.innerHTML = footerHtml;

  bindModalEvents();
}

// --- Step indicator ---
function renderStepIndicator() {
  const c = currentConfigurator;
  const steps = [];

  const zoomState = c.currentStep === 'zoom' ? 'is-active' : c.allZoomsSelected() ? 'is-done' : '';
  steps.push({ label: c.offer.zoomCount > 1 ? 'Zooms' : 'Zoom', state: zoomState });

  if (c.offer.coffretCount > 0) {
    const coffretState = c.currentStep === 'coffret' ? 'is-active' : c.selectedCoffret ? 'is-done' : '';
    steps.push({ label: 'Coffret', state: coffretState });
  }

  const recapState = c.currentStep === 'recap' ? 'is-active' : '';
  steps.push({ label: 'Récap', state: recapState });

  let html = '<div class="step-indicator" role="navigation" aria-label="Étapes">';
  steps.forEach((s, i) => {
    if (i > 0) html += '<span class="step-indicator__separator"></span>';
    html += `<div class="step-indicator__step ${s.state}">
      <span class="step-indicator__number">${i + 1}</span>
      <span>${s.label}</span>
    </div>`;
  });
  html += '</div>';
  return html;
}

// --- Zoom step ---
function renderZoomStep() {
  const c = currentConfigurator;
  let html = '<div class="selector-section">';
  html += `<h4 class="selector-section__title">Choisissez ${c.offer.zoomCount > 1 ? 'vos Zooms' : 'votre Zoom'}</h4>`;
  html += `<p class="selector-section__hint">${c.offer.zoomCount} guide${c.offer.zoomCount > 1 ? 's' : ''} à sélectionner</p>`;

  for (let slot = 0; slot < c.offer.zoomCount; slot++) {
    if (c.offer.zoomCount > 1) {
      html += `<p class="selector-section__slot-label">Zoom ${slot + 1}</p>`;
    }
    html += '<div class="product-grid">';
    html += ZOOMS.map((z) => renderProductOption(z, c.selectedZooms[slot] === z.id, 'zoom', slot)).join('');
    html += '</div>';
  }
  html += '</div>';
  return html;
}

// --- Coffret step ---
function renderCoffretStep() {
  let html = '<div class="selector-section">';
  html += '<h4 class="selector-section__title">Choisissez votre Coffret</h4>';
  html += '<p class="selector-section__hint">1 coffret à sélectionner</p>';
  html += '<div class="product-grid">';
  html += COFFRETS.map((c) =>
    renderProductOption(c, currentConfigurator.selectedCoffret === c.id, 'coffret', 0)
  ).join('');
  html += '</div></div>';
  return html;
}

// --- Recap step ---
function renderRecapStep() {
  const recap = currentConfigurator.getRecap();
  const shipping = currentConfigurator.getShipping();
  const price = currentConfigurator.getPrice();

  let html = '<div class="rv-recap">';
  html += `<p class="rv-recap__title">Votre ${recap.offer.packPrice ? 'pack' : 'sélection'}</p>`;
  html += '<ul class="rv-recap__items">';

  recap.zooms.forEach((z) => {
    html += `<li class="rv-recap__item"><span class="rv-recap__item-icon">✓</span>${z.title}</li>`;
  });

  if (recap.coffret) {
    html += `<li class="rv-recap__item"><span class="rv-recap__item-icon">✓</span>${recap.coffret.title}</li>`;
  }

  html += '</ul>';
  html += '<div class="rv-recap__divider"></div>';

  if (recap.originalPrice) {
    html += `<div class="rv-recap__price-row">
      <span class="rv-recap__price-label">Prix normal</span>
      <span class="rv-recap__price-value--original">${formatPrice(recap.originalPrice)}</span>
    </div>`;
  }

  html += `<div class="rv-recap__price-row">
    <span class="rv-recap__price-label">Prix pack</span>
    <span class="rv-recap__price-value">${formatPrice(price)}</span>
  </div>`;

  html += `<div class="rv-recap__price-row">
    <span class="rv-recap__price-label">Livraison</span>
    <span class="rv-recap__price-value ${shipping.price === 0 ? 'rv-recap__price-value--free' : ''}">
      ${shipping.price === 0 ? 'Offerte' : formatPrice(shipping.price)}
    </span>
  </div>`;

  if (recap.reductionText) {
    html += `<p class="rv-recap__reduction">${recap.reductionText}</p>`;
  }

  html += '</div>';
  return html;
}

// --- Product option ---
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
// MODAL EVENT BINDING
// ============================================================

function bindModalEvents() {
  const body = document.getElementById('rv-modal-body');
  const footer = document.getElementById('rv-modal-footer');

  // Product options
  body.querySelectorAll('.product-option').forEach((el) => {
    el.addEventListener('click', handleProductSelect);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProductSelect(e); }
    });
  });

  // Next
  const nextBtn = footer.querySelector('#config-next');
  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (currentConfigurator.nextStep()) renderModalContent();
  });

  // Prev
  const prevBtn = footer.querySelector('#config-prev');
  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (currentConfigurator.prevStep()) renderModalContent();
  });

  // Add to cart
  const addBtn = footer.querySelector('#config-add-to-cart');
  if (addBtn) addBtn.addEventListener('click', handleAddToCart);
}

function handleProductSelect(e) {
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

  renderModalContent();
}

async function handleAddToCart() {
  if (!currentConfigurator || !currentConfigurator.isComplete()) return;

  const payload = currentConfigurator.getCartPayload();
  const recap = currentConfigurator.getRecap();

  trackAddToCart(currentConfigurator.offer.code, {
    zooms: recap.zooms.map((z) => z.id),
    coffret: recap.coffret?.id || null,
  });

  const btn = document.getElementById('config-add-to-cart');
  if (btn) { btn.disabled = true; btn.textContent = 'Ajout en cours…'; }

  try {
    const result = await cartAdapter.addToCart(payload);
    if (result.ok) {
      trackAddToCartSuccess(currentConfigurator.offer.code, payload);
      showToast('Ajouté au panier !');
      closeModal();
      updateMockCartDisplay();
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    trackAddToCartError(currentConfigurator.offer.code, err);
    showToast('Erreur lors de l\'ajout', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Ajouter au panier'; }
  }
}

// ============================================================
// GLOBAL EVENTS
// ============================================================

export function bindProductEvents() {
  // Pack CTA card clicks
  document.getElementById('pack-cta-cards')?.addEventListener('click', (e) => {
    const card = e.target.closest('.pack-cta-card');
    if (!card) return;
    openModal(card.dataset.offer);
  });

  document.getElementById('pack-cta-cards')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.pack-cta-card');
    if (!card) return;
    e.preventDefault();
    openModal(card.dataset.offer);
  });

  // Modal close
  document.getElementById('rv-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('rv-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
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
