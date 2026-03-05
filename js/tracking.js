// ============================================================
// TRACKING - Événements analytics (MVP : console.log)
// ============================================================
// En production, remplacer console.log par dataLayer.push(),
// analytics.track(), ou tout autre système de tracking.

const PREFIX = '[TRACK]';

function emit(eventName, data = {}) {
  console.log(`${PREFIX} ${eventName}`, data);

  // --- Branchement futur ---
  // window.dataLayer?.push({ event: eventName, ...data });
  // analytics?.track(eventName, data);
}

// --- Événements métier ---

export function trackOfferCardClick(offerCode) {
  emit('offer_card_click', { offer: offerCode });
}

export function trackConfigOpen(offerCode) {
  emit('config_open', { offer: offerCode });
}

export function trackZoomSelected(zoomId, slotIndex) {
  emit('zoom_selected', { zoom_id: zoomId, slot: slotIndex });
}

export function trackCoffretSelected(coffretId) {
  emit('coffret_selected', { coffret_id: coffretId });
}

export function trackAddToCart(offerCode, content) {
  emit('add_to_cart', { offer: offerCode, content });
}

export function trackAddToCartSuccess(offerCode, content) {
  emit('add_to_cart_success', { offer: offerCode, content });
}

export function trackAddToCartError(offerCode, error) {
  emit('add_to_cart_error', { offer: offerCode, error: error?.message || error });
}
