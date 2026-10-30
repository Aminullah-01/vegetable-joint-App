import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../apiClient.js';
import { TokenStorage, TOKEN_STRATEGIES } from '../tokenStorage.js';

describe('ApiClient Token Handling, CORS & CSRF Setup (NFR-SEC-03, NFR-SEC-10, IF-05)', () => {
  let customStorage;
  let client;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.cookie = '';

    customStorage = new TokenStorage({ strategy: TOKEN_STRATEGIES.COOKIE });
    client = new ApiClient({
      baseUrl: 'https://staging-api.vegetablejoint.ng/api/v1',
      authStrategy: TOKEN_STRATEGIES.COOKIE,
      withCredentials: true,
      sanctumCsrfUrl:
        'https://staging-api.vegetablejoint.ng/sanctum/csrf-cookie',
      storage: customStorage,
    });
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.cookie = '';
    vi.restoreAllMocks();
  });

  describe('CORS Credentials Handling (NFR-SEC-10, Section 4.5)', () => {
    it('sets credentials: "include" for cross-origin requests when in cookie mode', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { id: 1, name: 'Produce' } }),
      });

      await client.get('/products');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://staging-api.vegetablejoint.ng/api/v1/products',
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    it('allows overriding credentials per request', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {} }),
      });

      await client.get('/public-feed', { credentials: 'omit' });

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://staging-api.vegetablejoint.ng/api/v1/public-feed',
        expect.objectContaining({
          credentials: 'omit',
        })
      );
    });
  });

  describe('CSRF Protection Header Injection (NFR-SEC-06, Laravel Sanctum)', () => {
    it('automatically attaches X-XSRF-TOKEN header on state-changing requests when cookie exists', async () => {
      document.cookie = 'XSRF-TOKEN=test-csrf-token-1234; Path=/';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { status: 'created' } }),
      });

      await client.post('/cart/items', { product_id: 1, quantity: 2 });

      expect(fetchSpy).toHaveBeenCalled();
      const callHeaders = fetchSpy.mock.calls[0][1].headers;
      expect(callHeaders.get('X-XSRF-TOKEN')).toBe('test-csrf-token-1234');
    });

    it('does NOT inject X-XSRF-TOKEN on safe GET requests', async () => {
      document.cookie = 'XSRF-TOKEN=test-csrf-token-1234; Path=/';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [] }),
      });

      await client.get('/products');

      const callHeaders = fetchSpy.mock.calls[0][1].headers;
      expect(callHeaders.get('X-XSRF-TOKEN')).toBeNull();
    });

    it('dispatches ensureCsrfCookie to the designated Sanctum endpoint', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
        text: async () => '',
      });

      await client.ensureCsrfCookie();

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://staging-api.vegetablejoint.ng/sanctum/csrf-cookie',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });
  });

  describe('Bearer Token Strategy & Authorization Header (IF-05)', () => {
    it('switches to bearer mode and attaches Authorization Bearer header', async () => {
      client.setAuthStrategy(TOKEN_STRATEGIES.BEARER);
      client.setToken('bearer-jwt-token-xyz');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { id: 5, email: 'buyer@test.ng' } }),
      });

      await client.get('/profile');

      const callHeaders = fetchSpy.mock.calls[0][1].headers;
      expect(callHeaders.get('Authorization')).toBe(
        'Bearer bearer-jwt-token-xyz'
      );
    });

    it('omits Authorization header when skipAuth is true', async () => {
      client.setAuthStrategy(TOKEN_STRATEGIES.BEARER);
      client.setToken('bearer-jwt-token-xyz');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {} }),
      });

      await client.get('/public-catalog', { skipAuth: true });

      const callHeaders = fetchSpy.mock.calls[0][1].headers;
      expect(callHeaders.get('Authorization')).toBeNull();
    });
  });
});
