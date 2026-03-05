// ============================================================
// UI - Composants de rendu (cartes, configurateur, drawer, page)
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

// --- État global UI ---
let currentConfigurator = null;
let cartAdapter = null;

export function initUI() {
  cartAdapter = createCartAdapter(CONFIG.cartAdapter);
  document.body.setAttribute('data-mode', CONFIG.mode);
  renderOfferCards();
  renderMockCartPanel();
}

// ============================================================
// OFFER CARDS
// ============================================================

function renderOfferCards() {
  const container = document.getElementById('offer-cards');
  if (!container) return;

  const offers = getCardOffers();
  container.innerHTML = offers.map(renderOfferCard).join('');
}

function renderOfferCard(offer) {
  const price = getCardDisplayPrice(offer);
  const hasOriginalPrice = offer.originalPrice !== null;
  const isPackOffer = offer.packPrice !== null;
  const badgeClass =
    offer.badge === 'Meilleure offre'
      ? 'offer-card__badge--best'
      : '';

  return `
    <article class="offer-card" tabindex="0" role="button"
             aria-label="Configurer ${offer.title}"
             data-offer="${offer.code}">
      ${offer.badge ? `<span class="offer-card__badge ${badgeClass}">${offer.badge}</span>` : ''}
      <img class="offer-card__image"
           src="${offer.cardImage}"
           alt="${offer.cardTitle}"
           loading="lazy" />
      <div class="offer-card__body">
        <h3 class="offer-card__title">${offer.cardTitle}</h3>
        <p class="offer-card__subtitle">${offer.cardSubtitle}</p>
        <div class="offer-card__pricing">
          <span class="offer-card__price">
            ${isPackOffer ? '' : '<span class="offer-card__price-prefix">À partir de </span>'}${formatPrice(price)}
          </span>
          ${hasOriginalPrice ? `<span class="offer-card__original-price">${formatPrice(offer.originalPrice)}</span>` : ''}
        </div>
        ${offer.reductionText ? `<p class="offer-card__reduction">${offer.reductionText}</p>` : ''}
        <span class="offer-card__cta">Choisir ce ${isPackOffer ? 'pack' : 'produit'}</span>
      </div>
    </article>
  `;
}

// ============================================================
// CONFIGURATOR CONTENT (shared between drawer & page)
// ============================================================

function renderConfiguratorContent(configurator) {
  const { offer, currentStep } = configurator;
  const stepNum = configurator.getStepNumber();
  const totalSteps = configurator.getTotalSteps();

  let html = '';

  // Step indicator
  html += renderStepIndicator(configurator);

  // Error message container
  html += '<div class="config-error" id="config-error"></div>';

  // Step content
  if (currentStep === 'zoom') {
    html += renderZoomStep(configurator);
  } else if (currentStep === 'coffret') {
    html += renderCoffretStep(configurator);
  } else if (currentStep === 'recap') {
    html += renderRecapStep(configurator);
  }

  return html;
}

// --- Step Indicator ---
function renderStepIndicator(configurator) {
  const steps = [];
  const currentStep = configurator.currentStep;

  // Step 1: Zoom
  const zoomState =
    currentStep === 'zoom'
      ? 'is-active'
      : configurator.allZoomsSelected()
        ? 'is-done'
        : '';
  steps.push({ label: `Zoom${configurator.offer.zoomCount > 1 ? 's' : ''}`, state: zoomState });

  // Step 2: Coffret (if applicable)
  if (configurator.offer.coffretCount > 0) {
    const coffretState =
      currentStep === 'coffret'
        ? 'is-active'
        : configurator.selectedCoffret
          ? 'is-done'
          : '';
    steps.push({ label: 'Coffret', state: coffretState });
  }

  // Step 3: Recap
  const recapState = currentStep === 'recap' ? 'is-active' : '';
  steps.push({ label: 'Récap', state: recapState });

  let html = '<div class="step-indicator" role="navigation" aria-label="Étapes">';
  steps.forEach((step, i) => {
    if (i > 0) html += '<span class="step-indicator__separator"></span>';
    html += `
      <div class="step-indicator__step ${step.state}">
        <span class="step-indicator__number">${i + 1}</span>
        <span>${step.label}</span>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

// --- Zoom Selection Step ---
function renderZoomStep(configurator) {
  const { offer } = configurator;
  let html = '<div class="selector-section">';
  html += `<h4 class="selector-section__title">Choisissez ${offer.zoomCount > 1 ? 'vos Zooms' : 'votre Zoom'}</h4>`;
  html += `<p class="selector-section__hint">${offer.zoomCount} guide${offer.zoomCount > 1 ? 's' : ''} à sélectionner</p>`;

  for (let slot = 0; slot < offer.zoomCount; slot++) {
    if (offer.zoomCount > 1) {
      html += `<p class="selector-section__slot-label">Zoom ${slot + 1}</p>`;
    }
    html += '<div class="product-grid">';
    html += ZOOMS.map(
      (zoom) => renderProductOption(zoom, configurator.selectedZooms[slot] === zoom.id, 'zoom', slot)
    ).join('');
    html += '</div>';
  }

  html += '</div>';

  // Navigation
  html += '<div class="config-nav">';
  html += `<button class="btn btn--primary" id="config-next" ${configurator.allZoomsSelected() ? '' : 'disabled'}>
    ${offer.coffretCount > 0 ? 'Choisir le coffret' : 'Voir le récapitulatif'} &rarr;
  </button>`;
  html += '</div>';

  return html;
}

// --- Coffret Selection Step ---
function renderCoffretStep(configurator) {
  let html = '<div class="selector-section">';
  html += '<h4 class="selector-section__title">Choisissez votre Coffret</h4>';
  html += '<p class="selector-section__hint">1 coffret à sélectionner</p>';

  html += '<div class="product-grid">';
  html += COFFRETS.map(
    (coffret) => renderProductOption(coffret, configurator.selectedCoffret === coffret.id, 'coffret', 0)
  ).join('');
  html += '</div>';
  html += '</div>';

  // Navigation
  html += '<div class="config-nav">';
  html += '<button class="btn btn--text" id="config-prev">&larr; Retour</button>';
  html += `<button class="btn btn--primary" id="config-next" ${configurator.selectedCoffret ? '' : 'disabled'}>
    Voir le récapitulatif &rarr;
  </button>`;
  html += '</div>';

  return html;
}

// --- Recap Step ---
function renderRecapStep(configurator) {
  const recap = configurator.getRecap();
  let html = '';

  html += renderStickyRecap(configurator);

  // Navigation
  html += '<div class="config-nav">';
  html += '<button class="btn btn--text" id="config-prev">&larr; Modifier</button>';
  html += `<button class="btn btn--primary" id="config-add-to-cart">
    Ajouter au panier
  </button>`;
  html += '</div>';

  return html;
}

// --- Product Option Card (zoom or coffret) ---
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

// --- Sticky Recap Widget ---
function renderStickyRecap(configurator) {
  const recap = configurator.getRecap();
  let html = '<div class="sticky-recap">';
  html += `<p class="sticky-recap__title">Votre ${recap.offer.packPrice ? 'pack' : 'sélection'}</p>`;
  html += '<ul class="sticky-recap__items">';

  // Zooms
  recap.zooms.forEach((zoom, i) => {
    html += `<li class="sticky-recap__item">
      <span class="sticky-recap__item-icon">✓</span>
      ${zoom.title}
    </li>`;
  });

  // Empty zoom slots
  const emptyZoomSlots = configurator.offer.zoomCount - recap.zooms.length;
  for (let i = 0; i < emptyZoomSlots; i++) {
    html += `<li class="sticky-recap__item sticky-recap__item--empty">
      <span class="sticky-recap__item-icon">○</span>
      Zoom à choisir
    </li>`;
  }

  // Coffret
  if (configurator.offer.coffretCount > 0) {
    if (recap.coffret) {
      html += `<li class="sticky-recap__item">
        <span class="sticky-recap__item-icon">✓</span>
        ${recap.coffret.title}
      </li>`;
    } else {
      html += `<li class="sticky-recap__item sticky-recap__item--empty">
        <span class="sticky-recap__item-icon">○</span>
        Coffret à choisir
      </li>`;
    }
  }

  html += '</ul>';

  // Price info
  html += '<div class="sticky-recap__divider"></div>';

  const price = configurator.getPrice();
  const shipping = configurator.getShipping();

  // Original price (barré)
  if (recap.originalPrice) {
    html += `<div class="sticky-recap__price-row">
      <span class="sticky-recap__price-label">Prix normal</span>
      <span class="sticky-recap__price-value--original">${formatPrice(recap.originalPrice)}</span>
    </div>`;
  }

  html += `<div class="sticky-recap__price-row">
    <span class="sticky-recap__price-label">Prix pack</span>
    <span class="sticky-recap__price-value">${price > 0 ? formatPrice(price) : '—'}</span>
  </div>`;

  html += `<div class="sticky-recap__price-row">
    <span class="sticky-recap__price-label">Livraison</span>
    <span class="sticky-recap__price-value ${shipping.price === 0 ? 'sticky-recap__price-value--free' : ''}">
      ${shipping.price === 0 ? 'Offerte' : formatPrice(shipping.price)}
    </span>
  </div>`;

  if (recap.reductionText) {
    html += `<p class="sticky-recap__reduction">${recap.reductionText}</p>`;
  }

  html += '</div>';
  return html;
}

// ============================================================
// DRAWER MODE
// ============================================================

function openDrawer(offerCode) {
  const offer = OFFERS.find((o) => o.code === offerCode);
  if (!offer) return;

  currentConfigurator = new PackConfigurator(offer);

  trackOfferCardClick(offerCode);
  trackConfigOpen(offerCode);

  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');
  const drawerTitle = document.getElementById('drawer-title');
  const drawerBody = document.getElementById('drawer-body');

  drawerTitle.textContent = offer.title;
  drawerBody.innerHTML = renderConfiguratorContent(currentConfigurator);

  overlay.classList.add('is-open');
  drawer.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // Focus trap
  setupFocusTrap(drawer);
  bindConfigEvents(drawerBody);
}

function closeDrawer() {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');

  overlay.classList.remove('is-open');
  drawer.classList.remove('is-open');
  document.body.style.overflow = '';
  currentConfigurator = null;
}

function updateDrawerContent() {
  const drawerBody = document.getElementById('drawer-body');
  if (!drawerBody || !currentConfigurator) return;
  drawerBody.innerHTML = renderConfiguratorContent(currentConfigurator);
  bindConfigEvents(drawerBody);
}

// ============================================================
// PAGE MODE
// ============================================================

function openPageConfigurator(offerCode) {
  const offer = OFFERS.find((o) => o.code === offerCode);
  if (!offer) return;

  currentConfigurator = new PackConfigurator(offer);

  trackOfferCardClick(offerCode);
  trackConfigOpen(offerCode);

  const cardsSection = document.getElementById('offer-cards');
  const pageConfig = document.getElementById('page-configurator');
  const pageTitle = document.getElementById('page-config-title');
  const pageBody = document.getElementById('page-config-body');

  cardsSection.style.display = 'none';
  document.querySelector('.hero').style.display = 'none';
  document.querySelector('.shipping-info').style.display = 'none';

  pageTitle.textContent = offer.title;
  pageBody.innerHTML = renderConfiguratorContent(currentConfigurator);

  pageConfig.classList.add('is-visible');
  pageConfig.scrollIntoView({ behavior: 'smooth' });

  bindConfigEvents(pageBody);
}

function closePageConfigurator() {
  const cardsSection = document.getElementById('offer-cards');
  const pageConfig = document.getElementById('page-configurator');

  pageConfig.classList.remove('is-visible');
  cardsSection.style.display = '';
  document.querySelector('.hero').style.display = '';
  document.querySelector('.shipping-info').style.display = '';

  currentConfigurator = null;
}

function updatePageContent() {
  const pageBody = document.getElementById('page-config-body');
  if (!pageBody || !currentConfigurator) return;
  pageBody.innerHTML = renderConfiguratorContent(currentConfigurator);
  bindConfigEvents(pageBody);
}

// ============================================================
// SHARED EVENT BINDING
// ============================================================

function bindConfigEvents(container) {
  // Product option clicks
  container.querySelectorAll('.product-option').forEach((el) => {
    el.addEventListener('click', handleProductSelect);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleProductSelect(e);
      }
    });
  });

  // Next button
  const nextBtn = container.querySelector('#config-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', handleNext);
  }

  // Prev button
  const prevBtn = container.querySelector('#config-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', handlePrev);
  }

  // Add to cart
  const addBtn = container.querySelector('#config-add-to-cart');
  if (addBtn) {
    addBtn.addEventListener('click', handleAddToCart);
  }
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

  refreshConfigUI();
}

function handleNext() {
  if (!currentConfigurator) return;
  if (!currentConfigurator.nextStep()) {
    showConfigError('Veuillez compléter votre sélection avant de continuer.');
    return;
  }
  refreshConfigUI();
}

function handlePrev() {
  if (!currentConfigurator) return;
  currentConfigurator.prevStep();
  refreshConfigUI();
}

async function handleAddToCart() {
  if (!currentConfigurator || !currentConfigurator.isComplete()) {
    showConfigError('Veuillez compléter votre sélection.');
    return;
  }

  const payload = currentConfigurator.getCartPayload();
  const recap = currentConfigurator.getRecap();

  trackAddToCart(currentConfigurator.offer.code, {
    zooms: recap.zooms.map((z) => z.id),
    coffret: recap.coffret?.id || null,
  });

  const addBtn = document.getElementById('config-add-to-cart');
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.textContent = 'Ajout en cours...';
  }

  try {
    const result = await cartAdapter.addToCart(payload);

    if (result.ok) {
      trackAddToCartSuccess(currentConfigurator.offer.code, payload);
      showToast('Ajouté au panier !', 'success');

      // Reset + close
      if (CONFIG.mode === 'drawer') {
        closeDrawer();
      } else {
        closePageConfigurator();
      }

      updateMockCartDisplay();
    } else {
      throw new Error(result.error || 'Erreur inconnue');
    }
  } catch (err) {
    trackAddToCartError(currentConfigurator.offer.code, err);
    showToast('Erreur lors de l\'ajout au panier', 'error');
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.textContent = 'Ajouter au panier';
    }
  }
}

function refreshConfigUI() {
  if (CONFIG.mode === 'drawer') {
    updateDrawerContent();
  } else {
    updatePageContent();
  }
}

function showConfigError(message) {
  const errorEl = document.getElementById('config-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('is-visible');
    setTimeout(() => errorEl.classList.remove('is-visible'), 3000);
  }
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

  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

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

// ============================================================
// FOCUS TRAP (accessibility)
// ============================================================

function setupFocusTrap(container) {
  const focusableSelectors =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function trapFocus(e) {
    if (e.key !== 'Tab') return;

    const focusable = container.querySelectorAll(focusableSelectors);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  container._trapFocus = trapFocus;
  container.addEventListener('keydown', trapFocus);

  // Focus first focusable element
  const firstFocusable = container.querySelector(focusableSelectors);
  if (firstFocusable) firstFocusable.focus();
}

// ============================================================
// GLOBAL EVENT DELEGATION
// ============================================================

export function bindGlobalEvents() {
  // Card clicks (event delegation on container)
  document.getElementById('offer-cards')?.addEventListener('click', (e) => {
    const card = e.target.closest('.offer-card');
    if (!card) return;
    const offerCode = card.dataset.offer;
    if (CONFIG.mode === 'drawer') {
      openDrawer(offerCode);
    } else {
      openPageConfigurator(offerCode);
    }
  });

  // Card keyboard activation
  document.getElementById('offer-cards')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.offer-card');
    if (!card) return;
    e.preventDefault();
    const offerCode = card.dataset.offer;
    if (CONFIG.mode === 'drawer') {
      openDrawer(offerCode);
    } else {
      openPageConfigurator(offerCode);
    }
  });

  // Drawer close
  document.getElementById('drawer-close')?.addEventListener('click', closeDrawer);
  document.getElementById('drawer-overlay')?.addEventListener('click', closeDrawer);

  // ESC to close drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (CONFIG.mode === 'drawer') {
        closeDrawer();
      }
    }
  });

  // Page mode back button
  document.getElementById('page-config-back')?.addEventListener('click', closePageConfigurator);
}
