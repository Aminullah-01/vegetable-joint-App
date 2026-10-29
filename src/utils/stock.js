/**
 * Stock & Inventory Utility Functions
 *
 * SRS References:
 * - SEL-09: The Inventory view shall flag low stock (default threshold 5 units, configurable per product). [ASSUMPTION A-09]
 * - SEL-07 / BR-01 / TC-21: Quantity 0 flags Out of Stock automatically.
 * - A-10: Whole integer quantities.
 */

/**
 * Checks if a given quantity is considered low stock (0 < quantity <= threshold).
 *
 * @param {number|string} quantity
 * @param {number|string} [threshold=5]
 * @returns {boolean}
 */
export function isLowStock(quantity, threshold = 5) {
  const q = Number(quantity);
  const t = Number(threshold);
  return !isNaN(q) && q > 0 && q <= (isNaN(t) ? 5 : t);
}

/**
 * Checks if a product is out of stock (quantity <= 0).
 *
 * @param {number|string} quantity
 * @returns {boolean}
 */
export function isOutOfStock(quantity) {
  const q = Number(quantity);
  return isNaN(q) || q <= 0;
}

/**
 * Derives the effective stock status of a produce item.
 *
 * @param {number|string} quantity
 * @param {number|string} [threshold=5]
 * @param {string|boolean} [availability='available']
 * @returns {'unavailable' | 'out_of_stock' | 'low_stock' | 'in_stock'}
 */
export function getStockStatus(
  quantity,
  threshold = 5,
  availability = 'available'
) {
  if (availability === 'unavailable' || availability === false) {
    return 'unavailable';
  }
  const q = Number(quantity);
  const t = Number(threshold);
  if (isNaN(q) || q <= 0) return 'out_of_stock';
  if (q <= (isNaN(t) ? 5 : t)) return 'low_stock';
  return 'in_stock';
}
