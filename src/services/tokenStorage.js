/**
 * Token Storage & Authentication Strategy Manager
 *
 * Conforms to:
 * - SRS NFR-SEC-03: Authentication shall use expiring tokens (e.g. Laravel Sanctum).
 *   Tokens shall be revocable on logout and on password change.
 *   Token storage in the browser shall minimise XSS exposure (HttpOnly cookie preferred).
 * - SRS IF-05: Protected endpoints require Authorization: Bearer <token>
 *   (or an equivalent secure cookie scheme).
 * - SRS NFR-SEC-06: CSRF protection (where cookies are used).
 */

import { env } from '../utils/env.js';

export const TOKEN_STRATEGIES = {
  COOKIE: 'cookie',
  BEARER: 'bearer',
};

export const STORAGE_KEYS = {
  TOKEN: 'vegetable_joint_token',
  USER: 'vegetable_joint_user',
  SESSION_ACTIVE: 'vegetable_joint_session_active',
  STRATEGY: 'vegetable_joint_auth_strategy',
};

/**
 * Parses JWT token payload without external libraries.
 *
 * @param {string} token
 * @returns {Object|null}
 */
export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Determines whether a JWT or timestamp-based token has expired.
 *
 * @param {string} token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) {
    // If not a standard JWT with exp, assume valid unless manually cleared
    return false;
  }
  return payload.exp * 1000 <= Date.now();
}

/**
 * Extracts CSRF token (XSRF-TOKEN) from document.cookie for Laravel Sanctum requests.
 * Laravel encodes the cookie value with urlencode().
 *
 * @returns {string|null}
 */
export function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined' || !document.cookie) {
    return null;
  }

  const matches = document.cookie.match(
    /(?:^|;\s*)(?:XSRF-TOKEN|csrf_token)=([^;]+)/
  );
  if (!matches || !matches[1]) {
    return null;
  }

  try {
    return decodeURIComponent(matches[1]);
  } catch {
    return matches[1];
  }
}

export class TokenStorage {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.strategy] - 'cookie' (HttpOnly cookie preferred) or 'bearer'
   * @param {string} [options.tokenKey]
   * @param {string} [options.sessionKey]
   */
  constructor({
    strategy = env.authStrategy || TOKEN_STRATEGIES.COOKIE,
    tokenKey = STORAGE_KEYS.TOKEN,
    sessionKey = STORAGE_KEYS.SESSION_ACTIVE,
  } = {}) {
    this.strategy = strategy;
    this.tokenKey = tokenKey;
    this.sessionKey = sessionKey;
    this.inMemoryToken = null;
    this.revocationListeners = new Set();

    // Check if strategy was overridden in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const persistedStrategy = window.localStorage.getItem(
          STORAGE_KEYS.STRATEGY
        );
        if (
          persistedStrategy === TOKEN_STRATEGIES.COOKIE ||
          persistedStrategy === TOKEN_STRATEGIES.BEARER
        ) {
          this.strategy = persistedStrategy;
        }
      } catch {
        // Restricted storage
      }
    }
  }

  /**
   * Returns current authentication storage strategy ('cookie' | 'bearer').
   * @returns {string}
   */
  getStrategy() {
    return this.strategy;
  }

  /**
   * Sets authentication strategy.
   *
   * When switching to 'cookie', any raw token stored in localStorage is removed
   * to enforce zero-XSS token exposure (NFR-SEC-03).
   *
   * @param {'cookie'|'bearer'} strategy
   */
  setStrategy(strategy) {
    if (
      strategy !== TOKEN_STRATEGIES.COOKIE &&
      strategy !== TOKEN_STRATEGIES.BEARER
    ) {
      throw new Error(`Invalid authentication strategy: ${strategy}`);
    }

    this.strategy = strategy;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.STRATEGY, strategy);
        if (strategy === TOKEN_STRATEGIES.COOKIE) {
          // Minimise XSS exposure: wipe raw token from localStorage
          window.localStorage.removeItem(this.tokenKey);
        }
      } catch {
        // Storage restricted
      }
    }
  }

  /**
   * Whether HttpOnly cookie authentication is active.
   * @returns {boolean}
   */
  isCookieStrategy() {
    return this.strategy === TOKEN_STRATEGIES.COOKIE;
  }

  /**
   * Whether Bearer token authentication is active.
   * @returns {boolean}
   */
  isBearerStrategy() {
    return this.strategy === TOKEN_STRATEGIES.BEARER;
  }

  /**
   * Stores an authentication token.
   *
   * In 'cookie' strategy (preferred, NFR-SEC-03):
   * - Raw token is NOT persisted to localStorage (preventing XSS exfiltration).
   * - A non-sensitive session marker is recorded in memory & sessionStorage.
   * - In-memory token can optionally be cached for the active JS session.
   *
   * In 'bearer' strategy:
   * - Token is persisted to localStorage and memory.
   *
   * @param {string|null} token
   */
  setToken(token) {
    this.inMemoryToken = token || null;

    if (!token) {
      this.clearToken();
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        // Record non-sensitive session active indicator
        if (window.sessionStorage) {
          window.sessionStorage.setItem(this.sessionKey, 'true');
        }

        if (this.isBearerStrategy()) {
          // Persist raw token only if bearer mode is explicitly selected
          if (window.localStorage) {
            window.localStorage.setItem(this.tokenKey, token);
          }
        } else {
          // Cookie mode: guarantee no raw token in localStorage (NFR-SEC-03)
          if (window.localStorage) {
            window.localStorage.removeItem(this.tokenKey);
          }
        }
      } catch {
        // Storage restricted
      }
    }
  }

  /**
   * Retrieves the active authentication token.
   *
   * In 'cookie' strategy:
   * - The browser transmits the token automatically via HttpOnly cookie.
   * - Returns inMemoryToken if set, or null (JS cannot read HttpOnly cookies).
   *
   * In 'bearer' strategy:
   * - Returns inMemoryToken or reads from localStorage.
   *
   * @returns {string|null}
   */
  getToken() {
    if (this.inMemoryToken) {
      if (isTokenExpired(this.inMemoryToken)) {
        this.clearToken();
        return null;
      }
      return this.inMemoryToken;
    }

    if (this.isBearerStrategy() && typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(this.tokenKey);
        if (stored) {
          if (isTokenExpired(stored)) {
            this.clearToken();
            return null;
          }
          this.inMemoryToken = stored;
          return stored;
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Checks whether an active session or token exists.
   *
   * In 'cookie' strategy:
   * - Checks whether the non-sensitive session active indicator is set,
   *   or inMemoryToken is present.
   *
   * In 'bearer' strategy:
   * - Checks whether a valid bearer token exists.
   *
   * @returns {boolean}
   */
  hasToken() {
    if (this.inMemoryToken) return true;

    if (typeof window !== 'undefined') {
      try {
        if (window.localStorage?.getItem(this.tokenKey)) {
          return true;
        }
        if (
          this.isCookieStrategy() &&
          window.sessionStorage?.getItem(this.sessionKey) === 'true'
        ) {
          return true;
        }
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Clears stored tokens and active session indicators.
   */
  clearToken() {
    this.inMemoryToken = null;

    if (typeof window !== 'undefined') {
      try {
        if (window.localStorage) {
          window.localStorage.removeItem(this.tokenKey);
          window.localStorage.removeItem(STORAGE_KEYS.USER);
        }
        if (window.sessionStorage) {
          window.sessionStorage.removeItem(this.sessionKey);
        }
      } catch {
        // Storage restricted
      }
    }
  }

  /**
   * Subscribes to token revocation events (logout, password change).
   *
   * @param {Function} callback
   * @returns {() => void} Unsubscribe function
   */
  onRevoke(callback) {
    if (typeof callback === 'function') {
      this.revocationListeners.add(callback);
    }
    return () => this.revocationListeners.delete(callback);
  }

  /**
   * Triggers token revocation lifecycle (NFR-SEC-03).
   * Called on logout or when password is changed.
   *
   * @param {'logout'|'password_change'|'expiry'} reason
   */
  revoke(reason = 'logout') {
    this.clearToken();
    for (const listener of this.revocationListeners) {
      try {
        listener(reason);
      } catch {
        // Ignore listener error
      }
    }
  }

  /**
   * Revoke token upon user logout (AUTH-05, NFR-SEC-03).
   */
  revokeOnLogout() {
    this.revoke('logout');
  }

  /**
   * Revoke existing token upon password change or reset (AUTH-11, NFR-SEC-03).
   */
  revokeOnPasswordChange() {
    this.revoke('password_change');
  }

  /**
   * Extracts active CSRF token (XSRF-TOKEN) from document.cookie (NFR-SEC-06).
   * @returns {string|null}
   */
  getCsrfToken() {
    return getCsrfTokenFromCookie();
  }

  /**
   * Generates authorization header object if in bearer mode or token available.
   *
   * @returns {Record<string, string>}
   */
  getAuthHeaders() {
    const token = this.getToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }
}

/**
 * Singleton instance of TokenStorage initialized with environment defaults.
 */
export const tokenStorage = new TokenStorage();

export default tokenStorage;
