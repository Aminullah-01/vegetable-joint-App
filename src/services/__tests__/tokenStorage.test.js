import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TokenStorage,
  TOKEN_STRATEGIES,
  STORAGE_KEYS,
  parseJwtPayload,
  isTokenExpired,
  getCsrfTokenFromCookie,
} from '../tokenStorage.js';

function clearCookies() {
  if (typeof document !== 'undefined' && document.cookie) {
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  }
}

describe('TokenStorage & Strategy Manager (NFR-SEC-03, IF-05, NFR-SEC-06)', () => {
  let storage;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearCookies();
    storage = new TokenStorage({ strategy: TOKEN_STRATEGIES.COOKIE });
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearCookies();
    vi.restoreAllMocks();
  });

  describe('Authentication Strategy Configuration', () => {
    it('defaults to cookie strategy (HttpOnly cookie preferred per NFR-SEC-03)', () => {
      expect(storage.getStrategy()).toBe(TOKEN_STRATEGIES.COOKIE);
      expect(storage.isCookieStrategy()).toBe(true);
      expect(storage.isBearerStrategy()).toBe(false);
    });

    it('allows switching to bearer strategy (IF-05)', () => {
      storage.setStrategy(TOKEN_STRATEGIES.BEARER);
      expect(storage.getStrategy()).toBe(TOKEN_STRATEGIES.BEARER);
      expect(storage.isBearerStrategy()).toBe(true);
      expect(storage.isCookieStrategy()).toBe(false);
      expect(window.localStorage.getItem(STORAGE_KEYS.STRATEGY)).toBe('bearer');
    });

    it('rejects invalid strategy identifiers', () => {
      expect(() => storage.setStrategy('oauth_popup')).toThrow(
        'Invalid authentication strategy'
      );
    });

    it('wipes raw token from localStorage when switching from bearer to cookie strategy', () => {
      storage.setStrategy(TOKEN_STRATEGIES.BEARER);
      storage.setToken('raw-secret-bearer-token');
      expect(window.localStorage.getItem(STORAGE_KEYS.TOKEN)).toBe(
        'raw-secret-bearer-token'
      );

      // Switching to cookie mode must wipe raw token to prevent XSS exposure
      storage.setStrategy(TOKEN_STRATEGIES.COOKIE);
      expect(window.localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    });
  });

  describe('HttpOnly Cookie Strategy — Minimizing XSS Exposure (NFR-SEC-03)', () => {
    it('does NOT write raw token to localStorage in cookie mode', () => {
      storage.setToken('secret-session-token');

      // Crucial NFR-SEC-03 verification: raw token must not be in localStorage
      expect(window.localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();

      // Session marker indicates authenticated session exists
      expect(window.sessionStorage.getItem(STORAGE_KEYS.SESSION_ACTIVE)).toBe(
        'true'
      );
      expect(storage.hasToken()).toBe(true);
    });

    it('clears session indicators on clearToken', () => {
      storage.setToken('token-to-clear');
      expect(storage.hasToken()).toBe(true);

      storage.clearToken();
      expect(storage.hasToken()).toBe(false);
      expect(
        window.sessionStorage.getItem(STORAGE_KEYS.SESSION_ACTIVE)
      ).toBeNull();
    });
  });

  describe('Bearer Token Strategy (IF-05)', () => {
    beforeEach(() => {
      storage.setStrategy(TOKEN_STRATEGIES.BEARER);
    });

    it('persists and retrieves token from localStorage in bearer mode', () => {
      storage.setToken('valid-bearer-token-12345');

      expect(window.localStorage.getItem(STORAGE_KEYS.TOKEN)).toBe(
        'valid-bearer-token-12345'
      );
      expect(storage.getToken()).toBe('valid-bearer-token-12345');
      expect(storage.hasToken()).toBe(true);
    });

    it('returns authorization header object with Bearer token', () => {
      storage.setToken('auth-bearer-token');
      expect(storage.getAuthHeaders()).toEqual({
        Authorization: 'Bearer auth-bearer-token',
      });
    });

    it('returns empty headers when no token exists', () => {
      storage.clearToken();
      expect(storage.getAuthHeaders()).toEqual({});
    });
  });

  describe('Token Revocation Lifecycle (NFR-SEC-03, AUTH-05, AUTH-11)', () => {
    it('notifies subscribers and clears tokens on revokeOnLogout', () => {
      const listener = vi.fn();
      const unsubscribe = storage.onRevoke(listener);

      storage.setToken('active-token');
      storage.revokeOnLogout();

      expect(listener).toHaveBeenCalledWith('logout');
      expect(storage.hasToken()).toBe(false);

      unsubscribe();
      storage.revokeOnLogout();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifies subscribers and clears tokens on revokeOnPasswordChange', () => {
      const listener = vi.fn();
      storage.onRevoke(listener);

      storage.setToken('active-token');
      storage.revokeOnPasswordChange();

      expect(listener).toHaveBeenCalledWith('password_change');
      expect(storage.hasToken()).toBe(false);
    });
  });

  describe('CSRF Token Handling (NFR-SEC-06)', () => {
    it('extracts and decodes XSRF-TOKEN cookie from document.cookie', () => {
      // Simulate Laravel Sanctum encrypted or url-encoded CSRF cookie
      document.cookie =
        'XSRF-TOKEN=eyJpdiI6Inh4eCIsInZhbHVlIjoidGVzdCJ9%3D; Path=/';

      const csrf = getCsrfTokenFromCookie();
      expect(csrf).toBe('eyJpdiI6Inh4eCIsInZhbHVlIjoidGVzdCJ9=');
      expect(storage.getCsrfToken()).toBe(
        'eyJpdiI6Inh4eCIsInZhbHVlIjoidGVzdCJ9='
      );
    });

    it('returns null when no CSRF cookie exists', () => {
      document.cookie = 'other_cookie=value; Path=/';
      expect(getCsrfTokenFromCookie()).toBeNull();
    });
  });

  describe('JWT Payload Parsing and Expiry Verification (NFR-SEC-03)', () => {
    it('decodes standard JWT payload structure', () => {
      // Header: {"alg":"HS256","typ":"JWT"} -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
      // Payload: {"sub":"1234567890","name":"Buyer","exp":1999999999} -> eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkJ1eWVyIiwiZXhwIjoxOTk5OTk5OTk5fQ
      const testJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkJ1eWVyIiwiZXhwIjoxOTk5OTk5OTk5fQ.signature';

      const payload = parseJwtPayload(testJwt);
      expect(payload).not.toBeNull();
      expect(payload.sub).toBe('1234567890');
      expect(payload.name).toBe('Buyer');
      expect(payload.exp).toBe(1999999999);
    });

    it('detects unexpired token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour ahead
      const payloadBase64 = btoa(JSON.stringify({ exp: futureExp }));
      const validJwt = `header.${payloadBase64}.signature`;

      expect(isTokenExpired(validJwt)).toBe(false);
    });

    it('detects expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payloadBase64 = btoa(JSON.stringify({ exp: pastExp }));
      const expiredJwt = `header.${payloadBase64}.signature`;

      expect(isTokenExpired(expiredJwt)).toBe(true);
    });

    it('treats null or empty token as expired', () => {
      expect(isTokenExpired(null)).toBe(true);
      expect(isTokenExpired('')).toBe(true);
    });
  });
});
