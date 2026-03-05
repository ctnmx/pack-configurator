// ============================================================
// LOGIC - Configurateur de packs (sélection, validation, prix)
// ============================================================

import { ZOOMS, COFFRETS, OFFERS, SHIPPING_TIERS } from './data.js';

// --- Calcul livraison à partir du prix ---
export function calculateShipping(price) {
  for (const tier of SHIPPING_TIERS) {
    if (price >= tier.min && price <= tier.max) {
      return tier;
    }
  }
  return SHIPPING_TIERS[SHIPPING_TIERS.length - 1];
}

// --- Formater un prix en euros ---
export function formatPrice(price) {
  if (price === 0) return 'Gratuit';
  return price.toFixed(2).replace('.', ',') + '\u202F\u20AC';
}

// --- Trouver une offre par code ---
export function getOfferByCode(code) {
  return OFFERS.find((o) => o.code === code) || null;
}

// --- Trouver un zoom par ID ---
export function getZoomById(id) {
  return ZOOMS.find((z) => z.id === id) || null;
}

// --- Trouver un coffret par ID ---
export function getCoffretById(id) {
  return COFFRETS.find((c) => c.id === id) || null;
}

// --- Offres affichées en cartes ---
export function getCardOffers() {
  return OFFERS.filter((o) => o.cardOrder !== null).sort(
    (a, b) => a.cardOrder - b.cardOrder
  );
}

// --- Prix affiché pour une carte ("À partir de X€") ---
export function getCardDisplayPrice(offer) {
  if (offer.packPrice !== null) {
    return offer.packPrice;
  }
  // Zoom seul : prix le moins cher des zooms
  const prices = ZOOMS.map((z) => z.price);
  return Math.min(...prices);
}

// ============================================================
// Classe PackConfigurator
// Gère l'état de sélection pour une offre donnée
// ============================================================

export class PackConfigurator {
  constructor(offer) {
    this.offer = offer;
    // Tableau de sélection des zooms (un slot par zoom à choisir)
    this.selectedZooms = new Array(offer.zoomCount).fill(null);
    // Coffret sélectionné (null si pas de coffret dans l'offre)
    this.selectedCoffret = null;
    // Étape courante : 'zoom' | 'coffret' | 'recap'
    this.currentStep = 'zoom';
  }

  // --- Sélectionner un zoom dans un slot ---
  selectZoom(slotIndex, zoomId) {
    if (slotIndex < 0 || slotIndex >= this.offer.zoomCount) return false;
    const zoom = getZoomById(zoomId);
    if (!zoom) return false;
    this.selectedZooms[slotIndex] = zoomId;
    return true;
  }

  // --- Désélectionner un zoom d'un slot ---
  clearZoom(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.offer.zoomCount) return;
    this.selectedZooms[slotIndex] = null;
  }

  // --- Tous les zooms sont sélectionnés ? ---
  allZoomsSelected() {
    return this.selectedZooms.every((z) => z !== null);
  }

  // --- Sélectionner un coffret ---
  selectCoffret(coffretId) {
    if (this.offer.coffretCount === 0) return false;
    const coffret = getCoffretById(coffretId);
    if (!coffret) return false;
    this.selectedCoffret = coffretId;
    return true;
  }

  // --- La sélection est-elle complète ? ---
  isComplete() {
    const zoomsDone = this.allZoomsSelected();
    const coffretDone =
      this.offer.coffretCount === 0 || this.selectedCoffret !== null;
    return zoomsDone && coffretDone;
  }

  // --- Étape suivante ---
  nextStep() {
    if (this.currentStep === 'zoom' && this.allZoomsSelected()) {
      if (this.offer.coffretCount > 0) {
        this.currentStep = 'coffret';
      } else {
        this.currentStep = 'recap';
      }
      return true;
    }
    if (this.currentStep === 'coffret' && this.selectedCoffret !== null) {
      this.currentStep = 'recap';
      return true;
    }
    return false;
  }

  // --- Étape précédente ---
  prevStep() {
    if (this.currentStep === 'recap') {
      this.currentStep =
        this.offer.coffretCount > 0 ? 'coffret' : 'zoom';
      return true;
    }
    if (this.currentStep === 'coffret') {
      this.currentStep = 'zoom';
      return true;
    }
    return false;
  }

  // --- Numéro d'étape courant (1-based) ---
  getStepNumber() {
    if (this.currentStep === 'zoom') return 1;
    if (this.currentStep === 'coffret') return 2;
    return this.offer.coffretCount > 0 ? 3 : 2;
  }

  // --- Nombre total d'étapes ---
  getTotalSteps() {
    // zoom + coffret (si applicable) + recap
    return 1 + (this.offer.coffretCount > 0 ? 1 : 0) + 1;
  }

  // --- Prix du pack ---
  getPrice() {
    if (this.offer.packPrice !== null) {
      return this.offer.packPrice;
    }
    // Zoom seul : somme des prix individuels
    return this.selectedZooms.reduce((sum, zoomId) => {
      const zoom = getZoomById(zoomId);
      return sum + (zoom ? zoom.price : 0);
    }, 0);
  }

  // --- Livraison attendue ---
  getShipping() {
    return calculateShipping(this.getPrice());
  }

  // --- Récapitulatif lisible ---
  getRecap() {
    const zooms = this.selectedZooms
      .map((id) => getZoomById(id))
      .filter(Boolean);

    const coffret = this.selectedCoffret
      ? getCoffretById(this.selectedCoffret)
      : null;

    const price = this.getPrice();
    const shipping = this.getShipping();

    return {
      offer: this.offer,
      zooms,
      coffret,
      price,
      shipping,
      originalPrice: this.offer.originalPrice,
      reductionText: this.offer.reductionText,
    };
  }

  // --- Payload pour l'ajout panier ---
  getCartPayload() {
    const recap = this.getRecap();
    const properties = {};

    recap.zooms.forEach((z, i) => {
      properties[`zoom_${i + 1}`] = z.title;
      properties[`zoom_${i + 1}_id`] = z.id;
    });

    if (recap.coffret) {
      properties.coffret = recap.coffret.title;
      properties.coffret_id = recap.coffret.id;
    }

    properties.offer_code = this.offer.code;
    properties.offer_title = this.offer.title;

    // Variant ID : pack ou produit individuel
    let variantId;
    if (this.offer.packVariantId) {
      variantId = this.offer.packVariantId;
    } else {
      // Zoom seul : on utilise le variant du zoom sélectionné
      const zoom = getZoomById(this.selectedZooms[0]);
      variantId = zoom ? zoom.variantId : null;
    }

    return {
      variantId,
      quantity: 1,
      properties,
    };
  }

  // --- Reset ---
  reset() {
    this.selectedZooms = new Array(this.offer.zoomCount).fill(null);
    this.selectedCoffret = null;
    this.currentStep = 'zoom';
  }
}
