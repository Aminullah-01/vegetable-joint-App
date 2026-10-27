import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { OrderConfirmation } from '../OrderConfirmation';
import { CartContext } from '../../../context/cartContextDef';
import { orderService } from '../../../services/orderService';
import { formatCurrency, formatDate } from '../../../utils';

const mockSingleSellerOrder = {
  id: 101,
  order_number: 'VJ-20261027-101',
  checkout_ref: 'chk_e823f001-9a7c-482d-8812-aabbccddeeff',
  buyer_id: 6,
  seller_id: 1,
  total_amount: 5000,
  status: 'pending',
  payment_method: 'pay_on_delivery',
  delivery_name: 'Amina Bello',
  delivery_phone: '+2348078901234',
  delivery_address: '14 Bompai Road, Nassarawa, Kano',
  notes: 'Ring bell or call on arrival',
  created_at: '2026-10-27T10:30:00.000Z',
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    location: 'Kano',
  },
  items: [
    {
      id: 1,
      order_id: 101,
      product_id: 1,
      product_name: 'Fresh Roma Tomatoes',
      unit: 'basket',
      quantity: 2,
      price: 2500,
      subtotal: 5000,
    },
  ],
};

const mockMultiSellerOrders = [
  {
    id: 201,
    order_number: 'VJ-20261027-201',
    checkout_ref: 'chk_multi_split_ref_1234',
    buyer_id: 6,
    seller_id: 1,
    total_amount: 5000,
    status: 'pending',
    payment_method: 'pay_on_delivery',
    delivery_name: 'Babangida Usman',
    delivery_phone: '+2348099887766',
    delivery_address: 'Plot 45 Ahmadu Bello Way, Abuja',
    notes: 'Leave at front security gate',
    created_at: '2026-10-27T11:00:00.000Z',
    seller: {
      id: 1,
      business_name: 'Arewa Fresh Farms',
      location: 'Kano',
    },
    items: [
      {
        id: 1,
        order_id: 201,
        product_id: 1,
        product_name: 'Fresh Roma Tomatoes',
        unit: 'basket',
        quantity: 2,
        price: 2500,
        subtotal: 5000,
      },
    ],
  },
  {
    id: 202,
    order_number: 'VJ-20261027-202',
    checkout_ref: 'chk_multi_split_ref_1234',
    buyer_id: 6,
    seller_id: 2,
    total_amount: 3600,
    status: 'pending',
    payment_method: 'pay_on_delivery',
    delivery_name: 'Babangida Usman',
    delivery_phone: '+2348099887766',
    delivery_address: 'Plot 45 Ahmadu Bello Way, Abuja',
    notes: 'Leave at front security gate',
    created_at: '2026-10-27T11:00:00.000Z',
    seller: {
      id: 2,
      business_name: 'Danbatta Greens',
      location: 'Kaduna',
    },
    items: [
      {
        id: 2,
        order_id: 202,
        product_id: 2,
        product_name: 'Red Bell Peppers',
        unit: 'kg',
        quantity: 2,
        price: 1800,
        subtotal: 3600,
      },
    ],
  },
];

function renderOrderConfirmation({
  route = '/checkout/confirmation/chk_e823f001-9a7c-482d-8812-aabbccddeeff',
  locationState = null,
  cartOverrides = {},
} = {}) {
  const clearCartMock = vi.fn();

  const cartValue = {
    items: [{ id: 1, name: 'Fresh Roma Tomatoes', quantity: 2 }],
    clearCart: clearCartMock,
    ...cartOverrides,
  };

  function Wrapper({ children }) {
    return (
      <MemoryRouter
        initialEntries={[
          locationState ? { pathname: route, state: locationState } : route,
        ]}
      >
        <CartContext.Provider value={cartValue}>
          <Routes>
            <Route path="/checkout/confirmation/:ref" element={children} />
            <Route
              path="/account/orders"
              element={<div data-testid="orders-page">My Orders Page</div>}
            />
            <Route
              path="/products"
              element={<div data-testid="products-page">Products Page</div>}
            />
          </Routes>
        </CartContext.Provider>
      </MemoryRouter>
    );
  }

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  const renderResult = render(<OrderConfirmation />, { wrapper: Wrapper });
  return { ...renderResult, clearCartMock };
}

describe('FE-076: Order Confirmation Page (CHK-08, CHK-05, CHK-09, CHK-10, Figma Section 11)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Visual Stepper & Hero (CHK-10, Figma Section 11)', () => {
    it('renders the 4-step progress stepper at Step 4 (Confirmation) with navigation disabled', () => {
      renderOrderConfirmation({
        locationState: { orders: [mockSingleSellerOrder] },
      });

      const stepper = screen.getByRole('navigation', {
        name: /checkout progress/i,
      });
      expect(stepper).toBeInTheDocument();

      const step4 = screen.getByTestId('checkout-step-4');
      expect(step4).toHaveAttribute('data-status', 'current');
      expect(step4).toHaveTextContent(/Confirmation/i);

      // Previous steps are marked completed
      expect(screen.getByTestId('checkout-step-1')).toHaveAttribute(
        'data-status',
        'completed'
      );
      expect(screen.getByTestId('checkout-step-2')).toHaveAttribute(
        'data-status',
        'completed'
      );
      expect(screen.getByTestId('checkout-step-3')).toHaveAttribute(
        'data-status',
        'completed'
      );
    });

    it('renders the confirmation hero with heading and checkout reference', () => {
      renderOrderConfirmation({
        locationState: {
          orders: [mockSingleSellerOrder],
          checkoutRef: mockSingleSellerOrder.checkout_ref,
        },
      });

      expect(
        screen.getByRole('heading', {
          name: /Order Placed Successfully!/i,
        })
      ).toBeInTheDocument();

      const refPill = screen.getByTestId('order-confirmation-ref');
      expect(refPill).toHaveTextContent(mockSingleSellerOrder.checkout_ref);
    });
  });

  describe('2. Cart Clearance on Mount (CHK-08)', () => {
    it('automatically calls clearCart() when the confirmation screen is displayed', () => {
      const { clearCartMock } = renderOrderConfirmation({
        locationState: { orders: [mockSingleSellerOrder] },
      });

      expect(clearCartMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Single-Seller Order Presentation (CHK-08, Figma Section 11)', () => {
    it('renders order number, formatted date, seller name, and order status badge', () => {
      renderOrderConfirmation({
        locationState: { orders: [mockSingleSellerOrder] },
      });

      expect(screen.getByTestId('confirmation-order-number')).toHaveTextContent(
        mockSingleSellerOrder.order_number
      );
      expect(screen.getByTestId('confirmation-order-date')).toHaveTextContent(
        formatDate(mockSingleSellerOrder.created_at)
      );
      expect(screen.getByTestId('confirmation-seller-name')).toHaveTextContent(
        mockSingleSellerOrder.seller.business_name
      );

      const statusBadge = screen.getByTestId('order-status-badge');
      expect(statusBadge).toHaveTextContent(/Pending/i);
    });

    it('itemizes products showing name, quantity, unit, unit price, and subtotal', () => {
      renderOrderConfirmation({
        locationState: { orders: [mockSingleSellerOrder] },
      });

      expect(screen.getByTestId('confirmation-item-name')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
      expect(
        screen.getByTestId('confirmation-item-quantity')
      ).toHaveTextContent('Quantity: 2 baskets');
      expect(screen.getByTestId('confirmation-item-price')).toHaveTextContent(
        `${formatCurrency(2500)} each`
      );
      expect(
        screen.getByTestId('confirmation-item-subtotal')
      ).toHaveTextContent(formatCurrency(5000));
    });

    it('displays the order subtotal and grand total matching the total amount', () => {
      renderOrderConfirmation({
        locationState: { orders: [mockSingleSellerOrder] },
      });

      expect(
        screen.getByTestId('confirmation-order-subtotal')
      ).toHaveTextContent(formatCurrency(5000));
      expect(screen.getByTestId('confirmation-grand-total')).toHaveTextContent(
        formatCurrency(5000)
      );
    });
  });

  describe('4. Multi-Seller Split Orders (CHK-05, BR-06)', () => {
    it('renders separate order cards for each seller with distinct order numbers and sellers', () => {
      renderOrderConfirmation({
        locationState: { orders: mockMultiSellerOrders },
      });

      // Split order notice banner (CHK-05)
      const notice = screen.getByTestId('confirmation-split-notice');
      expect(notice).toBeInTheDocument();
      expect(notice).toHaveTextContent(/Multi-Seller Order/i);
      expect(notice).toHaveTextContent(
        /split into separate orders per seller \(CHK-05\)/i
      );

      // 2 Order Cards
      expect(
        screen.getByTestId('confirmation-order-card-201')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('confirmation-order-card-202')
      ).toBeInTheDocument();

      // Card 1: Arewa Fresh Farms (VJ-20261027-201)
      const orderNumbers = screen.getAllByTestId('confirmation-order-number');
      expect(orderNumbers[0]).toHaveTextContent('VJ-20261027-201');
      expect(orderNumbers[1]).toHaveTextContent('VJ-20261027-202');

      const sellerNames = screen.getAllByTestId('confirmation-seller-name');
      expect(sellerNames[0]).toHaveTextContent('Arewa Fresh Farms');
      expect(sellerNames[1]).toHaveTextContent('Danbatta Greens');
    });

    it('sums individual seller subtotals into the combined checkout grand total', () => {
      renderOrderConfirmation({
        locationState: { orders: mockMultiSellerOrders },
      });

      const subtotals = screen.getAllByTestId('confirmation-order-subtotal');
      expect(subtotals[0]).toHaveTextContent(formatCurrency(5000));
      expect(subtotals[1]).toHaveTextContent(formatCurrency(3600));

      // Grand total = 5000 + 3600 = 8600
      const grandTotal = screen.getByTestId('confirmation-grand-total');
      expect(grandTotal).toHaveTextContent(formatCurrency(8600));
      expect(screen.getByText(/Combined Checkout Total:/i)).toBeInTheDocument();
    });
  });

  describe('5. Delivery Details Breakdown (CHK-02, CHK-08)', () => {
    it('renders recipient name, phone, full address, and special instructions', () => {
      renderOrderConfirmation({
        locationState: { orders: [mockSingleSellerOrder] },
      });

      const deliveryCard = screen.getByTestId('confirmation-delivery-details');
      expect(deliveryCard).toBeInTheDocument();

      expect(
        screen.getByTestId('confirmation-recipient-name')
      ).toHaveTextContent('Amina Bello');
      expect(
        screen.getByTestId('confirmation-recipient-phone')
      ).toHaveTextContent('+2348078901234');
      expect(
        screen.getByTestId('confirmation-delivery-address')
      ).toHaveTextContent('14 Bompai Road, Nassarawa, Kano');
      expect(
        screen.getByTestId('confirmation-delivery-notes')
      ).toHaveTextContent('"Ring bell or call on arrival"');
    });

    it('gracefully handles missing notes without rendering the notes block', () => {
      const orderWithoutNotes = {
        ...mockSingleSellerOrder,
        notes: '',
        delivery_details: null,
      };

      renderOrderConfirmation({
        locationState: { orders: [orderWithoutNotes] },
      });

      expect(
        screen.queryByTestId('confirmation-delivery-notes')
      ).not.toBeInTheDocument();
    });
  });

  describe('6. Payment Method Disclosure (CHK-09, A-07, OI-01, Figma Section 11)', () => {
    it('displays the payment method and the no-online-gateway notice', () => {
      renderOrderConfirmation({
        locationState: { orders: [mockSingleSellerOrder] },
      });

      const paymentDisplay = screen.getByTestId(
        'checkout-payment-method-display'
      );
      expect(paymentDisplay).toBeInTheDocument();
      expect(paymentDisplay).toHaveTextContent(
        /Pay on delivery \/ pay seller directly/i
      );

      const notice = screen.getByTestId('payment-method-notice');
      expect(notice).toHaveTextContent(
        /Online payment is not processed through the platform in Release 1.0/i
      );
    });
  });

  describe('7. Action Buttons & Navigation (Figma Section 11)', () => {
    it('provides navigation links to View My Orders and Continue Shopping', () => {
      renderOrderConfirmation({
        locationState: { orders: [mockSingleSellerOrder] },
      });

      const viewOrdersBtn = screen.getByTestId('confirmation-view-orders-btn');
      expect(viewOrdersBtn).toHaveAttribute('href', '/account/orders');

      const continueBtn = screen.getByTestId(
        'confirmation-continue-shopping-btn'
      );
      expect(continueBtn).toHaveAttribute('href', '/products');
    });

    it('triggers window.print() when Print Receipt button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      renderOrderConfirmation({
        locationState: { orders: [mockSingleSellerOrder] },
      });

      const printBtn = screen.getByTestId('confirmation-print-btn');
      await user.click(printBtn);

      expect(printSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('8. Asynchronous Fetch on Direct URL Access (:ref param)', () => {
    it('fetches order by ref via orderService when location.state is not present', async () => {
      vi.spyOn(orderService, 'getOrdersByRef').mockResolvedValue([
        mockSingleSellerOrder,
      ]);

      renderOrderConfirmation({
        route: `/checkout/confirmation/${mockSingleSellerOrder.checkout_ref}`,
        locationState: null,
      });

      await waitFor(() => {
        expect(orderService.getOrdersByRef).toHaveBeenCalledWith(
          mockSingleSellerOrder.checkout_ref
        );
      });

      expect(
        await screen.findByTestId('confirmation-order-number')
      ).toHaveTextContent(mockSingleSellerOrder.order_number);
      expect(
        screen.getByTestId('confirmation-recipient-name')
      ).toHaveTextContent('Amina Bello');
    });

    it('falls back gracefully to synthetic placeholder if ref is not found in store', async () => {
      vi.spyOn(orderService, 'getOrdersByRef').mockResolvedValue([]);

      renderOrderConfirmation({
        route: '/checkout/confirmation/ORD-UNKNOWN-999',
        locationState: null,
      });

      expect(
        await screen.findByTestId('confirmation-order-number')
      ).toHaveTextContent('ORD-UNKNOWN-999');
    });
  });
});
