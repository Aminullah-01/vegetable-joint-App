import { apiClient } from './apiClient.js';

/**
 * Category Management Service
 * Conforms to SRS 4.4, ADM-05, and BR-09.
 */
export const categoryService = {
  /**
   * List active product categories.
   * Endpoint: GET /categories
   *
   * @param {Object} [params={}]
   * @param {boolean} [params.all=false] - Whether to include inactive categories (Admin).
   * @returns {Promise<Array>}
   */
  async getCategories(params = {}) {
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
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  },

  /**
   * Create a new category (Admin).
   * Endpoint: POST /categories
   *
   * @param {Object} categoryData
   * @param {string} categoryData.name
   * @param {string} [categoryData.description]
   * @param {boolean} [categoryData.is_active=true]
   * @returns {Promise<Object>}
   */
  async createCategory(categoryData) {
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
    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  },
};

export default categoryService;
