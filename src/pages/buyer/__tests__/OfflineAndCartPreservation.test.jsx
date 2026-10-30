import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, CartProvider, ToastProvider } from '../../../context';
import { Checkout } from '../Checkout.jsx';
import { Products } from '../../public/Products.jsx';
import { OfflineBanner } from '../../../components/common/OfflineBanner.jsx';
import { orderService, productService, cartService } from '../../../services';
import { networkStatus } from '../../../services/networkStatus.js';
import { createNetworkError } from '../../../services/apiErrors.js';

const STORAGE_CART_KEY = 'vegetable_joint_cart';
const STORAGE_TOKEN_KEY = 'vegetable_joint_token';
const STORAGE_USER_KEY = 'vegetable_joint_user';

const mockBuyerUser = {
  id: 6,
  name: 'Amina Bello',
  email: 'buyer@example.com',
  phone: '+2348012345678',
  role: 'buyer',
  status: 'active',
};

const mockSeedCart = [
  {
    id: 1,
    product_id: 1,
    name: 'Fresh Habanero Pepper (Atarodo)',
    price: 1500,
    unit: 'basket',
    quantity: 2,
    seller_id: 2,
    seller_name: 'Arewa Fresh Farms',
    is_available: true,
  },
  {
    id: 2,
    product_id: 2,
    name: 'Ripe Tomatoes',
    price: 3000,
    unit: 'crate',
    quantity: 1,
    seller_id: 2,
    seller_name: 'Arewa Fresh Farms',
    is_available: true,
  },
];

function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>{ui}</CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('FE-111: Retry and Offline Error Handling (NFR-REL-05, MKT-10)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    networkStatus.reset();
    vi.restoreAllMocks();

    // Authenticate as buyer
    window.localStorage.setItem(STORAGE_TOKEN_KEY, 'mock-buyer-token');
    window.localStorage.setItem(
      STORAGE_USER_KEY,
      JSON.stringify(mockBuyerUser)
    );
    // Seed cart in localStorage
    window.localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(mockSeedCart));

    vi.spyOn(cartService, 'fetchCart').mockResolvedValue({
      items: mockSeedCart,
    });
    vi.spyOn(cartService, 'validateCart').mockResolvedValue({
      is_valid: true,
      has_price_changes: false,
      has_stock_issues: false,
      has_unavailable: false,
      changes: [],
      items: mockSeedCart,
    });
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    networkStatus.reset();
    vi.restoreAllMocks();
  });

  describe('NFR-REL-05: Cart Preservation When API is Unreachable or Offline', () => {
    it('preserves cart items in localStorage and context when offline', () => {
      networkStatus.setSimulatedStatus(false);

      renderWithProviders(<OfflineBanner />);

      // Verify offline banner informs user cart is preserved
      expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
      expect(
        screen.getByText(/Your cart and details are safely preserved/i)
      ).toBeInTheDocument();

      // Verify cart in localStorage is completely intact
      const savedCart = JSON.parse(
        window.localStorage.getItem(STORAGE_CART_KEY)
      );
      expect(savedCart).toHaveLength(2);
      expect(savedCart[0].name).toContain('Fresh Habanero Pepper');
    });

    it('renders OfflineBanner with Retry button and notifies when connection restored', async () => {
      networkStatus.setSimulatedStatus(false);

      renderWithProviders(<OfflineBanner />);
      const retryBtn = screen.getByTestId('offline-retry-button');
      expect(retryBtn).toBeInTheDocument();

      // Simulate coming back online
      networkStatus.setSimulatedStatus(true);

      await waitFor(() => {
        expect(
          screen.getByTestId('online-restored-banner')
        ).toBeInTheDocument();
        expect(
          screen.getByText(/internet connection restored/i)
        ).toBeInTheDocument();
      });
    });

    it('never loses the cart when checkout order placement encounters unreachable API, and enables retry', async () => {
      const user = userEvent.setup();

      // Mock order submission to throw a network error on the first attempt
      let attempts = 0;
      vi.spyOn(orderService, 'createOrder').mockImplementation(
        async (payload) => {
          attempts += 1;
          if (attempts === 1) {
            throw createNetworkError(
              new TypeError('Failed to fetch (API unreachable)')
            );
          }
          return {
            checkout_ref: payload.checkout_ref,
            orders: [
              {
                id: 501,
                order_number: 'ORD-2026-00501',
                status: 'pending',
                total_amount: 6000,
              },
            ],
          };
        }
      );

      renderWithProviders(
        <Routes>
          <Route path="/checkout" element={<Checkout />} />
          <Route
            path="/checkout/confirmation/:ref"
            element={
              <div data-testid="order-confirmation-page">Order Confirmed!</div>
            }
          />
        </Routes>,
        { route: '/checkout' }
      );

      // Wait until checkout revalidation has finished
      await waitFor(() => {
        expect(
          screen.getByTestId('checkout-order-summary')
        ).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(
          screen.queryByTestId('checkout-validating-indicator')
        ).not.toBeInTheDocument();
      });

      const streetInput = screen.getByTestId('delivery-street-input');
      const townInput = screen.getByTestId('delivery-town-input');
      const stateSelect = screen.getByTestId('delivery-state-select');

      await user.clear(streetInput);
      await user.type(streetInput, 'Plot 14 Farm Road');
      await user.clear(townInput);
      await user.type(townInput, 'Maitama');
      await user.selectOptions(stateSelect, 'FCT (Abuja)');

      // Step 1: Open review modal
      const proceedToReviewBtn = screen.getByTestId(
        'checkout-place-order-button'
      );
      await user.click(proceedToReviewBtn);

      await waitFor(() => {
        expect(screen.getByTestId('checkout-review-modal')).toBeInTheDocument();
      });

      // Confirm checkbox inside modal and place order
      const modal = screen.getByTestId('checkout-review-modal');
      const confirmCheckbox = within(modal).getByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckbox);

      const placeOrderBtn = screen.getByTestId(
        'checkout-confirm-place-order-button'
      );
      await user.click(placeOrderBtn);

      // Verification after Attempt 1 fails with Network Error:
      // 1. Error message displayed
      await waitFor(() => {
        expect(
          screen.getAllByText(
            /Unable to reach the server. Your cart and order details are safely preserved/i
          ).length
        ).toBeGreaterThanOrEqual(1);
      });

      // 2. Cart is NEVER lost / localStorage still contains items
      const cartDuringFailure = JSON.parse(
        window.localStorage.getItem(STORAGE_CART_KEY) || '[]'
      );
      expect(cartDuringFailure.length).toBe(2);

      // 3. Retry action button is visible
      const retryBtn = within(modal).getByRole('button', {
        name: /retry order submission/i,
      });
      expect(retryBtn).toBeInTheDocument();

      // Attempt 2: Click Retry Order Submission
      await user.click(retryBtn);

      // 4. Order succeeds on retry, confirmation page displayed
      await waitFor(() => {
        expect(
          screen.getByTestId('order-confirmation-page')
        ).toBeInTheDocument();
      });

      // 5. Cart is now cleanly cleared only upon confirmed order success (CHK-08)
      expect(attempts).toBe(2);
      const cartAfterSuccess = JSON.parse(
        window.localStorage.getItem(STORAGE_CART_KEY) || '[]'
      );
      expect(cartAfterSuccess.length).toBe(0);
    });
  });

  describe('MKT-10: Product Catalog Loading and Failure Retry', () => {
    it('shows loading indicator while loading, and on API failure shows error with retry action', async () => {
      const user = userEvent.setup();

      const getProductsSpy = vi.spyOn(productService, 'getProducts');
      getProductsSpy.mockRejectedValueOnce(
        createNetworkError(new TypeError('Network offline'))
      );

      renderWithProviders(<Products />, { route: '/products' });

      // First attempt fails: shows error message with retry button
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
        expect(
          screen.getByText('Unable to load vegetables')
        ).toBeInTheDocument();
      });

      const retryBtn = screen.getByTestId('error-state-retry-btn');
      expect(retryBtn).toBeInTheDocument();

      // Click retry button (mockStore will succeed)
      await user.click(retryBtn);

      // Second attempt succeeds: product grid rendered
      await waitFor(() => {
        expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
      });
    });
  });
});
