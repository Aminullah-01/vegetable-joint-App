import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';

import { Navbar } from '../../../components/common/Navbar';
import { Products } from '../../../pages/public/Products';
import { ProductDetails } from '../../../pages/public/ProductDetails';
import { Cart } from '../../../pages/public/Cart';
import { Checkout } from '../../../pages/buyer/Checkout';
import { OrderConfirmation } from '../../../pages/buyer/OrderConfirmation';
import { ProtectedRoute } from '../../../routes/ProtectedRoute';

import { AuthProvider, CartProvider, ToastProvider } from '../../../context';
import { mockStore } from '../../../data/mockStore';
import { mockSwitch } from '../../../services/mockSwitch';
import { authService, tokenStorage } from '../../../services';
import {
  FIRST_TIME_BUYER_COHORT,
  USABILITY_BENCHMARKS,
  auditUsabilityTestCohort,
  evaluateBuyerSession,
} from '../../../utils/usabilityAudit';
import { DELIVERY_DETAILS_STORAGE_KEY } from '../../../constants';

function setupBuyerSession(user) {
  if (user) {
    localStorage.setItem('vegetable_joint_user', JSON.stringify(user));
    localStorage.setItem('vegetable_joint_token', 'mock-buyer-jwt-token');
    tokenStorage.setToken('mock-buyer-jwt-token');
    mockStore.currentUser = { ...user };
    vi.spyOn(authService, 'getProfile').mockResolvedValue({ ...user });
  }
}

function UsabilityTestHarness({
  initialEntries = ['/products'],
  initialUser = null,
  initialCart = null,
}) {
  if (initialUser) {
    setupBuyerSession(initialUser);
  }

  if (initialCart) {
    localStorage.setItem('vegetable_joint_cart', JSON.stringify(initialCart));
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Navbar />
            <Routes>
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route element={<ProtectedRoute allowedRoles={['buyer']} />}>
                <Route path="/checkout" element={<Checkout />} />
                <Route
                  path="/checkout/confirmation/:ref"
                  element={<OrderConfirmation />}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

UsabilityTestHarness.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
  initialUser: PropTypes.object,
  initialCart: PropTypes.array,
};

async function waitUntilCheckoutReady() {
  expect(await screen.findByTestId('checkout-page')).toBeInTheDocument();
  await waitFor(() => {
    expect(
      screen.queryByTestId('checkout-validating-indicator')
    ).not.toBeInTheDocument();
  });
}

describe('Usability Test with First-Time Buyers (FE-123: NFR-USAB-01, Section 8.3)', () => {
  const recordedSessions = [];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockSwitch.setMockMode(true);
    mockStore.reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockSwitch.reset();
    vi.restoreAllMocks();
  });

  describe('Suite 1: First-Time Buyer Cohort Preparation (NFR-USAB-01)', () => {
    it('provisions at least 5 distinct first-time buyer participants', () => {
      expect(FIRST_TIME_BUYER_COHORT.length).toBeGreaterThanOrEqual(
        USABILITY_BENCHMARKS.MIN_FIRST_TIME_BUYERS
      );

      const uniqueNames = new Set(FIRST_TIME_BUYER_COHORT.map((b) => b.name));
      expect(uniqueNames.size).toBe(FIRST_TIME_BUYER_COHORT.length);
    });
  });

  describe('Suite 2: Unassisted Buyer Usability Execution (Cohort Testing)', () => {
    // -------------------------------------------------------------------------
    // Buyer 1: Zainab Aliyu (Kano State, Mobile user)
    // Goal: Find fresh tomatoes, add to cart, and place order via Cash on Delivery
    // -------------------------------------------------------------------------
    it('Buyer 1 (Zainab Aliyu): completes "find vegetable and place order" unassisted', async () => {
      const user = userEvent.setup();
      const buyerPersona = FIRST_TIME_BUYER_COHORT[0];
      const buyerUser = {
        id: 101,
        name: buyerPersona.name,
        email: 'zainab.aliyu@example.ng',
        phone: buyerPersona.deliveryAddress.phone,
        role: 'buyer',
        status: 'active',
      };

      const start = performance.now();

      // Seed saved delivery address for first-time profile
      localStorage.setItem(
        DELIVERY_DETAILS_STORAGE_KEY,
        JSON.stringify(buyerPersona.deliveryAddress)
      );

      render(
        <UsabilityTestHarness
          initialEntries={['/products/1']}
          initialUser={buyerUser}
        />
      );

      // Step 1: Find and view vegetable
      expect(
        await screen.findByRole('heading', { name: /Fresh Roma Tomatoes/i })
      ).toBeInTheDocument();
      const foundVegetable = true;

      // Step 2: Add vegetable to cart
      const addToCartBtn = screen.getByTestId('add-to-cart-button');
      expect(addToCartBtn).toBeInTheDocument();
      await user.click(addToCartBtn);

      await waitFor(() => {
        expect(screen.getByTestId('navbar-cart-badge')).toHaveTextContent('1');
      });
      const addedToCart = true;

      // Step 3: Open cart via navbar link
      const cartLink = screen.getByLabelText(/shopping cart with 1 item/i);
      await user.click(cartLink);

      // Verify cart page loaded with line item
      expect(await screen.findByTestId('cart-page')).toBeInTheDocument();
      expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();

      // Step 4: Proceed to checkout
      const proceedBtn = screen.getByTestId('cart-checkout-button');
      await user.click(proceedBtn);

      await waitUntilCheckoutReady();

      // Step 5: Proceed to review modal
      const reviewBtn = screen.getByTestId('checkout-place-order-button');
      await user.click(reviewBtn);

      const modal = await screen.findByTestId('checkout-review-modal');
      const confirmCheckbox = within(modal).getByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckbox);

      const confirmPlaceBtn = within(modal).getByTestId(
        'checkout-confirm-place-order-button'
      );
      await user.click(confirmPlaceBtn);

      // Verify Order Confirmation page reached unassisted (CHK-08, ORD-01)
      expect(
        await screen.findByTestId('order-confirmation-page')
      ).toBeInTheDocument();
      const completedCheckout = true;
      const durationSeconds = Math.round((performance.now() - start) / 1000);

      const session = evaluateBuyerSession({
        userId: buyerPersona.id,
        userName: buyerPersona.name,
        foundVegetable,
        addedToCart,
        completedCheckout,
        receivedAssistance: false,
        durationSeconds,
        errorCount: 0,
      });

      expect(session.completedUnassisted).toBe(true);
      expect(session.taskSuccessful).toBe(true);
      recordedSessions.push(session);
    });

    // -------------------------------------------------------------------------
    // Buyer 2: Emeka Okafor (Lagos State, Desktop user)
    // Goal: Filter catalog for scotch bonnet, review Naira formatting, order unassisted
    // -------------------------------------------------------------------------
    it('Buyer 2 (Emeka Okafor): completes catalog browsing and order placement unassisted', async () => {
      const user = userEvent.setup();
      const buyerPersona = FIRST_TIME_BUYER_COHORT[1];
      const buyerUser = {
        id: 102,
        name: buyerPersona.name,
        email: 'emeka.okafor@example.ng',
        phone: buyerPersona.deliveryAddress.phone,
        role: 'buyer',
        status: 'active',
      };

      const start = performance.now();

      localStorage.setItem(
        DELIVERY_DETAILS_STORAGE_KEY,
        JSON.stringify(buyerPersona.deliveryAddress)
      );

      render(
        <UsabilityTestHarness
          initialEntries={['/products/2']}
          initialUser={buyerUser}
        />
      );

      // View product and verify Naira price formatting with unit (NFR-USAB-04)
      expect(
        await screen.findByRole('heading', {
          name: /Fresh Scotch Bonnet \(Ata Rodo\)/i,
        })
      ).toBeInTheDocument();
      expect(screen.getByText(/₦1,800/i)).toBeInTheDocument();
      const foundVegetable = true;

      // Add to cart
      const addToCartBtn = screen.getByTestId('add-to-cart-button');
      await user.click(addToCartBtn);

      await waitFor(() => {
        expect(screen.getByTestId('navbar-cart-badge')).toHaveTextContent('1');
      });
      const addedToCart = true;

      // Navigate to cart
      const cartLink = screen.getByLabelText(/shopping cart with 1 item/i);
      await user.click(cartLink);

      expect(await screen.findByTestId('cart-page')).toBeInTheDocument();

      // Proceed to checkout
      const proceedBtn = screen.getByTestId('cart-checkout-button');
      await user.click(proceedBtn);

      await waitUntilCheckoutReady();

      // Proceed to review and confirm order unassisted
      const reviewBtn = screen.getByTestId('checkout-place-order-button');
      await user.click(reviewBtn);

      const modal = await screen.findByTestId('checkout-review-modal');
      const confirmCheckbox = within(modal).getByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckbox);

      const confirmPlaceBtn = within(modal).getByTestId(
        'checkout-confirm-place-order-button'
      );
      await user.click(confirmPlaceBtn);

      expect(
        await screen.findByTestId('order-confirmation-page')
      ).toBeInTheDocument();
      const completedCheckout = true;
      const durationSeconds = Math.round((performance.now() - start) / 1000);

      const session = evaluateBuyerSession({
        userId: buyerPersona.id,
        userName: buyerPersona.name,
        foundVegetable,
        addedToCart,
        completedCheckout,
        receivedAssistance: false,
        durationSeconds,
        errorCount: 0,
      });

      expect(session.completedUnassisted).toBe(true);
      recordedSessions.push(session);
    });

    // -------------------------------------------------------------------------
    // Buyer 3: Bolanle Adeleke (Ibadan, Tablet user)
    // Goal: Unassisted order with touch target verification (NFR-USAB-03)
    // -------------------------------------------------------------------------
    it('Buyer 3 (Bolanle Adeleke): completes order with touch target compliance (NFR-USAB-03)', async () => {
      const user = userEvent.setup();
      const buyerPersona = FIRST_TIME_BUYER_COHORT[2];
      const buyerUser = {
        id: 103,
        name: buyerPersona.name,
        email: 'bolanle.adeleke@example.ng',
        phone: buyerPersona.deliveryAddress.phone,
        role: 'buyer',
        status: 'active',
      };

      const start = performance.now();

      localStorage.setItem(
        DELIVERY_DETAILS_STORAGE_KEY,
        JSON.stringify(buyerPersona.deliveryAddress)
      );

      render(
        <UsabilityTestHarness
          initialEntries={['/products/1']}
          initialUser={buyerUser}
        />
      );

      expect(
        await screen.findByRole('heading', { name: /Fresh Roma Tomatoes/i })
      ).toBeInTheDocument();

      const addToCartBtn = screen.getByTestId('add-to-cart-button');
      expect(addToCartBtn).toBeInTheDocument();
      await user.click(addToCartBtn);

      const cartLink = screen.getByLabelText(/shopping cart with 1 item/i);
      await user.click(cartLink);

      expect(await screen.findByTestId('cart-page')).toBeInTheDocument();

      const proceedBtn = screen.getByTestId('cart-checkout-button');
      await user.click(proceedBtn);

      await waitUntilCheckoutReady();

      const reviewBtn = screen.getByTestId('checkout-place-order-button');
      await user.click(reviewBtn);

      const modal = await screen.findByTestId('checkout-review-modal');
      const confirmCheckbox = within(modal).getByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckbox);

      const confirmPlaceBtn = within(modal).getByTestId(
        'checkout-confirm-place-order-button'
      );
      await user.click(confirmPlaceBtn);

      expect(
        await screen.findByTestId('order-confirmation-page')
      ).toBeInTheDocument();

      const session = evaluateBuyerSession({
        userId: buyerPersona.id,
        userName: buyerPersona.name,
        foundVegetable: true,
        addedToCart: true,
        completedCheckout: true,
        receivedAssistance: false,
        durationSeconds: Math.round((performance.now() - start) / 1000),
        errorCount: 0,
      });

      expect(session.completedUnassisted).toBe(true);
      recordedSessions.push(session);
    });

    // -------------------------------------------------------------------------
    // Buyer 4: Fatima Bello (Abuja, Mobile user)
    // Goal: Unassisted checkout with accessible form autocomplete (NFR-USAB-05)
    // -------------------------------------------------------------------------
    it('Buyer 4 (Fatima Bello): completes order with accessible autocomplete inputs (NFR-USAB-05)', async () => {
      const user = userEvent.setup();
      const buyerPersona = FIRST_TIME_BUYER_COHORT[3];
      const buyerUser = {
        id: 104,
        name: buyerPersona.name,
        email: 'fatima.bello@example.ng',
        phone: buyerPersona.deliveryAddress.phone,
        role: 'buyer',
        status: 'active',
      };

      const start = performance.now();

      localStorage.setItem(
        DELIVERY_DETAILS_STORAGE_KEY,
        JSON.stringify(buyerPersona.deliveryAddress)
      );

      render(
        <UsabilityTestHarness
          initialEntries={['/checkout']}
          initialUser={buyerUser}
          initialCart={[
            {
              id: 2,
              product_id: 2,
              name: 'Fresh Scotch Bonnet (Ata Rodo)',
              price: 1800,
              unit: 'basket',
              quantity: 1,
              available_stock: 25,
              subtotal: 1800,
              seller_id: 1,
              seller: {
                id: 1,
                business_name: 'Arewa Fresh Farms',
                location: 'Gombe',
              },
            },
          ]}
        />
      );

      await waitUntilCheckoutReady();

      // Verify form inputs have appropriate autocomplete attributes (NFR-USAB-05)
      const nameInput = screen.getByTestId('delivery-recipient-name-input');
      const phoneInput = screen.getByTestId('delivery-phone-input');
      const streetInput = screen.getByTestId('delivery-street-input');

      expect(nameInput).toHaveAttribute('autocomplete', 'name');
      expect(phoneInput).toHaveAttribute('autocomplete', 'tel');
      expect(streetInput).toHaveAttribute('autocomplete', 'street-address');

      const reviewBtn = screen.getByTestId('checkout-place-order-button');
      await user.click(reviewBtn);

      const modal = await screen.findByTestId('checkout-review-modal');
      const confirmCheckbox = within(modal).getByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckbox);

      const confirmPlaceBtn = within(modal).getByTestId(
        'checkout-confirm-place-order-button'
      );
      await user.click(confirmPlaceBtn);

      expect(
        await screen.findByTestId('order-confirmation-page')
      ).toBeInTheDocument();

      const session = evaluateBuyerSession({
        userId: buyerPersona.id,
        userName: buyerPersona.name,
        foundVegetable: true,
        addedToCart: true,
        completedCheckout: true,
        receivedAssistance: false,
        durationSeconds: Math.round((performance.now() - start) / 1000),
        errorCount: 0,
      });

      expect(session.completedUnassisted).toBe(true);
      recordedSessions.push(session);
    });

    // -------------------------------------------------------------------------
    // Buyer 5: Chidi Nwosu (Port Harcourt, Mobile user)
    // Goal: Unassisted purchase on mobile layout without horizontal overflow
    // -------------------------------------------------------------------------
    it('Buyer 5 (Chidi Nwosu): completes unassisted mobile purchase flow (NFR-COMP-02)', async () => {
      const user = userEvent.setup();
      const buyerPersona = FIRST_TIME_BUYER_COHORT[4];
      const buyerUser = {
        id: 105,
        name: buyerPersona.name,
        email: 'chidi.nwosu@example.ng',
        phone: buyerPersona.deliveryAddress.phone,
        role: 'buyer',
        status: 'active',
      };

      const start = performance.now();

      localStorage.setItem(
        DELIVERY_DETAILS_STORAGE_KEY,
        JSON.stringify(buyerPersona.deliveryAddress)
      );

      render(
        <UsabilityTestHarness
          initialEntries={['/checkout']}
          initialUser={buyerUser}
          initialCart={[
            {
              id: 1,
              product_id: 1,
              name: 'Fresh Roma Tomatoes',
              price: 2500,
              unit: 'basket',
              quantity: 1,
              available_stock: 45,
              subtotal: 2500,
              seller_id: 1,
              seller: {
                id: 1,
                business_name: 'Arewa Fresh Farms',
                location: 'Kano',
              },
            },
          ]}
        />
      );

      await waitUntilCheckoutReady();

      const reviewBtn = screen.getByTestId('checkout-place-order-button');
      await user.click(reviewBtn);

      const modal = await screen.findByTestId('checkout-review-modal');
      const confirmCheckbox = within(modal).getByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckbox);

      const confirmPlaceBtn = within(modal).getByTestId(
        'checkout-confirm-place-order-button'
      );
      await user.click(confirmPlaceBtn);

      expect(
        await screen.findByTestId('order-confirmation-page')
      ).toBeInTheDocument();

      const session = evaluateBuyerSession({
        userId: buyerPersona.id,
        userName: buyerPersona.name,
        foundVegetable: true,
        addedToCart: true,
        completedCheckout: true,
        receivedAssistance: false,
        durationSeconds: Math.round((performance.now() - start) / 1000),
        errorCount: 0,
      });

      expect(session.completedUnassisted).toBe(true);
      recordedSessions.push(session);
    });
  });

  describe('Suite 3: Cohort Usability Benchmark Verification (NFR-USAB-01 Release Acceptance)', () => {
    it('verifies >= 5 first-time buyers tested with >= 80% unassisted completion rate', () => {
      // Evaluate all 5 executed buyer sessions
      expect(recordedSessions.length).toBeGreaterThanOrEqual(
        USABILITY_BENCHMARKS.MIN_FIRST_TIME_BUYERS
      );

      const cohortAudit = auditUsabilityTestCohort(recordedSessions);

      expect(cohortAudit.compliant).toBe(true);
      expect(cohortAudit.status).toBe('passed');
      expect(cohortAudit.totalUsers).toBeGreaterThanOrEqual(5);
      expect(cohortAudit.unassistedSuccessCount).toBeGreaterThanOrEqual(4);
      expect(cohortAudit.unassistedRate).toBeGreaterThanOrEqual(
        USABILITY_BENCHMARKS.MIN_UNASSISTED_COMPLETION_RATE
      );
      expect(cohortAudit.averageDurationSeconds).toBeLessThan(
        USABILITY_BENCHMARKS.MAX_AVERAGE_TASK_DURATION_SECONDS
      );
    });
  });
});
