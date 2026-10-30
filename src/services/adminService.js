import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';
import { categoryService } from './categoryService.js';

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
 * Administrator Operations & Governance Service
 * Conforms to SRS Section 4.4, ADM-01 through ADM-13, and NFR-MAIN-02 (Mock/API Switch).
 */
export const adminService = {
  /**
   * List platform users with role and status filters (ADM-02).
   * Endpoint: GET /admin/users
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object|null, links: Object|null }>}
   */
  async getUsers(params = {}) {
    if (isMockMode()) {
      return mockStore.getUsers(params);
    }

    const response = await apiClient.get('/admin/users', { params });
    return normalizeCollection(response);
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
    return normalizeItem(response);
  },

  /**
   * List sellers for moderation (ADM-03).
   * Endpoint: GET /admin/sellers
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object|null, links: Object|null }>}
   */
  async getSellers(params = {}) {
    if (isMockMode()) {
      return mockStore.getAdminSellers(params);
    }

    const response = await apiClient.get('/admin/sellers', { params });
    return normalizeCollection(response);
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
    return normalizeItem(response);
  },

  /**
   * List products for moderation across all sellers (ADM-04).
   * Endpoint: GET /admin/products
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object|null, links: Object|null }>}
   */
  async getProducts(params = {}) {
    if (isMockMode()) {
      return mockStore.getAdminProducts(params);
    }

    const response = await apiClient.get('/admin/products', { params });
    return normalizeCollection(response);
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
    return normalizeItem(response);
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
    return normalizeItem(response);
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
    return (
      normalizeItem(response) || {
        success: true,
        message: 'Product removed successfully.',
      }
    );
  },

  /**
   * List all categories for administration (ADM-05).
   * Endpoint: GET /categories
   *
   * @param {Object} [params={}]
   * @returns {Promise<Array>}
   */
  async getCategories(params = {}) {
    return categoryService.getCategories({ all: true, ...params });
  },

  /**
   * Create a new category (ADM-05).
   * Endpoint: POST /categories
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createCategory(data) {
    return categoryService.createCategory(data);
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
    return categoryService.updateCategory(id, data);
  },

  /**
   * Delete category (only allowed if unused per ADM-05 and BR-09).
   * Endpoint: DELETE /categories/{id}
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async deleteCategory(id) {
    return categoryService.deleteCategory(id);
  },

  /**
   * Deactivate category (ADM-05, BR-09).
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async deactivateCategory(id) {
    return categoryService.deactivateCategory(id);
  },

  /**
   * Reactivate category (ADM-05).
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async reactivateCategory(id) {
    return categoryService.reactivateCategory(id);
  },

  /**
   * List all marketplace orders for monitoring (ADM-06).
   * Endpoint: GET /admin/orders
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object|null, links: Object|null }>}
   */
  async getOrders(params = {}) {
    if (isMockMode()) {
      return mockStore.getAdminOrders(params);
    }

    const response = await apiClient.get('/admin/orders', { params });
    return normalizeCollection(response);
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
    return normalizeItem(response);
  },

  /**
   * Override an order's status with a mandatory justification reason (ADM-07).
   * Endpoint: POST /admin/orders/{id}/override-status
   *
   * @param {string|number} id
   * @param {string} status - Target status
   * @param {string} reason - Mandatory administrative justification
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
   * Retrieve platform configuration settings (ADM-08).
   * Endpoint: GET /admin/settings
   *
   * @returns {Promise<Record<string, any>>}
   */
  async getSettings() {
    if (isMockMode()) {
      return mockStore.getSettings();
    }

    const response = await apiClient.get('/admin/settings');
    return normalizeItem(response);
  },

  /**
   * Update platform configuration settings (ADM-08).
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
    return normalizeItem(response);
  },

  /**
   * Retrieve system audit logs with filters (ADM-09, NFR-OBS-01).
   * Endpoint: GET /admin/audit-logs
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object|null, links: Object|null }>}
   */
  async getAuditLogs(params = {}) {
    if (isMockMode()) {
      return mockStore.getAuditLogs(params);
    }

    const response = await apiClient.get('/admin/audit-logs', { params });
    return normalizeCollection(response);
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
    return normalizeItem(response);
  },

  /**
   * Convenience alias for getStats().
   */
  async getAdminStats() {
    return this.getStats();
  },
};

export default adminService;
