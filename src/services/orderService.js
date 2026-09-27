import { apiClient } from './apiClient.js';

/**
 * Order Management & Checkout Service
 * Conforms to SRS 4.4, CHK-01 to CHK-10, ORD-01 to ORD-07, and SEL-10 to SEL-11.
 */
export const orderService = {
  /**
   * Create new order(s) from cart checkout payload.
   * Endpoint: POST /orders
   *
   * @param {Object} payload
   * @param {Array<{ product_id: number, quantity: number, price: number }>} payload.items
   * @param {string} payload.delivery_name - Contact name for delivery.
   * @param {string} payload.delivery_phone - Contact phone number.
   * @param {string} payload.delivery_address - Street address.
   * @param {string} [payload.notes] - Special delivery instructions.
   * @param {string} [payload.payment_method='cash_on_delivery']
   * @returns {Promise<{ checkout_ref: string, orders: Array }>}
   */
  async createOrder(payload) {
    const response = await apiClient.post('/orders', payload);
    return response.data;
  },

  /**
   * List orders scoped by the authenticated user's role (Buyer, Seller, or Admin).
   * Endpoint: GET /orders
   *
   * @param {Object} [params={}]
   * @param {'pending'|'confirmed'|'processing'|'ready_for_pickup'|'out_for_delivery'|'completed'|'cancelled'} [params.status]
   * @param {string} [params.search] - Search by order number or checkout reference.
   * @param {number} [params.page=1]
   * @param {number} [params.per_page=20]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getOrders(params = {}) {
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
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },

  /**
   * Transition order status per the allowed lifecycle (Seller or Admin).
   * Valid transitions:
   *   Pending -> Confirmed or Cancelled
   *   Confirmed -> Processing or Cancelled
   *   Processing -> Ready for Pickup / Out for Delivery
   *   Ready / Out -> Completed
   * Endpoint: PATCH /orders/{id}/status
   *
   * @param {string|number} id
   * @param {string} status - New target status.
   * @param {string} [note] - Optional transition note.
   * @returns {Promise<Object>}
   */
  async updateOrderStatus(id, status, note = '') {
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
    const response = await apiClient.post(`/orders/${id}/cancel`, { reason });
    return response.data;
  },
};

export default orderService;
