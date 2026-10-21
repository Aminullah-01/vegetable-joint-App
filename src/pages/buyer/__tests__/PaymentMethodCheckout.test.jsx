import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Checkout } from '../Checkout';
import { OrderConfirmation } from '../OrderConfirmation';
import { OrderDetail } from '../OrderDetail';
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
  quantity: 2,
  subtotal: 5000,
  seller_id: 1,
  seller: { id: 1, business_name: 'Arewa Fresh Farms', location: 'Kano' },
};

async function loginAsBuyer() {
  const result = await authService.login({
    email: 'buyer@example.com',
    password: 'password123',
  });
  localStorage.setItem('vegetable_joint_token', result.token);
  return result;
}

function renderCheckoutWithCart(cartOverrides = {}) {
  const defaultCart = {
    items: [sampleTomato],
    isEmpty: false,
    itemCount: 2,
    uniqueItemCount: 1,
    subtotal: 5000,
    total: 5000,
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
      items: [sampleTomato],
    }),
    acknowledgeValidation: vi.fn().mockReturnValue([sampleTomato]),
    clearValidationNotice: vi.fn(),
  };

  const cartValue = { ...defaultCart, ...cartOverrides };

  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={['/checkout']}>
        <ToastProvider>
          <AuthProvider>
            <CartContext.Provider value={cartValue}>
              <Routes>
                <Route path="/checkout" element={children} />
                <Route
                  path="/checkout/confirmation/:ref"
                  element={
                    <div data-testid="confirmation-page">Confirmation Page</div>
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

  return render(<Checkout />, { wrapper: Wrapper });
}

async function waitUntilReady() {
  await screen.findByTestId('checkout-page');
  await waitFor(() =>
    expect(
      screen.queryByTestId('checkout-validating-indicator')
    ).not.toBeInTheDocument()
  );
}

describe('FE-073 / CHK-09: Payment Method Display (“Pay on delivery / pay seller directly”)', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
    await loginAsBuyer();
  });

  describe('1. Checkout Page Payment Method Card (CHK-09, Figma Section 10)', () => {
    it('renders the payment method section with correct testid and title', async () => {
      renderCheckoutWithCart();
      await waitUntilReady();

      const paymentCard = await screen.findByTestId(
        'checkout-payment-method-display'
      );
      expect(paymentCard).toBeInTheDocument();
      expect(paymentCard).toHaveAttribute('data-variant', 'card');

      expect(
        screen.getByRole('heading', { name: /Payment Method/i })
      ).toBeInTheDocument();
      expect(screen.getByTestId('payment-method-badge')).toHaveTextContent(
        /Pay on Delivery/i
      );
    });

    it('displays the required label "Pay on delivery / pay seller directly"', async () => {
      renderCheckoutWithCart();
      await waitUntilReady();

      const title = await screen.findByTestId('payment-method-title');
      expect(title).toHaveTextContent(
        /Pay on delivery \/ pay seller directly/i
      );
    });

    it('renders the radio button as checked and read-only for pay_on_delivery (no online gateway in 1.0)', async () => {
      renderCheckoutWithCart();
      await waitUntilReady();

      const radio = await screen.findByTestId('payment-method-radio');
      expect(radio).toBeInTheDocument();
      expect(radio).toBeChecked();
      expect(radio).toHaveAttribute('value', 'pay_on_delivery');
      expect(radio).toHaveAttribute('aria-checked', 'true');
    });

    it('explains the accepted direct modes: Cash on Delivery and Mobile / Bank Transfer', async () => {
      renderCheckoutWithCart();
      await waitUntilReady();

      expect(await screen.findByText(/Cash on Delivery/i)).toBeInTheDocument();
      expect(screen.getByText(/Mobile \/ Bank Transfer/i)).toBeInTheDocument();
    });

    it('clearly discloses that NO online payment is processed through the platform in Release 1.0 (A-07, OI-01)', async () => {
      renderCheckoutWithCart();
      await waitUntilReady();

      const disclosure = await screen.findByTestId(
        'payment-method-no-online-disclosure'
      );
      expect(disclosure).toBeInTheDocument();
      expect(disclosure).toHaveTextContent(/No Online Payment in Release 1.0/i);
      expect(disclosure).toHaveTextContent(
        /Vegetable Joint does not process online payments or charge debit cards through the platform in this version/i
      );
    });
  });

  describe('2. Order Review Modal & Submission Payload (CHK-03, CHK-09, A-07)', () => {
    it('shows the payment method disclosure inside the review modal and transmits payment_method in payload', async () => {
      const user = userEvent.setup({ delay: null });

      localStorage.setItem(
        DELIVERY_DETAILS_STORAGE_KEY,
        JSON.stringify({
          street: '12 Farm Road',
          town: 'Ikeja',
          state: 'Lagos',
          notes: 'Call on arrival',
        })
      );

      const createOrderSpy = vi
        .spyOn(orderService, 'createOrder')
        .mockResolvedValue({
          checkout_ref: 'CHK-REF-2026-TEST',
          orders: [{ id: 1, order_number: 'VJ-20261021-0001' }],
        });

      renderCheckoutWithCart();
      await waitUntilReady();

      const reviewBtn = await screen.findByTestId(
        'checkout-place-order-button'
      );
      await user.click(reviewBtn);

      const modal = await screen.findByTestId('checkout-review-modal');
      expect(modal).toBeInTheDocument();

      const modalPayment = screen.getByTestId('review-payment-section');
      expect(modalPayment).toHaveTextContent(
        /Pay on delivery \/ pay seller directly/i
      );
      expect(modalPayment).toHaveTextContent(
        /No online payment is processed on the platform/i
      );

      const confirmCheckboxes = screen.getAllByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckboxes[confirmCheckboxes.length - 1]);

      const placeOrderBtn = screen.getByTestId(
        'checkout-confirm-place-order-button'
      );
      await user.click(placeOrderBtn);

      await waitFor(() => {
        expect(createOrderSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            payment_method: 'pay_on_delivery',
          })
        );
      });
    });
  });

  describe('3. Order Confirmation Page (CHK-08, CHK-09, Figma Section 11)', () => {
    it('renders the payment method disclosure on the confirmation screen', () => {
      render(
        <MemoryRouter
          initialEntries={['/checkout/confirmation/VJ-20261021-0001']}
        >
          <Routes>
            <Route
              path="/checkout/confirmation/:ref"
              element={<OrderConfirmation />}
            />
          </Routes>
        </MemoryRouter>
      );

      const display = screen.getByTestId('checkout-payment-method-display');
      expect(display).toBeInTheDocument();
      expect(display).toHaveTextContent(
        /Pay on delivery \/ pay seller directly/i
      );
      expect(screen.getByTestId('payment-method-notice')).toHaveTextContent(
        /Online payment is not processed through the platform in Release 1.0/i
      );
    });
  });

  describe('4. Order Detail Page (ORD-02, CHK-09, Figma Section 11)', () => {
    it('renders the payment method disclosure on the buyer order details screen', () => {
      render(
        <MemoryRouter initialEntries={['/account/orders/42']}>
          <Routes>
            <Route path="/account/orders/:id" element={<OrderDetail />} />
          </Routes>
        </MemoryRouter>
      );

      const display = screen.getByTestId('checkout-payment-method-display');
      expect(display).toBeInTheDocument();
      expect(display).toHaveTextContent(
        /Pay on delivery \/ pay seller directly/i
      );
    });
  });
});
