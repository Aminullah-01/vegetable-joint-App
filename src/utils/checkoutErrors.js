import { STRINGS } from '../constants/strings.js';
import { formatCurrency } from './formatters.js';

/**
 * Normalizes and extracts structured error details from an order placement failure.
 * Conforms to:
 * - FE-074: Handle 409/422 (insufficient stock, price change) with clear per-item messages.
 * - SRS CHK-04: Validate all checkout fields and stock server-side; reject with specific message if unavailable or under-stocked.
 * - SRS ERR-01: Plain-language messages for expected errors ("This product is currently unavailable.", "Product not found.", etc.)
 * - SRS ERR-02: Hide technical database / stack trace details from buyers.
 * - SRS IF-02, IF-03: Consistent error envelope with 409 Conflict and 422 Unprocessable Entity codes.
 * - SRS TC-17, TC-18, UC-02 4a.
 *
 * @param {Error|Object} err - Error object thrown by orderService or API client.
 * @param {Array} [cartItems=[]] - Items currently in buyer's cart for reference matching.
 * @returns {{
 *   status: number,
 *   is409: boolean,
 *   is422: boolean,
 *   message: string,
 *   title: string,
 *   itemErrors: Array<{
 *     productId: string|number,
 *     name: string,
 *     type: 'insufficient_stock'|'out_of_stock'|'price_changed'|'unavailable'|'item_error',
 *     badgeText: string,
 *     message: string,
 *     oldQuantity?: number,
 *     newQuantity?: number,
 *     availableStock?: number,
 *     requestedQuantity?: number,
 *     oldPrice?: number,
 *     newPrice?: number
 *   }>,
 *   fieldErrors: Record<string, string[]>,
 *   changes: Array<Object>
 * }}
 */
export function parseCheckoutError(err, cartItems = []) {
  if (!err) {
    return {
      status: 0,
      is409: false,
      is422: false,
      message: 'An unknown error occurred while placing your order.',
      title: 'Order Placement Error',
      itemErrors: [],
      fieldErrors: {},
      changes: [],
    };
  }

  const status =
    Number(err.status ?? err.statusCode ?? err.response?.status) || 0;
  const is409 = status === 409;
  const is422 = status === 422;

  // Sanitize message to never expose technical traces (ERR-02)
  let rawMessage = err.data?.message || err.message || '';

  const isTechnicalError =
    /sql|pdo|database|foreign key|syntax error|stack trace|at line|exception/i.test(
      rawMessage
    );

  if (isTechnicalError || !rawMessage) {
    rawMessage =
      STRINGS.ERRORS.SERVER_ERROR_500_MESSAGE ||
      'Something unexpected happened while communicating with the service. Please try again shortly.';
  }

  // Derive contextual title
  let title = 'Order Placement Error';
  if (is409) {
    title = 'Stock Conflict — Order Cannot Be Placed';
  } else if (is422) {
    title = 'Order Validation Issue';
  }

  const itemErrors = [];
  const fieldErrors = {};
  const changes = [];

  const addedProductIds = new Set();

  function addItemError(itemErr) {
    const key = String(itemErr.productId || itemErr.name);
    if (!addedProductIds.has(key)) {
      addedProductIds.add(key);
      itemErrors.push(itemErr);
    }
  }

  // Helper to resolve product name from ID if missing
  function resolveName(productId, fallbackName) {
    if (fallbackName && fallbackName !== 'Product') return fallbackName;
    const found = cartItems.find(
      (it) => String(it.product_id ?? it.id) === String(productId)
    );
    return found?.name || fallbackName || 'Product';
  }

  // 1. Process err.data.changes (e.g. from server stock/price validator)
  if (Array.isArray(err.data?.changes) && err.data.changes.length > 0) {
    for (const change of err.data.changes) {
      changes.push(change);
      const productId = change.product_id ?? change.id;
      const name = resolveName(productId, change.name);

      let badgeText = 'Issue';
      let msg = change.message;

      if (change.type === 'stock_reduced') {
        badgeText = 'Insufficient Stock';
        if (!msg) {
          msg = `Available stock for "${name}" is now ${change.new_quantity} (requested ${change.old_quantity}).`;
        }
      } else if (change.type === 'price_changed') {
        badgeText = 'Price Changed';
        if (!msg) {
          msg = `Price for "${name}" changed from ${formatCurrency(change.old_price)} to ${formatCurrency(change.new_price)}.`;
        }
      } else if (
        change.type === 'unavailable' ||
        change.type === 'seller_suspended'
      ) {
        badgeText = 'Unavailable';
        if (!msg) {
          msg = `"${name}" is currently unavailable or out of stock.`;
        }
      }

      addItemError({
        productId,
        name,
        type: change.type || (is409 ? 'insufficient_stock' : 'price_changed'),
        badgeText,
        message: msg,
        oldQuantity: change.old_quantity,
        newQuantity: change.new_quantity,
        availableStock: change.new_quantity,
        requestedQuantity: change.old_quantity,
        oldPrice: change.old_price,
        newPrice: change.new_price,
      });
    }
  }

  // 2. Process err.data.failed_items, err.data.items, or err.items
  const directItems =
    Array.isArray(err.data?.failed_items) && err.data.failed_items.length > 0
      ? err.data.failed_items
      : Array.isArray(err.data?.items) && err.data.items.length > 0
        ? err.data.items
        : Array.isArray(err.items) && err.items.length > 0
          ? err.items
          : null;

  if (directItems) {
    for (const item of directItems) {
      const productId = item.product_id ?? item.id;
      const name = resolveName(productId, item.name);
      const type =
        item.type || (is409 ? 'insufficient_stock' : 'price_changed');

      let badgeText = 'Item Issue';
      if (type === 'insufficient_stock') badgeText = 'Insufficient Stock';
      else if (type === 'out_of_stock') badgeText = 'Out of Stock';
      else if (type === 'price_changed') badgeText = 'Price Changed';
      else if (type === 'unavailable') badgeText = 'Unavailable';

      let msg = item.message;
      if (!msg) {
        if (type === 'insufficient_stock') {
          msg = `Only ${item.available_stock ?? item.availableStock ?? 0} remaining in stock (requested ${item.requested_quantity ?? item.requestedQuantity}).`;
        } else if (type === 'out_of_stock') {
          msg = `"${name}" is currently out of stock.`;
        } else if (type === 'price_changed') {
          msg = `Price changed from ${formatCurrency(item.old_price ?? item.oldPrice)} to ${formatCurrency(item.new_price ?? item.newPrice)}.`;
        } else {
          msg = `"${name}" is currently unavailable.`;
        }
      }

      addItemError({
        productId,
        product_id: productId,
        name,
        type,
        badgeText,
        message: msg,
        requestedQuantity: item.requested_quantity ?? item.requestedQuantity,
        availableStock: item.available_stock ?? item.availableStock,
        oldPrice: item.old_price ?? item.oldPrice,
        newPrice: item.new_price ?? item.newPrice,
      });
    }
  }

  // 3. Process err.errors (Laravel error envelope)
  const rawErrors = err.errors || err.data?.errors;
  if (rawErrors && typeof rawErrors === 'object') {
    Object.entries(rawErrors).forEach(([key, val]) => {
      const msgs = Array.isArray(val) ? val : [val];
      const combinedMsg = msgs.join(' ');

      // Check for item patterns: "items.0.quantity", "items.0.price", "items.0", "items[0]"
      const itemMatch = key.match(
        /^items?[.[_](\d+)(?:[.]?(quantity|price|stock|product_id))?/i
      );
      if (itemMatch) {
        const index = parseInt(itemMatch[1], 10);
        const cartItem = cartItems[index];
        const productId = cartItem?.product_id ?? cartItem?.id ?? index;
        const name = cartItem?.name || `Item #${index + 1}`;
        const subField = itemMatch[2]?.toLowerCase();

        let type = is409 ? 'insufficient_stock' : 'item_error';
        let badgeText = 'Issue';

        if (subField === 'price' || (is422 && /price/i.test(combinedMsg))) {
          type = 'price_changed';
          badgeText = 'Price Changed';
        } else if (subField === 'quantity' || subField === 'stock' || is409) {
          type = /out of stock/i.test(combinedMsg)
            ? 'out_of_stock'
            : 'insufficient_stock';
          badgeText =
            type === 'out_of_stock' ? 'Out of Stock' : 'Insufficient Stock';
        }

        addItemError({
          productId,
          name,
          type,
          badgeText,
          message: combinedMsg,
        });
      } else if (key === 'items' && Array.isArray(val)) {
        // "items": ["Item 1 out of stock", "Item 2 price changed"]
        val.forEach((m, idx) => {
          const cartItem = cartItems[idx];
          const productId = cartItem?.product_id ?? cartItem?.id ?? idx;
          const name = cartItem?.name || `Item #${idx + 1}`;
          const isPrice = /price/i.test(m);
          addItemError({
            productId,
            name,
            type: isPrice
              ? 'price_changed'
              : is409
                ? 'insufficient_stock'
                : 'item_error',
            badgeText: isPrice ? 'Price Changed' : 'Insufficient Stock',
            message: typeof m === 'string' ? m : String(m),
          });
        });
      } else {
        // Check if key is a product ID or product name
        const matchByProductId = cartItems.find(
          (it) => String(it.product_id ?? it.id) === key
        );
        if (matchByProductId) {
          const isPrice = /price/i.test(combinedMsg);
          addItemError({
            productId: matchByProductId.product_id ?? matchByProductId.id,
            name: matchByProductId.name,
            type: isPrice
              ? 'price_changed'
              : is409
                ? 'insufficient_stock'
                : 'item_error',
            badgeText: isPrice
              ? 'Price Changed'
              : is409
                ? 'Insufficient Stock'
                : 'Issue',
            message: combinedMsg,
          });
        } else {
          // Standard form field error (e.g. delivery_name, delivery_phone, delivery_address)
          fieldErrors[key] = msgs;
        }
      }
    });
  }

  // 4. Fallback: If no structured per-item errors were found, inspect rawMessage for cart items
  if (itemErrors.length === 0 && cartItems.length > 0) {
    for (const it of cartItems) {
      if (rawMessage.toLowerCase().includes(it.name.toLowerCase())) {
        const isPrice = /price/i.test(rawMessage);
        const isOutOfStock = /out of stock/i.test(rawMessage);
        const isInsufficient = /insufficient|stock|under-stocked/i.test(
          rawMessage
        );

        const type = isPrice
          ? 'price_changed'
          : isOutOfStock
            ? 'out_of_stock'
            : isInsufficient || is409
              ? 'insufficient_stock'
              : 'item_error';

        const badgeText = isPrice
          ? 'Price Changed'
          : isOutOfStock
            ? 'Out of Stock'
            : 'Insufficient Stock';

        addItemError({
          productId: it.product_id ?? it.id,
          name: it.name,
          type,
          badgeText,
          message: rawMessage,
        });
        break;
      }
    }
  }

  // If status is 409 and still no per-item error, identify as stock issue
  if (is409 && itemErrors.length === 0 && cartItems.length > 0) {
    rawMessage =
      rawMessage ||
      'One or more items in your cart have insufficient stock or are unavailable.';
  }

  return {
    status,
    is409,
    is422,
    message: rawMessage,
    title,
    itemErrors,
    fieldErrors,
    changes,
  };
}

export default parseCheckoutError;
