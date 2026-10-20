import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Cart } from '../Cart';
import { Checkout } from '../../buyer/Checkout';
import { EmptyState } from '../../../components/common/EmptyState';
import { CartContext } from '../../../context/cartContextDef.js';
import { CartProvider } from '../../../context/CartContext.jsx';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import { ToastProvider } from '../../../context/ToastContext.jsx';
import { STRINGS } from '../../../constants';

function renderCartWithState(cartValue = {}) {
  const defaultCartValue = {
    items: [],
    itemCount: 0,
    uniqueItemCount: 0,
    subtotal: 0,
    total: 0,
    isEmpty: true,
    validationNotice: null,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    validateCart: vi.fn(),
    ...cartValue,
  };

  return render(
    <MemoryRouter initialEntries={['/cart']}>
      <CartContext.Provider value={defaultCartValue}>
        <Routes>
          <Route path="/cart" element={<Cart />} />
          <Route path="/products" element={<div>Marketplace Vegetables</div>} />
          <Route path="/checkout" element={<div>Checkout Page</div>} />
        </Routes>
      </CartContext.Provider>
    </MemoryRouter>
  );
}

function renderCheckoutWithState(cartValue = {}) {
  const defaultCartValue = {
    items: [],
    itemCount: 0,
    uniqueItemCount: 0,
    subtotal: 0,
    total: 0,
    isEmpty: true,
    validationNotice: null,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    validateCart: vi.fn(),
    ...cartValue,
  };

  return render(
    <MemoryRouter initialEntries={['/checkout']}>
      <ToastProvider>
        <AuthProvider>
          <CartContext.Provider value={defaultCartValue}>
            <Routes>
              <Route path="/checkout" element={<Checkout />} />
              <Route
                path="/products"
                element={<div>Marketplace Vegetables</div>}
              />
              <Route path="/cart" element={<div>Cart Page</div>} />
            </Routes>
          </CartContext.Provider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Empty Cart State (FE-057 / CART-05, TC-11, ERR-01)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('1. Cart Page Empty State (/cart)', () => {
    it('shows “Your cart is empty.” message verbatim per ERR-01 and CART-05', () => {
      renderCartWithState({ isEmpty: true, items: [] });

      // Verbatim requirement: "Your cart is empty."
      const heading = screen.getByRole('heading', {
        name: STRINGS.CART.EMPTY_TITLE,
        level: 3,
      });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Your cart is empty.');

      // Friendly produce description
      expect(screen.getByText(STRINGS.CART.EMPTY_SUBTITLE)).toBeInTheDocument();
    });

    it('blocks checkout by not rendering proceed to checkout button or order summary', () => {
      renderCartWithState({ isEmpty: true, items: [] });

      // Checkout controls and summary MUST NOT be present
      expect(
        screen.queryByTestId('cart-checkout-button')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('cart-summary')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clear-cart-button')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('cart-item-count-badge')
      ).not.toBeInTheDocument();
    });

    it('offers prominent "Browse Marketplace Vegetables" CTA linking to /products', () => {
      renderCartWithState({ isEmpty: true, items: [] });

      const ctaBtn = screen.getByTestId('cart-empty-start-shopping');
      expect(ctaBtn).toBeInTheDocument();
      expect(ctaBtn).toHaveTextContent('Browse Marketplace Vegetables');
      expect(ctaBtn.closest('a')).toHaveAttribute('href', '/products');
    });

    it('renders accessible empty state markup with role="status"', () => {
      renderCartWithState({ isEmpty: true, items: [] });

      const emptyStatus = screen.getByTestId('empty-state');
      expect(emptyStatus).toHaveAttribute('role', 'status');
    });
  });

  describe('2. Checkout Page Empty Guard (/checkout / TC-11)', () => {
    it('prevents proceeding with empty cart and renders “Your cart is empty.” message on checkout', () => {
      renderCheckoutWithState({ isEmpty: true, items: [] });

      // TC-11: Checkout prevented; "Your cart is empty."
      expect(
        screen.getByTestId('checkout-empty-cart-state')
      ).toBeInTheDocument();

      const heading = screen.getByRole('heading', {
        name: STRINGS.CART.EMPTY_TITLE,
        level: 3,
      });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Your cart is empty.');

      // Delivery form and place order button are completely blocked
      expect(screen.queryByLabelText(/contact name/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/phone number/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/place order now/i)).not.toBeInTheDocument();

      // Offers navigation buttons back to products and cart
      const browseBtn = screen.getByTestId('checkout-empty-browse-button');
      expect(browseBtn.closest('a')).toHaveAttribute('href', '/products');

      const cartBtn = screen.getByTestId('checkout-empty-view-cart-button');
      expect(cartBtn.closest('a')).toHaveAttribute('href', '/cart');
    });
  });

  describe('3. Dynamic Transition to Empty Cart State', () => {
    it('transitions to empty cart state when removing the last item in a live cart session', async () => {
      const user = userEvent.setup();

      // Preload cart with 1 item
      localStorage.setItem(
        'vegetable_joint_cart',
        JSON.stringify([
          {
            product_id: 1,
            name: 'Fresh Tomatoes',
            price: 2500,
            quantity: 1,
            unit: 'basket',
            seller_id: 1,
            seller_name: 'Farm Cooperative',
          },
        ])
      );

      function FullAppWrapper() {
        return (
          <MemoryRouter initialEntries={['/cart']}>
            <ToastProvider>
              <CartProvider>
                <Routes>
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/products" element={<div>Products Page</div>} />
                </Routes>
              </CartProvider>
            </ToastProvider>
          </MemoryRouter>
        );
      }

      render(<FullAppWrapper />);

      // Initially shows item
      expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('cart-checkout-button')).toBeInTheDocument();

      // Remove the item
      const removeBtn = screen.getByTestId('cart-remove-button-1');
      await user.click(removeBtn);

      // Immediately transitions to empty cart state
      expect(
        screen.getByRole('heading', {
          name: STRINGS.CART.EMPTY_TITLE,
          level: 3,
        })
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('cart-checkout-button')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('cart-item-1')).not.toBeInTheDocument();
    });

    it('transitions to empty cart state when user clears cart via confirm dialog', async () => {
      const user = userEvent.setup();

      // Preload cart with 2 items
      localStorage.setItem(
        'vegetable_joint_cart',
        JSON.stringify([
          {
            product_id: 1,
            name: 'Fresh Tomatoes',
            price: 2500,
            quantity: 2,
            unit: 'basket',
            seller_id: 1,
          },
          {
            product_id: 2,
            name: 'Fresh Ugwu',
            price: 1200,
            quantity: 1,
            unit: 'bunch',
            seller_id: 2,
          },
        ])
      );

      function FullAppWrapper() {
        return (
          <MemoryRouter initialEntries={['/cart']}>
            <ToastProvider>
              <CartProvider>
                <Routes>
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/products" element={<div>Products Page</div>} />
                </Routes>
              </CartProvider>
            </ToastProvider>
          </MemoryRouter>
        );
      }

      render(<FullAppWrapper />);

      expect(screen.getByTestId('cart-items-section')).toBeInTheDocument();

      // Click Clear Cart button
      const clearBtn = screen.getByTestId('clear-cart-button');
      await user.click(clearBtn);

      // Confirm dialog opens
      expect(
        screen.getByRole('heading', {
          name: 'Clear your shopping cart?',
          level: 2,
        })
      ).toBeInTheDocument();

      // Confirm clearance
      const confirmBtn = screen.getByTestId('clear-cart-dialog-confirm-button');
      await user.click(confirmBtn);

      // Shows empty cart state
      expect(
        screen.getByRole('heading', {
          name: STRINGS.CART.EMPTY_TITLE,
          level: 3,
        })
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('cart-checkout-button')
      ).not.toBeInTheDocument();
    });
  });

  describe('4. EmptyState Component Defaults (MKT-10)', () => {
    it('renders with type="cart" preset containing "Your cart is empty." and produce icon', () => {
      render(
        <MemoryRouter>
          <EmptyState type="cart" />
        </MemoryRouter>
      );

      expect(
        screen.getByRole('heading', {
          name: 'Your cart is empty.',
          level: 3,
        })
      ).toBeInTheDocument();
      expect(screen.getByText('🛒')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Explore our fresh farm produce and add vegetables to your basket.'
        )
      ).toBeInTheDocument();
    });
  });
});
