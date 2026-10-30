import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../apiClient.js';
import { ApiError, ERROR_CODES, createNetworkError } from '../apiErrors.js';
import { networkStatus } from '../networkStatus.js';

describe('FE-111: ApiClient Retry & Offline Error Handling (NFR-REL-05, MKT-10)', () => {
  let client;

  beforeEach(() => {
    vi.restoreAllMocks();
    networkStatus.reset();
    client = new ApiClient({
      baseUrl: 'https://api.vegetablejoint.ng/api/v1',
      maxRetries: 2,
      retryDelay: 10, // Short delay for tests
      backoffMultiplier: 1.5,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    networkStatus.reset();
  });

  describe('Transient Network Error & Automatic Retry', () => {
    it('retries safe GET requests on network failure up to maxRetries before throwing', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(client.get('/products')).rejects.toThrow();

      // Initial attempt (1) + 2 retries = 3 calls
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('succeeds if a transient network failure resolves on a subsequent retry attempt', async () => {
      let attempts = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new TypeError('Network connection lost');
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ data: [{ id: 1, name: 'Fresh Spinach' }] }),
        };
      });

      const response = await client.get('/products');
      expect(attempts).toBe(3);
      expect(response.data).toEqual([{ id: 1, name: 'Fresh Spinach' }]);
    });

    it('retries transient 502/503/504 gateway and server errors for safe methods', async () => {
      let attempts = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        attempts += 1;
        if (attempts === 1) {
          return {
            ok: false,
            status: 503,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ message: 'Service Temporarily Unavailable' }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            data: { id: 10, site_name: 'Vegetable Joint' },
          }),
        };
      });

      const result = await client.get('/settings');
      expect(attempts).toBe(2);
      expect(result.data.id).toBe(10);
    });

    it('does NOT retry client-side errors (400, 401, 403, 404, 409, 422)', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Product not found.' }),
      });

      await expect(client.get('/products/99999')).rejects.toThrow(
        'Product not found.'
      );
      // Client 404 error should fail immediately without retry
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('allows overriding retries per request to disable automatic retry (retries: 0)', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(client.get('/products', { retries: 0 })).rejects.toThrow();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('retries mutation requests when marked idempotent (NFR-REL-04)', async () => {
      let attempts = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new TypeError('Connection timeout');
        }
        return {
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            checkout_ref: 'CHK-RETRY-001',
            orders: [{ id: 101, status: 'pending' }],
          }),
        };
      });

      const result = await client.post(
        '/orders',
        { checkout_ref: 'CHK-RETRY-001' },
        { idempotent: true, retries: 2 }
      );

      expect(attempts).toBe(2);
      expect(result.data.checkout_ref).toBe('CHK-RETRY-001');
    });

    it('provides requestWithRetry convenience method', async () => {
      let attempts = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        attempts += 1;
        if (attempts < 2) {
          throw new TypeError('Failed to fetch');
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ data: { success: true } }),
        };
      });

      const res = await client.requestWithRetry('/ping');
      expect(attempts).toBe(2);
      expect(res.data.success).toBe(true);
    });
  });

  describe('Error Classification & Offline Categorization (NFR-REL-05)', () => {
    it('surfaces ApiError with isNetworkError: true and attempts count on exhaustion', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new TypeError('Failed to fetch')
      );

      try {
        await client.get('/categories');
        expect.unreachable('Should have thrown network error');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.isNetworkError).toBe(true);
        expect(err.code).toBe(ERROR_CODES.NETWORK_ERROR);
        expect(err.attempts).toBe(3); // 1 initial + 2 retries
      }
    });

    it('detects when the browser is offline and provides a clear friendly message', () => {
      const origOnLine = navigator.onLine;
      try {
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          configurable: true,
        });

        const error = createNetworkError(new TypeError('Failed to fetch'), 2);
        expect(error.isOffline).toBe(true);
        expect(error.message).toContain('offline');
        expect(error.attempts).toBe(2);
      } finally {
        Object.defineProperty(navigator, 'onLine', {
          value: origOnLine,
          configurable: true,
        });
      }
    });

    it('identifies timeout errors correctly', () => {
      const timeoutErr = new Error('Request timeout after 30000ms');
      timeoutErr.name = 'AbortError';

      const error = createNetworkError(timeoutErr);
      expect(error.code).toBe(ERROR_CODES.TIMEOUT_ERROR);
      expect(error.message).toContain('timed out');
    });
  });

  describe('NetworkStatus Service & Simulation', () => {
    it('notifies subscribers on network connectivity state transitions', () => {
      const callback = vi.fn();
      const unsubscribe = networkStatus.subscribe(callback);

      networkStatus.setSimulatedStatus(false);
      expect(callback).toHaveBeenCalledWith(false);
      expect(networkStatus.isOffline()).toBe(true);

      networkStatus.setSimulatedStatus(true);
      expect(callback).toHaveBeenCalledWith(true);
      expect(networkStatus.isOnline()).toBe(true);

      unsubscribe();
      networkStatus.setSimulatedStatus(false);
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});
