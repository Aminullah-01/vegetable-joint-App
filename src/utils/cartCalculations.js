/**
 * Cart Totals Calculation Utilities
 *
 * SRS References:
 * - CART-04: Each cart line shall show product, quantity, unit price and subtotal
 *   (unit price × quantity); the cart shall show the grand total. Totals shall be
 *   calculated identically on client and server; the server value is authoritative.
 * - BR-02: Order line subtotal = unit price × quantity. Order total = sum of line subtotals.
 *   (No delivery fee, tax or discount in 1.0.)
 * - BR-04: Buyer cannot order more than current stock; cart re-validates before checkout.
 * - CHK-05 / BR-06: Items grouped per seller for independent order processing.
 * - A-10: Quantities are whole numbers of the selected unit.
 */

/**
 * Calculates the subtotal for an individual cart line item (BR-02).
 * Line subtotal = unit price × quantity.
 *
 * @param {number|string} price - Unit price in Naira (≥ 0).
 * @param {number|string} quantity - Item quantity (whole number ≥ 0).
 * @returns {number} Calculated line subtotal in Naira, rounded to 2 decimal places.
 */
export function calculateLineSubtotal(price, quantity) {
  const numericPrice = Number(price);
  const numericQty = Number(quantity);

  if (
    !Number.isFinite(numericPrice) ||
    !Number.isFinite(numericQty) ||
    numericPrice < 0 ||
    numericQty < 0
  ) {
    return 0;
  }

  // Quantities are whole numbers per SRS A-10
  const wholeQty = Math.floor(numericQty);

  // Exact arithmetic rounded to nearest kobo
  return Math.round(numericPrice * wholeQty * 100) / 100;
}

/**
 * Calculates comprehensive cart totals across all line items (CART-04, BR-02).
 * In 1.0: Subtotal = sum of line subtotals; Total = Subtotal (no delivery fee, tax or discount).
 * If authoritative server totals are supplied, server value takes precedence per CART-04.
 *
 * @param {Array<object>} [items=[]] - Array of cart line items.
 * @param {object} [options={}] - Optional pricing overrides or authoritative server figures.
 * @param {number} [options.deliveryFee=0] - Estimated delivery fee (0 in 1.0 per BR-02).
 * @param {number} [options.tax=0] - Applicable tax (0 in 1.0 per BR-02).
 * @param {number} [options.discount=0] - Applicable discount (0 in 1.0 per BR-02).
 * @param {number|null} [options.serverTotal=null] - Authoritative total returned by backend.
 * @param {number|null} [options.serverSubtotal=null] - Authoritative subtotal returned by backend.
 * @returns {{
 *   subtotal: number,
 *   deliveryFee: number,
 *   tax: number,
 *   discount: number,
 *   total: number,
 *   itemCount: number,
 *   uniqueItemCount: number,
 *   lineItems: Array<object>,
 *   isServerAuthoritative: boolean,
 *   hasDiscrepancy: boolean,
 *   discrepancyAmount: number
 * }}
 */
export function calculateCartTotals(items = [], options = {}) {
  const safeItems = Array.isArray(items) ? items : [];
  const {
    deliveryFee = 0,
    tax = 0,
    discount = 0,
    serverTotal = null,
    serverSubtotal = null,
  } = options;

  let calculatedSubtotal = 0;
  let totalItemCount = 0;

  const lineItems = safeItems.map((item) => {
    if (!item) {
      return {
        product_id: null,
        price: 0,
        quantity: 0,
        subtotal: 0,
      };
    }

    const price = Number(item.price) || 0;
    const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const subtotal = calculateLineSubtotal(price, quantity);

    calculatedSubtotal += subtotal;
    totalItemCount += quantity;

    return {
      ...item,
      price,
      quantity,
      subtotal,
    };
  });

  calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;

  // In 1.0 per BR-02: Total = Sum of line subtotals
  const fee = Math.max(0, Number(deliveryFee) || 0);
  const taxAmount = Math.max(0, Number(tax) || 0);
  const discountAmount = Math.max(0, Number(discount) || 0);

  const clientCalculatedTotal = Math.max(
    0,
    Math.round((calculatedSubtotal + fee + taxAmount - discountAmount) * 100) /
      100
  );

  // Authoritative server reconciliation (CART-04: server value is authoritative)
  const isServerAuthoritative =
    serverTotal !== null &&
    serverTotal !== undefined &&
    Number.isFinite(Number(serverTotal));

  const authoritativeTotal = isServerAuthoritative
    ? Math.max(0, Number(serverTotal))
    : clientCalculatedTotal;

  const authoritativeSubtotal =
    serverSubtotal !== null &&
    serverSubtotal !== undefined &&
    Number.isFinite(Number(serverSubtotal))
      ? Math.max(0, Number(serverSubtotal))
      : calculatedSubtotal;

  const discrepancyAmount =
    Math.round(Math.abs(authoritativeTotal - clientCalculatedTotal) * 100) /
    100;

  const hasDiscrepancy = isServerAuthoritative && discrepancyAmount > 0.009;

  return {
    subtotal: authoritativeSubtotal,
    deliveryFee: fee,
    tax: taxAmount,
    discount: discountAmount,
    total: authoritativeTotal,
    itemCount: totalItemCount,
    uniqueItemCount: safeItems.length,
    lineItems,
    isServerAuthoritative,
    hasDiscrepancy,
    discrepancyAmount,
  };
}

/**
 * Reconciles client-side cart totals with authoritative backend response (CART-04).
 * If the server reports updated prices or stock corrections, server totals prevail.
 *
 * @param {object} clientTotals - Client calculated totals from calculateCartTotals.
 * @param {object} serverResponse - Response payload from POST /cart/validate or POST /orders.
 * @returns {{
 *   authoritativeTotal: number,
 *   authoritativeSubtotal: number,
 *   hasDiscrepancy: boolean,
 *   discrepancy: number,
 *   serverNotice: string|null
 * }}
 */
export function reconcileWithServerTotals(clientTotals, serverResponse = {}) {
  const clientTotal = Number(clientTotals?.total) || 0;
  const clientSubtotal = Number(clientTotals?.subtotal) || 0;

  const serverTotal =
    serverResponse?.total ?? serverResponse?.data?.total ?? null;
  const serverSubtotal =
    serverResponse?.subtotal ?? serverResponse?.data?.subtotal ?? null;

  const authoritativeTotal =
    serverTotal !== null && Number.isFinite(Number(serverTotal))
      ? Number(serverTotal)
      : clientTotal;

  const authoritativeSubtotal =
    serverSubtotal !== null && Number.isFinite(Number(serverSubtotal))
      ? Number(serverSubtotal)
      : clientSubtotal;

  const discrepancy =
    Math.round(Math.abs(authoritativeTotal - clientTotal) * 100) / 100;
  const hasDiscrepancy = discrepancy > 0.009;

  let serverNotice = null;
  if (hasDiscrepancy) {
    serverNotice = `Cart total adjusted by ${discrepancy > 0 ? 'server verification' : 'pricing update'} to match authoritative amount.`;
  }

  return {
    authoritativeTotal,
    authoritativeSubtotal,
    hasDiscrepancy,
    discrepancy,
    serverNotice,
  };
}

/**
 * Groups cart items by seller and calculates each seller's independent subtotal and item count.
 * Conforms to CHK-05 and BR-06 (one order per seller; each order processed independently).
 *
 * @param {Array<object>} items - Cart line items.
 * @returns {Array<{
 *   sellerId: number|string,
 *   sellerName: string,
 *   sellerLocation: string,
 *   subtotal: number,
 *   itemCount: number,
 *   items: Array<object>
 * }>}
 */
export function calculateSellerSubtotals(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  const sellerMap = new Map();

  for (const item of safeItems) {
    if (!item) continue;

    const sellerKey =
      item.seller_id ??
      item.seller_name ??
      item.seller?.business_name ??
      'unknown-seller';

    if (!sellerMap.has(sellerKey)) {
      sellerMap.set(sellerKey, {
        sellerId: item.seller_id,
        sellerName:
          item.seller_name ||
          item.seller?.business_name ||
          'Verified Local Seller',
        sellerLocation:
          item.seller_location || item.seller?.location || 'Nigeria',
        subtotal: 0,
        itemCount: 0,
        items: [],
      });
    }

    const group = sellerMap.get(sellerKey);
    const lineSubtotal = calculateLineSubtotal(item.price, item.quantity);
    const lineQty = Math.max(0, Math.floor(Number(item.quantity) || 0));

    group.subtotal = Math.round((group.subtotal + lineSubtotal) * 100) / 100;
    group.itemCount += lineQty;
    group.items.push({
      ...item,
      subtotal: lineSubtotal,
      quantity: lineQty,
    });
  }

  return Array.from(sellerMap.values());
}
