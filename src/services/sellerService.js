import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';
import { productService } from './productService.js';
import { orderService } from './orderService.js';

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
 * Seller Management & Portal Service
 * Conforms to SRS Section 4.4, SEL-01 through SEL-14, and NFR-MAIN-02 (Mock/API Switch).
 */
export const sellerService = {
  /**
   * List approved sellers publicly for buyers to browse.
   * Endpoint: GET /sellers
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object|null, links: Object|null }>}
   */
  async getPublicSellers(params = {}) {
    if (isMockMode()) {
      return mockStore.getPublicSellers(params);
    }

    const response = await apiClient.get('/sellers', { params });
    return normalizeCollection(response);
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
    return normalizeItem(response);
  },

  /**
   * Get authenticated seller's inventory including out-of-stock items (SEL-07).
   * Endpoint: GET /seller/products
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object|null, links: Object|null }>}
   */
  async getSellerProducts(params = {}) {
    if (isMockMode()) {
      return mockStore.getSellerProducts(params);
    }

    const response = await apiClient.get('/seller/products', { params });
    return normalizeCollection(response);
  },

  /**
   * Soft-delete a product (SEL-04, BR-10).
   * Endpoint: DELETE /products/{id}
   *
   * @param {string|number} id - Product ID.
   * @returns {Promise<{ message: string, success?: boolean }>}
   */
  async deleteProduct(id) {
    return productService.deleteProduct(id);
  },

  /**
   * Create a new vegetable listing (SEL-02).
   * Supports JSON or FormData multipart payload.
   * Endpoint: POST /products
   *
   * @param {FormData|Object} productData
   * @returns {Promise<Object>}
   */
  async createProduct(productData) {
    return productService.createProduct(productData);
  },

  /**
   * Get product by ID for editing or inspection.
   * Endpoint: GET /products/{id}
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async getProductById(id) {
    return productService.getProductById(id);
  },

  /**
   * Update an existing product listing (SEL-03).
   * Supports JSON or FormData multipart payload.
   * Endpoint: PUT /products/{id}
   *
   * @param {string|number} id
   * @param {FormData|Object} productData
   * @returns {Promise<Object>}
   */
  async updateProduct(id, productData) {
    return productService.updateProduct(id, productData);
  },

  /**
   * Upload a product image file with progress callback (SEL-05, IF-01).
   * Allowed types: JPEG, PNG, WebP. Max size: 2 MB.
   * Endpoint: POST /seller/products/upload-image
   *
   * @param {File|Blob} file - Image file (JPEG, PNG, WebP, ≤ 2 MB)
   * @param {Function} [onProgress] - Progress callback ({ loaded, total, percent })
   * @returns {Promise<{ url: string, filename: string, size: number, type: string }>}
   */
  async uploadProductImage(file, onProgress) {
    return productService.uploadProductImage(file, onProgress);
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
    return productService.updateProductStock(id, stockData);
  },

  /**
   * Get seller dashboard metrics (active listings, pending orders, revenue, low-stock items).
   * Endpoint: GET /seller/dashboard
   *
   * @param {Object} [params={}]
   * @returns {Promise<{
   *   seller_id: number,
   *   seller_name: string,
   *   active_listings_count: number,
   *   total_products_count: number,
   *   pending_orders_count: number,
   *   completed_orders_count: number,
   *   total_revenue: number,
   *   total_products_sold: number,
   *   low_stock_count: number,
   *   low_stock_threshold: number,
   *   pending_orders: Array,
   *   recent_orders: Array,
   *   low_stock_products: Array,
   *   latest_sales: Array
   * }>}
   */
  async getSellerDashboard(params = {}) {
    if (isMockMode()) {
      return mockStore.getSellerDashboard(params?.seller_id);
    }

    const response = await apiClient.get('/seller/dashboard', { params });
    return normalizeItem(response);
  },

  /**
   * Get orders placed with this seller (SEL-10, SEL-14).
   * Endpoint: GET /seller/orders
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object|null, links: Object|null }>}
   */
  async getSellerOrders(params = {}) {
    if (isMockMode()) {
      return mockStore.getOrders(params);
    }

    const response = await apiClient.get('/seller/orders', { params });
    return normalizeCollection(response);
  },

  /**
   * Get authenticated seller's order by ID (SEL-10, SEL-14).
   * Endpoint: GET /seller/orders/{id}
   *
   * @param {string|number} id
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  async getSellerOrderById(id, params = {}) {
    if (isMockMode()) {
      return mockStore.getSellerOrderById(id, params);
    }

    const response = await apiClient.get(`/seller/orders/${id}`, { params });
    return normalizeItem(response);
  },

  /**
   * Advance order status per permitted lifecycle (SEL-11, ORD-05).
   * Endpoint: PATCH /orders/{id}/status
   *
   * @param {string|number} id
   * @param {string} status
   * @param {string} [note]
   * @returns {Promise<Object>}
   */
  async updateOrderStatus(id, status, note = '') {
    return orderService.updateOrderStatus(id, status, note);
  },

  /**
   * Cancel an order with a mandatory reason (ORD-07).
   * Endpoint: POST /orders/{id}/cancel
   *
   * @param {string|number} id
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  async cancelOrder(id, reason) {
    return orderService.cancelOrder(id, reason);
  },

  /**
   * Get seller sales performance metrics for a selectable period (SEL-12, BR-12, SEL-14).
   * Endpoint: GET /seller/sales
   *
   * @param {Object} [params={}] - Query parameters (period, date_from, date_to, seller_id).
   * @returns {Promise<{
   *   seller_id: number,
   *   seller_name: string,
   *   period: string,
   *   date_from: string|null,
   *   date_to: string|null,
   *   total_sales: number,
   *   completed_orders_count: number,
   *   total_orders_count: number,
   *   order_count: number,
   *   total_products_sold: number,
   *   average_order_value: number,
   *   products_sold: Array<{ product_id: number, product_name: string, unit: string, quantity_sold: number, total_revenue: number, order_count: number }>,
   *   recent_orders: Array
   * }>}
   */
  async getSellerSales(params = {}) {
    if (isMockMode()) {
      return mockStore.getSellerSales(params);
    }

    const response = await apiClient.get('/seller/sales', { params });
    return normalizeItem(response);
  },

  /**
   * Get authenticated seller's profile details (SEL-01, AUTH-11).
   * Endpoint: GET /seller/profile or GET /profile
   *
   * @returns {Promise<Object>}
   */
  async getSellerProfile() {
    if (isMockMode()) {
      return mockStore.getCurrentProfile();
    }

    const response = await apiClient.get('/seller/profile');
    return normalizeItem(response);
  },

  /**
   * Update seller profile details (business_name, location, description, phone, name) (FE-094, AUTH-11).
   * Endpoint: PUT /seller/profile or PUT /profile
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateSellerProfile(data) {
    if (isMockMode()) {
      return mockStore.updateProfile(data);
    }

    const response = await apiClient.put('/seller/profile', data);
    return normalizeItem(response);
  },
};

export default sellerService;
