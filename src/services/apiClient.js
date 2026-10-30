import { env } from '../utils/index.js';
import {
  HTTP_STATUS,
  ERROR_CODES,
  createApiErrorFromResponse,
  createNetworkError,
} from './apiErrors.js';
import { tokenStorage, TOKEN_STRATEGIES } from './tokenStorage.js';

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
   * @param {string} [config.authStrategy] - 'cookie' (HttpOnly cookie preferred) or 'bearer'.
   * @param {boolean} [config.withCredentials] - Whether to include credentials across CORS origins.
   * @param {string} [config.sanctumCsrfUrl] - Laravel Sanctum CSRF cookie initialization endpoint.
   * @param {Object} [config.storage] - TokenStorage driver instance.
   */
  constructor({
    baseUrl = env.apiBaseUrl,
    timeout = 30000,
    authStrategy = env.authStrategy || TOKEN_STRATEGIES.COOKIE,
    withCredentials = env.withCredentials !== undefined
      ? env.withCredentials
      : true,
    sanctumCsrfUrl = env.sanctumCsrfUrl,
    storage = tokenStorage,
    maxRetries = 2,
    retryDelay = 300,
    backoffMultiplier = 2,
    retryCondition = null,
  } = {}) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.authStrategy = authStrategy;
    this.withCredentials = withCredentials;
    this.sanctumCsrfUrl = sanctumCsrfUrl;
    this.tokenStorage = storage;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.backoffMultiplier = backoffMultiplier;
    this.retryCondition = retryCondition;
    this.token = null;
    this.tokenProvider = null;
    this.unauthorizedListeners = new Set();
    // Initialize token from storage
    this.initTokenFromStorage();
  }

  /**
   * Reads persisted auth token from tokenStorage or localStorage if available.
   * @private
   */
  initTokenFromStorage() {
    if (this.tokenStorage) {
      this.token = this.tokenStorage.getToken();
    }
    if (!this.token && typeof window !== 'undefined' && window.localStorage) {
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
   * Set authentication bearer token and persist appropriately per strategy.
   * In cookie mode, localStorage persistence is avoided to minimize XSS exposure (NFR-SEC-03).
   * @param {string|null} token
   */
  setToken(token) {
    this.token = token || null;
    if (this.tokenStorage) {
      this.tokenStorage.setToken(token);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (
          token &&
          (this.authStrategy === TOKEN_STRATEGIES.BEARER ||
            !this.tokenStorage?.isCookieStrategy())
        ) {
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
   * Priority: custom tokenProvider -> in-memory token -> tokenStorage -> localStorage.
   * @returns {string|null}
   */
  getToken() {
    if (typeof this.tokenProvider === 'function') {
      const provided = this.tokenProvider();
      if (provided) return provided;
    }
    if (this.token) return this.token;

    if (this.tokenStorage) {
      const stored = this.tokenStorage.getToken();
      if (stored) return stored;
    }

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
    this.token = null;
    if (this.tokenStorage) {
      this.tokenStorage.clearToken();
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_TOKEN_KEY);
      } catch {
        // Storage restricted
      }
    }
  }

  /**
   * Switch authentication strategy ('cookie' | 'bearer').
   * @param {'cookie'|'bearer'} strategy
   */
  setAuthStrategy(strategy) {
    this.authStrategy = strategy;
    if (this.tokenStorage) {
      this.tokenStorage.setStrategy(strategy);
    }
  }

  /**
   * Get currently active authentication strategy.
   * @returns {'cookie'|'bearer'}
   */
  getAuthStrategy() {
    return this.authStrategy;
  }

  /**
   * Set whether credentials (cookies) are sent with cross-origin requests.
   * @param {boolean} value
   */
  setWithCredentials(value) {
    this.withCredentials = Boolean(value);
  }

  /**
   * Checks whether cookie authentication strategy is active.
   * @returns {boolean}
   */
  isCookieAuth() {
    return this.authStrategy === TOKEN_STRATEGIES.COOKIE;
  }

  /**
   * Initializes Laravel Sanctum CSRF protection cookie (NFR-SEC-03, NFR-SEC-06).
   * Safe to call prior to login or register requests in SPA cookie mode.
   *
   * @returns {Promise<void>}
   */
  async ensureCsrfCookie() {
    if (this.authStrategy === TOKEN_STRATEGIES.COOKIE || this.withCredentials) {
      try {
        await this.get(this.sanctumCsrfUrl || '/sanctum/csrf-cookie', {
          skipAuth: true,
        });
      } catch {
        // Sanctum endpoint may return 204 No Content with set-cookie header
      }
    }
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
   * Determines whether an error is transient and eligible for automatic retry.
   * Conforms to NFR-REL-04, NFR-REL-05, and idempotency standards.
   *
   * @param {ApiError|Error} error
   * @param {string} [method='GET']
   * @param {Object} [options={}]
   * @returns {boolean}
   */
  isRetryable(error, method = 'GET', options = {}) {
    if (typeof this.retryCondition === 'function') {
      return Boolean(this.retryCondition(error, method, options));
    }

    // Never retry client validation or auth errors (400, 401, 403, 404, 409, 422)
    const status = error?.status;
    if (
      status &&
      status >= 400 &&
      status < 500 &&
      status !== HTTP_STATUS.TOO_MANY_REQUESTS
    ) {
      return false;
    }

    const isTransient =
      error?.isNetworkError ||
      error?.code === ERROR_CODES.NETWORK_ERROR ||
      error?.code === ERROR_CODES.TIMEOUT_ERROR ||
      status === 0 ||
      status === HTTP_STATUS.BAD_GATEWAY ||
      status === HTTP_STATUS.SERVICE_UNAVAILABLE ||
      status === HTTP_STATUS.GATEWAY_TIMEOUT ||
      status === HTTP_STATUS.TOO_MANY_REQUESTS;

    if (!isTransient) {
      return false;
    }

    // Safe/idempotent methods are always retryable on transient error
    const upperMethod = String(method).toUpperCase();
    const isIdempotentMethod = ['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(
      upperMethod
    );

    if (isIdempotentMethod) {
      return true;
    }

    // For mutations, retry only if explicitly enabled or flagged idempotent (NFR-REL-04)
    return Boolean(
      options.retries > 0 ||
      options.idempotent === true ||
      options.retryOnNetworkError === true ||
      options.headers?.['X-Checkout-Ref'] ||
      options.headers?.['x-checkout-ref'] ||
      options.headers?.['X-Idempotency-Key'] ||
      options.headers?.['x-idempotency-key']
    );
  }

  /**
   * Helper checking whether an error is a network or connectivity failure.
   * @param {any} error
   * @returns {boolean}
   */
  isNetworkError(error) {
    return Boolean(
      error?.isNetworkError ||
      error?.code === ERROR_CODES.NETWORK_ERROR ||
      error?.status === 0
    );
  }

  /**
   * Helper checking whether an error occurred while offline.
   * @param {any} error
   * @returns {boolean}
   */
  isOffline(error) {
    return Boolean(
      error?.isOffline ||
      (typeof navigator !== 'undefined' && navigator.onLine === false)
    );
  }

  /**
   * Core request dispatcher with automatic retry for transient network errors.
   * Satisfies NFR-REL-05 and MKT-10.
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
   * @param {number} [options.retries] - Number of retry attempts.
   * @param {number} [options.retryDelay] - Base delay between retries.
   * @param {boolean} [options.idempotent] - Flag indicating request is safe to retry.
   * @param {boolean} [options.raw=false] - If true, returns raw Fetch Response.
   * @returns {Promise<{ data: any, meta: any, links: any, status: number, headers: Headers, raw: any }>}
   */
  async request(endpoint, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const isSafeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method);
    const configuredRetries =
      options.retries !== undefined
        ? Number(options.retries)
        : isSafeMethod || options.idempotent
          ? this.maxRetries
          : 0;

    let attempt = 0;
    while (true) {
      try {
        return await this.executeRequest(endpoint, options, attempt + 1);
      } catch (err) {
        attempt += 1;
        const shouldRetry =
          attempt <= configuredRetries &&
          this.isRetryable(err, method, options);

        if (!shouldRetry) {
          if (err && typeof err === 'object') {
            err.attempts = attempt;
          }
          throw err;
        }

        // Calculate backoff with jitter
        const baseDelay =
          options.retryDelay !== undefined
            ? options.retryDelay
            : this.retryDelay;
        const multiplier =
          options.backoffMultiplier !== undefined
            ? options.backoffMultiplier
            : this.backoffMultiplier;

        let delayMs = baseDelay * Math.pow(multiplier, attempt - 1);
        if (err.retryAfter && Number.isFinite(err.retryAfter)) {
          delayMs = Math.max(delayMs, Math.min(err.retryAfter * 1000, 10000));
        } else {
          delayMs += Math.random() * 50;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Executes a single HTTP request attempt.
   * @private
   */
  async executeRequest(endpoint, options = {}, attempt = 1) {
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

    // Attach CSRF protection header for state-changing requests (NFR-SEC-06)
    const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
    if (!SAFE_METHODS.includes(method.toUpperCase())) {
      const csrfToken =
        customHeaders['X-XSRF-TOKEN'] ||
        customHeaders['x-xsrf-token'] ||
        (this.tokenStorage ? this.tokenStorage.getCsrfToken() : null);
      if (csrfToken && !headers.has('X-XSRF-TOKEN')) {
        headers.set('X-XSRF-TOKEN', csrfToken);
      }
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
        throw createNetworkError(
          externalSignal.reason || new Error('Aborted'),
          attempt
        );
      }
      externalSignal.addEventListener('abort', () => {
        clearTimeout(timerId);
        controller.abort(externalSignal.reason);
      });
    }

    const shouldIncludeCredentials =
      credentials !== undefined
        ? credentials
        : this.withCredentials || this.authStrategy === TOKEN_STRATEGIES.COOKIE
          ? 'include'
          : 'same-origin';

    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: serializedBody,
        signal: controller.signal,
        credentials: shouldIncludeCredentials,
        ...extraFetchOptions,
      });
    } catch (err) {
      clearTimeout(timerId);
      throw createNetworkError(err, attempt);
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
   * Convenience method to dispatch a request with explicit retries.
   *
   * @param {string} endpoint
   * @param {Object} [options={}]
   * @returns {Promise<any>}
   */
  requestWithRetry(endpoint, options = {}) {
    const retries =
      options.retries !== undefined
        ? options.retries
        : Math.max(1, this.maxRetries);
    return this.request(endpoint, { ...options, retries });
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

  /**
   * Multipart file upload with upload progress tracking (IF-01, SEL-05).
   * Uses XMLHttpRequest when available so upload progress events can be monitored.
   *
   * @param {string} endpoint
   * @param {FormData} formData
   * @param {Object} [options={}]
   * @param {Function} [options.onProgress] - Callback receiving ({ loaded, total, percent })
   * @returns {Promise<any>}
   */
  uploadWithProgress(endpoint, formData, options = {}) {
    const {
      onProgress,
      method = 'POST',
      headers: customHeaders = {},
      params = {},
      skipAuth = false,
      token: tokenOverride,
    } = options;

    if (
      typeof XMLHttpRequest === 'undefined' ||
      typeof onProgress !== 'function'
    ) {
      return this.upload(endpoint, formData, options);
    }

    const url = formatUrl(this.baseUrl, endpoint, params);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);

      xhr.setRequestHeader('Accept', 'application/json');

      const shouldIncludeCredentials =
        this.withCredentials || this.authStrategy === TOKEN_STRATEGIES.COOKIE;
      xhr.withCredentials = shouldIncludeCredentials;

      const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
      if (!SAFE_METHODS.includes(method.toUpperCase())) {
        const csrfToken =
          customHeaders['X-XSRF-TOKEN'] ||
          customHeaders['x-xsrf-token'] ||
          (this.tokenStorage ? this.tokenStorage.getCsrfToken() : null);
        if (csrfToken && !customHeaders['X-XSRF-TOKEN']) {
          xhr.setRequestHeader('X-XSRF-TOKEN', csrfToken);
        }
      }

      if (!skipAuth) {
        const activeToken = tokenOverride || this.getToken();
        if (activeToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${activeToken}`);
        }
      }

      for (const [key, value] of Object.entries(customHeaders)) {
        xhr.setRequestHeader(key, value);
      }

      if (xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percent,
            });
          }
        };
      }

      xhr.onload = () => {
        let parsed = null;
        try {
          parsed = JSON.parse(xhr.responseText);
        } catch {
          parsed = xhr.responseText;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parsed?.data ?? parsed);
        } else {
          reject(
            new Error(
              parsed?.message || `Upload failed with status ${xhr.status}`
            )
          );
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during file upload'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload request timed out'));
      };

      xhr.send(formData);
    });
  }
}

/**
 * Singleton instance of ApiClient configured with application defaults.
 */
export const apiClient = new ApiClient();

export default apiClient;
