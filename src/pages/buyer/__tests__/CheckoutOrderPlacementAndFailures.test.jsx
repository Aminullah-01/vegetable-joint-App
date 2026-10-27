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
  quantity: 5,
  subtotal: 12500,
  seller_id: 1,
  seller: { id: 1, business_name: 'Arewa Fresh Farms', location: 'Gombe' },
};

const samplePepper = {
  id: 2,
  product_id: 2,
  name: 'Red Bell Peppers',
  price: 1800,
  unit: 'kg',
  quantity: 4,
  subtotal: 7200,
  seller_id: 2,
  seller: { id: 2, business_name: 'Danbatta Greens', location: 'Kano' },
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
    notes: 'Call on arrival',
    ...overrides,
  };
  localStorage.setItem(DELIVERY_DETAILS_STORAGE_KEY, JSON.stringify(details));
  return details;
}

function renderCheckoutWithCart(
  cartOverrides = {},
  initialRoute = '/checkout'
) {
  const defaultCart = {
    items: [sampleTomato, samplePepper],
    isEmpty: false,
    itemCount: 9,
    uniqueItemCount: 2,
    subtotal: 19700,
    total: 19700,
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
}

describe('Place Order & Handle Failures (FE-074 / CHK-04, ERR-01, IF-03)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    vi.restoreAllMocks();
  });

  describe('1. Mock Store Order Placement Validation (CHK-04, ERR-01, Alternative Flows 4a & 1a)', () => {
    it('throws 409 Conflict with per-item details when item has insufficient stock', () => {
      // Product 1 has stock quantity 45 in mockStore
      // Requesting 99 units exceeds stock
      expect(() => {
        mockStore.createOrder({
          items: [{ product_id: 1, quantity: 99, price: 2500 }],
          delivery_name: 'Amina Bello',
          delivery_phone: '+2348078901234',
          delivery_address: '14 Bompai Road, Kano',
        });
      }).toThrowError(/Insufficient stock for.*Roma Tomatoes.*CHK-04/i);

      try {
        mockStore.createOrder({
          items: [{ product_id: 1, quantity: 99, price: 2500 }],
          delivery_name: 'Amina Bello',
          delivery_phone: '+2348078901234',
          delivery_address: '14 Bompai Road, Kano',
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(409);
        expect(err.code).toBe('CONFLICT');
        expect(err.data?.items).toHaveLength(1);
        expect(err.data.items[0]).toMatchObject({
          product_id: 1,
          name: 'Fresh Roma Tomatoes',
          type: 'insufficient_stock',
          requested_quantity: 99,
          available_stock: 45,
        });
      }
    });

    it('throws 409 Conflict when item price has changed', () => {
      // Roma Tomatoes has price 2500 in mockStore; payload passes outdated price 2000
      expect(() => {
        mockStore.createOrder({
          items: [{ product_id: 1, quantity: 2, price: 2000 }],
          delivery_name: 'Amina Bello',
          delivery_phone: '+2348078901234',
          delivery_address: '14 Bompai Road, Kano',
        });
      }).toThrowError(/Price for.*Roma Tomatoes.*has changed.*ERR-01/i);

      try {
        mockStore.createOrder({
          items: [{ product_id: 1, quantity: 2, price: 2000 }],
          delivery_name: 'Amina Bello',
          delivery_phone: '+2348078901234',
          delivery_address: '14 Bompai Road, Kano',
        });
      } catch (err) {
        expect(err.status).toBe(409);
        expect(err.data?.items[0]).toMatchObject({
          product_id: 1,
          type: 'price_changed',
          old_price: 2000,
          new_price: 2500,
        });
      }
    });

    it('throws 409 Conflict when item is unavailable or out of stock (ERR-01)', () => {
      const prod = mockStore.products.find((p) => p.id === 1);
      prod.quantity = 0;
      prod.availability = 'out_of_stock';

      expect(() => {
        mockStore.createOrder({
          items: [{ product_id: 1, quantity: 1, price: 2500 }],
          delivery_name: 'Amina Bello',
          delivery_phone: '+2348078901234',
          delivery_address: '14 Bompai Road, Kano',
        });
      }).toThrowError(/out of stock.*CHK-04/i);
    });

    it('throws 422 Unprocessable Entity when required delivery details are missing', () => {
      expect(() => {
        mockStore.createOrder({
          items: [{ product_id: 1, quantity: 2, price: 2500 }],
          delivery_name: '',
          delivery_phone: '',
          delivery_address: '',
        });
      }).toThrowError(/Checkout validation failed.*CHK-02, CHK-04/i);

      try {
        mockStore.createOrder({
          items: [{ product_id: 1, quantity: 2, price: 2500 }],
          delivery_name: '',
          delivery_phone: '',
          delivery_address: '',
        });
      } catch (err) {
        expect(err.status).toBe(422);
        expect(err.errors).toHaveProperty('delivery_name');
        expect(err.errors).toHaveProperty('delivery_phone');
        expect(err.errors).toHaveProperty('delivery_address');
      }
    });
  });

  describe('2. UI Integration: HTTP 409 Insufficient Stock Error', () => {
    it('displays clear per-item insufficient stock message, does not clear cart, and offers review cart action', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      // Mock 409 Conflict response with per-item details
      vi.spyOn(orderService, 'createOrder').mockRejectedValue(
        new ApiError({
          message:
            'Insufficient stock for "Fresh Roma Tomatoes". Requested 5, but only 2 is available (CHK-04).',
          status: 409,
          code: 'CONFLICT',
          data: {
            items: [
              {
                product_id: 1,
                name: 'Fresh Roma Tomatoes',
                type: 'insufficient_stock',
                requested_quantity: 5,
                available_stock: 2,
                message:
                  'Requested 5 baskets, but only 2 baskets are available in stock.',
              },
            ],
          },
        })
      );

      const { cartValue } = renderCheckoutWithCart();
      await waitUntilReady();

      // Open review modal
      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      // Check explicit confirmation
      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckboxes[confirmCheckboxes.length - 1]);

      // Confirm and place order
      await user.click(
        screen.getByTestId('checkout-confirm-place-order-button')
      );

      // Verify submission error banner on page
      const errorNotice = await screen.findByTestId(
        'checkout-submission-error'
      );
      expect(errorNotice).toBeInTheDocument();

      // Verify HTTP 409 status and conflict categorization
      const failureNotice = screen.getByTestId('checkout-order-failure-notice');
      expect(failureNotice).toHaveAttribute('data-status', '409');
      expect(failureNotice).toHaveAttribute('data-error-type', 'conflict');
      expect(screen.getByTestId('order-failure-status-code')).toHaveTextContent(
        'HTTP 409'
      );
      expect(screen.getByTestId('order-failure-title')).toHaveTextContent(
        /Inventory or Price Conflict/i
      );

      // Verify per-item failure details (FE-074, CHK-04)
      const itemCard = screen.getByTestId('order-failure-item-1');
      expect(itemCard).toBeInTheDocument();
      expect(itemCard).toHaveTextContent(/Fresh Roma Tomatoes/i);
      expect(itemCard).toHaveTextContent(
        /Requested 5 baskets, but only 2 baskets are available/i
      );
      expect(screen.getByTestId('order-failure-stock-diff')).toHaveTextContent(
        /Requested quantity:\s*5/i
      );
      expect(screen.getByTestId('order-failure-stock-diff')).toHaveTextContent(
        /Available stock:\s*2/i
      );

      // Verify cart was NOT cleared
      expect(cartValue.clearCart).not.toHaveBeenCalled();

      // Verify "Review & Update Cart" button navigates to /cart
      const reviewCartBtn = screen.getByTestId('order-failure-review-cart-btn');
      expect(reviewCartBtn).toBeInTheDocument();
      await user.click(reviewCartBtn);
      expect(screen.getByText('Mock Cart Page')).toBeInTheDocument();
    });
  });

  describe('3. UI Integration: HTTP 409 Price Changed Error', () => {
    it('displays price update comparison and per-item notice', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      vi.spyOn(orderService, 'createOrder').mockRejectedValue(
        new ApiError({
          message:
            'Price for "Red Bell Peppers" has changed from ₦1,800 to ₦2,200 (ERR-01).',
          status: 409,
          code: 'CONFLICT',
          data: {
            items: [
              {
                product_id: 2,
                name: 'Red Bell Peppers',
                type: 'price_changed',
                old_price: 1800,
                new_price: 2200,
                message: 'Price updated from ₦1,800 to ₦2,200 per kg.',
              },
            ],
          },
        })
      );

      renderCheckoutWithCart();
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
      const itemCard = screen.getByTestId('order-failure-item-2');
      expect(itemCard).toBeInTheDocument();
      expect(itemCard).toHaveTextContent(/Red Bell Peppers/i);
      expect(itemCard).toHaveTextContent(/Price Changed/i);

      const priceDiff = screen.getByTestId('order-failure-price-diff');
      expect(priceDiff).toHaveTextContent(/Old price:\s*₦1,800/i);
      expect(priceDiff).toHaveTextContent(/New price:\s*₦2,200/i);
    });
  });

  describe('4. UI Integration: Multi-Item Combined Conflict (409)', () => {
    it('displays itemized list with both stock shortage and price change', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      vi.spyOn(orderService, 'createOrder').mockRejectedValue(
        new ApiError({
          message:
            'Order cannot be placed: 2 items have stock or price conflicts (CHK-04, ERR-01).',
          status: 409,
          code: 'CONFLICT',
          data: {
            items: [
              {
                product_id: 1,
                name: 'Fresh Roma Tomatoes',
                type: 'insufficient_stock',
                requested_quantity: 5,
                available_stock: 1,
                message: 'Requested 5, but only 1 available.',
              },
              {
                product_id: 2,
                name: 'Red Bell Peppers',
                type: 'price_changed',
                old_price: 1800,
                new_price: 2100,
                message: 'Price updated to ₦2,100.',
              },
            ],
          },
        })
      );

      renderCheckoutWithCart();
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
      expect(
        screen.getByTestId('order-failure-items-list')
      ).toBeInTheDocument();
      expect(screen.getByText(/Affected Items \(2\)/i)).toBeInTheDocument();

      expect(screen.getByTestId('order-failure-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('order-failure-item-2')).toBeInTheDocument();
    });
  });

  describe('5. UI Integration: HTTP 422 Validation Error', () => {
    it('displays field validation errors clearly', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      vi.spyOn(orderService, 'createOrder').mockRejectedValue(
        new ApiError({
          message:
            'Checkout validation failed. Please check the required delivery details.',
          status: 422,
          code: 'VALIDATION_ERROR',
          errors: {
            delivery_phone: ['Please enter a valid Nigerian phone number.'],
            delivery_address: ['Street delivery address is required.'],
          },
        })
      );

      renderCheckoutWithCart();
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
      const failureNotice = screen.getByTestId('checkout-order-failure-notice');
      expect(failureNotice).toHaveAttribute('data-status', '422');
      expect(failureNotice).toHaveAttribute('data-error-type', 'validation');

      const fieldErrors = screen.getByTestId('order-failure-field-errors');
      expect(fieldErrors).toHaveTextContent(
        /delivery phone:.*valid Nigerian phone number/i
      );
      expect(fieldErrors).toHaveTextContent(
        /delivery address:.*address is required/i
      );
    });
  });

  describe('6. Review Modal Error Feedback & Dismissal', () => {
    it('shows error notice directly inside OrderReviewModal and allows dismissal', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      vi.spyOn(orderService, 'createOrder').mockRejectedValue(
        new ApiError({
          message: 'Insufficient stock for Roma Tomatoes.',
          status: 409,
          code: 'CONFLICT',
        })
      );

      renderCheckoutWithCart();
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

      // Verify in-modal error notice
      expect(
        await screen.findByTestId('review-order-error')
      ).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByTestId('checkout-review-back-button'));
      await waitFor(() => {
        expect(
          screen.queryByTestId('checkout-review-modal')
        ).not.toBeInTheDocument();
      });

      // Error banner remains visible on checkout page
      expect(
        screen.getByTestId('checkout-submission-error')
      ).toBeInTheDocument();

      // Dismiss error
      await user.click(screen.getByTestId('order-failure-dismiss-btn'));
      await waitFor(() => {
        expect(
          screen.queryByTestId('checkout-submission-error')
        ).not.toBeInTheDocument();
      });
    });
  });
});
