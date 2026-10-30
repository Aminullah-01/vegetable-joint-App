import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';
import { validateProductImage } from '../utils/image.js';
import { ApiError } from './apiErrors.js';

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
 * Product & Catalog Service
 * Conforms to SRS Section 4.4, MKT-01 to MKT-06, SRCH-01 to SRCH-08, SEL-02 to SEL-08,
 * and NFR-MAIN-02 (Mock/API Switch).
 */
export const productService = {
  /**
   * List marketplace products with search, filtering, and pagination.
   * Query params: q, category, min_price, max_price, availability, seller, location, sort, page, per_page.
   * Endpoint: GET /products
   *
   * @param {Object} [params={}]
   * @returns {Promise<{ data: Array, meta: Object|null, links: Object|null }>}
   */
  async getProducts(params = {}) {
    if (isMockMode()) {
      return mockStore.getProducts(params);
    }

    const response = await apiClient.get('/products', { params });
    return normalizeCollection(response);
  },

  /**
   * Get product detail by ID.
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
    return normalizeItem(response);
  },

  /**
   * Get seller's own inventory listings, including unavailable items.
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
   * Create a new vegetable listing.
   * Supports multipart/form-data for image upload per IF-01 and SEL-02.
   * Endpoint: POST /products
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
      response = await apiClient.upload('/products', productData);
    } else {
      response = await apiClient.post('/products', productData);
    }
    return normalizeItem(response);
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
    if (isMockMode()) {
      return mockStore.updateProduct(id, productData);
    }

    let response;
    if (typeof FormData !== 'undefined' && productData instanceof FormData) {
      // In Laravel, multipart/form-data with PUT requires method spoofing via POST with _method=PUT
      if (!productData.has('_method')) {
        productData.append('_method', 'PUT');
      }
      response = await apiClient.upload(`/products/${id}`, productData, {
        method: 'POST',
      });
    } else {
      response = await apiClient.put(`/products/${id}`, productData);
    }
    return normalizeItem(response);
  },

  /**
   * Soft-delete a product (SEL-04, BR-10).
   * Endpoint: DELETE /products/{id}
   *
   * @param {string|number} id
   * @returns {Promise<{ message: string, success?: boolean }>}
   */
  async deleteProduct(id) {
    if (isMockMode()) {
      const result = mockStore.deleteProduct(id);
      return {
        success: true,
        message: result?.message || 'Product deleted successfully.',
      };
    }

    const response = await apiClient.delete(`/products/${id}`);
    return (
      response.data || {
        success: true,
        message: 'Product deleted successfully.',
      }
    );
  },

  /**
   * Quick update for inventory stock quantity and availability (SEL-07, SEL-08).
   * Endpoint: PATCH /products/{id}/stock
   *
   * @param {string|number} id
   * @param {Object} stockData - { stock_quantity?: number, quantity?: number, is_available?: boolean, availability?: string }
   * @returns {Promise<Object>}
   */
  async updateProductStock(id, stockData) {
    if (isMockMode()) {
      const mockPayload = {
        ...stockData,
        quantity:
          stockData.quantity !== undefined
            ? stockData.quantity
            : stockData.stock_quantity,
        availability:
          stockData.availability !== undefined
            ? stockData.availability
            : stockData.is_available === false
              ? 'unavailable'
              : stockData.is_available === true
                ? 'in_stock'
                : undefined,
      };
      const updated = mockStore.updateProduct(id, mockPayload);
      return {
        ...updated,
        stock_quantity:
          updated.quantity !== undefined
            ? updated.quantity
            : updated.stock_quantity,
        is_available:
          updated.is_available !== undefined
            ? updated.is_available
            : updated.availability !== 'unavailable' &&
              (updated.quantity ?? 0) > 0,
      };
    }

    const response = await apiClient.patch(`/products/${id}/stock`, stockData);
    const item = normalizeItem(response);
    if (
      item &&
      item.stock_quantity === undefined &&
      item.quantity !== undefined
    ) {
      item.stock_quantity = item.quantity;
    }
    return item;
  },

  /**
   * Quick stock update alias for updateProductStock.
   *
   * @param {string|number} id
   * @param {Object} stockData
   * @returns {Promise<Object>}
   */
  async updateStock(id, stockData) {
    return this.updateProductStock(id, stockData);
  },

  /**
   * Upload a product image file with progress callback (SEL-05, IF-01).
   * Allowed types: JPEG, PNG, WebP. Max size: 2 MB.
   * Endpoint: POST /seller/products/upload-image
   *
   * @param {File|Blob} file - Image file (JPEG, PNG, WebP, <= 2 MB)
   * @param {Function} [onProgress] - Callback ({ loaded, total, percent })
   * @returns {Promise<{ url: string, filename: string, size: number, type: string }>}
   */
  async uploadProductImage(file, onProgress) {
    if (!file) {
      throw new ApiError({
        message: 'No image file provided for upload.',
        status: 422,
        code: 'VALIDATION_ERROR',
      });
    }

    const validationError = validateProductImage(file);
    if (validationError) {
      throw new ApiError({
        message: validationError,
        status: 422,
        code: 'VALIDATION_ERROR',
      });
    }

    if (isMockMode()) {
      return mockStore.uploadImage(file, onProgress);
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.uploadWithProgress(
      '/seller/products/upload-image',
      formData,
      {
        onProgress,
      }
    );
    return normalizeItem(response);
  },

  /**
   * Upload product image alias for uploadProductImage.
   *
   * @param {File|Blob} file
   * @param {Function} [onProgress]
   * @returns {Promise<{ url: string, filename: string, size: number, type: string }>}
   */
  async uploadImage(file, onProgress) {
    return this.uploadProductImage(file, onProgress);
  },

  /**
   * Validate cart line items against current stock and prices (CART-08).
   * Endpoint: POST /cart/validate
   *
   * @param {Array<{ product_id: number|string, quantity: number, price: number }>} items
   * @returns {Promise<{ is_valid: boolean, items: Array, has_price_changes: boolean, has_stock_issues: boolean }>}
   */
  async validateCart(items) {
    if (isMockMode()) {
      return mockStore.validateCart(items);
    }

    const response = await apiClient.post('/cart/validate', { items });
    return normalizeItem(response);
  },
};

export default productService;
