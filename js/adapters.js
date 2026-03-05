// ============================================================
// CART ADAPTERS - Abstraction panier e-commerce
// ============================================================
// Interface : addToCart(payload) → Promise<{ok, data?, error?}>
//
// payload = {
//   variantId: number | string,
//   quantity: number,
//   properties: { zoom_1, zoom_2?, coffret?, offer_code, ... }
// }

// --- Mock Adapter (défaut en développement) ---
// Stocke les items en mémoire et affiche le résultat

export class MockCartAdapter {
  constructor() {
    this.items = [];
  }

  async addToCart(payload) {
    // Simule un délai réseau
    await new Promise((r) => setTimeout(r, 400));

    const item = {
      id: Date.now(),
      variantId: payload.variantId,
      quantity: payload.quantity || 1,
      properties: payload.properties || {},
      addedAt: new Date().toISOString(),
    };

    this.items.push(item);

    console.log('[MockCart] Item ajouté :', item);
    console.log('[MockCart] Panier complet :', this.items);

    return { ok: true, data: item };
  }

  getItems() {
    return [...this.items];
  }

  clear() {
    this.items = [];
  }
}

// --- Shopify AJAX Cart Adapter ---
// Utilise l'API AJAX Shopify (/cart/add.js)
// Documentation : https://shopify.dev/docs/api/ajax/reference/cart

export class ShopifyAjaxCartAdapter {
  async addToCart(payload) {
    const body = {
      id: payload.variantId,
      quantity: payload.quantity || 1,
      properties: payload.properties || {},
    };

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: errorData.description || `Erreur HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err.message || 'Erreur réseau',
      };
    }
  }
}

// --- Factory ---
// Crée l'adapter selon la configuration

export function createCartAdapter(type = 'mock') {
  switch (type) {
    case 'shopify':
      return new ShopifyAjaxCartAdapter();
    case 'mock':
    default:
      return new MockCartAdapter();
  }
}
