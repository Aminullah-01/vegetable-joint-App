import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { CartProvider } from '../CartContext';
import { useCart } from '../../hooks/useCart';
import { Cart } from '../../pages/public/Cart';
import { ToastProvider } from '../ToastContext';
import { STRINGS } from '../../constants';

const sampleTomato = {
  id: 1,
  name: 'Fresh Roma Tomatoes',
  price: 2500,
  unit: 'basket',
  quantity: 10, // Available stock
  availability: 'in_stock',
  seller_id: 1,
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    location: 'Gombe',
  },
};

const samplePepper = {
  id: 2,
  name: 'Fresh Scotch Bonnet',
  price: 1800,
  unit: 'basket',
  quantity: 5, // Available stock: 5
  availability: 'in_stock',
  seller_id: 1,
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    location: 'Gombe',
  },
};

const sampleOutOfStock = {
  id: 3,
  name: 'Sold Out Spinach',
  price: 800,
  unit: 'bunch',
  quantity: 0,
  availability: 'out_of_stock',
};

const sampleUnavailable = {
  id: 4,
  name: 'Unavailable Carrots',
  price: 1200,
  unit: 'kg',
  quantity: 15,
  availability: 'unavailable',
};

describe('Add / Update / Remove Cart Items (FE-055 / CART-01 to CART-03, BR-02, BR-04)', () => {
  const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
  wrapper.propTypes = { children: PropTypes.node.isRequired };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('CART-01: Adding products to cart', () => {
    it('adds product with chosen quantity (>= 1)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      let success;
      act(() => {
        success = result.current.addItem(sampleTomato, 3);
      });

      expect(success).toBe(true);
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toMatchObject({
        product_id: 1,
        name: 'Fresh Roma Tomatoes',
        price: 2500,
        unit: 'basket',
        quantity: 3,
        subtotal: 7500,
      });
      expect(result.current.itemCount).toBe(3);
      expect(result.current.subtotal).toBe(7500);
      expect(result.current.total).toBe(7500);
    });

    it('defaults quantity to 1 if not specified or invalid', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleTomato);
      });

      expect(result.current.items[0].quantity).toBe(1);
      expect(result.current.subtotal).toBe(2500);
    });

    it('clamps initial quantity to available stock when adding more than stock (BR-04)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      // Available stock is 10, requesting 25
      act(() => {
        result.current.addItem(sampleTomato, 25);
      });

      expect(result.current.items[0].quantity).toBe(10);
      expect(result.current.items[0].subtotal).toBe(25000);
    });

    it('increments quantity and clamps to stock when adding an already present item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleTomato, 4);
      });
      expect(result.current.items[0].quantity).toBe(4);

      // Add 3 more (total 7 <= 10)
      act(() => {
        result.current.addItem(sampleTomato, 3);
      });
      expect(result.current.items[0].quantity).toBe(7);
      expect(result.current.items[0].subtotal).toBe(17500);

      // Add 10 more (should clamp to max stock 10)
      act(() => {
        result.current.addItem(sampleTomato, 10);
      });
      expect(result.current.items[0].quantity).toBe(10);
      expect(result.current.items[0].subtotal).toBe(25000);
    });

    it('rejects adding out of stock or unavailable products', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      let outOfStockRes;
      let unavailableRes;

      act(() => {
        outOfStockRes = result.current.addItem(sampleOutOfStock, 1);
        unavailableRes = result.current.addItem(sampleUnavailable, 1);
      });

      expect(outOfStockRes).toBe(false);
      expect(unavailableRes).toBe(false);
      expect(result.current.items).toHaveLength(0);
      expect(result.current.isEmpty).toBe(true);
    });

    it('rejects invalid product payloads', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.addItem(null)).toBe(false);
      expect(result.current.addItem({})).toBe(false);
      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('CART-02: Updating cart line quantity', () => {
    it('increases or decreases quantity and updates subtotal accurately', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleTomato, 2);
      });
      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.items[0].subtotal).toBe(5000);

      // Increase to 5
      act(() => {
        result.current.updateQuantity(1, 5);
      });
      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.items[0].subtotal).toBe(12500);
      expect(result.current.itemCount).toBe(5);
      expect(result.current.total).toBe(12500);

      // Decrease to 3
      act(() => {
        result.current.updateQuantity(1, 3);
      });
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.items[0].subtotal).toBe(7500);
      expect(result.current.itemCount).toBe(3);
      expect(result.current.total).toBe(7500);
    });

    it('clamps quantity to available stock when update exceeds limit (BR-04)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(samplePepper, 2); // max stock 5
      });

      act(() => {
        result.current.updateQuantity(2, 99);
      });

      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.items[0].subtotal).toBe(9000);
    });

    it('prevents quantity from falling below 1; clamping to 1 (CART-02)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleTomato, 3);
      });

      // Attempt to update to 0
      act(() => {
        result.current.updateQuantity(1, 0);
      });
      expect(result.current.items[0].quantity).toBe(1);

      // Attempt to update to negative
      act(() => {
        result.current.updateQuantity(1, -5);
      });
      expect(result.current.items[0].quantity).toBe(1);

      // Attempt with NaN or invalid string
      act(() => {
        result.current.updateQuantity(1, 'invalid');
      });
      expect(result.current.items[0].quantity).toBe(1);
    });

    it('ignores updateQuantity for non-existent product ID', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleTomato, 2);
        result.current.updateQuantity(999, 10);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
    });
  });

  describe('CART-03: Removing cart items', () => {
    it('removes item from cart and recalculates totals', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleTomato, 2); // 5000
        result.current.addItem(samplePepper, 1); // 1800
      });
      expect(result.current.items).toHaveLength(2);
      expect(result.current.itemCount).toBe(3);
      expect(result.current.total).toBe(6800);

      // Remove tomato
      act(() => {
        result.current.removeItem(1);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product_id).toBe(2);
      expect(result.current.itemCount).toBe(1);
      expect(result.current.total).toBe(1800);
      expect(result.current.subtotal).toBe(1800);
    });

    it('transitions to empty cart when last item is removed', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleTomato, 2);
      });
      expect(result.current.isEmpty).toBe(false);

      act(() => {
        result.current.removeItem(1);
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('CART-06: LocalStorage persistence of cart modifications', () => {
    it('persists added items and updates to localStorage', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(sampleTomato, 2);
      });

      const stored = JSON.parse(
        localStorage.getItem('vegetable_joint_cart') || '[]'
      );
      expect(stored).toHaveLength(1);
      expect(stored[0].quantity).toBe(2);

      // Update quantity
      act(() => {
        result.current.updateQuantity(1, 4);
      });

      const storedUpdated = JSON.parse(
        localStorage.getItem('vegetable_joint_cart') || '[]'
      );
      expect(storedUpdated[0].quantity).toBe(4);

      // Remove item
      act(() => {
        result.current.removeItem(1);
      });

      const storedRemoved = JSON.parse(
        localStorage.getItem('vegetable_joint_cart') || '[]'
      );
      expect(storedRemoved).toHaveLength(0);
    });
  });

  describe('Cart Page Interactive Add/Update/Remove UI Flow', () => {
    function FullCartApp() {
      return (
        <MemoryRouter initialEntries={['/cart']}>
          <ToastProvider>
            <CartProvider>
              <Routes>
                <Route path="/cart" element={<Cart />} />
                <Route path="/products" element={<div>Marketplace</div>} />
              </Routes>
            </CartProvider>
          </ToastProvider>
        </MemoryRouter>
      );
    }

    it('allows buyer to increment, decrement, and delete cart line directly from Cart UI', async () => {
      // Pre-seed cart in localStorage
      localStorage.setItem(
        'vegetable_joint_cart',
        JSON.stringify([
          {
            product_id: 1,
            name: 'Fresh Roma Tomatoes',
            price: 2500,
            unit: 'basket',
            quantity: 2,
            available_stock: 5,
            subtotal: 5000,
            seller_id: 1,
            seller_name: 'Arewa Fresh Farms',
            seller_location: 'Gombe',
          },
        ])
      );

      const user = userEvent.setup();
      render(<FullCartApp />);

      // Verify item renders
      const itemRow = screen.getByTestId('cart-item-1');
      expect(
        within(itemRow).getByText('Fresh Roma Tomatoes')
      ).toBeInTheDocument();
      expect(
        within(itemRow).getByTestId('cart-item-subtotal-1')
      ).toHaveTextContent('₦5,000');

      // Click increment button (+)
      const incBtn = within(itemRow).getByRole('button', {
        name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
      });
      await user.click(incBtn);

      // Subtotal updates to ₦7,500 (3 * 2500)
      expect(
        within(itemRow).getByTestId('cart-item-subtotal-1')
      ).toHaveTextContent('₦7,500');
      expect(screen.getByTestId('cart-grand-total')).toHaveTextContent(
        '₦7,500'
      );

      // Click decrement button (-)
      const decBtn = within(itemRow).getByRole('button', {
        name: STRINGS.PRODUCTS.DECREASE_QUANTITY,
      });
      await user.click(decBtn);

      // Subtotal updates back to ₦5,000
      expect(
        within(itemRow).getByTestId('cart-item-subtotal-1')
      ).toHaveTextContent('₦5,000');

      // Click remove button
      const removeBtn = screen.getByTestId('cart-remove-button-1');
      await user.click(removeBtn);

      // Transitions to empty state
      expect(
        screen.getByRole('heading', {
          name: STRINGS.CART.EMPTY_TITLE,
          level: 3,
        })
      ).toBeInTheDocument();
    });
  });
});
