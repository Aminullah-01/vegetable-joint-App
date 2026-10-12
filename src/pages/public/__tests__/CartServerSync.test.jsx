import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Cart } from '../Cart';
import { AuthProvider, CartProvider, ToastProvider } from '../../../context';
import { cartService } from '../../../services/cartService';
import { authService } from '../../../services/authService';
import { mergeCartItems } from '../../../utils/cartCalculations';
import { STRINGS } from '../../../constants';

const mockTomato = {
  id: 1,
  product_id: 1,
  name: 'Fresh Roma Tomatoes',
  price: 2500,
  unit: 'basket',
  quantity: 2,
  available_stock: 45,
  subtotal: 5000,
  seller_id: 1,
  seller: { id: 1, business_name: 'Arewa Fresh Farms', location: 'Gombe' },
};

const mockPepper = {
  id: 2,
  product_id: 2,
  name: 'Fresh Scotch Bonnet (Ata Rodo)',
  price: 1800,
  unit: 'basket',
  quantity: 3,
  available_stock: 25,
  subtotal: 5400,
  seller_id: 1,
  seller: { id: 1, business_name: 'Arewa Fresh Farms', location: 'Gombe' },
};

const mockOnion = {
  id: 3,
  product_id: 3,
  name: 'Northern Red Onions',
  price: 1200,
  unit: 'bag',
  quantity: 1,
  available_stock: 30,
  subtotal: 1200,
  seller_id: 1,
  seller: { id: 1, business_name: 'Arewa Fresh Farms', location: 'Gombe' },
};

function TestCartApp({ initialUser = null, initialLocalCart = null }) {
  if (initialLocalCart) {
    localStorage.setItem(
      'vegetable_joint_cart',
      JSON.stringify(initialLocalCart)
    );
  }

  if (initialUser) {
    localStorage.setItem('vegetable_joint_user', JSON.stringify(initialUser));
    localStorage.setItem('vegetable_joint_token', 'mock-valid-token');
    vi.spyOn(authService, 'getProfile').mockResolvedValue(initialUser);
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={['/cart']}>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

TestCartApp.propTypes = {
  initialUser: PropTypes.object,
  initialLocalCart: PropTypes.array,
};

describe('Server-side Cart Sync & Device Persistence (FE-061 / CART-10)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('mergeCartItems Utility Function', () => {
    it('returns server items when local cart is empty', () => {
      const merged = mergeCartItems([], [mockTomato, mockPepper]);
      expect(merged).toHaveLength(2);
      expect(merged[0].name).toBe('Fresh Roma Tomatoes');
      expect(merged[1].name).toBe('Fresh Scotch Bonnet (Ata Rodo)');
    });

    it('returns local items when server cart is empty', () => {
      const merged = mergeCartItems([mockTomato], []);
      expect(merged).toHaveLength(1);
      expect(merged[0].name).toBe('Fresh Roma Tomatoes');
    });

    it('combines quantities for overlapping products bounded by available stock', () => {
      const local = [{ ...mockTomato, quantity: 4 }];
      const server = [{ ...mockTomato, quantity: 3, available_stock: 6 }];

      const merged = mergeCartItems(local, server);
      expect(merged).toHaveLength(1);
      // min(3 + 4, 6) = 6 (bounded by stock)
      expect(merged[0].quantity).toBe(6);
      expect(merged[0].subtotal).toBe(6 * 2500);
    });

    it('merges non-overlapping items from both local and server carts', () => {
      const local = [mockTomato];
      const server = [mockPepper, mockOnion];

      const merged = mergeCartItems(local, server);
      expect(merged).toHaveLength(3);
      const productIds = merged.map((i) => i.product_id);
      expect(productIds).toContain(1);
      expect(productIds).toContain(2);
      expect(productIds).toContain(3);
    });
  });

  describe('CartContext & Cart Page Integration with Server Sync', () => {
    const buyerUser = {
      id: 6,
      name: 'Amina Bello',
      email: 'buyer@example.com',
      role: 'buyer',
    };

    it('loads and merges remote server cart for authenticated buyer when local cart is empty (CART-10)', async () => {
      vi.spyOn(cartService, 'fetchCart').mockResolvedValue({
        items: [mockTomato, mockPepper],
        updated_at: '2026-02-20T10:00:00Z',
      });
      const syncSpy = vi.spyOn(cartService, 'syncCart').mockResolvedValue({
        items: [mockTomato, mockPepper],
        updated_at: '2026-02-20T10:00:00Z',
      });

      render(<TestCartApp initialUser={buyerUser} initialLocalCart={[]} />);

      // Verify remote items are loaded into the UI
      expect(
        await screen.findByText('Fresh Roma Tomatoes')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Fresh Scotch Bonnet (Ata Rodo)')
      ).toBeInTheDocument();

      // Verify sync indicator displays synced status
      expect(
        await screen.findByTestId('cart-sync-indicator')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Cart synced across devices/i)
      ).toBeInTheDocument();

      expect(cartService.fetchCart).toHaveBeenCalledTimes(1);
      expect(syncSpy).toHaveBeenCalled();
    });

    it('merges local guest cart with server cart when buyer signs in (CART-10)', async () => {
      // Local cart has Tomato (qty 2)
      // Server cart has Onion (qty 1)
      vi.spyOn(cartService, 'fetchCart').mockResolvedValue({
        items: [mockOnion],
        updated_at: '2026-02-20T08:00:00Z',
      });
      vi.spyOn(cartService, 'syncCart').mockResolvedValue({
        items: [mockTomato, mockOnion],
        updated_at: '2026-02-20T10:00:00Z',
      });

      render(
        <TestCartApp initialUser={buyerUser} initialLocalCart={[mockTomato]} />
      );

      // UI should show both the local item and the server item
      expect(
        await screen.findByText('Fresh Roma Tomatoes')
      ).toBeInTheDocument();
      expect(screen.getByText('Northern Red Onions')).toBeInTheDocument();

      // Local storage should contain merged cart
      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('vegetable_joint_cart'));
        expect(stored).toHaveLength(2);
      });
    });

    it('auto-syncs cart changes to server when authenticated buyer updates quantity', async () => {
      const syncSpy = vi.spyOn(cartService, 'syncCart').mockResolvedValue({
        items: [mockTomato],
        updated_at: '2026-02-20T11:00:00Z',
      });

      const user = userEvent.setup();
      render(
        <TestCartApp initialUser={buyerUser} initialLocalCart={[mockTomato]} />
      );

      expect(
        await screen.findByText('Fresh Roma Tomatoes')
      ).toBeInTheDocument();

      // Increase quantity
      const incrementBtn = screen.getByRole('button', {
        name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
      });
      await user.click(incrementBtn);

      await waitFor(() => {
        expect(syncSpy).toHaveBeenCalled();
      });
    });

    it('clears server cart when authenticated buyer clears their cart', async () => {
      const clearSpy = vi.spyOn(cartService, 'clearCart').mockResolvedValue({
        success: true,
      });

      const user = userEvent.setup();
      render(
        <TestCartApp initialUser={buyerUser} initialLocalCart={[mockTomato]} />
      );

      expect(
        await screen.findByText('Fresh Roma Tomatoes')
      ).toBeInTheDocument();

      // Click clear cart
      const clearBtn = screen.getByTestId('clear-cart-button');
      await user.click(clearBtn);

      // Confirm in dialog
      const confirmBtn = await screen.findByRole('button', {
        name: /Clear Cart/i,
      });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(clearSpy).toHaveBeenCalled();
        expect(screen.getByTestId('empty-cart-state')).toBeInTheDocument();
      });
    });

    it('gracefully degrades to local storage if server sync fails (resilience)', async () => {
      vi.spyOn(cartService, 'fetchCart').mockRejectedValue(
        new Error('Network offline')
      );

      render(
        <TestCartApp initialUser={buyerUser} initialLocalCart={[mockTomato]} />
      );

      // Local cart items still render without breaking
      expect(
        await screen.findByText('Fresh Roma Tomatoes')
      ).toBeInTheDocument();

      // Sync indicator reflects local/offline status
      expect(
        await screen.findByTestId('cart-sync-indicator')
      ).toBeInTheDocument();
      expect(screen.getByText(STRINGS.CART.SYNC_OFFLINE)).toBeInTheDocument();
    });

    it('does not trigger server cart sync for unauthenticated guests (CART-06)', async () => {
      const fetchSpy = vi.spyOn(cartService, 'fetchCart');
      const syncSpy = vi.spyOn(cartService, 'syncCart');

      render(
        <TestCartApp initialUser={null} initialLocalCart={[mockTomato]} />
      );

      expect(
        await screen.findByText('Fresh Roma Tomatoes')
      ).toBeInTheDocument();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(syncSpy).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId('cart-sync-indicator')
      ).not.toBeInTheDocument();
    });
  });
});
