import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';

/**
 * Category Management Service
 * Conforms to SRS 4.4, ADM-05, BR-09, and NFR-MAIN-02 (Mock/API Switch).
 */
export const categoryService = {
  /**
   * List active product categories.
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
    return response.data || [];
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
    return response.data;
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
    return response.data;
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
    return response.data;
  },

  /**
   * Delete or deactivate category (Admin).
   * If products exist, server prevents hard deletion per BR-09.
   * Endpoint: DELETE /categories/{id}
   *
   * @param {string|number} id
   * @returns {Promise<void>}
   */
  async deleteCategory(id) {
    if (isMockMode()) {
      return mockStore.deleteCategory(id);
    }

    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  },
};

export default categoryService;
