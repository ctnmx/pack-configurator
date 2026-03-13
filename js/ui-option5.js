// ============================================================
// UI OPTION 5 - Guided Flow (shadcn/ui design)
// Accordion stepper: one step at a time, sequential flow
// Reduces cognitive load, focuses attention on current task
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
let selectedOfferCode = 'explorer';

// ============================================================
// INIT
// ============================================================

export function initGuidedUI() {
  cartAdapter = createCartAdapter(CONFIG.cartAdapter);
  renderFormulaCards();
  selectOffer(selectedOfferCode);
  renderReviews();
  renderMockCartPanel();
}

// ============================================================
// FORMULA CARDS (Step 1)
// ============================================================

function renderFormulaCards() {
  const container = document.getElementById('formula-cards');
  if (!container) return;

  const offers = getCardOffers();

  container.innerHTML = offers.map((offer) => {
    const price = getCardDisplayPrice(offer);
    const isSelected = offer.code === selectedOfferCode;
    const isPack = offer.packPrice !== null;

    let badgeHtml = '';
    if (offer.badge) {
      const cls = offer.badge === 'Meilleure offre' ? 'sh-badge--destructive' : 'sh-badge--success';
      badgeHtml = `<span class="sh-badge ${cls}">${offer.badge}</span>`;
    }

    return `
      <button class="sh-formula-card ${isSelected ? 'is-selected' : ''}"
              data-offer="${offer.code}"
              aria-pressed="${isSelected}">
        <span class="sh-formula-card__radio"><span class="sh-formula-card__radio-dot"></span></span>
        <span class="sh-formula-card__body">
          <span class="sh-formula-card__top">
            <span class="sh-formula-card__title">${offer.cardTitle}</span>
            ${badgeHtml}
          </span>
          <span class="sh-formula-card__subtitle">${offer.cardSubtitle}</span>
        </span>
        <span class="sh-formula-card__pricing">
          ${offer.originalPrice ? `<span class="sh-formula-card__original">${formatPrice(offer.originalPrice)}</span>` : ''}
          <span class="sh-formula-card__price">${isPack ? '' : 'Dès '}${formatPrice(price)}</span>
          ${offer.reductionText ? `<span class="sh-formula-card__savings">${offer.reductionText}</span>` : ''}
        </span>
      </button>
    `;
  }).join('');
}

// ============================================================
// OFFER SELECTION
// ============================================================

function selectOffer(offerCode) {
  const offer = OFFERS.find((o) => o.code === offerCode);
  if (!offer) return;

  selectedOfferCode = offerCode;
  currentConfigurator = new PackConfigurator(offer);

  trackOfferCardClick(offerCode);
  trackConfigOpen(offerCode);

  renderFormulaCards();
  setupAccordionSteps();
  renderGuidesSelection();
  renderCoffretSelection();
  renderRecap();
  updateCTAButton();
  updateStickyCTA();

  // After selecting formula, auto-open step 2
  openStep('guides');
}

// ============================================================
// ACCORDION STEPPER
// ============================================================

function setupAccordionSteps() {
  if (!currentConfigurator) return;
  const c = currentConfigurator;

  // Show/hide coffret step
  const coffretStep = document.getElementById('step-coffret');
  if (coffretStep) {
    coffretStep.style.display = c.offer.coffretCount > 0 ? '' : 'none';
  }

  // Enable step 2 trigger
  const guidesBtn = document.querySelector('#step-guides .sh-accordion__trigger');
  if (guidesBtn) guidesBtn.disabled = false;

  // Enable/disable coffret trigger
  const coffretBtn = document.querySelector('#step-coffret .sh-accordion__trigger');
  if (coffretBtn) coffretBtn.disabled = c.offer.coffretCount === 0;

  // Update step numbers
  updateStepBadge('step-formula', '1', true);

  // Update step summaries
  updateFormulaSummary();
}

function openStep(stepName) {
  const items = document.querySelectorAll('.sh-accordion__item');
  items.forEach((item) => {
    const trigger = item.querySelector('.sh-accordion__trigger');
    if (item.dataset.step === stepName) {
      item.classList.add('is-open');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'true');
        trigger.disabled = false;
      }
    } else {
      item.classList.remove('is-open');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
  });
}

function markStepDone(stepId) {
  const item = document.getElementById(stepId);
  if (item) item.classList.add('is-done');
}

function updateStepBadge(stepId, text, isActive) {
  const badge = document.querySelector(`#${stepId} .sh-accordion__step-badge`);
  if (badge) {
    badge.textContent = text;
  }
}

function updateFormulaSummary() {
  const el = document.getElementById('step-formula-summary');
  if (el && currentConfigurator) {
    el.textContent = currentConfigurator.offer.title + ' · ' + formatPrice(currentConfigurator.getPrice());
  }
}

// ============================================================
// GUIDES SELECTION (Step 2)
// ============================================================

function renderGuidesSelection() {
  const container = document.getElementById('guides-selection');
  if (!container || !currentConfigurator) return;

  const c = currentConfigurator;
  const zoomsDone = c.allZoomsSelected();
  const zoomsSelected = c.selectedZooms.filter((z) => z !== null).length;

  let html = '';
  html += `<p class="sh-selection__hint">
    ${c.offer.zoomCount} guide${c.offer.zoomCount > 1 ? 's' : ''} à sélectionner
    <span class="sh-selection__counter ${zoomsDone ? 'sh-selection__counter--done' : ''}">${zoomsSelected}/${c.offer.zoomCount}</span>
  </p>`;

  for (let slot = 0; slot < c.offer.zoomCount; slot++) {
    if (c.offer.zoomCount > 1) {
      html += `<p class="sh-selection__slot-label">Guide ${slot + 1}</p>`;
    }
    html += '<div class="product-grid">';
    html += ZOOMS.map((z) => renderProductOption(z, c.selectedZooms[slot] === z.id, 'zoom', slot)).join('');
    html += '</div>';
  }

  container.innerHTML = html;
  bindSelectionEvents(container);

  // Update summary
  const summaryEl = document.getElementById('step-guides-summary');
  if (summaryEl) {
    const selectedNames = c.selectedZooms
      .map((id) => id ? getZoomById(id) : null)
      .filter(Boolean)
      .map((z) => z.title);
    summaryEl.textContent = selectedNames.length > 0 ? selectedNames.join(', ') : '';
  }

  // Mark step done if complete
  if (zoomsDone) {
    markStepDone('step-guides');
    // Auto-advance to coffret if needed
    if (c.offer.coffretCount > 0 && !c.selectedCoffret) {
      const coffretBtn = document.querySelector('#step-coffret .sh-accordion__trigger');
      if (coffretBtn) coffretBtn.disabled = false;
      // Only auto-open if all zooms were just completed (last selection)
      setTimeout(() => openStep('coffret'), 200);
    }
  }
}

// ============================================================
// COFFRET SELECTION (Step 3)
// ============================================================

function renderCoffretSelection() {
  const container = document.getElementById('coffret-selection');
  if (!container || !currentConfigurator) return;
  if (currentConfigurator.offer.coffretCount === 0) return;

  const c = currentConfigurator;
  const coffretDone = c.selectedCoffret !== null;

  let html = '';
  html += `<p class="sh-selection__hint">
    1 coffret à sélectionner
    <span class="sh-selection__counter ${coffretDone ? 'sh-selection__counter--done' : ''}">${coffretDone ? '1' : '0'}/1</span>
  </p>`;
  html += '<div class="product-grid">';
  html += COFFRETS.map((co) =>
    renderProductOption(co, c.selectedCoffret === co.id, 'coffret', 0)
  ).join('');
  html += '</div>';

  container.innerHTML = html;
  bindSelectionEvents(container);

  // Update summary
  const summaryEl = document.getElementById('step-coffret-summary');
  if (summaryEl) {
    if (c.selectedCoffret) {
      const coffret = getCoffretById(c.selectedCoffret);
      summaryEl.textContent = coffret ? coffret.title : '';
    } else {
      summaryEl.textContent = '';
    }
  }

  if (coffretDone) {
    markStepDone('step-coffret');
  }
}

// ============================================================
// PRODUCT OPTION
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
// SELECTION EVENTS
// ============================================================

function bindSelectionEvents(container) {
  container.querySelectorAll('.product-option').forEach((el) => {
    el.addEventListener('click', handleProductSelect);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleProductSelect(e);
      }
    });
  });
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

  renderGuidesSelection();
  renderCoffretSelection();
  renderRecap();
  updateCTAButton();
  updateStickyCTA();
}

// ============================================================
// RECAP
// ============================================================

function renderRecap() {
  const container = document.getElementById('guided-recap');
  if (!container || !currentConfigurator) return;

  const c = currentConfigurator;
  const hasSelections = c.selectedZooms.some((z) => z !== null) || c.selectedCoffret;

  if (!hasSelections) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';
  const price = c.getPrice();
  const shipping = c.getShipping();

  let html = '<p class="sh-recap-card__title">Votre sélection</p>';

  // Items
  const selectedZooms = c.selectedZooms
    .map((id) => id ? getZoomById(id) : null)
    .filter(Boolean);

  if (selectedZooms.length > 0 || c.selectedCoffret) {
    html += '<div class="sh-recap-card__items">';
    selectedZooms.forEach((z) => {
      html += `<span class="sh-recap-card__item">✓ ${z.title}</span>`;
    });
    if (c.selectedCoffret) {
      const coffret = getCoffretById(c.selectedCoffret);
      html += `<span class="sh-recap-card__item">✓ ${coffret.title}</span>`;
    }
    html += '</div>';
  }

  // Price
  html += '<div class="sh-recap-card__price-row">';
  if (c.offer.originalPrice) {
    html += `<span class="sh-recap-card__original">${formatPrice(c.offer.originalPrice)}</span>`;
    html += `<span class="sh-recap-card__price">${formatPrice(price)}</span>`;
    const savings = c.offer.originalPrice - price;
    if (savings > 0) {
      html += `<span class="sh-recap-card__savings">-${formatPrice(savings)}</span>`;
    }
  } else {
    html += `<span class="sh-recap-card__price">${formatPrice(price)}</span>`;
  }
  html += '</div>';

  // Shipping
  const isFree = shipping.price === 0;
  html += `<span class="sh-recap-card__shipping ${isFree ? 'sh-recap-card__shipping--free' : ''}">
    Livraison : ${isFree ? 'offerte ✓' : formatPrice(shipping.price)}
  </span>`;

  container.innerHTML = html;
}

// ============================================================
// CTA
// ============================================================

function updateCTAButton() {
  const btn = document.getElementById('guided-add-to-cart');
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
// STICKY CTA
// ============================================================

function updateStickyCTA() {
  const titleEl = document.getElementById('sticky-title');
  const priceEl = document.getElementById('sticky-price');
  const originalEl = document.getElementById('sticky-original');
  const btn = document.getElementById('sticky-btn');
  if (!titleEl || !currentConfigurator) return;

  const c = currentConfigurator;
  titleEl.textContent = c.offer.title;
  const price = c.getPrice();
  priceEl.textContent = formatPrice(price);

  if (originalEl && c.offer.originalPrice) {
    originalEl.textContent = formatPrice(c.offer.originalPrice);
  } else if (originalEl) {
    originalEl.textContent = '';
  }

  const isComplete = c.isComplete();
  btn.disabled = !isComplete;
  btn.textContent = isComplete
    ? `Ajouter — ${formatPrice(price)}`
    : 'Complétez votre sélection';
}

function initStickyObserver() {
  const mainCTA = document.getElementById('guided-add-to-cart');
  const stickyBar = document.getElementById('sticky-cta-bar');
  if (!mainCTA || !stickyBar) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      stickyBar.classList.toggle('is-visible', !entry.isIntersecting);
      stickyBar.setAttribute('aria-hidden', entry.isIntersecting ? 'true' : 'false');
    },
    { threshold: 0 }
  );
  observer.observe(mainCTA);
}

// ============================================================
// ADD TO CART
// ============================================================

async function handleAddToCart() {
  if (!currentConfigurator || !currentConfigurator.isComplete()) return;

  const payload = currentConfigurator.getCartPayload();
  const recap = currentConfigurator.getRecap();

  trackAddToCart(currentConfigurator.offer.code, {
    zooms: recap.zooms.map((z) => z.id),
    coffret: recap.coffret?.id || null,
  });

  const mainBtn = document.getElementById('guided-add-to-cart');
  const stickyBtn = document.getElementById('sticky-btn');
  if (mainBtn) { mainBtn.disabled = true; mainBtn.textContent = 'Ajout en cours…'; }
  if (stickyBtn) { stickyBtn.disabled = true; stickyBtn.textContent = 'Ajout en cours…'; }

  try {
    const result = await cartAdapter.addToCart(payload);
    if (result.ok) {
      trackAddToCartSuccess(currentConfigurator.offer.code, payload);
      showToast('Ajouté au panier !');
      updateMockCartDisplay();
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
// REVIEWS
// ============================================================

function renderReviews() {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  const reviews = [
    { name: 'Marie L.', text: 'Carte magnifique et super bien pensée. Les itinéraires sont vraiment testés et approuvés, on sent le vécu !', stars: 5, date: 'il y a 3 jours' },
    { name: 'Thomas B.', text: 'Le Pack Explorer est le meilleur rapport qualité-prix. 2 Zooms + Coffret, tout ce qu\'il faut pour planifier ses vacances.', stars: 5, date: 'il y a 1 semaine' },
    { name: 'Sophie R.', text: 'Offert à mon conjoint pour Noël, il a adoré. Les tracés GPS sont un vrai plus par rapport aux autres guides.', stars: 5, date: 'il y a 2 semaines' },
  ];

  container.innerHTML = reviews.map((r) => `
    <div class="sh-review-card">
      <div class="sh-review-card__stars">${'★'.repeat(r.stars)}</div>
      <p class="sh-review-card__text">"${r.text}"</p>
      <span class="sh-review-card__author">— ${r.name} · ${r.date}</span>
    </div>
  `).join('');
}

// ============================================================
// GLOBAL EVENTS
// ============================================================

export function bindGuidedEvents() {
  // Formula card clicks
  document.getElementById('formula-cards')?.addEventListener('click', (e) => {
    const card = e.target.closest('.sh-formula-card');
    if (!card) return;
    const code = card.dataset.offer;
    if (code && code !== selectedOfferCode) {
      selectOffer(code);
    }
  });

  // Accordion triggers
  document.querySelectorAll('.sh-accordion__trigger').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      const item = trigger.closest('.sh-accordion__item');
      if (!item || trigger.disabled) return;
      const step = item.dataset.step;
      if (item.classList.contains('is-open')) {
        // Close it
        item.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        openStep(step);
      }
    });
  });

  // Main CTA
  document.getElementById('guided-add-to-cart')?.addEventListener('click', handleAddToCart);

  // Sticky CTA
  document.getElementById('sticky-btn')?.addEventListener('click', handleAddToCart);

  // Init sticky observer
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
