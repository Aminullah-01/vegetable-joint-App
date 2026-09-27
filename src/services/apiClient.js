import { env } from '../utils/index.js';
import {
  HTTP_STATUS,
  createApiErrorFromResponse,
  createNetworkError,
} from './apiErrors.js';

const STORAGE_TOKEN_KEY = 'vegetable_joint_token';

/**
 * Builds a query string from a parameters object.
 * Supports numbers, strings, booleans, and arrays.
 * Strips null and undefined values.
 *
 * @param {Record<string, any>} [params={}]
 * @returns {string}
 */
export function buildQueryString(params = {}) {
  if (!params || typeof params !== 'object') {
    return '';
  }

  const queryParts = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined && item !== '') {
          queryParts.push(
            `${encodeURIComponent(`${key}[]`)}=${encodeURIComponent(item)}`
          );
        }
      }
    } else {
      queryParts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      );
    }
  }

  return queryParts.join('&');
}

/**
 * Normalizes full URL by combining base URL, endpoint path, and query parameters.
 *
 * @param {string} baseUrl
 * @param {string} endpoint
 * @param {Record<string, any>} [params={}]
 * @returns {string}
 */
export function formatUrl(baseUrl, endpoint, params = {}) {
  let fullUrl;

  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    fullUrl = endpoint;
  } else {
    const cleanBase = (baseUrl || '').replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    fullUrl = cleanBase ? `${cleanBase}/${cleanEndpoint}` : `/${cleanEndpoint}`;
  }

  const queryString = buildQueryString(params);
  if (queryString) {
    const separator = fullUrl.includes('?') ? '&' : '?';
    fullUrl = `${fullUrl}${separator}${queryString}`;
  }

  return fullUrl;
}

/**
 * API Client Class providing a standard wrapper for Laravel REST API communication.
 * Satisfies IF-01 to IF-05, CON-01, NFR-MAIN-02, and ERR-01 to ERR-04.
 */
export class ApiClient {
  /**
   * @param {Object} [config={}]
   * @param {string} [config.baseUrl] - Base API URL (defaults to env.apiBaseUrl).
   * @param {number} [config.timeout=30000] - Default request timeout in milliseconds.
   */
  constructor({ baseUrl = env.apiBaseUrl, timeout = 30000 } = {}) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.token = null;
    this.tokenProvider = null;
    this.unauthorizedListeners = new Set();

    // Initialize token from localStorage if in a browser environment
    this.initTokenFromStorage();
  }

  /**
   * Reads persisted auth token from localStorage if available.
   * @private
   */
  initTokenFromStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_TOKEN_KEY);
        if (stored) {
          this.token = stored;
        }
      } catch {
        // Storage access may be restricted by security policies
      }
    }
  }

  /**
   * Set base URL dynamically.
   * @param {string} url
   */
  setBaseUrl(url) {
    this.baseUrl = url;
  }

  /**
   * Get current base URL.
   * @returns {string}
   */
  getBaseUrl() {
    return this.baseUrl;
  }

  /**
   * Set authentication bearer token and persist to localStorage.
   * @param {string|null} token
   */
  setToken(token) {
    this.token = token || null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (token) {
          window.localStorage.setItem(STORAGE_TOKEN_KEY, token);
        } else {
          window.localStorage.removeItem(STORAGE_TOKEN_KEY);
        }
      } catch {
        // Storage restricted
      }
    }
  }

  /**
   * Retrieve active authentication token.
   * Priority: custom tokenProvider -> in-memory token -> localStorage.
   * @returns {string|null}
   */
  getToken() {
    if (typeof this.tokenProvider === 'function') {
      const provided = this.tokenProvider();
      if (provided) return provided;
    }
    if (this.token) return this.token;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(STORAGE_TOKEN_KEY);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Clears stored authentication token.
   */
  clearToken() {
    this.setToken(null);
  }

  /**
   * Register a custom token provider callback (e.g. from an AuthContext).
   * @param {() => string|null} provider
   */
  setTokenProvider(provider) {
    this.tokenProvider = provider;
  }

  /**
   * Register an event listener called when a 401 Unauthorized response is received.
   * @param {Function} callback
   * @returns {() => void} Unsubscribe function
   */
  onUnauthorized(callback) {
    if (typeof callback === 'function') {
      this.unauthorizedListeners.add(callback);
    }
    return () => this.unauthorizedListeners.delete(callback);
  }

  /**
   * Trigger 401 unauthorized listeners.
   * @private
   */
  notifyUnauthorized(error) {
    for (const listener of this.unauthorizedListeners) {
      try {
        listener(error);
      } catch {
        // Ignore listener error
      }
    }
  }

  /**
   * Core request dispatcher.
   *
   * @param {string} endpoint - Relative API endpoint or absolute URL.
   * @param {Object} [options={}]
   * @param {string} [options.method='GET'] - HTTP Method.
   * @param {Record<string, any>} [options.params] - URL query parameters.
   * @param {any} [options.body] - Request body (object, string, FormData).
   * @param {Record<string, string>} [options.headers] - Custom HTTP headers.
   * @param {boolean} [options.skipAuth=false] - Whether to skip Authorization header.
   * @param {string} [options.token] - Explicit token override.
   * @param {AbortSignal} [options.signal] - External AbortSignal.
   * @param {number} [options.timeout] - Custom timeout in ms.
   * @param {boolean} [options.raw=false] - If true, returns raw Fetch Response.
   * @returns {Promise<{ data: any, meta: any, links: any, status: number, headers: Headers, raw: any }>}
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      params = {},
      body,
      headers: customHeaders = {},
      skipAuth = false,
      token: tokenOverride,
      signal: externalSignal,
      timeout = this.timeout,
      raw = false,
      credentials,
      ...extraFetchOptions
    } = options;

    const url = formatUrl(this.baseUrl, endpoint, params);

    // Setup headers
    const headers = new Headers(customHeaders);

    // Set standard Accept header (IF-01)
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    // Set Authorization header if token exists and not skipped (IF-05)
    if (!skipAuth) {
      const activeToken = tokenOverride || this.getToken();
      if (activeToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      }
    }

    // Format body and Content-Type
    let serializedBody = body;
    const isFormData =
      typeof FormData !== 'undefined' && body instanceof FormData;

    if (body !== undefined && body !== null && !isFormData) {
      if (typeof body === 'object') {
        serializedBody = JSON.stringify(body);
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
      }
    }

    // Setup timeout and abort controller
    const controller = new AbortController();
    const timerId = setTimeout(() => {
      controller.abort(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    // Link external abort signal if supplied
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timerId);
        throw createNetworkError(externalSignal.reason || new Error('Aborted'));
      }
      externalSignal.addEventListener('abort', () => {
        clearTimeout(timerId);
        controller.abort(externalSignal.reason);
      });
    }

    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: serializedBody,
        signal: controller.signal,
        credentials: credentials || 'same-origin',
        ...extraFetchOptions,
      });
    } catch (err) {
      clearTimeout(timerId);
      throw createNetworkError(err);
    } finally {
      clearTimeout(timerId);
    }

    // Return raw fetch response if explicitly requested
    if (raw) {
      return response;
    }

    // Handle 204 No Content
    if (response.status === HTTP_STATUS.NO_CONTENT) {
      return {
        data: null,
        meta: null,
        links: null,
        status: response.status,
        headers: response.headers,
        raw: null,
      };
    }

    // Parse response body safely
    let parsedBody = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        parsedBody = await response.json();
      } catch {
        parsedBody = null;
      }
    } else {
      try {
        parsedBody = await response.text();
      } catch {
        parsedBody = null;
      }
    }

    // Handle HTTP error statuses (4xx, 5xx)
    if (!response.ok) {
      const error = createApiErrorFromResponse(response, parsedBody);

      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        this.notifyUnauthorized(error);
      }

      throw error;
    }

    // Envelope handling (IF-02, IF-04)
    // Standard envelope: { data: ..., meta: ..., links: ... }
    let data = parsedBody;
    let meta = null;
    let links = null;

    if (
      parsedBody &&
      typeof parsedBody === 'object' &&
      !Array.isArray(parsedBody) &&
      'data' in parsedBody
    ) {
      data = parsedBody.data;
      meta = parsedBody.meta || null;
      links = parsedBody.links || null;
    }

    return {
      data,
      meta,
      links,
      status: response.status,
      headers: response.headers,
      raw: parsedBody,
    };
  }

  /**
   * HTTP GET convenience method.
   * @param {string} endpoint
   * @param {Object} [options={}]
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * HTTP POST convenience method.
   * @param {string} endpoint
   * @param {any} body
   * @param {Object} [options={}]
   */
  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * HTTP PUT convenience method.
   * @param {string} endpoint
   * @param {any} body
   * @param {Object} [options={}]
   */
  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * HTTP PATCH convenience method.
   * @param {string} endpoint
   * @param {any} body
   * @param {Object} [options={}]
   */
  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * HTTP DELETE convenience method.
   * @param {string} endpoint
   * @param {Object} [options={}]
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Convenience method for multipart file/image upload (IF-01).
   * Automatically leaves Content-Type blank so fetch sets the boundary.
   *
   * @param {string} endpoint
   * @param {FormData} formData
   * @param {Object} [options={}]
   */
  upload(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: options.method || 'POST',
      body: formData,
    });
  }
}

/**
 * Singleton instance of ApiClient configured with application defaults.
 */
export const apiClient = new ApiClient();

export default apiClient;
