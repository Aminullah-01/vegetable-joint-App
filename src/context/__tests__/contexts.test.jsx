import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import PropTypes from 'prop-types';
import { CartProvider } from '../CartContext.jsx';
import { useCart } from '../../hooks/useCart.js';
import { ToastProvider } from '../ToastContext.jsx';
import { useToast } from '../../hooks/useToast.js';
import { AuthProvider } from '../AuthContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';

describe('Global Application Contexts (NFR-MAIN-04)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('CartContext & useCart (CART-01 to CART-09, BR-02, BR-04)', () => {
    const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
    wrapper.propTypes = { children: PropTypes.node.isRequired };

    const sampleProduct = {
      id: 101,
      name: 'Fresh Tomatoes',
      price: 2500,
      quantity: 10,
      unit: 'basket',
    };

    it('initializes with an empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.items).toEqual([]);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.subtotal).toBe(0);
    });

    it('adds item to cart and updates subtotal (CART-01, BR-02)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleProduct, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.items[0].subtotal).toBe(5000);
      expect(result.current.subtotal).toBe(5000);
      expect(result.current.itemCount).toBe(2);
    });

    it('clamps quantity to available stock (BR-04, CART-02)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      // Request 15 items when available stock is 10
      act(() => {
        result.current.addItem(sampleProduct, 15);
      });

      expect(result.current.items[0].quantity).toBe(10);
      expect(result.current.items[0].subtotal).toBe(25000);
    });

    it('updates quantity and prevents values below 1 (CART-02)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleProduct, 3);
      });

      act(() => {
        result.current.updateQuantity(101, 5);
      });
      expect(result.current.items[0].quantity).toBe(5);

      // Attempting to set 0 or negative should clamp to 1 (must use removeItem to delete)
      act(() => {
        result.current.updateQuantity(101, 0);
      });
      expect(result.current.items[0].quantity).toBe(1);
    });

    it('removes item from cart (CART-03)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleProduct, 2);
      });
      expect(result.current.items).toHaveLength(1);

      act(() => {
        result.current.removeItem(101);
      });
      expect(result.current.items).toHaveLength(0);
      expect(result.current.itemCount).toBe(0);
    });

    it('clears entire cart (CART-05)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleProduct, 2);
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.subtotal).toBe(0);
    });
  });

  describe('ToastContext & useToast (ERR-03)', () => {
    const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>;
    wrapper.propTypes = { children: PropTypes.node.isRequired };

    it('triggers success and error notifications', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      let toastId;
      act(() => {
        toastId = result.current.success('Product saved successfully');
      });

      expect(toastId).toBeTruthy();

      act(() => {
        result.current.dismiss(toastId);
      });
    });
  });

  describe('AuthContext & useAuth (AUTH-04, ERR-04)', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    wrapper.propTypes = { children: PropTypes.node.isRequired };

    it('initializes with session state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isSessionExpired');
    });

    it('triggers and dismisses session expired prompt (ERR-04)', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.triggerSessionExpired();
      });
      expect(result.current.isSessionExpired).toBe(true);

      act(() => {
        result.current.dismissSessionExpired();
      });
      expect(result.current.isSessionExpired).toBe(false);
    });
  });
});
