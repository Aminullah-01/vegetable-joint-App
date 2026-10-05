/**
 * Sorting constants and helper utilities (SRCH-04, SRCH-05, FE-035)
 *
 * SRS References:
 * - SRCH-04: Sorting by price (low→high), price (high→low) and newest.
 * - SRCH-05: Sorting by popularity and by rating.
 * - SRCH-06: Search, filters and sort combinable and reflected in URL.
 */

export const DEFAULT_SORT = 'newest';

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Highest Rated' },
];

/**
 * Validates whether a given sort string is a supported option.
 *
 * @param {string} val
 * @returns {boolean}
 */
export function isValidSortOption(val) {
  if (!val || typeof val !== 'string') return false;
  return SORT_OPTIONS.some((opt) => opt.value === val);
}

/**
 * Returns human-readable label for a sort key.
 *
 * @param {string} val
 * @returns {string}
 */
export function getSortOptionLabel(val) {
  const found = SORT_OPTIONS.find((opt) => opt.value === val);
  return found ? found.label : 'Newest First';
}

/**
 * Normalizes sort value, falling back to default 'newest' if invalid.
 *
 * @param {string} val
 * @returns {string}
 */
export function normalizeSortOption(val) {
  return isValidSortOption(val) ? val : DEFAULT_SORT;
}
