import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';

/**
 * Normalizes single item response from Laravel API.
 * Supports { data: {...} } envelope and direct object {...}.
 *
 * @param {any} response
 * @returns {any}
 */
function normalizeItem(response) {
  if (!response) return null;
  const data = response.data !== undefined ? response.data : response;
  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'data' in data &&
    data.data &&
    typeof data.data === 'object' &&
    !Array.isArray(data.data)
  ) {
    return data.data;
  }
  return data;
}

/**
 * Normalizes paginated or list collection response from Laravel API.
 * Supports { data: [...], meta: {...}, links: {...} }, raw arrays, and nested envelopes.
 *
 * @param {any} response
 * @returns {{ data: Array, meta: Object|null, links: Object|null }}
 */
function normalizeCollection(response) {
  if (!response) return { data: [], meta: null, links: null };

  const raw = response.raw || response;
  let items = [];

  if (Array.isArray(response.data)) {
    items = response.data;
  } else if (response.data && Array.isArray(response.data.data)) {
    items = response.data.data;
  } else if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && Array.isArray(raw.data)) {
    items = raw.data;
  }

  const meta = response.meta || response.data?.meta || raw?.meta || null;
  const links = response.links || response.data?.links || raw?.links || null;

  return {
    data: items,
    meta,
    links,
  };
}

/**
 * Normalizes order creation response from Laravel API.
 * Supports { checkout_ref: string, orders: Array }, { data: { checkout_ref, orders } },
 * or raw collection of created orders.
 *
 * @param {any} response
 * @param {Object} [payload]
 * @returns {{ checkout_ref: string|null, orders: Array }}
 */
function normalizeCreateOrderResponse(response, payload) {
  if (!response) {
    return { checkout_ref: payload?.checkout_ref || null, orders: [] };
  }

  const data = response.data !== undefined ? response.data : response;
  const raw = response.raw || response;

  let checkout_ref =
    data?.checkout_ref || raw?.checkout_ref || payload?.checkout_ref || null;

  let orders = [];
  if (Array.isArray(data?.orders)) {
    orders = data.orders;
  } else if (Array.isArray(raw?.orders)) {
    orders = raw.orders;
  } else if (Array.isArray(data)) {
    orders = data;
  } else if (data && typeof data === 'object' && data.id) {
    orders = [data];
  } else if (data?.data && Array.isArray(data.data)) {
    orders = data.data;
  }

  if (!checkout_ref && orders.length > 0 && orders[0]?.checkout_ref) {
    checkout_ref = orders[0].checkout_ref;
  }

  return {
    ...(typeof data === 'object' && !Array.isArray(data) ? data : {}),
    checkout_ref,
    orders,
  };
}

/**
 * Order Management & Checkout Service
 * Conforms to SRS Section 4.4, CHK-01 to CHK-10, ORD-01 to ORD-07, SEL-10, SEL-11, ADM-06, ADM-07,
 * and NFR-MAIN-02 (Mock/API Switch).
 */
export const orderService = {
  /**
   * Create new order(s) from cart checkout payload.
   * Endpoint: POST /orders (Buyer)
   * Includes X-Idempotency-Key and X-Checkout-Reference headers when checkout_ref is provided (CHK-05).
   *
   * @param {Object} payload
   * @returns {Promise<{ checkout_ref: string, orders: Array }>}
   */
  async createOrder(payload) {
    if (isMockMode()) {
      return mockStore.createOrder(payload);
    }

    const headers = payload?.checkout_ref
      ? {
          'X-Idempotency-Key': payload.checkout_ref,
          'X-Checkout-Reference': payload.checkout_ref,
        }
      : {};

    const response = await apiClient.post('/orders', payload, { headers });
    return normalizeCreateOrderResponse(response, payload);
  },

  /**
   * List orders scoped by the authenticated user's role:
   * - Buyer: own placed orders (ORD-01).
   * - Seller: orders containing products from seller (SEL-10).
   * - Admin: all marketplace orders (ADM-06).
   * Endpoint: GET /orders
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object|null, links: Object|null }>}
   */
  async getOrders(params = {}) {
    if (isMockMode()) {
      return mockStore.getOrders(params);
    }

    const response = await apiClient.get('/orders', { params });
    return normalizeCollection(response);
  },

  /**
   * Get complete order details including line items, seller, buyer, and status history (ORD-02).
   * Scoped by authenticated role.
   * Endpoint: GET /orders/{id}
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async getOrderById(id) {
    if (isMockMode()) {
      return mockStore.getOrderById(id);
    }

    const response = await apiClient.get(`/orders/${id}`);
    return normalizeItem(response);
  },

  /**
   * Fetch order(s) by checkout reference UUID or order number (CHK-05, CHK-08).
   *
   * @param {string} ref
   * @returns {Promise<Array>}
   */
  async getOrdersByRef(ref) {
    if (isMockMode()) {
      return mockStore.getOrdersByRef(ref);
    }

    const response = await apiClient.get('/orders', {
      params: { search: ref },
    });
    const col = normalizeCollection(response);
    const list = col.data || [];
    return list.filter(
      (o) =>
        o.checkout_ref === ref ||
        o.order_number === ref ||
        String(o.id) === String(ref)
    );
  },

  /**
   * Transition order status per the allowed lifecycle (Seller or Admin, SEL-11, ORD-05).
   * Allowed transitions: pending -> confirmed -> processing -> out_for_delivery -> delivered.
   * Endpoint: PATCH /orders/{id}/status
   *
   * @param {string|number} id
   * @param {string} status - Target status
   * @param {string} [note] - Optional transition note
   * @returns {Promise<Object>}
   */
  async updateOrderStatus(id, status, note = '') {
    if (isMockMode()) {
      return mockStore.updateOrderStatus(id, status, note);
    }

    const response = await apiClient.patch(`/orders/${id}/status`, {
      status,
      note,
    });
    return normalizeItem(response);
  },

  /**
   * Cancel an order with a mandatory reason and restore product inventory (ORD-03, ORD-07).
   * Allowed for Buyer (if status is Pending), Seller, or Admin.
   * Endpoint: POST /orders/{id}/cancel
   *
   * @param {string|number} id
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>}
   */
  async cancelOrder(id, reason) {
    if (isMockMode()) {
      return mockStore.cancelOrder(id, reason);
    }

    const response = await apiClient.post(`/orders/${id}/cancel`, { reason });
    return normalizeItem(response);
  },

  /**
   * Override an order status with a mandatory justification reason (Admin-only, ADM-07).
   * Endpoint: POST /admin/orders/{id}/override-status
   *
   * @param {string|number} id
   * @param {string} status
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  async overrideOrderStatus(id, status, reason) {
    if (!reason || !reason.trim()) {
      throw new Error(
        'A reason is mandatory for administrative order status overrides (ADM-07).'
      );
    }

    if (isMockMode()) {
      return mockStore.overrideOrderStatus(id, status, reason);
    }

    const response = await apiClient.post(
      `/admin/orders/${id}/override-status`,
      {
        status,
        reason,
      }
    );
    return normalizeItem(response);
  },

  /**
   * Validate cart line items against current stock and prices (CART-08).
   * Endpoint: POST /cart/validate
   *
   * @param {Array<{ product_id: number|string, quantity: number, price: number }>} items
   * @returns {Promise<{ is_valid: boolean, items: Array, has_price_changes: boolean, has_stock_issues: boolean }>}
   */
  async validateCart(items = []) {
    if (isMockMode()) {
      return mockStore.validateCart(items);
    }

    const response = await apiClient.post('/cart/validate', { items });
    return normalizeItem(response);
  },
};

export default orderService;
