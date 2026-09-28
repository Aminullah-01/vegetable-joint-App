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
   * Retrieve administrator high-level overview metrics and GMV (ADM-01).
   * Endpoint: GET /admin/stats
   *
   * @returns {Promise<{
   *   total_users: number,
   *   total_sellers: number,
   *   pending_seller_approvals: number,
   *   active_products: number,
   *   total_orders: number,
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
