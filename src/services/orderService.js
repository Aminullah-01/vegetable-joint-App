import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';

/**
 * Order Management & Checkout Service
 * Conforms to SRS 4.4, CHK-01 to CHK-10, ORD-01 to ORD-07, and NFR-MAIN-02 (Mock/API Switch).
 */
export const orderService = {
  /**
   * Create new order(s) from cart checkout payload.
   * Endpoint: POST /orders
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
    return response.data;
  },

  /**
   * List orders scoped by the authenticated user's role (Buyer, Seller, or Admin).
   * Endpoint: GET /orders
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getOrders(params = {}) {
    if (isMockMode()) {
      return mockStore.getOrders(params);
    }

    const response = await apiClient.get('/orders', { params });
    return {
      data: response.data || [],
      meta: response.meta,
      links: response.links,
    };
  },

  /**
   * Get complete order details including line items and status transition history.
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
    return response.data;
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
    const list = response.data || [];
    return list.filter(
      (o) =>
        o.checkout_ref === ref ||
        o.order_number === ref ||
        String(o.id) === String(ref)
    );
  },

  /**
   * Transition order status per the allowed lifecycle (Seller or Admin).
   * Endpoint: PATCH /orders/{id}/status
   *
   * @param {string|number} id
   * @param {string} status - New target status.
   * @param {string} [note] - Optional transition note.
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
    return response.data;
  },

  /**
   * Cancel an order with a reason and restore product inventory (ORD-03).
   * Allowed for Buyer (if status is Pending), Seller, or Admin.
   * Endpoint: POST /orders/{id}/cancel
   *
   * @param {string|number} id
   * @param {string} reason - Cancellation reason.
   * @returns {Promise<Object>}
   */
  async cancelOrder(id, reason) {
    if (isMockMode()) {
      return mockStore.cancelOrder(id, reason);
    }

    const response = await apiClient.post(`/orders/${id}/cancel`, { reason });
    return response.data;
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
    return response.data;
  },
};

export default orderService;
