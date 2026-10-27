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
import { isValidUUID } from '../../../utils';

const sampleTomato = {
  id: 1,
  product_id: 1,
  name: 'Fresh Roma Tomatoes',
  price: 2500,
  unit: 'basket',
  quantity: 2,
  subtotal: 5000,
  seller_id: 1,
  seller: { id: 1, business_name: 'Arewa Fresh Farms', location: 'Gombe' },
};

const samplePepper = {
  id: 2,
  product_id: 2,
  name: 'Red Bell Peppers',
  price: 1800,
  unit: 'kg',
  quantity: 3,
  subtotal: 5400,
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
    itemCount: 5,
    uniqueItemCount: 2,
    subtotal: 10400,
    total: 10400,
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
                  element={
                    <div data-testid="mock-confirmation-page">
                      Order Confirmed Mock
                    </div>
                  }
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

describe('Idempotent Order Submission (FE-075 / NFR-REL-04, CHK-05)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    vi.restoreAllMocks();
  });

  describe('1. Checkout Reference (UUID v4) Generation & Payload Inclusion', () => {
    it('generates a valid 36-character UUID checkout reference upon rendering', async () => {
      await loginAsBuyer();
      setSavedAddress();

      renderCheckoutWithCart();
      await waitUntilReady();

      const page = screen.getByTestId('checkout-page');
      const checkoutRef = page.getAttribute('data-checkout-ref');

      expect(checkoutRef).toBeTruthy();
      expect(checkoutRef).toHaveLength(36);
      expect(isValidUUID(checkoutRef)).toBe(true);
    });

    it('submits checkout_ref (UUID) in the order payload and links multi-seller orders (CHK-05)', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      const createOrderSpy = vi.spyOn(orderService, 'createOrder');

      renderCheckoutWithCart();
      await waitUntilReady();

      // Proceed to review modal
      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      // Check explicit confirmation checkbox
      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckboxes[confirmCheckboxes.length - 1]);

      // Confirm & Place Order
      await user.click(
        screen.getByTestId('checkout-confirm-place-order-button')
      );

      await waitFor(() => {
        expect(createOrderSpy).toHaveBeenCalledTimes(1);
      });

      const submittedPayload = createOrderSpy.mock.calls[0][0];
      expect(submittedPayload).toHaveProperty('checkout_ref');
      expect(typeof submittedPayload.checkout_ref).toBe('string');
      expect(submittedPayload.checkout_ref).toHaveLength(36);
      expect(isValidUUID(submittedPayload.checkout_ref)).toBe(true);

      // Verify redirection to confirmation page with the checkout_ref
      expect(
        await screen.findByTestId('mock-confirmation-page')
      ).toBeInTheDocument();
    });
  });

  describe('2. Submit Button Double-Click and Rapid Multi-Click Suppression (NFR-REL-04)', () => {
    it('disables submit button and shows loading state when order submission is in-flight', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      // Slow response to inspect in-flight state
      let resolveOrder;
      const orderPromise = new Promise((resolve) => {
        resolveOrder = resolve;
      });
      vi.spyOn(orderService, 'createOrder').mockReturnValue(orderPromise);

      renderCheckoutWithCart();
      await waitUntilReady();

      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckboxes[confirmCheckboxes.length - 1]);

      const submitBtn = screen.getByTestId(
        'checkout-confirm-place-order-button'
      );
      await user.click(submitBtn);

      // Verify submit button is disabled and in loading state
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveTextContent(/Placing Order\.\.\./i);
      expect(submitBtn).toHaveAttribute('aria-busy', 'true');

      // Verify back button is also disabled while submitting
      expect(screen.getByTestId('checkout-review-back-button')).toBeDisabled();

      // Complete order
      resolveOrder({
        checkout_ref: 'chk-test-resolved',
        orders: [{ id: 1, order_number: 'VJ-20261027-001' }],
      });

      expect(
        await screen.findByTestId('mock-confirmation-page')
      ).toBeInTheDocument();
    });

    it('suppresses duplicate submissions when submit button is rapidly clicked multiple times', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      let resolveOrder;
      const orderPromise = new Promise((resolve) => {
        resolveOrder = resolve;
      });
      const createOrderSpy = vi
        .spyOn(orderService, 'createOrder')
        .mockReturnValue(orderPromise);

      renderCheckoutWithCart();
      await waitUntilReady();

      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckboxes[confirmCheckboxes.length - 1]);

      const submitBtn = screen.getByTestId(
        'checkout-confirm-place-order-button'
      );

      // Fire 3 clicks in rapid succession
      await Promise.all([
        user.click(submitBtn),
        user.click(submitBtn),
        user.click(submitBtn),
      ]);

      // Exactly 1 call was dispatched (NFR-REL-04)
      expect(createOrderSpy).toHaveBeenCalledTimes(1);

      resolveOrder({
        checkout_ref: 'chk-single-call',
        orders: [{ id: 10, order_number: 'VJ-20261027-010' }],
      });

      expect(
        await screen.findByTestId('mock-confirmation-page')
      ).toBeInTheDocument();
    });
  });

  describe('3. Server-Side Idempotency via Mock Store (NFR-REL-04 / UC-02 4b)', () => {
    it('returns existing orders and avoids duplicate records or extra stock deduction on duplicate submission', () => {
      const testCheckoutRef = 'a1b2c3d4-e5f6-4a7b-8c9d-000000000099';
      const initialTomatoStock = mockStore.products.find(
        (p) => p.id === 1
      ).quantity;
      const initialOrdersCount = mockStore.orders.length;

      const orderPayload = {
        checkout_ref: testCheckoutRef,
        items: [{ product_id: 1, quantity: 3, price: 2500 }],
        delivery_name: 'Amina Bello',
        delivery_phone: '+2348078901234',
        delivery_address: '14 Bompai Road, Kano',
      };

      // First submission
      const firstResult = mockStore.createOrder(orderPayload);
      expect(firstResult.checkout_ref).toBe(testCheckoutRef);
      expect(firstResult.orders).toHaveLength(1);
      expect(mockStore.orders.length).toBe(initialOrdersCount + 1);

      const stockAfterFirstOrder = mockStore.products.find(
        (p) => p.id === 1
      ).quantity;
      expect(stockAfterFirstOrder).toBe(initialTomatoStock - 3);

      // Duplicate submission with the same checkout_ref (e.g., network retry / double-click)
      const duplicateResult = mockStore.createOrder(orderPayload);

      // Verifies idempotency (NFR-REL-04, UC-02 4b)
      expect(duplicateResult.checkout_ref).toBe(testCheckoutRef);
      expect(duplicateResult.is_duplicate).toBe(true);
      expect(duplicateResult.idempotent).toBe(true);
      expect(duplicateResult.orders).toEqual(firstResult.orders);

      // No additional order records created
      expect(mockStore.orders.length).toBe(initialOrdersCount + 1);

      // Stock was NOT decremented a second time
      const stockAfterDuplicate = mockStore.products.find(
        (p) => p.id === 1
      ).quantity;
      expect(stockAfterDuplicate).toBe(stockAfterFirstOrder);
    });
  });

  describe('4. Safe Retry on Submission Failure (NFR-REL-04, NFR-REL-05)', () => {
    it('preserves cart and re-submits with the EXACT SAME checkout_ref on retry', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      let attempts = 0;
      let recordedCheckoutRefs = [];

      vi.spyOn(orderService, 'createOrder').mockImplementation(
        async (payload) => {
          attempts += 1;
          recordedCheckoutRefs.push(payload.checkout_ref);
          if (attempts === 1) {
            throw new ApiError({
              message: 'Network connection lost. Please retry.',
              status: 0,
              code: 'NETWORK_ERROR',
            });
          }
          return {
            checkout_ref: payload.checkout_ref,
            orders: [{ id: 99, order_number: 'VJ-20261027-099' }],
          };
        }
      );

      const { cartValue } = renderCheckoutWithCart();
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

      // First attempt failed
      expect(attempts).toBe(1);

      // Cart items were NOT cleared on failure (NFR-REL-05)
      expect(cartValue.clearCart).not.toHaveBeenCalled();

      // In-modal error notice with retry button
      const retryBtn = await screen.findByTestId(
        'review-order-failure-retry-btn'
      );
      expect(retryBtn).toBeInTheDocument();
      expect(retryBtn).toHaveTextContent(/Retry Order Submission/i);

      // Click Retry
      await user.click(retryBtn);

      await waitFor(() => {
        expect(attempts).toBe(2);
      });

      // Crucial NFR-REL-04 verification: both attempts used the identical checkout_ref
      expect(recordedCheckoutRefs).toHaveLength(2);
      expect(recordedCheckoutRefs[0]).toBeTruthy();
      expect(recordedCheckoutRefs[1]).toBe(recordedCheckoutRefs[0]);

      // Cart cleared after successful retry (CHK-08)
      expect(cartValue.clearCart).toHaveBeenCalledTimes(1);

      expect(
        await screen.findByTestId('mock-confirmation-page')
      ).toBeInTheDocument();
    });

    it('allows retry from page-level failure notice after review modal is closed', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      let attempts = 0;
      let recordedCheckoutRefs = [];

      vi.spyOn(orderService, 'createOrder').mockImplementation(
        async (payload) => {
          attempts += 1;
          recordedCheckoutRefs.push(payload.checkout_ref);
          if (attempts === 1) {
            throw new ApiError({
              message: 'Internal server error (500). Please retry.',
              status: 500,
              code: 'SERVER_ERROR',
            });
          }
          return {
            checkout_ref: payload.checkout_ref,
            orders: [{ id: 101, order_number: 'VJ-20261027-101' }],
          };
        }
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

      expect(attempts).toBe(1);

      // Close modal
      await user.click(screen.getByTestId('checkout-review-back-button'));
      await waitFor(() => {
        expect(
          screen.queryByTestId('checkout-review-modal')
        ).not.toBeInTheDocument();
      });

      // Page-level retry button
      const pageRetryBtn = screen.getByTestId('order-failure-retry-btn');
      expect(pageRetryBtn).toBeInTheDocument();

      // Click page-level retry
      await user.click(pageRetryBtn);

      await waitFor(() => {
        expect(attempts).toBe(2);
      });

      expect(recordedCheckoutRefs[1]).toBe(recordedCheckoutRefs[0]);
      expect(
        await screen.findByTestId('mock-confirmation-page')
      ).toBeInTheDocument();
    });
  });

  describe('5. Checkout Reference Regeneration on Cart Modification', () => {
    it('regenerates a new checkout reference when buyer accepts cart re-validation changes', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      const changedTomato = {
        product_id: 1,
        name: 'Fresh Roma Tomatoes',
        type: 'price_changed',
        old_price: 2500,
        new_price: 2700,
      };

      renderCheckoutWithCart({
        validateCart: vi.fn().mockResolvedValue({
          is_valid: false,
          has_price_changes: true,
          has_stock_issues: false,
          has_unavailable: false,
          changes: [changedTomato],
          items: [sampleTomato, samplePepper],
        }),
      });
      await waitUntilReady();

      const pageBefore = screen.getByTestId('checkout-page');
      const initialRef = pageBefore.getAttribute('data-checkout-ref');
      expect(isValidUUID(initialRef)).toBe(true);

      const acceptBtn = await screen.findByRole('button', {
        name: /Accept Changes & Proceed/i,
      });
      await user.click(acceptBtn);

      // Verify that after accepting changes, a new checkout reference UUID was generated
      await waitFor(() => {
        const newRef = pageBefore.getAttribute('data-checkout-ref');
        expect(newRef).not.toBe(initialRef);
        expect(isValidUUID(newRef)).toBe(true);
      });
    });
  });
});
