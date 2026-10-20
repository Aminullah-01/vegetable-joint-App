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
import { DELIVERY_DETAILS_STORAGE_KEY } from '../../../constants';

const sampleTomato = {
  id: 1,
  product_id: 1,
  name: 'Fresh Roma Tomatoes',
  price: 2500,
  unit: 'basket',
  quantity: 3,
  subtotal: 7500,
  seller_id: 1,
  seller: { id: 1, business_name: 'Arewa Fresh Farms', location: 'Kano' },
};

const samplePepper = {
  id: 2,
  product_id: 2,
  name: 'Red Bell Peppers',
  price: 1800,
  unit: 'kg',
  quantity: 2,
  subtotal: 3600,
  seller_id: 2,
  seller: { id: 2, business_name: 'Danbatta Greens', location: 'Danbatta' },
};

const singleSellerItems = [sampleTomato];
const multiSellerItems = [sampleTomato, samplePepper];

async function loginAsBuyer() {
  const result = await authService.login({
    email: 'buyer@example.com',
    password: 'password123',
  });
  localStorage.setItem('vegetable_joint_token', result.token);
  return result;
}

function renderCheckout(cartOverrides = {}, initialRoute = '/checkout') {
  const defaultCart = {
    items: multiSellerItems,
    isEmpty: false,
    itemCount: 5,
    uniqueItemCount: 2,
    subtotal: 11100,
    total: 11100,
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
      items: multiSellerItems,
    }),
    acknowledgeValidation: vi.fn().mockReturnValue(multiSellerItems),
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

describe('Checkout Order Summary and Review (FE-071 / CHK-03, CHK-05, CHK-09, CHK-10, BR-02)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    vi.restoreAllMocks();
  });

  describe('1. Order Summary Layout & Calculations (CHK-03, BR-02)', () => {
    it('renders order summary with all items, quantities, units, prices, and line subtotals', async () => {
      await loginAsBuyer();
      renderCheckout({
        items: multiSellerItems,
        subtotal: 11100,
        total: 11100,
      });
      await waitUntilReady();

      expect(screen.getByTestId('checkout-order-summary')).toBeInTheDocument();
      expect(screen.getByTestId('checkout-order-items')).toBeInTheDocument();

      // Check Item 1: Tomatoes
      expect(screen.getByTestId('checkout-item-name-1')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
      expect(screen.getByTestId('checkout-item-meta-1')).toHaveTextContent(
        '3 × ₦2,500 per basket'
      );
      expect(screen.getByTestId('checkout-item-subtotal-1')).toHaveTextContent(
        '₦7,500'
      );

      // Check Item 2: Peppers
      expect(screen.getByTestId('checkout-item-name-2')).toHaveTextContent(
        'Red Bell Peppers'
      );
      expect(screen.getByTestId('checkout-item-meta-2')).toHaveTextContent(
        '2 × ₦1,800 per kg'
      );
      expect(screen.getByTestId('checkout-item-subtotal-2')).toHaveTextContent(
        '₦3,600'
      );

      // Financial breakdown
      expect(screen.getByTestId('checkout-subtotal')).toHaveTextContent(
        '₦11,100'
      );
      expect(screen.getByTestId('checkout-total')).toHaveTextContent('₦11,100');
      expect(
        screen.getByText(/Calculated on delivery \(BR-02\)/i)
      ).toBeInTheDocument();
    });

    it('identifies item sellers and alerts about multi-seller order splitting (CHK-05, BR-06)', async () => {
      await loginAsBuyer();
      renderCheckout({ items: multiSellerItems });
      await waitUntilReady();

      // Seller names displayed per item
      expect(screen.getByTestId('checkout-item-seller-1')).toHaveTextContent(
        'Arewa Fresh Farms'
      );
      expect(screen.getByTestId('checkout-item-seller-2')).toHaveTextContent(
        'Danbatta Greens'
      );

      // Multi-seller notice displayed
      expect(
        screen.getByTestId('checkout-multi-seller-notice')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('checkout-multi-seller-notice')
      ).toHaveTextContent(/Multi-Seller Order \(2 sellers\)/i);
    });

    it('does not display multi-seller split notice for single-seller cart', async () => {
      await loginAsBuyer();
      renderCheckout({
        items: singleSellerItems,
        subtotal: 7500,
        total: 7500,
        itemCount: 3,
      });
      await waitUntilReady();

      expect(
        screen.queryByTestId('checkout-multi-seller-notice')
      ).not.toBeInTheDocument();
    });

    it('displays the pay on delivery payment method disclosure (CHK-09, OI-01)', async () => {
      await loginAsBuyer();
      renderCheckout();
      await waitUntilReady();

      const paymentNotice = screen.getByTestId(
        'checkout-payment-method-notice'
      );
      expect(paymentNotice).toBeInTheDocument();
      expect(paymentNotice).toHaveTextContent(/Pay on delivery/i);
      expect(paymentNotice).toHaveTextContent(/Cash or Bank Transfer/i);
    });

    it('renders the 4-step progress stepper (CHK-10, Figma Section 10)', async () => {
      await loginAsBuyer();
      renderCheckout();
      await waitUntilReady();

      expect(screen.getByTestId('checkout-stepper')).toBeInTheDocument();
      expect(screen.getByTestId('checkout-step-1')).toHaveTextContent('Cart');
      expect(screen.getByTestId('checkout-step-2')).toHaveTextContent(
        'Delivery Details'
      );
      expect(screen.getByTestId('checkout-step-3')).toHaveTextContent(
        'Review & Confirm'
      );
      expect(screen.getByTestId('checkout-step-4')).toHaveTextContent(
        'Confirmation'
      );
    });
  });

  describe('2. Order Review Modal & Explicit Confirmation (CHK-03, CHK-10)', () => {
    it('prompts to enter delivery details if address is missing when clicking review', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      renderCheckout(); // no saved address in localStorage
      await waitUntilReady();

      const proceedBtn = screen.getByTestId('checkout-place-order-button');
      await user.click(proceedBtn);

      // Should not open review modal
      expect(
        screen.queryByTestId('checkout-review-modal')
      ).not.toBeInTheDocument();
    });

    it('opens order review modal with delivery details, seller breakdown, and totals', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();
      renderCheckout();
      await waitUntilReady();

      const proceedBtn = screen.getByTestId('checkout-place-order-button');
      await user.click(proceedBtn);

      // Review modal opens
      expect(
        await screen.findByTestId('checkout-review-modal')
      ).toBeInTheDocument();

      // Check Delivery Details in review
      expect(screen.getByTestId('review-delivery-section')).toBeInTheDocument();
      expect(screen.getByTestId('review-recipient-name')).toHaveTextContent(
        'Amina Bello'
      );
      expect(screen.getByTestId('review-phone')).toHaveTextContent(
        '+2348078901234'
      );
      expect(screen.getByTestId('review-address')).toHaveTextContent(
        '14 Bompai Road, Nassarawa, Kano'
      );
      expect(screen.getByTestId('review-notes')).toHaveTextContent(
        'Call before delivery'
      );

      // Check Seller Breakdown in review (CHK-05)
      expect(screen.getByTestId('review-seller-group-1')).toHaveTextContent(
        'Arewa Fresh Farms'
      );
      expect(screen.getByTestId('review-seller-group-2')).toHaveTextContent(
        'Danbatta Greens'
      );
      expect(screen.getByTestId('review-item-1')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
      expect(screen.getByTestId('review-item-2')).toHaveTextContent(
        'Red Bell Peppers'
      );

      // Check Payment Method & Totals
      expect(screen.getByTestId('review-payment-section')).toHaveTextContent(
        /Pay on delivery/i
      );
      expect(screen.getByTestId('review-subtotal')).toHaveTextContent(
        '₦11,100'
      );
      expect(screen.getByTestId('review-order-total')).toHaveTextContent(
        '₦11,100'
      );
    });

    it('enforces explicit confirmation before placing order (CHK-03)', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();
      renderCheckout();
      await waitUntilReady();

      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      const confirmBtn = screen.getByTestId(
        'checkout-confirm-place-order-button'
      );
      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      const modalCheckbox = confirmCheckboxes[confirmCheckboxes.length - 1];

      // Initially unchecked and button is disabled
      expect(modalCheckbox).not.toBeChecked();
      expect(confirmBtn).toBeDisabled();

      // Check the explicit confirmation checkbox
      await user.click(modalCheckbox);
      expect(modalCheckbox).toBeChecked();
      expect(confirmBtn).not.toBeDisabled();

      // Uncheck disables button again
      await user.click(modalCheckbox);
      expect(confirmBtn).toBeDisabled();
    });

    it('closes review modal when clicking "Back to Edit" or "Edit Details"', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();
      renderCheckout();
      await waitUntilReady();

      await user.click(screen.getByTestId('checkout-place-order-button'));
      await screen.findByTestId('checkout-review-modal');

      // Click Back to Edit button
      await user.click(screen.getByTestId('checkout-review-back-button'));
      await waitFor(() => {
        expect(
          screen.queryByTestId('checkout-review-modal')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('3. Order Placement Integration (CHK-03, CHK-05, CHK-08)', () => {
    it('creates orders with correct payload, clears cart, and navigates to confirmation', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      const createOrderSpy = vi
        .spyOn(orderService, 'createOrder')
        .mockResolvedValue({
          checkout_ref: 'chk_test_12345',
          orders: [
            { id: 101, order_number: 'VJ-20261020-001' },
            { id: 102, order_number: 'VJ-20261020-002' },
          ],
        });

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

      // Confirm and place order
      await user.click(
        screen.getByTestId('checkout-confirm-place-order-button')
      );

      await waitFor(() => {
        expect(createOrderSpy).toHaveBeenCalledTimes(1);
      });

      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            { product_id: 1, quantity: 3, price: 2500 },
            { product_id: 2, quantity: 2, price: 1800 },
          ],
          delivery_name: 'Amina Bello',
          delivery_phone: '+2348078901234',
          delivery_address: '14 Bompai Road, Nassarawa, Kano',
          notes: 'Call before delivery',
          payment_method: 'pay_on_delivery',
        })
      );

      // Cart cleared (CHK-08)
      expect(cartValue.clearCart).toHaveBeenCalledTimes(1);

      // Navigated to confirmation screen
      expect(
        await screen.findByText('Mock Confirmation Page')
      ).toBeInTheDocument();
    });

    it('displays error feedback when order placement fails', async () => {
      const user = userEvent.setup();
      await loginAsBuyer();
      setSavedAddress();

      vi.spyOn(orderService, 'createOrder').mockRejectedValue(
        new Error('One or more selected items are currently out of stock.')
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

      const errorAlert = await screen.findByTestId('checkout-submission-error');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent(/out of stock/i);
    });
  });
});
