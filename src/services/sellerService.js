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
      return mockStore.getSellerProducts(params);
    }

    const response = await apiClient.get('/seller/products', { params });
    return {
      data: response.data || [],
      meta: response.meta,
      links: response.links,
    };
  },

  /**
   * Soft-delete a product (SEL-04, BR-10).
   * Endpoint: DELETE /seller/products/{id} or DELETE /products/{id}
   *
   * @param {string|number} id - Product ID.
   * @returns {Promise<{ message: string }>}
   */
  async deleteProduct(id) {
    if (isMockMode()) {
      return mockStore.deleteProduct(id);
    }

    const response = await apiClient.delete(`/seller/products/${id}`);
    return response.data;
  },

  /**
   * Create a new vegetable listing (SEL-02).
   * Endpoint: POST /seller/products or POST /products
   *
   * @param {FormData|Object} productData
   * @returns {Promise<Object>}
   */
  async createProduct(productData) {
    if (isMockMode()) {
      return mockStore.createProduct(productData);
    }

    let response;
    if (typeof FormData !== 'undefined' && productData instanceof FormData) {
      response = await apiClient.upload('/seller/products', productData);
    } else {
      response = await apiClient.post('/seller/products', productData);
    }
    return response.data;
  },

  /**
   * Get product by ID for editing or inspection.
   * Endpoint: GET /products/{id}
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async getProductById(id) {
    if (isMockMode()) {
      return mockStore.getProductById(id);
    }

    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  /**
   * Update an existing product listing (SEL-03).
   * Endpoint: PUT /seller/products/{id} or PUT /products/{id}
   *
   * @param {string|number} id
   * @param {FormData|Object} productData
   * @returns {Promise<Object>}
   */
  async updateProduct(id, productData) {
    if (isMockMode()) {
      return mockStore.updateProduct(id, productData);
    }

    let response;
    if (typeof FormData !== 'undefined' && productData instanceof FormData) {
      response = await apiClient.upload(`/seller/products/${id}`, productData, {
        method: 'PUT',
      });
    } else {
      response = await apiClient.put(`/seller/products/${id}`, productData);
    }
    return response.data;
  },

  /**
   * Upload a product image file with progress callback (SEL-05).
   * Endpoint: POST /seller/products/upload-image or mockStore simulation
   *
   * @param {File|Blob} file - Image file (JPEG, PNG, WebP, ≤ 2 MB)
   * @param {Function} [onProgress] - Progress callback ({ loaded, total, percent })
   * @returns {Promise<{ url: string, filename: string, size: number, type: string }>}
   */
  async uploadProductImage(file, onProgress) {
    if (isMockMode()) {
      return mockStore.uploadImage(file, onProgress);
    }

    const formData = new FormData();
    formData.append('image', file);
    return apiClient.uploadWithProgress(
      '/seller/products/upload-image',
      formData,
      {
        onProgress,
      }
    );
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
    return response.data;
  },

  /**
   * Get orders placed with this seller (SEL-10, SEL-14).
   * Endpoint: GET /seller/orders
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getSellerOrders(params = {}) {
    if (isMockMode()) {
      return mockStore.getOrders(params);
    }

    const response = await apiClient.get('/seller/orders', { params });
    return {
      data: response.data || [],
      meta: response.meta,
      links: response.links,
    };
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
    return response.data;
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
   * Cancel an order with a mandatory reason (ORD-07).
   * Endpoint: POST /orders/{id}/cancel
   *
   * @param {string|number} id
   * @param {string} reason
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
    return response.data;
  },
};

export default sellerService;
