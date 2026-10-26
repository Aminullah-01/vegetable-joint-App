import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Checkout } from '../Checkout';
import { CartContext } from '../../../context/cartContextDef';
import { ToastProvider, AuthProvider } from '../../../context';
import { orderService } from '../../../services/orderService';
import { authService } from '../../../services/authService';
import { mockStore } from '../../../data/mockStore';
import { ApiError } from '../../../services/apiErrors';
import { DELIVERY_DETAILS_STORAGE_KEY } from '../../../constants';

const sampleTomato = {
  id: 1,
  product_id: 1,
  name: 'Fresh Roma Tomatoes',
  price: 2500,
  unit: 'basket',
  quantity: 4,
  subtotal: 10000,
  seller_id: 1,
  seller: { id: 1, business_name: 'Arewa Fresh Farms', location: 'Kano' },
};

const samplePepper = {
  id: 2,
  product_id: 2,
  name: 'Fresh Scotch Bonnet',
  price: 1800,
  unit: 'basket',
  quantity: 5,
  subtotal: 9000,
  seller_id: 2,
  seller: { id: 2, business_name: 'Danbatta Greens', location: 'Danbatta' },
};

async function loginAsBuyer() {
  const result = await authService.login({
    email: 'buyer@example.com',
    password: 'password123',
  });
  localStorage.setItem('vegetable_joint_token', result.token);
  return result;
}

function setSavedAddress(overrides = {}) {
  const details = {
    name: 'Amina Bello',
    phone: '+2348078901234',
    street: '14 Bompai Road',
    town: 'Nassarawa',
    state: 'Kano',
    notes: 'Call before delivery',
    ...overrides,
  };
  localStorage.setItem(DELIVERY_DETAILS_STORAGE_KEY, JSON.stringify(details));
  return details;
}

function renderCheckout(cartOverrides = {}, initialRoute = '/checkout') {
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

async function waitUntilReady() {
  await screen.findByTestId('checkout-page');
  await waitFor(() =>
    expect(
      screen.queryByTestId('checkout-validating-indicator')
    ).not.toBeInTheDocument()
  );
  await screen.findByDisplayValue('Amina Bello');
}

describe('Checkout Failure Handling (FE-074 / CHK-04, ERR-01, TC-17, TC-18)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    vi.restoreAllMocks();
  });

  describe('1. HTTP 409 Conflict — Insufficient Stock & Unavailable Items (CHK-04, UC-02 4a, TC-17)', () => {
    it('handles 409 Conflict with per-item insufficient stock message, closes modal, and shows error breakdown', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      const stockApiError = new ApiError({
        message:
          'One or more items in your cart have insufficient stock or are unavailable.',
        status: 409,
        code: 'CONFLICT',
        errors: {
          'items.0.quantity': [
            'Insufficient stock for Fresh Roma Tomatoes. Only 2 remaining in stock (requested 4).',
          ],
        },
        data: {
          failed_items: [
            {
              product_id: 1,
              name: 'Fresh Roma Tomatoes',
              type: 'insufficient_stock',
              available_stock: 2,
              requested_quantity: 4,
              message:
                'Insufficient stock. Only 2 remaining in stock (requested 4).',
            },
          ],
          changes: [
            {
              product_id: 1,
              name: 'Fresh Roma Tomatoes',
              type: 'stock_reduced',
              old_quantity: 4,
              new_quantity: 2,
              message:
                'Available stock for "Fresh Roma Tomatoes" is now 2 (requested 4).',
            },
          ],
        },
      });

      vi.spyOn(orderService, 'createOrder').mockRejectedValue(stockApiError);

      const { cartValue } = renderCheckout();
      await waitUntilReady();

      // Open review modal
      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      // Check explicit confirmation
      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckboxes[confirmCheckboxes.length - 1]);

      // Confirm order placement
      await user.click(
        screen.getByTestId('checkout-confirm-place-order-button')
      );

      // Modal closes so buyer can address conflicts
      await waitFor(() => {
        expect(
          screen.queryByTestId('checkout-review-modal')
        ).not.toBeInTheDocument();
      });

      // Cart is NOT cleared on failure (CHK-04)
      expect(cartValue.clearCart).not.toHaveBeenCalled();

      // Submission error alert is prominently displayed
      const errorBanner = await screen.findByTestId(
        'checkout-submission-error'
      );
      expect(errorBanner).toBeInTheDocument();
      expect(screen.getByTestId('checkout-error-title')).toHaveTextContent(
        /Stock Conflict/i
      );

      // Per-item breakdown is rendered
      expect(
        screen.getByTestId('checkout-failure-item-list')
      ).toBeInTheDocument();
      expect(screen.getByTestId('checkout-failure-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('checkout-failure-badge-1')).toHaveTextContent(
        /Insufficient Stock/i
      );
      expect(
        screen.getByTestId('checkout-failure-item-name-1')
      ).toHaveTextContent('Fresh Roma Tomatoes:');
      expect(
        screen.getByTestId('checkout-failure-item-detail-1')
      ).toHaveTextContent(/now 2 \(requested 4\)/i);

      // "Review & Edit Cart" action button is available
      expect(
        screen.getByTestId('checkout-failure-review-cart-btn')
      ).toBeInTheDocument();
    });

    it('handles 409 Conflict when a product becomes out of stock or unavailable', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      const outOfStockError = new ApiError({
        message: 'This product is currently unavailable.',
        status: 409,
        code: 'CONFLICT',
        errors: {
          'items.1': ['"Fresh Scotch Bonnet" is currently out of stock.'],
        },
        data: {
          failed_items: [
            {
              product_id: 2,
              name: 'Fresh Scotch Bonnet',
              type: 'out_of_stock',
              available_stock: 0,
              requested_quantity: 5,
              message: '"Fresh Scotch Bonnet" is out of stock.',
            },
          ],
        },
      });

      vi.spyOn(orderService, 'createOrder').mockRejectedValue(outOfStockError);

      renderCheckout();
      await waitUntilReady();

      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckboxes[confirmCheckboxes.length - 1]);
      await user.click(
        screen.getByTestId('checkout-confirm-place-order-button')
      );

      const errorBanner = await screen.findByTestId(
        'checkout-submission-error'
      );
      expect(errorBanner).toBeInTheDocument();

      const badge = screen.getByTestId('checkout-failure-badge-2');
      expect(badge).toHaveTextContent(/Out of Stock/i);
      expect(screen.getByTestId('checkout-failure-item-2')).toHaveTextContent(
        'Fresh Scotch Bonnet'
      );
    });
  });

  describe('2. HTTP 422 Unprocessable Entity — Price Changes & Field Validation (CART-08, TC-18, ERR-01)', () => {
    it('handles 422 when seller changes price after item was added to cart (TC-18)', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      const priceChangeError = new ApiError({
        message:
          'Price for one or more items has changed since you added them to your cart.',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: {
          'items.0.price': [
            'Price for "Fresh Roma Tomatoes" changed from ₦2,500 to ₦3,000.',
          ],
        },
        data: {
          failed_items: [
            {
              product_id: 1,
              name: 'Fresh Roma Tomatoes',
              type: 'price_changed',
              old_price: 2500,
              new_price: 3000,
              message: 'Price changed from ₦2,500 to ₦3,000.',
            },
          ],
          changes: [
            {
              product_id: 1,
              name: 'Fresh Roma Tomatoes',
              type: 'price_changed',
              old_price: 2500,
              new_price: 3000,
              message:
                'Price for "Fresh Roma Tomatoes" changed from ₦2,500 to ₦3,000.',
            },
          ],
        },
      });

      vi.spyOn(orderService, 'createOrder').mockRejectedValue(priceChangeError);

      renderCheckout();
      await waitUntilReady();

      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckboxes[confirmCheckboxes.length - 1]);
      await user.click(
        screen.getByTestId('checkout-confirm-place-order-button')
      );

      // Error banner with price change details
      const errorBanner = await screen.findByTestId(
        'checkout-submission-error'
      );
      expect(errorBanner).toBeInTheDocument();
      expect(screen.getByTestId('checkout-error-title')).toHaveTextContent(
        /Order Validation Issue/i
      );

      expect(screen.getByTestId('checkout-failure-badge-1')).toHaveTextContent(
        /Price Changed/i
      );
      expect(
        screen.getByTestId('checkout-failure-item-detail-1')
      ).toHaveTextContent(/changed from ₦2,500 to ₦3,000/i);

      // Offers "Accept Updated Items & Proceed" button
      const acceptBtn = screen.getByTestId(
        'checkout-failure-accept-changes-btn'
      );
      expect(acceptBtn).toBeInTheDocument();

      // Clicking accept clears failure banner
      await user.click(acceptBtn);
      expect(
        screen.queryByTestId('checkout-submission-error')
      ).not.toBeInTheDocument();
    });

    it('navigates to /cart when clicking "Review & Edit Cart" button from error banner', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      vi.spyOn(orderService, 'createOrder').mockRejectedValue(
        new ApiError({
          message: 'Insufficient stock.',
          status: 409,
          code: 'CONFLICT',
        })
      );

      renderCheckout();
      await waitUntilReady();

      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckboxes[confirmCheckboxes.length - 1]);
      await user.click(
        screen.getByTestId('checkout-confirm-place-order-button')
      );

      const reviewCartBtn = await screen.findByTestId(
        'checkout-failure-review-cart-btn'
      );
      await user.click(reviewCartBtn);

      expect(screen.getByText('Mock Cart Page')).toBeInTheDocument();
    });
  });

  describe('3. Multiple Simultaneous Failures (Mixed 409 & 422)', () => {
    it('displays multiple per-item messages when cart has both price change and stock reduction', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      const mixedError = new ApiError({
        message: 'Multiple item conflicts detected.',
        status: 409,
        code: 'CONFLICT',
        data: {
          changes: [
            {
              product_id: 1,
              name: 'Fresh Roma Tomatoes',
              type: 'price_changed',
              old_price: 2500,
              new_price: 2800,
              message:
                'Price for "Fresh Roma Tomatoes" changed from ₦2,500 to ₦2,800.',
            },
            {
              product_id: 2,
              name: 'Fresh Scotch Bonnet',
              type: 'stock_reduced',
              old_quantity: 5,
              new_quantity: 2,
              message:
                'Available stock for "Fresh Scotch Bonnet" is now 2 (requested 5).',
            },
          ],
        },
      });

      vi.spyOn(orderService, 'createOrder').mockRejectedValue(mixedError);

      renderCheckout();
      await waitUntilReady();

      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckboxes[confirmCheckboxes.length - 1]);
      await user.click(
        screen.getByTestId('checkout-confirm-place-order-button')
      );

      await screen.findByTestId('checkout-submission-error');
      expect(screen.getByTestId('checkout-failure-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('checkout-failure-badge-1')).toHaveTextContent(
        /Price Changed/i
      );

      expect(screen.getByTestId('checkout-failure-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('checkout-failure-badge-2')).toHaveTextContent(
        /Insufficient Stock/i
      );
    });
  });

  describe('4. Graceful Error Handling & Shielding Technical Errors (ERR-01, ERR-02)', () => {
    it('shields technical database/SQL errors from buyer and displays friendly fallback (ERR-02)', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      const sqlError = new Error(
        'SQLSTATE[23000]: Integrity constraint violation: 1048 Column cannot be null at line 42'
      );

      vi.spyOn(orderService, 'createOrder').mockRejectedValue(sqlError);

      renderCheckout();
      await waitUntilReady();

      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckboxes[confirmCheckboxes.length - 1]);
      await user.click(
        screen.getByTestId('checkout-confirm-place-order-button')
      );

      const errorBanner = await screen.findByTestId(
        'checkout-submission-error'
      );
      expect(errorBanner).toBeInTheDocument();

      // Technical details must NOT appear (ERR-02)
      expect(errorBanner).not.toHaveTextContent(/SQLSTATE/i);
      expect(errorBanner).not.toHaveTextContent(/Integrity constraint/i);
      expect(errorBanner).toHaveTextContent(
        /Something unexpected happened while communicating with the service/i
      );
    });
  });

  describe('5. Mock Store Direct Validation (CHK-04, TC-17, TC-18)', () => {
    it('throws 409 ApiError when item quantity exceeds available stock in mockStore (TC-17)', () => {
      expect(() => {
        mockStore.createOrder({
          items: [
            {
              product_id: 1, // Fresh Roma Tomatoes has 25 units
              quantity: 99999, // Exceeds stock!
              price: 2500,
            },
          ],
          delivery_name: 'Amina Bello',
          delivery_phone: '+2348078901234',
          delivery_address: '14 Bompai Road, Kano',
        });
      }).toThrowError(
        expect.objectContaining({
          status: 409,
          code: 'CONFLICT',
        })
      );
    });

    it('throws 422 ApiError when item price differs from catalog price in mockStore (TC-18)', () => {
      expect(() => {
        mockStore.createOrder({
          items: [
            {
              product_id: 1,
              quantity: 1,
              price: 1, // Original catalog price is 2500
            },
          ],
          delivery_name: 'Amina Bello',
          delivery_phone: '+2348078901234',
          delivery_address: '14 Bompai Road, Kano',
        });
      }).toThrowError(
        expect.objectContaining({
          status: 422,
          code: 'VALIDATION_ERROR',
        })
      );
    });
  });
});
