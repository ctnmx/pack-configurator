// ============================================================
// DATA LAYER - Produits, offres, paliers livraison
// ============================================================
// Pour modifier les produits : éditer les tableaux ZOOMS / COFFRETS
// Pour modifier les prix/offres : éditer le tableau OFFERS
// Pour brancher les vrais IDs Shopify : éditer VARIANT_MAP

// --- Produits Zoom ---
export const ZOOMS = [
  {
    id: 'zoom-auvergne',
    handle: 'zoom-auvergne',
    title: 'Zoom Auvergne',
    subtitle: 'Volcans & lacs',
    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&h=300&fit=crop',
    price: 15.50,
    variantId: 1001, // ID Shopify fictif — remplacer par le vrai
  },
  {
    id: 'zoom-ecrin',
    handle: 'zoom-ecrin',
    title: 'Zoom Écrin',
    subtitle: 'Haute montagne',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
    price: 15.50,
    variantId: 1002,
  },
  {
    id: 'zoom-bretagne-velo',
    handle: 'zoom-bretagne-velo',
    title: 'Zoom Bretagne à vélo',
    subtitle: 'Côtes & sentiers',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    price: 15.50,
    variantId: 1003,
  },
];

// --- Produits Coffret ---
export const COFFRETS = [
  {
    id: 'coffret-france',
    handle: 'coffret-france',
    title: 'Coffret France',
    subtitle: 'Toutes les régions',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop',
    price: 41.50,
    variantId: 2001,
  },
  {
    id: 'coffret-europe',
    handle: 'coffret-europe',
    title: 'Coffret Europe',
    subtitle: 'Destinations européennes',
    image: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=400&h=300&fit=crop',
    price: 41.50,
    variantId: 2002,
  },
  {
    id: 'coffret-velo-france',
    handle: 'coffret-velo-france',
    title: 'Coffret Vélo France',
    subtitle: 'Itinéraires cyclables',
    image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=400&h=300&fit=crop',
    price: 41.50,
    variantId: 2003,
  },
  {
    id: 'coffret-ile-de-france',
    handle: 'coffret-ile-de-france',
    title: 'Coffret Île-de-France',
    subtitle: 'Randos franciliennes',
    image: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=400&h=300&fit=crop',
    price: 41.50,
    variantId: 2004,
  },
];

// --- Offres / Packs ---
// code: identifiant unique de l'offre
// cardOrder: ordre d'affichage dans les cartes (null = pas de carte)
// zoomCount / coffretCount: nombre de produits à sélectionner
// packPrice: prix du pack (null = prix individuel)
// originalPrice: prix barré (null = pas de prix barré)
// reductionText: texte promo affiché
// expectedShipping: livraison attendue pour ce pack
// packVariantId: ID variant Shopify du pack (fictif)
export const OFFERS = [
  {
    code: 'zoom-seul',
    title: 'Zoom seul',
    subtitle: 'Un guide randonnée au choix',
    cardTitle: 'Zoom seul',
    cardSubtitle: 'Le guide parfait pour une rando',
    cardImage: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop',
    cardOrder: 1,
    zoomCount: 1,
    coffretCount: 0,
    packPrice: null,
    originalPrice: null,
    reductionText: null,
    expectedShipping: 3.90,
    packVariantId: null, // pas de variant pack, produit individuel
    badge: null,
  },
  {
    code: 'starter',
    title: 'Pack Starter',
    subtitle: '1 Coffret + 1 Zoom',
    cardTitle: 'Pack Starter',
    cardSubtitle: '1 Coffret + 1 Zoom',
    cardImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&h=400&fit=crop',
    cardOrder: 2,
    zoomCount: 1,
    coffretCount: 1,
    packPrice: 55,
    originalPrice: null,
    reductionText: 'Réduction 2\u202F\u20AC',
    expectedShipping: 1.90,
    packVariantId: 111, // ID fictif — remplacer par le vrai
    badge: 'Populaire',
  },
  {
    code: 'explorer',
    title: 'Pack Explorer',
    subtitle: '1 Coffret + 2 Zooms',
    cardTitle: 'Pack Explorer',
    cardSubtitle: '2 Zooms + 1 Coffret',
    cardImage: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&h=400&fit=crop',
    cardOrder: 3,
    zoomCount: 2,
    coffretCount: 1,
    packPrice: 68,
    originalPrice: 70,
    reductionText: 'Réduction 4\u202F\u20AC au total',
    expectedShipping: 1.90,
    packVariantId: 222,
    badge: 'Meilleure offre',
  },
  {
    code: 'aventure',
    title: 'Pack Aventure',
    subtitle: '1 Coffret + 3 Zooms',
    cardTitle: 'Pack Aventure',
    cardSubtitle: '3 Zooms + 1 Coffret',
    cardImage: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=600&h=400&fit=crop',
    cardOrder: null, // pas de carte en MVP, mais structure prête
    zoomCount: 3,
    coffretCount: 1,
    packPrice: 82,
    originalPrice: 85,
    reductionText: 'Réduction 6,9\u202F\u20AC au total',
    expectedShipping: 0,
    packVariantId: 333,
    badge: 'Livraison offerte',
  },
  {
    code: 'extension-2',
    title: '2 Zooms',
    subtitle: '2 guides au choix',
    cardTitle: '2 Zooms',
    cardSubtitle: '2 guides au choix',
    cardImage: null,
    cardOrder: null,
    zoomCount: 2,
    coffretCount: 0,
    packPrice: 30,
    originalPrice: null,
    reductionText: 'Réduction 1\u202F\u20AC',
    expectedShipping: 2.90,
    packVariantId: 444,
    badge: null,
  },
  {
    code: 'extension-3',
    title: '3 Zooms',
    subtitle: '3 guides au choix',
    cardTitle: '3 Zooms',
    cardSubtitle: '3 guides au choix',
    cardImage: null,
    cardOrder: null,
    zoomCount: 3,
    coffretCount: 0,
    packPrice: 43,
    originalPrice: null,
    reductionText: 'Réduction 3\u202F\u20AC',
    expectedShipping: 2.90,
    packVariantId: 555,
    badge: null,
  },
];

// --- Paliers de livraison ---
export const SHIPPING_TIERS = [
  { min: 75, max: Infinity, price: 0, label: 'Livraison offerte' },
  { min: 55, max: 74.99, price: 1.90, label: '1,90\u202F\u20AC' },
  { min: 28, max: 54.99, price: 2.90, label: '2,90\u202F\u20AC' },
  { min: 0, max: 27.99, price: 3.90, label: '3,90\u202F\u20AC' },
];

// --- Mapping offre → variant ID Shopify ---
// Centralise les IDs pour les remplacer facilement
export const VARIANT_MAP = {
  'starter': 111,
  'explorer': 222,
  'aventure': 333,
  'extension-2': 444,
  'extension-3': 555,
};

// --- Configuration globale ---
export const CONFIG = {
  // Mode d'affichage du configurateur : 'drawer' | 'page'
  mode: 'drawer',

  // Adapter panier : 'mock' | 'shopify'
  cartAdapter: 'mock',

  // Devise
  currency: '\u20AC',
};
