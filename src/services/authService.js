import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';

/**
 * Authentication & Profile Service
 * Conforms to SRS 4.4, AUTH-01 through AUTH-13, and NFR-MAIN-02 (Mock/API Switch).
 */
export const authService = {
  /**
   * Register a new user (Buyer or Seller).
   * Endpoint: POST /auth/register
   *
   * @param {Object} payload
   * @returns {Promise<{ user: Object, token?: string }>}
   */
  async register(payload) {
    if (isMockMode()) {
      const result = mockStore.registerUser(payload);
      if (result?.token) {
        apiClient.setToken(result.token);
      }
      return result;
    }

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
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async login(credentials) {
    if (isMockMode()) {
      const result = mockStore.loginUser(credentials);
      if (result?.token) {
        apiClient.setToken(result.token);
      }
      return result;
    }

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
    if (isMockMode()) {
      mockStore.logoutUser();
      apiClient.clearToken();
      return;
    }

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
   * @returns {Promise<{ message: string }>}
   */
  async forgotPassword(data) {
    if (isMockMode()) {
      return { message: 'Password reset link sent to your email.' };
    }

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
   * @returns {Promise<{ message: string }>}
   */
  async resetPassword(data) {
    if (isMockMode()) {
      return { message: 'Password has been reset successfully.' };
    }

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
    if (isMockMode()) {
      return mockStore.getCurrentProfile();
    }

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
    if (isMockMode()) {
      return mockStore.updateProfile(data);
    }

    const response = await apiClient.put('/profile', data);
    return response.data;
  },
};

export default authService;
