import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';

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
 * Category Management Service
 * Conforms to SRS Section 4.4, ADM-05, BR-09, and NFR-MAIN-02 (Mock/API Switch).
 */
export const categoryService = {
  /**
   * List active product categories (Public) or all categories (Admin).
   * Endpoint: GET /categories
   *
   * @param {Object} [params={}]
   * @returns {Promise<Array>}
   */
  async getCategories(params = {}) {
    if (isMockMode()) {
      return mockStore.getCategories(params);
    }

    const response = await apiClient.get('/categories', { params });
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    if (response.raw && Array.isArray(response.raw.data)) {
      return response.raw.data;
    }
    return Array.isArray(response) ? response : [];
  },

  /**
   * Get category by ID.
   * Endpoint: GET /categories/{id}
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async getCategoryById(id) {
    if (isMockMode()) {
      return mockStore.getCategoryById(id);
    }

    const response = await apiClient.get(`/categories/${id}`);
    return normalizeItem(response);
  },

  /**
   * Create a new category (Admin).
   * Endpoint: POST /categories
   *
   * @param {Object} categoryData
   * @returns {Promise<Object>}
   */
  async createCategory(categoryData) {
    if (isMockMode()) {
      return mockStore.createCategory(categoryData);
    }

    const response = await apiClient.post('/categories', categoryData);
    return normalizeItem(response);
  },

  /**
   * Update category details (Admin).
   * Endpoint: PUT /categories/{id}
   *
   * @param {string|number} id
   * @param {Object} categoryData
   * @returns {Promise<Object>}
   */
  async updateCategory(id, categoryData) {
    if (isMockMode()) {
      return mockStore.updateCategory(id, categoryData);
    }

    const response = await apiClient.put(`/categories/${id}`, categoryData);
    return normalizeItem(response);
  },

  /**
   * Delete or deactivate category (Admin).
   * If products exist, server prevents hard deletion per BR-09.
   * Endpoint: DELETE /categories/{id}
   *
   * @param {string|number} id
   * @returns {Promise<{ message: string, success?: boolean }>}
   */
  async deleteCategory(id) {
    if (isMockMode()) {
      const result = mockStore.deleteCategory(id);
      return {
        success: true,
        message: result?.message || 'Category deleted successfully.',
      };
    }

    const response = await apiClient.delete(`/categories/${id}`);
    return (
      response.data || {
        success: true,
        message: 'Category deleted successfully.',
      }
    );
  },

  /**
   * Deactivate category (Admin, ADM-05, BR-09).
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async deactivateCategory(id) {
    return this.updateCategory(id, { is_active: false });
  },

  /**
   * Reactivate category (Admin, ADM-05).
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async reactivateCategory(id) {
    return this.updateCategory(id, { is_active: true });
  },
};

export default categoryService;
