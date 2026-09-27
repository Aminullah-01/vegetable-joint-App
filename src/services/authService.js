import { apiClient } from './apiClient.js';

/**
 * Authentication & Profile Service
 * Conforms to SRS 4.4, AUTH-01 through AUTH-13, and CON-02.
 */
export const authService = {
  /**
   * Register a new user (Buyer or Seller).
   * Endpoint: POST /auth/register
   *
   * @param {Object} payload
   * @param {string} payload.name - Full name.
   * @param {string} payload.email - Email address.
   * @param {string} payload.password - Password.
   * @param {string} [payload.password_confirmation] - Password confirmation.
   * @param {'buyer'|'seller'} payload.role - Desired user role.
   * @param {string} [payload.phone] - Phone number.
   * @param {string} [payload.business_name] - Business name (if seller).
   * @param {string} [payload.location] - Location/State (if seller).
   * @returns {Promise<{ user: Object, token?: string }>}
   */
  async register(payload) {
    const response = await apiClient.post('/auth/register', payload, {
      skipAuth: true,
    });
    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Authenticate a user by credentials.
   * Endpoint: POST /auth/login
   *
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials, {
      skipAuth: true,
    });
    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Invalidate the current session token on the server and clear local token.
   * Endpoint: POST /auth/logout
   *
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout', {});
    } finally {
      apiClient.clearToken();
    }
  },

  /**
   * Request a password reset link.
   * Endpoint: POST /auth/forgot-password
   *
   * @param {Object} data
   * @param {string} data.email
   * @returns {Promise<{ message: string }>}
   */
  async forgotPassword(data) {
    const response = await apiClient.post('/auth/forgot-password', data, {
      skipAuth: true,
    });
    return response.data;
  },

  /**
   * Reset password using a reset token.
   * Endpoint: POST /auth/reset-password
   *
   * @param {Object} data
   * @param {string} data.token
   * @param {string} data.email
   * @param {string} data.password
   * @param {string} [data.password_confirmation]
   * @returns {Promise<{ message: string }>}
   */
  async resetPassword(data) {
    const response = await apiClient.post('/auth/reset-password', data, {
      skipAuth: true,
    });
    return response.data;
  },

  /**
   * Get authenticated user profile.
   * Endpoint: GET /profile
   *
   * @returns {Promise<Object>}
   */
  async getProfile() {
    const response = await apiClient.get('/profile');
    return response.data;
  },

  /**
   * Update authenticated user profile.
   * Endpoint: PUT /profile
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateProfile(data) {
    const response = await apiClient.put('/profile', data);
    return response.data;
  },
};

export default authService;
