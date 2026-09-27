import { apiClient } from './apiClient.js';

/**
 * Seller Management & Portal Service
 * Conforms to SRS 4.4, SEL-01 through SEL-14, and BR-08, BR-11, BR-12.
 */
export const sellerService = {
  /**
   * List approved sellers publicly for buyers to browse.
   * Endpoint: GET /sellers
   *
   * @param {Object} [params={}]
   * @param {string} [params.location] - Filter by state/location.
   * @param {string} [params.search] - Search by business name.
   * @param {number} [params.page=1]
   * @param {number} [params.per_page=20]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getPublicSellers(params = {}) {
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
    const response = await apiClient.get(`/sellers/${id}`);
    return response.data;
  },

  /**
   * Get authenticated seller's inventory including out-of-stock items (SEL-07).
   * Endpoint: GET /seller/products
   *
   * @param {Object} [params={}]
   * @param {'in_stock'|'low_stock'|'out_of_stock'} [params.availability]
   * @param {string} [params.search]
   * @param {number} [params.page=1]
   * @param {number} [params.per_page=20]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getSellerProducts(params = {}) {
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
   * @param {number} stockData.quantity - Updated stock count.
   * @param {'in_stock'|'low_stock'|'out_of_stock'} [stockData.availability]
   * @param {number} [stockData.low_stock_threshold]
   * @returns {Promise<Object>}
   */
  async updateProductStock(id, stockData) {
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
    const response = await apiClient.get('/seller/dashboard');
    return response.data;
  },
};

export default sellerService;
