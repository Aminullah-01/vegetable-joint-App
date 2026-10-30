import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cartService } from '../cartService.js';
import { apiClient } from '../apiClient.js';
import { mockStore } from '../../data/mockStore.js';
import { mockSwitch } from '../mockSwitch.js';
import { productService } from '../productService.js';

describe('CartService (CART-08, CART-10)', () => {
  const sampleItems = [
    {
      id: 1,
      product_id: 1,
      name: 'Fresh Roma Tomatoes',
      price: 1500,
      quantity: 2,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSwitch.setMockMode(true);
    mockStore.reset();
  });

  afterEach(() => {
    mockSwitch.reset();
  });

  describe('fetchCart (CART-10)', () => {
    it('fetches server-side cart for the current user in mock mode', async () => {
      mockStore.currentUser = { id: 6, role: 'buyer', name: 'Amina Bello' };
      mockStore.syncServerCart(6, sampleItems);

      const res = await cartService.fetchCart();
      expect(res).toBeDefined();
      expect(res.items).toHaveLength(1);
      expect(res.items[0].product_id).toBe(1);
    });

    it('makes GET request to /cart endpoint in live API mode', async () => {
      mockSwitch.setMockMode(false);
      vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: { items: sampleItems, updated_at: '2026-10-30T12:00:00Z' },
      });

      const res = await cartService.fetchCart();
      expect(apiClient.get).toHaveBeenCalledWith('/cart');
      expect(res.items).toHaveLength(1);
      expect(res.updated_at).toBe('2026-10-30T12:00:00Z');
    });
  });

  describe('syncCart (CART-10)', () => {
    it('persists and synchronizes cart items in mock mode', async () => {
      mockStore.currentUser = { id: 6, role: 'buyer', name: 'Amina Bello' };

      const res = await cartService.syncCart(sampleItems);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].quantity).toBe(2);

      // Verify persisted state
      const serverCart = mockStore.getServerCart(6);
      expect(serverCart.items).toHaveLength(1);
    });

    it('makes PUT request to /cart with items payload in live API mode', async () => {
      mockSwitch.setMockMode(false);
      vi.spyOn(apiClient, 'put').mockResolvedValue({
        data: { items: sampleItems, updated_at: '2026-10-30T12:05:00Z' },
      });

      const res = await cartService.syncCart(sampleItems);
      expect(apiClient.put).toHaveBeenCalledWith('/cart', {
        items: sampleItems,
      });
      expect(res.items).toHaveLength(1);
    });
  });

  describe('validateCart (CART-08)', () => {
    it('delegates validation to productService.validateCart', async () => {
      const validateSpy = vi
        .spyOn(productService, 'validateCart')
        .mockResolvedValue({
          is_valid: true,
          items: sampleItems,
          changes: [],
          has_price_changes: false,
          has_stock_issues: false,
          has_unavailable: false,
        });

      const res = await cartService.validateCart(sampleItems);
      expect(validateSpy).toHaveBeenCalledWith(sampleItems);
      expect(res.is_valid).toBe(true);
      expect(res.changes).toEqual([]);
    });
  });

  describe('clearCart (CART-10)', () => {
    it('clears server cart in mock mode', async () => {
      mockStore.currentUser = { id: 6, role: 'buyer', name: 'Amina Bello' };
      mockStore.syncServerCart(6, sampleItems);

      const res = await cartService.clearCart();
      expect(res.success).toBe(true);

      const serverCart = mockStore.getServerCart(6);
      expect(serverCart.items).toHaveLength(0);
    });

    it('makes DELETE request to /cart in live API mode', async () => {
      mockSwitch.setMockMode(false);
      vi.spyOn(apiClient, 'delete').mockResolvedValue({
        data: { success: true },
      });

      const res = await cartService.clearCart();
      expect(apiClient.delete).toHaveBeenCalledWith('/cart');
      expect(res.success).toBe(true);
    });
  });
});
