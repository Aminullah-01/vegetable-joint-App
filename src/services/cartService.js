import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';
import { productService } from './productService.js';

/**
 * Cart Service — Client & Server-side Cart Synchronization (CART-08, CART-10)
 * Conforms to SRS CART-10 (Server-side cart sync across devices) and CART-08 (Cart re-validation).
 */
export const cartService = {
  /**
   * Fetches the server-side cart for the authenticated buyer (CART-10).
   * Endpoint: GET /cart
   *
   * @returns {Promise<{ items: Array, updated_at: string|null }>}
   */
  async fetchCart() {
    if (isMockMode()) {
      const user = mockStore.currentUser;
      return mockStore.getServerCart(user?.id);
    }

    const response = await apiClient.get('/cart');
    return response.data;
  },

  /**
   * Synchronizes and persists cart line items to the server (CART-10).
   * Endpoint: PUT /cart or POST /cart/sync
   *
   * @param {Array} items
   * @returns {Promise<{ items: Array, updated_at: string }>}
   */
  async syncCart(items = []) {
    if (isMockMode()) {
      const user = mockStore.currentUser;
      return mockStore.syncServerCart(user?.id, items);
    }

    const response = await apiClient.put('/cart', { items });
    return response.data;
  },

  /**
   * Re-validates cart lines against current prices, stock, availability, and seller status (CART-08).
   * Endpoint: POST /cart/validate
   *
   * @param {Array} items
   * @returns {Promise<{ is_valid: boolean, items: Array, changes: Array, has_price_changes: boolean, has_stock_issues: boolean, has_unavailable: boolean }>}
   */
  async validateCart(items = []) {
    return productService.validateCart(items);
  },

  /**
   * Clears the server-side cart for the authenticated buyer (CART-10).
   * Endpoint: DELETE /cart
   *
   * @returns {Promise<{ success: boolean }>}
   */
  async clearCart() {
    if (isMockMode()) {
      const user = mockStore.currentUser;
      return mockStore.clearServerCart(user?.id);
    }

    const response = await apiClient.delete('/cart');
    return response.data;
  },
};

export default cartService;
