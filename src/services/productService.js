import { apiClient } from './apiClient.js';

/**
 * Product & Catalog Service
 * Conforms to SRS 4.4, MKT-01 to MKT-06, SRCH-01 to SRCH-08, SEL-02 to SEL-07, and CART-08.
 */
export const productService = {
  /**
   * List marketplace products with search, filtering, and pagination.
   * Endpoint: GET /products
   *
   * @param {Object} [params={}]
   * @param {string} [params.q] - Search query.
   * @param {string|number} [params.category] - Category slug or ID.
   * @param {number} [params.min_price] - Minimum price in Naira.
   * @param {number} [params.max_price] - Maximum price in Naira.
   * @param {'in_stock'|'low_stock'|'out_of_stock'} [params.availability] - Stock availability.
   * @param {string|number} [params.seller] - Seller ID or slug.
   * @param {string} [params.location] - Geographical location/State.
   * @param {'price_asc'|'price_desc'|'newest'|'rating'} [params.sort] - Sorting rule.
   * @param {number} [params.page=1] - Current page number.
   * @param {number} [params.per_page=20] - Number of items per page (capped at 50 per IF-04).
   * @returns {Promise<{ data: Array, meta: Object, links: Object }>}
   */
  async getProducts(params = {}) {
    const response = await apiClient.get('/products', { params });
    return {
      data: response.data || [],
      meta: response.meta,
      links: response.links,
    };
  },

  /**
   * Get product detail by ID.
   * Endpoint: GET /products/{id}
   *
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  async getProductById(id) {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  /**
   * Create a new vegetable listing.
   * Supports multipart/form-data for image upload per IF-01.
   * Endpoint: POST /products
   *
   * @param {FormData|Object} productData
   * @returns {Promise<Object>}
   */
  async createProduct(productData) {
    let response;
    if (typeof FormData !== 'undefined' && productData instanceof FormData) {
      response = await apiClient.upload('/products', productData);
    } else {
      response = await apiClient.post('/products', productData);
    }
    return response.data;
  },

  /**
   * Update an existing product listing.
   * Supports multipart/form-data or JSON.
   * Endpoint: PUT /products/{id}
   *
   * @param {string|number} id
   * @param {FormData|Object} productData
   * @returns {Promise<Object>}
   */
  async updateProduct(id, productData) {
    let response;
    if (typeof FormData !== 'undefined' && productData instanceof FormData) {
      // In Laravel, PUT with multipart sometimes uses POST with _method=PUT or POST /products/{id}
      response = await apiClient.upload(`/products/${id}`, productData, {
        method: 'POST',
      });
    } else {
      response = await apiClient.put(`/products/${id}`, productData);
    }
    return response.data;
  },

  /**
   * Soft-delete a product (SEL-04, BR-10).
   * Endpoint: DELETE /products/{id}
   *
   * @param {string|number} id
   * @returns {Promise<void>}
   */
  async deleteProduct(id) {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },

  /**
   * Validate cart line items against current stock and prices (CART-08).
   * Endpoint: POST /cart/validate
   *
   * @param {Array<{ product_id: number|string, quantity: number, price: number }>} items
   * @returns {Promise<{ is_valid: boolean, items: Array, has_price_changes: boolean, has_stock_issues: boolean }>}
   */
  async validateCart(items) {
    const response = await apiClient.post('/cart/validate', { items });
    return response.data;
  },
};

export default productService;
