import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';

/**
 * Administrator Operations & Governance Service
 * Conforms to SRS 4.4, ADM-01 through ADM-13, and NFR-MAIN-02 (Mock/API Switch).
 */
export const adminService = {
  /**
   * List platform users with role and status filters (ADM-02).
   * Endpoint: GET /admin/users
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getUsers(params = {}) {
    if (isMockMode()) {
      return mockStore.getUsers(params);
    }

    const response = await apiClient.get('/admin/users', { params });
    return {
      data: response.data || [],
      meta: response.meta,
      links: response.links,
    };
  },

  /**
   * Activate or suspend a user account (AUTH-12).
   * Endpoint: PATCH /admin/users/{id}/status
   *
   * @param {string|number} id
   * @param {'active'|'suspended'} status
   * @returns {Promise<Object>}
   */
  async updateUserStatus(id, status) {
    if (isMockMode()) {
      return mockStore.updateUserStatus(id, status);
    }

    const response = await apiClient.patch(`/admin/users/${id}/status`, {
      status,
    });
    return response.data;
  },

  /**
   * List sellers for moderation (ADM-03).
   * Endpoint: GET /admin/sellers
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getSellers(params = {}) {
    if (isMockMode()) {
      return mockStore.getAdminSellers(params);
    }

    const response = await apiClient.get('/admin/sellers', { params });
    return {
      data: response.data || [],
      meta: response.meta,
      links: response.links,
    };
  },

  /**
   * Moderate a seller application: approve, reject, or suspend (ADM-03).
   * Endpoint: PATCH /admin/sellers/{id}/status
   *
   * @param {string|number} id
   * @param {'approved'|'rejected'|'suspended'} approvalStatus
   * @param {string} [rejectionReason]
   * @returns {Promise<Object>}
   */
  async updateSellerStatus(id, approvalStatus, rejectionReason = '') {
    if (isMockMode()) {
      return mockStore.updateSellerStatus(id, approvalStatus, rejectionReason);
    }

    const response = await apiClient.patch(`/admin/sellers/${id}/status`, {
      approval_status: approvalStatus,
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  /**
   * List products for moderation across all sellers (ADM-04).
   * Endpoint: GET /admin/products
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getProducts(params = {}) {
    if (isMockMode()) {
      return mockStore.getAdminProducts(params);
    }

    const response = await apiClient.get('/admin/products', { params });
    return {
      data: response.data || [],
      meta: response.meta,
      links: response.links,
    };
  },

  /**
   * Unpublish a violating product listing (ADM-04).
   * Endpoint: PATCH /admin/products/{id}/unpublish
   *
   * @param {string|number} id
   * @param {string} [reason]
   * @returns {Promise<Object>}
   */
  async unpublishProduct(id, reason = '') {
    if (isMockMode()) {
      return mockStore.unpublishAdminProduct(id, reason);
    }

    const response = await apiClient.patch(`/admin/products/${id}/unpublish`, {
      reason,
    });
    return response.data;
  },

  /**
   * Re-publish a moderated product listing (ADM-04).
   * Endpoint: PATCH /admin/products/{id}/publish
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async publishProduct(id) {
    if (isMockMode()) {
      return mockStore.publishAdminProduct(id);
    }

    const response = await apiClient.patch(`/admin/products/${id}/publish`);
    return response.data;
  },

  /**
   * Remove / soft-delete a violating product listing (ADM-04, BR-10).
   * Endpoint: DELETE /admin/products/{id}
   *
   * @param {string|number} id
   * @param {string} [reason]
   * @returns {Promise<Object>}
   */
  async removeProduct(id, reason = '') {
    if (isMockMode()) {
      return mockStore.removeAdminProduct(id, reason);
    }

    const response = await apiClient.delete(`/admin/products/${id}`, {
      data: { reason },
    });
    return response.data;
  },

  /**
   * List all categories for administration (ADM-05).
   * Endpoint: GET /categories
   *
   * @param {Object} [params={}]
   * @returns {Promise<Array>}
   */
  async getCategories(params = {}) {
    if (isMockMode()) {
      return mockStore.getCategories({ all: true, ...params });
    }

    const response = await apiClient.get('/categories', {
      params: { all: true, ...params },
    });
    return response.data || [];
  },

  /**
   * Create a new category (ADM-05).
   * Endpoint: POST /categories
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createCategory(data) {
    if (isMockMode()) {
      return mockStore.createCategory(data);
    }

    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  /**
   * Update category name, slug, description, or status (ADM-05).
   * Endpoint: PUT /categories/{id}
   *
   * @param {string|number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateCategory(id, data) {
    if (isMockMode()) {
      return mockStore.updateCategory(id, data);
    }

    const response = await apiClient.put(`/categories/${id}`, data);
    return response.data;
  },

  /**
   * Delete category (only allowed if unused per ADM-05 and BR-09).
   * Endpoint: DELETE /categories/{id}
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async deleteCategory(id) {
    if (isMockMode()) {
      return mockStore.deleteCategory(id);
    }

    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  },

  /**
   * Deactivate category (ADM-05, BR-09).
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async deactivateCategory(id) {
    return this.updateCategory(id, { is_active: false });
  },

  /**
   * Reactivate category (ADM-05).
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async reactivateCategory(id) {
    return this.updateCategory(id, { is_active: true });
  },

  /**
   * List all marketplace orders for monitoring (ADM-06).
   * Endpoint: GET /admin/orders
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getOrders(params = {}) {
    if (isMockMode()) {
      return mockStore.getAdminOrders(params);
    }

    const response = await apiClient.get('/admin/orders', { params });
    return {
      data: response.data || [],
      meta: response.meta,
      links: response.links,
    };
  },

  /**
   * Get complete order details for administration (ADM-06).
   * Endpoint: GET /admin/orders/{id}
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async getOrderById(id) {
    if (isMockMode()) {
      return mockStore.getAdminOrderById(id);
    }

    const response = await apiClient.get(`/admin/orders/${id}`);
    return response.data;
  },

  /**
   * Retrieve platform configuration settings (ADM-06).
   * Endpoint: GET /admin/settings
   *
   * @returns {Promise<Record<string, any>>}
   */
  async getSettings() {
    if (isMockMode()) {
      return mockStore.getSettings();
    }

    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  /**
   * Update platform configuration settings.
   * Endpoint: PUT /admin/settings
   *
   * @param {Record<string, any>} settings
   * @returns {Promise<Record<string, any>>}
   */
  async updateSettings(settings) {
    if (isMockMode()) {
      return mockStore.updateSettings(settings);
    }

    const response = await apiClient.put('/admin/settings', settings);
    return response.data;
  },

  /**
   * Retrieve system audit logs with filters (ADM-07, NFR-OBS-01).
   * Endpoint: GET /admin/audit-logs
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getAuditLogs(params = {}) {
    if (isMockMode()) {
      return mockStore.getAuditLogs(params);
    }

    const response = await apiClient.get('/admin/audit-logs', { params });
    return {
      data: response.data || [],
      meta: response.meta,
      links: response.links,
    };
  },

  /**
   * Retrieve administrator high-level overview metrics, counts, and sales value (ADM-01, ADM-10).
   * Endpoint: GET /admin/stats
   *
   * @returns {Promise<{
   *   total_users: number,
   *   total_sellers: number,
   *   pending_seller_approvals: number,
   *   active_products: number,
   *   total_products: number,
   *   total_orders: number,
   *   total_sales_value: number,
   *   platform_gmv: number
   * }>}
   */
  async getStats() {
    if (isMockMode()) {
      return mockStore.getAdminStats();
    }

    const response = await apiClient.get('/admin/stats');
    return response.data;
  },
};

export default adminService;
