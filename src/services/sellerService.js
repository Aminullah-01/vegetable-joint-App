import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';

/**
 * Seller Management & Portal Service
 * Conforms to SRS 4.4, SEL-01 through SEL-14, and NFR-MAIN-02 (Mock/API Switch).
 */
export const sellerService = {
  /**
   * List approved sellers publicly for buyers to browse.
   * Endpoint: GET /sellers
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getPublicSellers(params = {}) {
    if (isMockMode()) {
      return mockStore.getPublicSellers(params);
    }

    const response = await apiClient.get('/sellers', { params });
    return {
      data: response.data || [],
      meta: response.meta,
      links: response.links,
    };
  },

  /**
   * Get public profile and listed products of a verified seller.
   * Endpoint: GET /sellers/{id}
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async getPublicSellerById(id) {
    if (isMockMode()) {
      return mockStore.getPublicSellerById(id);
    }

    const response = await apiClient.get(`/sellers/${id}`);
    return response.data;
  },

  /**
   * Get authenticated seller's inventory including out-of-stock items (SEL-07).
   * Endpoint: GET /seller/products
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getSellerProducts(params = {}) {
    if (isMockMode()) {
      const sellerId = mockStore.sellers[0]?.id || 1;
      return mockStore.getProducts({ ...params, seller: sellerId });
    }

    const response = await apiClient.get('/seller/products', { params });
    return {
      data: response.data || [],
      meta: response.meta,
      links: response.links,
    };
  },

  /**
   * Quick update for inventory stock quantity and availability (SEL-07, SEL-08).
   * Endpoint: PATCH /products/{id}/stock
   *
   * @param {string|number} id - Product ID.
   * @param {Object} stockData
   * @returns {Promise<Object>}
   */
  async updateProductStock(id, stockData) {
    if (isMockMode()) {
      return mockStore.updateProduct(id, stockData);
    }

    const response = await apiClient.patch(`/products/${id}/stock`, stockData);
    return response.data;
  },

  /**
   * Get seller dashboard metrics (active listings, pending orders, revenue).
   * Endpoint: GET /seller/dashboard
   *
   * @returns {Promise<{
   *   active_listings_count: number,
   *   pending_orders_count: number,
   *   completed_orders_count: number,
   *   total_revenue: number,
   *   recent_orders: Array
   * }>}
   */
  async getSellerDashboard() {
    if (isMockMode()) {
      return mockStore.getSellerDashboard();
    }

    const response = await apiClient.get('/seller/dashboard');
    return response.data;
  },
};

export default sellerService;
