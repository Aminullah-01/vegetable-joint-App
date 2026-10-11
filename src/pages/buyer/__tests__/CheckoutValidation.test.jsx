import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Checkout } from '../Checkout';
import { CartContext } from '../../../context/cartContextDef';
import { ToastProvider, AuthProvider } from '../../../context';

const sampleTomato = {
  id: 1,
  product_id: 1,
  name: 'Fresh Roma Tomatoes',
  price: 2500,
  unit: 'basket',
  quantity: 4,
  available_stock: 10,
  subtotal: 10000,
  seller_id: 1,
  seller: { id: 1, business_name: 'Arewa Farms' },
};

const samplePepper = {
  id: 2,
  product_id: 2,
  name: 'Fresh Scotch Bonnet',
  price: 1800,
  unit: 'basket',
  quantity: 5,
  available_stock: 5,
  subtotal: 9000,
  seller_id: 1,
  seller: { id: 1, business_name: 'Arewa Farms' },
};

function renderCheckoutWithCart(
  cartOverrides = {},
  initialRoute = '/checkout'
) {
  const defaultCart = {
    items: [sampleTomato, samplePepper],
    isEmpty: false,
    itemCount: 9,
    uniqueItemCount: 2,
    subtotal: 19000,
    total: 19000,
    validationNotice: null,
    validationChanges: [],
    validationResult: null,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    validateCart: vi.fn().mockResolvedValue({
      is_valid: true,
      has_price_changes: false,
      has_stock_issues: false,
      has_unavailable: false,
      changes: [],
      items: [sampleTomato, samplePepper],
    }),
    acknowledgeValidation: vi
      .fn()
      .mockReturnValue([sampleTomato, samplePepper]),
    clearValidationNotice: vi.fn(),
  };

  const cartValue = { ...defaultCart, ...cartOverrides };

  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <ToastProvider>
          <AuthProvider>
            <CartContext.Provider value={cartValue}>
              <Routes>
                <Route path="/checkout" element={children} />
                <Route path="/cart" element={<div>Mock Cart Page</div>} />
                <Route
                  path="/checkout/confirmation/:ref"
                  element={<div>Mock Confirmation Page</div>}
                />
              </Routes>
            </CartContext.Provider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  }

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  const renderResult = render(<Checkout />, { wrapper: Wrapper });
  return { ...renderResult, cartValue };
}

describe('Checkout Cart Re-Validation Notices (FE-059 / CART-08, TC-18, UC-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls validateCart on checkout mount (CART-08)', async () => {
    const validateCartMock = vi.fn().mockResolvedValue({
      is_valid: true,
      has_price_changes: false,
      has_stock_issues: false,
      has_unavailable: false,
      changes: [],
      items: [sampleTomato, samplePepper],
    });

    renderCheckoutWithCart({ validateCart: validateCartMock });

    expect(validateCartMock).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('heading', {
        name: /Checkout & Delivery Details/i,
      })
    ).toBeInTheDocument();
  });

  it('displays price change notices and blocks place order before acknowledgement (TC-18)', async () => {
    const priceChange = {
      product_id: 1,
      name: 'Fresh Roma Tomatoes',
      type: 'price_changed',
      old_price: 2500,
      new_price: 3000,
      message: 'Price for "Fresh Roma Tomatoes" changed from ₦2,500 to ₦3,000.',
    };

    const validateCartMock = vi.fn().mockResolvedValue({
      is_valid: false,
      has_price_changes: true,
      has_stock_issues: false,
      has_unavailable: false,
      changes: [priceChange],
      items: [{ ...sampleTomato, current_price: 3000, price: 3000 }],
    });

    const acknowledgeMock = vi
      .fn()
      .mockReturnValue([
        { ...sampleTomato, price: 3000, subtotal: 12000 },
        samplePepper,
      ]);

    renderCheckoutWithCart({
      validateCart: validateCartMock,
      acknowledgeValidation: acknowledgeMock,
    });

    // Notice should appear
    const noticeContainer = await screen.findByTestId(
      'checkout-validation-notices'
    );
    expect(noticeContainer).toBeInTheDocument();

    expect(screen.getByTestId('notice-price-change')).toBeInTheDocument();
    expect(screen.getAllByText(/Fresh Roma Tomatoes/i)[0]).toBeInTheDocument();
    expect(screen.getByText('₦2,500')).toBeInTheDocument();
    expect(screen.getByText('₦3,000')).toBeInTheDocument();

    // Place Order button should be disabled until changes acknowledged
    const placeOrderBtn = screen.getByTestId('checkout-place-order-button');
    expect(placeOrderBtn).toHaveAttribute('aria-disabled', 'true');

    // Click Accept Changes & Proceed
    const user = userEvent.setup();
    const acceptBtn = screen.getByTestId('accept-cart-changes-button');
    await user.click(acceptBtn);

    expect(acknowledgeMock).toHaveBeenCalledTimes(1);
  });

  it('displays stock reduction notices with old quantity and new stock quantity', async () => {
    const stockChange = {
      product_id: 2,
      name: 'Fresh Scotch Bonnet',
      type: 'stock_reduced',
      old_quantity: 5,
      new_quantity: 2,
      message:
        'Available stock for "Fresh Scotch Bonnet" is now 2 (reduced from 5).',
    };

    const validateCartMock = vi.fn().mockResolvedValue({
      is_valid: false,
      has_price_changes: false,
      has_stock_issues: true,
      has_unavailable: false,
      changes: [stockChange],
      items: [{ ...samplePepper, quantity: 2, current_stock: 2 }],
    });

    renderCheckoutWithCart({ validateCart: validateCartMock });

    const notice = await screen.findByTestId('notice-stock-issue');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(/Stock Adjusted/i);
    expect(notice).toHaveTextContent('Fresh Scotch Bonnet');
    expect(notice).toHaveTextContent(/Quantity adjusted to 2 \(requested 5\)/i);
  });

  it('displays unavailable and seller suspended item notices', async () => {
    const unavailableChange = {
      product_id: 2,
      name: 'Fresh Scotch Bonnet',
      type: 'unavailable',
      message:
        '"Fresh Scotch Bonnet" is out of stock and has been removed from your cart.',
    };

    const validateCartMock = vi.fn().mockResolvedValue({
      is_valid: false,
      has_price_changes: false,
      has_stock_issues: true,
      has_unavailable: true,
      changes: [unavailableChange],
      items: [{ ...samplePepper, is_available: false }],
    });

    renderCheckoutWithCart({ validateCart: validateCartMock });

    const notice = await screen.findByTestId('notice-unavailable');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(/Unavailable/i);
    expect(notice).toHaveTextContent('Fresh Scotch Bonnet');
    expect(notice).toHaveTextContent(/removed from order/i);
  });

  it('displays multiple mixed changes simultaneously (price, stock, and unavailable)', async () => {
    const mixedChanges = [
      {
        product_id: 1,
        name: 'Fresh Roma Tomatoes',
        type: 'price_changed',
        old_price: 2500,
        new_price: 2800,
      },
      {
        product_id: 2,
        name: 'Fresh Scotch Bonnet',
        type: 'stock_reduced',
        old_quantity: 5,
        new_quantity: 3,
      },
      {
        product_id: 3,
        name: 'Sold Out Spinach',
        type: 'unavailable',
      },
    ];

    const validateCartMock = vi.fn().mockResolvedValue({
      is_valid: false,
      has_price_changes: true,
      has_stock_issues: true,
      has_unavailable: true,
      changes: mixedChanges,
      items: [],
    });

    renderCheckoutWithCart({ validateCart: validateCartMock });

    expect(
      await screen.findByTestId('notice-price-change')
    ).toBeInTheDocument();
    expect(screen.getByTestId('notice-stock-issue')).toBeInTheDocument();
    expect(screen.getByTestId('notice-unavailable')).toBeInTheDocument();
  });

  it('navigates back to /cart when clicking "Review in Cart"', async () => {
    const user = userEvent.setup();
    const validateCartMock = vi.fn().mockResolvedValue({
      is_valid: false,
      has_price_changes: true,
      has_stock_issues: false,
      has_unavailable: false,
      changes: [
        {
          product_id: 1,
          name: 'Fresh Roma Tomatoes',
          type: 'price_changed',
          old_price: 2500,
          new_price: 3000,
        },
      ],
      items: [],
    });

    renderCheckoutWithCart({ validateCart: validateCartMock });

    const reviewCartBtn = await screen.findByTestId('review-cart-button');
    await user.click(reviewCartBtn);

    expect(screen.getByText('Mock Cart Page')).toBeInTheDocument();
  });

  it('renders empty cart state and blocks checkout if all items become unavailable (CART-05, TC-11)', () => {
    renderCheckoutWithCart({
      items: [],
      isEmpty: true,
      itemCount: 0,
      subtotal: 0,
      total: 0,
    });

    expect(screen.getByTestId('checkout-empty-cart-state')).toBeInTheDocument();
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(
      screen.queryByTestId('checkout-place-order-button')
    ).not.toBeInTheDocument();
  });

  it('enables place order when cart re-validation succeeds with 0 changes', async () => {
    const validateCartMock = vi.fn().mockResolvedValue({
      is_valid: true,
      has_price_changes: false,
      has_stock_issues: false,
      has_unavailable: false,
      changes: [],
      items: [sampleTomato, samplePepper],
    });

    renderCheckoutWithCart({ validateCart: validateCartMock });

    await waitFor(() => {
      expect(
        screen.queryByTestId('checkout-validating-indicator')
      ).not.toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('checkout-validation-notices')
    ).not.toBeInTheDocument();

    const placeOrderBtn = screen.getByTestId('checkout-place-order-button');
    expect(placeOrderBtn).not.toHaveAttribute('aria-disabled', 'true');
    expect(placeOrderBtn.closest('a')).toHaveAttribute(
      'href',
      '/checkout/confirmation/ORD-2026-001'
    );
  });
});
