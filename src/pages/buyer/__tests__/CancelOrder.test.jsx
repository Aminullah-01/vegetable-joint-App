import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { OrderDetail } from '../OrderDetail';
import { MyOrders } from '../MyOrders';
import { orderService } from '../../../services/orderService';

// Mock pending order
const mockPendingOrder = {
  id: 101,
  order_number: 'VJ-20261027-101',
  checkout_ref: 'chk_test_pending_101',
  buyer_id: 10,
  seller_id: 1,
  total_amount: 5400,
  status: 'pending',
  payment_method: 'pay_on_delivery',
  delivery_name: 'Fatima Aliyu',
  delivery_phone: '+2348011223344',
  delivery_address: '15 Bompai Road, Nassarawa, Kano',
  notes: 'Ring the gate bell upon arrival.',
  cancel_reason: null,
  created_at: '2026-10-27T10:00:00.000Z',
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
      price: 2700,
      subtotal: 5400,
    },
  ],
  status_history: [
    {
      id: 1,
      order_id: 101,
      from_status: null,
      to_status: 'pending',
      note: 'Order placed by buyer (CHK-03)',
      created_at: '2026-10-27T10:00:00.000Z',
    },
  ],
};

function renderOrderDetailWithRoute(
  orderId = 101,
  initialEntry = `/account/orders/${orderId}`
) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/account/orders/:id" element={children} />
          <Route path="/account/orders" element={<div>Orders List</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return render(<OrderDetail />, { wrapper: Wrapper });
}

function renderMyOrdersWithRoute(initialEntry = '/account/orders') {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/account/orders" element={children} />
          <Route path="/account/orders/:id" element={<div>Order Detail</div>} />
          <Route path="/products" element={<div>Products Catalog</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return render(<MyOrders />, { wrapper: Wrapper });
}

describe('FE-079: Cancel Pending Order (ORD-03)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Cancel Button Visibility (Only while Pending)', () => {
    it('renders Cancel Order button when order status is "pending"', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(
        mockPendingOrder
      );

      renderOrderDetailWithRoute(101);

      const cancelBtn = await screen.findByTestId('cancel-order-button');
      expect(cancelBtn).toBeInTheDocument();
      expect(cancelBtn).toHaveTextContent(/Cancel Order/i);
    });

    it('does NOT render Cancel Order button when order status is "confirmed"', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue({
        ...mockPendingOrder,
        id: 102,
        status: 'confirmed',
      });

      renderOrderDetailWithRoute(102);

      await screen.findByTestId('order-detail-number');
      expect(
        screen.queryByTestId('cancel-order-button')
      ).not.toBeInTheDocument();
    });

    it('does NOT render Cancel Order button when order status is "processing"', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue({
        ...mockPendingOrder,
        id: 103,
        status: 'processing',
      });

      renderOrderDetailWithRoute(103);

      await screen.findByTestId('order-detail-number');
      expect(
        screen.queryByTestId('cancel-order-button')
      ).not.toBeInTheDocument();
    });

    it('does NOT render Cancel Order button when order status is "ready"', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue({
        ...mockPendingOrder,
        id: 104,
        status: 'ready',
      });

      renderOrderDetailWithRoute(104);

      await screen.findByTestId('order-detail-number');
      expect(
        screen.queryByTestId('cancel-order-button')
      ).not.toBeInTheDocument();
    });

    it('does NOT render Cancel Order button when order status is "completed"', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue({
        ...mockPendingOrder,
        id: 105,
        status: 'completed',
      });

      renderOrderDetailWithRoute(105);

      await screen.findByTestId('order-detail-number');
      expect(
        screen.queryByTestId('cancel-order-button')
      ).not.toBeInTheDocument();
    });

    it('does NOT render Cancel Order button when order is already "cancelled"', async () => {
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue({
        ...mockPendingOrder,
        id: 106,
        status: 'cancelled',
        cancel_reason: 'Previous cancellation',
      });

      renderOrderDetailWithRoute(106);

      await screen.findByTestId('order-detail-number');
      expect(
        screen.queryByTestId('cancel-order-button')
      ).not.toBeInTheDocument();
    });
  });

  describe('2. Confirmation Dialog Interaction (FE-036 / ORD-03)', () => {
    it('opens accessible confirm dialog upon clicking Cancel Order button', async () => {
      const user = userEvent.setup();
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(
        mockPendingOrder
      );

      renderOrderDetailWithRoute(101);

      const cancelBtn = await screen.findByTestId('cancel-order-button');
      await user.click(cancelBtn);

      const dialog = await screen.findByTestId('cancel-order-dialog');
      expect(dialog).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /Cancel Order/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Once cancelled, the reserved produce stock will be restored/i
        )
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('cancel-order-dialog-confirm-button')
      ).toHaveTextContent(/Yes, Cancel Order/i);
      expect(
        screen.getByTestId('cancel-order-dialog-cancel-button')
      ).toHaveTextContent(/Keep Order/i);
    });

    it('dismisses dialog without cancelling when "Keep Order" is clicked', async () => {
      const user = userEvent.setup();
      const cancelSpy = vi.spyOn(orderService, 'cancelOrder');
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(
        mockPendingOrder
      );

      renderOrderDetailWithRoute(101);

      const cancelBtn = await screen.findByTestId('cancel-order-button');
      await user.click(cancelBtn);

      const keepOrderBtn = await screen.findByTestId(
        'cancel-order-dialog-cancel-button'
      );
      await user.click(keepOrderBtn);

      await waitFor(() => {
        expect(
          screen.queryByTestId('cancel-order-dialog')
        ).not.toBeInTheDocument();
      });

      expect(cancelSpy).not.toHaveBeenCalled();
      // Order remains pending and cancel button remains visible
      expect(screen.getByTestId('cancel-order-button')).toBeInTheDocument();
      expect(screen.getByTestId('order-detail-status-badge')).toHaveTextContent(
        /Pending/i
      );
    });
  });

  describe('3. Successful Cancellation & Status Refresh (ORD-03)', () => {
    it('cancels pending order, refreshes status to cancelled, removes cancel button, and shows notice', async () => {
      const user = userEvent.setup();
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(
        mockPendingOrder
      );

      const cancelledResponse = {
        ...mockPendingOrder,
        status: 'cancelled',
        cancel_reason: 'Cancelled by buyer (ORD-03)',
        status_history: [
          ...mockPendingOrder.status_history,
          {
            id: 2,
            order_id: 101,
            from_status: 'pending',
            to_status: 'cancelled',
            note: 'Cancelled by buyer (ORD-03)',
            created_at: new Date().toISOString(),
          },
        ],
      };

      const cancelSpy = vi
        .spyOn(orderService, 'cancelOrder')
        .mockResolvedValue(cancelledResponse);

      renderOrderDetailWithRoute(101);

      // Verify initially pending
      const cancelBtn = await screen.findByTestId('cancel-order-button');
      expect(screen.getByTestId('order-detail-status-badge')).toHaveTextContent(
        /Pending/i
      );

      // Open dialog and confirm
      await user.click(cancelBtn);
      const confirmBtn = await screen.findByTestId(
        'cancel-order-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      // Verify orderService.cancelOrder was called with order id
      await waitFor(() => {
        expect(cancelSpy).toHaveBeenCalledWith(
          101,
          expect.stringContaining('ORD-03')
        );
      });

      // Dialog should be closed
      await waitFor(() => {
        expect(
          screen.queryByTestId('cancel-order-dialog')
        ).not.toBeInTheDocument();
      });

      // Status badge should immediately refresh to Cancelled
      await waitFor(() => {
        expect(
          screen.getByTestId('order-detail-status-badge')
        ).toHaveTextContent(/Cancelled/i);
      });

      // Cancel button should no longer exist
      expect(
        screen.queryByTestId('cancel-order-button')
      ).not.toBeInTheDocument();

      // Cancellation alert notice and reason banner should appear (ORD-07)
      expect(
        await screen.findByTestId('order-cancellation-notice')
      ).toBeInTheDocument();
      expect(screen.getByTestId('order-cancellation-reason')).toHaveTextContent(
        /Cancelled by buyer \(ORD-03\)/i
      );

      // Cancellation success feedback banner should appear
      const successBanner = screen.getByTestId('cancel-order-success-banner');
      expect(successBanner).toHaveTextContent(/Order Successfully Cancelled/i);

      // Dismiss success banner
      const dismissBtn = screen.getByTestId('dismiss-cancel-success-btn');
      await user.click(dismissBtn);
      expect(
        screen.queryByTestId('cancel-order-success-banner')
      ).not.toBeInTheDocument();
    });
  });

  describe('4. Cancellation Failure & Error Handling', () => {
    it('displays error banner and keeps order in pending state if cancel API fails', async () => {
      const user = userEvent.setup();
      vi.spyOn(orderService, 'getOrderById').mockResolvedValue(
        mockPendingOrder
      );
      vi.spyOn(orderService, 'cancelOrder').mockRejectedValue(
        new Error('Network error: Unable to reach order service.')
      );

      renderOrderDetailWithRoute(101);

      const cancelBtn = await screen.findByTestId('cancel-order-button');
      await user.click(cancelBtn);

      const confirmBtn = await screen.findByTestId(
        'cancel-order-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      // Error banner should be rendered
      const errorBanner = await screen.findByTestId(
        'cancel-order-error-banner'
      );
      expect(errorBanner).toBeInTheDocument();
      expect(errorBanner).toHaveTextContent(
        /Network error: Unable to reach order service/i
      );

      // Order should remain in pending state and cancel button remains available
      expect(screen.getByTestId('order-detail-status-badge')).toHaveTextContent(
        /Pending/i
      );
      expect(screen.getByTestId('cancel-order-button')).toBeInTheDocument();

      // Dismiss error banner
      const dismissErrorBtn = screen.getByTestId('dismiss-cancel-error-btn');
      await user.click(dismissErrorBtn);
      expect(
        screen.queryByTestId('cancel-order-error-banner')
      ).not.toBeInTheDocument();
    });
  });

  describe('5. MyOrders List Page Cancellation (ORD-03)', () => {
    const listOrders = [
      {
        ...mockPendingOrder,
        id: 201,
        order_number: 'VJ-20261027-201',
        status: 'pending',
      },
      {
        ...mockPendingOrder,
        id: 202,
        order_number: 'VJ-20261026-202',
        status: 'confirmed',
      },
      {
        ...mockPendingOrder,
        id: 203,
        order_number: 'VJ-20261025-203',
        status: 'completed',
      },
    ];

    it('renders Cancel Order button only for pending order in the orders list', async () => {
      vi.spyOn(orderService, 'getOrders').mockResolvedValue({
        data: listOrders,
        meta: { total: 3, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderMyOrdersWithRoute();

      // Order 201 (Pending) should have cancel button
      expect(
        await screen.findByTestId('order-cancel-btn-201')
      ).toBeInTheDocument();

      // Orders 202 (Confirmed) and 203 (Completed) should NOT have cancel button
      expect(
        screen.queryByTestId('order-cancel-btn-202')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('order-cancel-btn-203')
      ).not.toBeInTheDocument();
    });

    it('cancels pending order from orders list and refreshes card status to cancelled', async () => {
      const user = userEvent.setup();
      vi.spyOn(orderService, 'getOrders').mockResolvedValue({
        data: listOrders,
        meta: { total: 3, current_page: 1, last_page: 1, per_page: 10 },
      });

      const cancelSpy = vi
        .spyOn(orderService, 'cancelOrder')
        .mockResolvedValue({
          id: 201,
          status: 'cancelled',
          cancel_reason: 'Cancelled by buyer (ORD-03)',
        });

      renderMyOrdersWithRoute();

      const cancelBtn = await screen.findByTestId('order-cancel-btn-201');
      await user.click(cancelBtn);

      // Confirm dialog opens
      const dialog = await screen.findByTestId('my-orders-cancel-dialog');
      expect(dialog).toBeInTheDocument();

      // Confirm cancellation
      const confirmBtn = screen.getByTestId(
        'my-orders-cancel-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(cancelSpy).toHaveBeenCalledWith(201, expect.any(String));
      });

      // Cancel button for order 201 should disappear
      await waitFor(() => {
        expect(
          screen.queryByTestId('order-cancel-btn-201')
        ).not.toBeInTheDocument();
      });

      // Success notification displayed
      expect(
        await screen.findByTestId('my-orders-cancel-success')
      ).toHaveTextContent(/Order #VJ-20261027-201 has been cancelled/i);
    });
  });
});
