/**
 * Filter constants and helper utilities (SRCH-02, SRCH-03, SRCH-06, SRCH-08, FE-034)
 */

export const DEFAULT_LOCATIONS = [
  'Gombe',
  'Kaduna',
  'Kano',
  'Lagos',
  'Plateau',
];

export const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'in_stock', label: 'In Stock Only' },
  { value: 'low_stock', label: 'Low Stock Only' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

export const PRICE_PRESETS = [
  { label: 'Under ₦2,000', min: '', max: '2000' },
  { label: '₦2,000 – ₦5,000', min: '2000', max: '5000' },
  { label: 'Above ₦5,000', min: '5000', max: '' },
];

/**
 * Extracts normalized filter values from URLSearchParams or an object.
 *
 * @param {URLSearchParams|Object} params
 * @returns {{ category: string, min_price: string, max_price: string, availability: string, seller: string, location: string }}
 */
export function extractFiltersFromParams(params) {
  if (!params) {
    return {
      category: '',
      min_price: '',
      max_price: '',
      availability: '',
      seller: '',
      location: '',
    };
  }

  const get = (key) => {
    if (typeof params.get === 'function') {
      return params.get(key) || '';
    }
    return params[key] !== undefined && params[key] !== null
      ? String(params[key])
      : '';
  };

  return {
    category: get('category'),
    min_price: get('min_price') || get('minPrice'),
    max_price: get('max_price') || get('maxPrice'),
    availability: get('availability'),
    seller: get('seller'),
    location: get('location'),
  };
}

/**
 * Counts the number of active filters.
 *
 * @param {Object} filters
 * @returns {number}
 */
export function countActiveFilters(filters) {
  if (!filters) return 0;
  let count = 0;

  if (filters.category && filters.category !== 'all') count++;
  if (filters.min_price || filters.minPrice) count++;
  if (filters.max_price || filters.maxPrice) count++;
  if (filters.availability && filters.availability !== 'all') count++;
  if (filters.seller && filters.seller !== 'all') count++;
  if (filters.location && filters.location !== 'all') count++;

  return count;
}

export const CATEGORY_ICONS = {
  tomato: '🍅',
  pepper: '🌶️',
  onion: '🧅',
  carrot: '🥕',
  cabbage: '🥬',
  spinach: '🥗',
  lettuce: '🥬',
  cucumber: '🥒',
  potato: '🥔',
  'other-vegetables': '🥦',
  'other vegetables': '🥦',
};

/**
 * Resolves standard produce emoji icon for a category object or slug/name string.
 *
 * @param {Object|string} cat
 * @returns {string}
 */
export function resolveCategoryIcon(cat) {
  if (!cat) return '🥬';
  if (typeof cat === 'string') {
    const key = cat.toLowerCase();
    return CATEGORY_ICONS[key] || '🥬';
  }
  if (cat.icon) return cat.icon;
  const slugKey = (cat.slug || '').toLowerCase();
  const nameKey = (cat.name || '').toLowerCase();
  return CATEGORY_ICONS[slugKey] || CATEGORY_ICONS[nameKey] || '🥬';
}
