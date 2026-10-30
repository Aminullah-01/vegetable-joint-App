import { apiClient } from './apiClient.js';
import { isMockMode } from './mockSwitch.js';
import { mockStore } from '../data/mockStore.js';
import { tokenStorage } from './tokenStorage.js';

/**
 * Normalizes authentication response payloads from Laravel Sanctum.
 * Supports envelopes:
 * - Direct: { user: {...}, token: "..." }
 * - Unwrapped Data: { data: { user: {...}, token: "..." } }
 * - Separated Token: { data: { id: 1, ...user }, token: "..." }
 * - OAuth style: { access_token: "...", token_type: "Bearer", user: {...} }
 *
 * @param {Object} response
 * @returns {{ user: Object|null, token: string|null, message?: string }}
 */
function normalizeAuthResponse(response) {
  if (!response) return { user: null, token: null };

  const data = response.data !== undefined ? response.data : response;
  const raw = response.raw || response;

  const token =
    data?.token ||
    raw?.token ||
    data?.access_token ||
    raw?.access_token ||
    null;

  let user = null;
  if (data?.user) {
    user = data.user;
  } else if (raw?.user) {
    user = raw.user;
  } else if (data && typeof data === 'object' && (data.id || data.email)) {
    user = data;
  }

  const message = data?.message || raw?.message || null;

  return {
    ...(typeof data === 'object' && data !== null ? data : {}),
    user,
    token,
    ...(message ? { message } : {}),
  };
}

/**
 * Authentication & Profile Service
 * Conforms to SRS Section 4.4, AUTH-01 through AUTH-13, and NFR-MAIN-02 (Mock/API Switch).
 */
export const authService = {
  /**
   * Register a new user (Buyer or Seller).
   * Endpoint: POST /auth/register
   *
   * @param {Object} payload
   * @returns {Promise<{ user: Object, token?: string, message?: string }>}
   */
  async register(payload) {
    if (isMockMode()) {
      const result = mockStore.registerUser(payload);
      if (result?.token) {
        tokenStorage.setToken(result.token);
        apiClient.setToken(result.token);
      }
      return result;
    }

    if (apiClient.isCookieAuth()) {
      await apiClient.ensureCsrfCookie();
    }

    const response = await apiClient.post('/auth/register', payload, {
      skipAuth: true,
    });

    const result = normalizeAuthResponse(response);
    if (result?.token) {
      tokenStorage.setToken(result.token);
      apiClient.setToken(result.token);
    }
    return result;
  },

  /**
   * Authenticate a user by credentials.
   * Endpoint: POST /auth/login
   *
   * @param {Object} credentials
   * @returns {Promise<{ user: Object, token: string, message?: string }>}
   */
  async login(credentials) {
    if (isMockMode()) {
      const result = mockStore.loginUser(credentials);
      if (result?.token) {
        tokenStorage.setToken(result.token);
        apiClient.setToken(result.token);
      }
      return result;
    }

    if (apiClient.isCookieAuth()) {
      await apiClient.ensureCsrfCookie();
    }

    const response = await apiClient.post('/auth/login', credentials, {
      skipAuth: true,
    });

    const result = normalizeAuthResponse(response);
    if (result?.token) {
      tokenStorage.setToken(result.token);
      apiClient.setToken(result.token);
    }
    return result;
  },

  /**
   * Invalidate the current session token on the server and clear local token.
   * Conforms to SRS AUTH-05 and NFR-SEC-03.
   * Endpoint: POST /auth/logout
   *
   * @returns {Promise<void>}
   */
  async logout() {
    if (isMockMode()) {
      mockStore.logoutUser();
      tokenStorage.revokeOnLogout();
      apiClient.clearToken();
      return;
    }

    try {
      await apiClient.post('/auth/logout', {});
    } finally {
      tokenStorage.revokeOnLogout();
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
    if (isMockMode()) {
      return mockStore.forgotPassword(data);
    }

    const response = await apiClient.post('/auth/forgot-password', data, {
      skipAuth: true,
    });
    return response.data?.message
      ? response.data
      : {
          message:
            response.data?.message ||
            response.raw?.message ||
            'Password reset link sent.',
        };
  },

  /**
   * Reset password using a reset token.
   * Endpoint: POST /auth/reset-password
   *
   * @param {Object} data
   * @param {string} data.email
   * @param {string} data.token
   * @param {string} data.password
   * @param {string} data.password_confirmation
   * @returns {Promise<{ message: string }>}
   */
  async resetPassword(data) {
    if (isMockMode()) {
      const res = mockStore.resetPassword(data);
      tokenStorage.revokeOnPasswordChange();
      apiClient.clearToken();
      return res;
    }

    const response = await apiClient.post('/auth/reset-password', data, {
      skipAuth: true,
    });
    tokenStorage.revokeOnPasswordChange();
    apiClient.clearToken();
    return response.data?.message
      ? response.data
      : {
          message:
            response.data?.message ||
            response.raw?.message ||
            'Password has been reset successfully.',
        };
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
    return response.data?.user || response.data;
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
    return response.data?.user || response.data;
  },

  /**
   * Change the authenticated user's password (SRS AUTH-11, NFR-SEC-03).
   * Endpoint: POST /auth/change-password
   *
   * @param {{ current_password: string, password: string, password_confirmation: string }} payload
   * @returns {Promise<{ message: string }>}
   */
  async changePassword(payload) {
    if (isMockMode()) {
      return mockStore.changePassword(payload);
    }

    const response = await apiClient.post('/auth/change-password', payload);
    return response.data?.message
      ? response.data
      : {
          message:
            response.data?.message ||
            response.raw?.message ||
            'Password updated successfully.',
        };
  },

  /**
   * Retrieve active authentication token from tokenStorage or ApiClient.
   * @returns {string|null}
   */
  getToken() {
    return tokenStorage.getToken() || apiClient.getToken();
  },

  /**
   * Set active authentication token in tokenStorage and ApiClient.
   * @param {string|null} token
   */
  setToken(token) {
    tokenStorage.setToken(token);
    apiClient.setToken(token);
  },

  /**
   * Clear active token and session markers from tokenStorage and ApiClient.
   */
  clearToken() {
    tokenStorage.clearToken();
    apiClient.clearToken();
  },

  /**
   * Check if an active authenticated session exists (via token or cookie session marker).
   * @returns {boolean}
   */
  isAuthenticated() {
    return tokenStorage.hasToken() || Boolean(apiClient.getToken());
  },
};

export default authService;
