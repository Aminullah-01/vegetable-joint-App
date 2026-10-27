import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { OrderDetail } from '../OrderDetail';
import { orderService } from '../../../services/orderService';
import { formatCurrency, formatDate } from '../../../utils';

const mockActiveOrder = {
  id: 1,
  order_number: 'VJ-20260220-001',
  checkout_ref: 'chk_8f3a1e9c-4b2d-4819-a1b2-000000000001',
  buyer_id: 6,
  seller_id: 1,
  total_amount: 7500,
  status: 'confirmed',
  payment_method: 'pay_on_delivery',
  delivery_name: 'Amina Bello',
  delivery_phone: '+2348078901234',
  delivery_address: '12 Ahmadu Bello Way, Victoria Island, Lagos',
  notes: 'Please call before arrival.',
  cancel_reason: null,
  created_at: '2026-02-20T10:00:00.000Z',
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    location: 'Gombe',
  },
  items: [
    {
      id: 1,
      order_id: 1,
      product_id: 1,
      product_name: 'Fresh Roma Tomatoes',
      unit: 'basket',
      quantity: 3,
      price: 2500,
      subtotal: 7500,
    },
  ],
  status_history: [
    {
      id: 1,
      order_id: 1,
      from_status: null,
      to_status: 'pending',
      note: 'Order placed by buyer (CHK-03)',
      created_at: '2026-02-20T10:00:00.000Z',
    },
    {
      id: 2,
      order_id: 1,
      from_status: 'pending',
      to_status: 'confirmed',
      note: 'Seller confirmed fresh harvest availability',
      created_at: '2026-02-20T10:45:00.000Z',
    },
  ],
};

const mockCancelledOrder = {
  id: 4,
  order_number: 'VJ-20260223-004',
  checkout_ref: 'chk_cancelled_order_ref_4444',
  buyer_id: 6,
  seller_id: 2,
  total_amount: 3600,
  status: 'cancelled',
  payment_method: 'pay_on_delivery',
  delivery_name: 'Babangida Usman',
  delivery_phone: '+2348099887766',
  delivery_address: '45 Bompai Road, Kano',
  notes: '',
  cancel_reason: 'Produce damaged during farm packaging.',
  created_at: '2026-02-23T08:00:00.000Z',
  seller: {
    id: 2,
    business_name: 'Danbatta Greens',
    location: 'Kano',
  },
  items: [
    {
      id: 2,
      order_id: 4,
      product_id: 2,
      product_name: 'Red Bell Peppers',
      unit: 'kg',
      quantity: 2,
      price: 1800,
      subtotal: 3600,
    },
  ],
  status_history: [
    {
      id: 1,
      order_id: 4,
      from_status: null,
      to_status: 'pending',
      note: 'Order placed by buyer',
      created_at: '2026-02-23T08:00:00.000Z',
    },
    {
      id: 2,
      order_id: 4,
      from_status: 'pending',
      to_status: 'cancelled',
      note: 'Cancelled by seller: Produce damaged during farm packaging.',
      created_at: '2026-02-23T09:00:00.000Z',
    },
  ],
};

function renderOrderDetail({
  route = '/account/orders/1',
  locationState = null,
} = {}) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter
        initialEntries={[
          locationState ? { pathname: route, state: locationState } : route,
        ]}
      >
        <Routes>
          <Route path="/account/orders/:id" element={children} />
          <Route
            path="/account/orders"
            element={<div data-testid="orders-list-page">My Orders</div>}
          />
        </Routes>
      </MemoryRouter>
    );
  }

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return render(<OrderDetail />, { wrapper: Wrapper });
}

describe('FE-078: Buyer Order Detail Page (ORD-02, ORD-07, CHK-09, Figma Section 12)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Navigation & Order Header (ORD-02)', () => {
    it('renders back navigation to My Orders and Print Order button', async () => {
      const user = userEvent.setup({ delay: null });
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(mockActiveOrder);

      renderOrderDetail({ route: '/account/orders/1' });

      const backBtn = screen.getByTestId('back-to-orders-btn');
      expect(backBtn).toHaveAttribute('href', '/account/orders');

      const printBtn = screen.getByTestId('print-order-btn');
      await user.click(printBtn);
      expect(printSpy).toHaveBeenCalledTimes(1);
    });

    it('renders order number, date, checkout reference, and status badge', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(mockActiveOrder);

      renderOrderDetail({ route: '/account/orders/1' });

      expect(
        await screen.findByTestId('order-detail-number')
      ).toHaveTextContent(mockActiveOrder.order_number);

      expect(screen.getByTestId('order-detail-date')).toHaveTextContent(
        formatDate(mockActiveOrder.created_at)
      );

      expect(screen.getByTestId('order-checkout-ref')).toHaveTextContent(
        mockActiveOrder.checkout_ref
      );

      expect(screen.getByTestId('order-detail-status-badge')).toHaveTextContent(
        /Confirmed/i
      );
    });

    it('displays seller business name and location', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(mockActiveOrder);

      renderOrderDetail({ route: '/account/orders/1' });

      expect(
        await screen.findByTestId('order-detail-seller-name')
      ).toHaveTextContent('Arewa Fresh Farms');
      expect(
        screen.getByTestId('order-detail-seller-location')
      ).toHaveTextContent('(Gombe)');
    });
  });

  describe('2. Itemized Products & Total (ORD-02, Figma Section 12)', () => {
    it('renders all ordered items with quantities, units, prices, and line subtotals', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(mockActiveOrder);

      renderOrderDetail({ route: '/account/orders/1' });

      expect(await screen.findByTestId('order-item-name-1')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );

      expect(screen.getByTestId('order-item-quantity-1')).toHaveTextContent(
        'Quantity: 3 baskets · ₦2,500 each'
      );

      expect(screen.getByTestId('order-item-subtotal-1')).toHaveTextContent(
        formatCurrency(7500)
      );

      expect(screen.getByTestId('order-detail-total')).toHaveTextContent(
        formatCurrency(7500)
      );
    });
  });

  describe('3. Delivery Information (ORD-02, CHK-02)', () => {
    it('renders recipient name, phone, full address, and delivery notes', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(mockActiveOrder);

      renderOrderDetail({ route: '/account/orders/1' });

      expect(
        await screen.findByTestId('order-delivery-name')
      ).toHaveTextContent('Amina Bello');

      expect(screen.getByTestId('order-delivery-phone')).toHaveTextContent(
        '+2348078901234'
      );

      expect(screen.getByTestId('order-delivery-address')).toHaveTextContent(
        '12 Ahmadu Bello Way, Victoria Island, Lagos'
      );

      expect(screen.getByTestId('order-delivery-notes')).toHaveTextContent(
        '"Please call before arrival."'
      );
    });
  });

  describe('4. Status Timeline with Timestamps (ORD-02)', () => {
    it('renders the status lifecycle pipeline and chronological history with timestamps', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(mockActiveOrder);

      renderOrderDetail({ route: '/account/orders/1' });

      const timeline = await screen.findByTestId('order-status-timeline');
      expect(timeline).toBeInTheDocument();

      // Stepper pipeline stages
      expect(
        screen.getByTestId('order-status-timeline-step-pending')
      ).toHaveAttribute('data-step-status', 'completed');
      expect(
        screen.getByTestId('order-status-timeline-step-confirmed')
      ).toHaveAttribute('data-step-status', 'active');

      // History entries
      expect(
        screen.getByTestId('order-status-timeline-history')
      ).toBeInTheDocument();
      expect(
        screen.getAllByText(/Order Placed/i).length
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/Order Confirmed by Seller/i)
      ).toBeInTheDocument();
    });
  });

  describe('5. Cancellation Reason Display (ORD-07, Figma Section 12)', () => {
    it('displays visible cancellation alert notice and reason when order is cancelled', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(
        mockCancelledOrder
      );

      renderOrderDetail({ route: '/account/orders/4' });

      const notice = await screen.findByTestId('order-cancellation-notice');
      expect(notice).toBeInTheDocument();
      expect(notice).toHaveTextContent(/Order Cancelled \(ORD-07\)/i);

      const reason = screen.getByTestId('order-cancellation-reason');
      expect(reason).toHaveTextContent(
        'Reason: Produce damaged during farm packaging.'
      );

      // Cancelled banner in timeline
      expect(
        screen.getByTestId('order-status-timeline-cancelled-banner')
      ).toHaveTextContent(/Produce damaged during farm packaging/i);
    });
  });

  describe('6. Payment Method Disclosure (CHK-09, Figma Section 11 & 19)', () => {
    it('renders the payment method disclosure showing pay on delivery', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(mockActiveOrder);

      renderOrderDetail({ route: '/account/orders/1' });

      const paymentDisplay = await screen.findByTestId(
        'checkout-payment-method-display'
      );
      expect(paymentDisplay).toBeInTheDocument();
      expect(paymentDisplay).toHaveTextContent(
        /Pay on delivery \/ pay seller directly/i
      );
    });
  });

  describe('7. Error Handling & Retry', () => {
    it('displays error banner when order loading fails and retries on click', async () => {
      const user = userEvent.setup({ delay: null });
      const getOrderSpy = vi
        .spyOn(orderService, 'getOrderById')
        .mockRejectedValueOnce(new Error('Network error: order not available'))
        .mockResolvedValueOnce(mockActiveOrder);

      renderOrderDetail({ route: '/account/orders/999' });

      const errorNotice = await screen.findByTestId('order-detail-error');
      expect(errorNotice).toBeInTheDocument();
      expect(errorNotice).toHaveTextContent(
        'Network error: order not available'
      );

      const retryBtn = screen.getByTestId('order-retry-button');
      await user.click(retryBtn);

      await waitFor(() => {
        expect(getOrderSpy).toHaveBeenCalledTimes(2);
      });

      expect(
        await screen.findByTestId('order-detail-number')
      ).toHaveTextContent(mockActiveOrder.order_number);
    });
  });
});
