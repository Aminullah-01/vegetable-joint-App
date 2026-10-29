import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AdminOrders } from '../AdminOrders';
import { adminService } from '../../../services/adminService';
import { ToastContext } from '../../../context/toastContextDef';

// Mock Sellers for dropdown
const mockSellersList = [
  { id: 1, business_name: 'Arewa Fresh Farms', location: 'Gombe' },
  { id: 2, business_name: 'Danbatta Agro Ventures', location: 'Kano' },
];

// Mock Orders conforming to ADM-06, Figma Section 14, and DB Schema
const mockOrdersList = [
  {
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
    completed_at: null,
    created_at: '2026-02-20T10:00:00Z',
    updated_at: '2026-02-20T10:45:00Z',
    buyer: {
      id: 6,
      name: 'Amina Bello',
      email: 'buyer@example.com',
      phone: '+2348078901234',
    },
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
        changed_by: 6,
        note: 'Order placed by buyer',
        created_at: '2026-02-20T10:00:00Z',
      },
      {
        id: 2,
        order_id: 1,
        from_status: 'pending',
        to_status: 'confirmed',
        changed_by: 2,
        note: 'Confirmed by seller',
        created_at: '2026-02-20T10:45:00Z',
      },
    ],
  },
  {
    id: 2,
    order_number: 'VJ-20260221-002',
    checkout_ref: 'chk_9a1b2c3d-5e6f-4718-b2c3-000000000002',
    buyer_id: 7,
    seller_id: 2,
    total_amount: 14000,
    status: 'completed',
    payment_method: 'pay_on_delivery',
    delivery_name: 'Chinedu Eze',
    delivery_phone: '+2348081234567',
    delivery_address: '45 Awolowo Road, Ikoyi, Lagos',
    notes: null,
    cancel_reason: null,
    completed_at: '2026-02-21T16:00:00Z',
    created_at: '2026-02-21T11:00:00Z',
    updated_at: '2026-02-21T16:00:00Z',
    buyer: {
      id: 7,
      name: 'Chinedu Eze',
      email: 'chinedu@example.ng',
      phone: '+2348081234567',
    },
    seller: {
      id: 2,
      business_name: 'Danbatta Agro Ventures',
      location: 'Kano',
    },
    items: [
      {
        id: 2,
        order_id: 2,
        product_id: 3,
        product_name: 'Red Scotch Bonnet (Atarodo)',
        unit: 'bag',
        quantity: 2,
        price: 7000,
        subtotal: 14000,
      },
    ],
    status_history: [
      {
        id: 3,
        order_id: 2,
        from_status: null,
        to_status: 'pending',
        changed_by: 7,
        note: 'Order placed by buyer',
        created_at: '2026-02-21T11:00:00Z',
      },
      {
        id: 4,
        order_id: 2,
        from_status: 'pending',
        to_status: 'completed',
        changed_by: 2,
        note: 'Delivered and paid in cash',
        created_at: '2026-02-21T16:00:00Z',
      },
    ],
  },
  {
    id: 3,
    order_number: 'VJ-20260222-003',
    checkout_ref: 'chk_1c2d3e4f-6a7b-4819-c3d4-000000000003',
    buyer_id: 8,
    seller_id: 1,
    total_amount: 5000,
    status: 'cancelled',
    payment_method: 'pay_on_delivery',
    delivery_name: 'Fatima Aliyu',
    delivery_phone: '+2348099887766',
    delivery_address: '88 Zoo Road, Kano',
    notes: 'Urgent delivery needed.',
    cancel_reason: 'Seller out of stock of fresh produce items.',
    completed_at: null,
    created_at: '2026-02-22T09:30:00Z',
    updated_at: '2026-02-22T10:15:00Z',
    buyer: {
      id: 8,
      name: 'Fatima Aliyu',
      email: 'fatima@kanomarket.ng',
      phone: '+2348099887766',
    },
    seller: {
      id: 1,
      business_name: 'Arewa Fresh Farms',
      location: 'Gombe',
    },
    items: [
      {
        id: 3,
        order_id: 3,
        product_id: 2,
        product_name: 'Dry Red Onions',
        unit: 'bag',
        quantity: 1,
        price: 5000,
        subtotal: 5000,
      },
    ],
    status_history: [
      {
        id: 5,
        order_id: 3,
        from_status: null,
        to_status: 'pending',
        changed_by: 8,
        note: 'Order placed by buyer',
        created_at: '2026-02-22T09:30:00Z',
      },
      {
        id: 6,
        order_id: 3,
        from_status: 'pending',
        to_status: 'cancelled',
        changed_by: 1,
        note: 'Seller out of stock of fresh produce items.',
        created_at: '2026-02-22T10:15:00Z',
      },
    ],
  },
];

function TestWrapper({ children, toastMocks = {} }) {
  const toastValue = {
    success: toastMocks.success || vi.fn(),
    error: toastMocks.error || vi.fn(),
    info: toastMocks.info || vi.fn(),
  };

  return (
    <ToastContext.Provider value={toastValue}>
      <MemoryRouter initialEntries={['/admin/orders']}>
        <Routes>
          <Route path="/admin/orders" element={children} />
        </Routes>
      </MemoryRouter>
    </ToastContext.Provider>
  );
}

TestWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  toastMocks: PropTypes.object,
};

describe('FE-101 / ADM-06: Admin Orders Monitoring Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(adminService, 'getSellers').mockResolvedValue(mockSellersList);

    vi.spyOn(adminService, 'getOrders').mockResolvedValue({
      data: mockOrdersList,
      meta: {
        total: mockOrdersList.length,
        current_page: 1,
        last_page: 1,
      },
      links: {},
    });
  });

  describe('1. Orders Table & Listing (ADM-06, Figma Section 14)', () => {
    it('renders the orders table with order numbers, buyers, sellers, totals, and statuses', async () => {
      render(
        <TestWrapper>
          <AdminOrders />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('orders-table')).toBeInTheDocument();
      });

      // Total count badge
      expect(screen.getByTestId('orders-total-badge')).toHaveTextContent(
        '3 orders'
      );

      // Check Order 1
      expect(screen.getByTestId('order-number-1')).toHaveTextContent(
        'VJ-20260220-001'
      );
      expect(screen.getByTestId('order-buyer-1')).toHaveTextContent(
        'Amina Bello'
      );
      expect(screen.getByTestId('order-seller-1')).toHaveTextContent(
        'Arewa Fresh Farms'
      );
      expect(screen.getByTestId('order-items-count-1')).toHaveTextContent(
        '3 items'
      );
      expect(screen.getByTestId('order-amount-1')).toHaveTextContent('₦7,500');
      expect(screen.getByTestId('order-status-badge-1')).toHaveTextContent(
        'Confirmed'
      );

      // Check Order 2
      expect(screen.getByTestId('order-number-2')).toHaveTextContent(
        'VJ-20260221-002'
      );
      expect(screen.getByTestId('order-amount-2')).toHaveTextContent('₦14,000');
      expect(screen.getByTestId('order-status-badge-2')).toHaveTextContent(
        'Completed'
      );

      // Check Order 3
      expect(screen.getByTestId('order-number-3')).toHaveTextContent(
        'VJ-20260222-003'
      );
      expect(screen.getByTestId('order-status-badge-3')).toHaveTextContent(
        'Cancelled'
      );
    });

    it('renders View Details button for each order row', async () => {
      render(
        <TestWrapper>
          <AdminOrders />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('orders-table')).toBeInTheDocument();
      });

      expect(screen.getByTestId('view-order-btn-1')).toBeInTheDocument();
      expect(screen.getByTestId('view-order-btn-2')).toBeInTheDocument();
      expect(screen.getByTestId('view-order-btn-3')).toBeInTheDocument();
    });
  });

  describe('2. Search & Multi-criteria Filtering (ADM-06)', () => {
    it('searches orders by order number keyword', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminOrders />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('orders-table')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-orders-input');
      await user.type(searchInput, '001');

      await waitFor(() => {
        expect(adminService.getOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '001',
          })
        );
      });
    });

    it('filters orders by status dropdown', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminOrders />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('orders-table')).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId('filter-status-select');
      await user.selectOptions(statusSelect, 'completed');

      await waitFor(() => {
        expect(adminService.getOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'completed',
          })
        );
      });
    });

    it('filters orders by seller dropdown', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminOrders />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('orders-table')).toBeInTheDocument();
      });

      const sellerSelect = screen.getByTestId('filter-seller-select');
      await user.selectOptions(sellerSelect, '1');

      await waitFor(() => {
        expect(adminService.getOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            seller: '1',
          })
        );
      });
    });

    it('filters orders by date and resets filters with Clear button', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminOrders />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('orders-table')).toBeInTheDocument();
      });

      const dateInput = screen.getByTestId('filter-date-input');
      await user.type(dateInput, '2026-02-20');

      await waitFor(() => {
        expect(adminService.getOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            date: '2026-02-20',
          })
        );
      });

      // Clear filters button resets
      const resetBtn = screen.getByTestId('clear-filters-btn');
      expect(resetBtn).toBeInTheDocument();

      await user.click(resetBtn);

      await waitFor(() => {
        expect(adminService.getOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
          })
        );
      });
    });
  });

  describe('3. Order Details Modal View (ADM-06, Figma Section 14)', () => {
    it('opens modal on View Details click showing complete order record, buyer, seller, items, and history', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminOrders />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('view-order-btn-1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('view-order-btn-1'));

      await waitFor(() => {
        expect(screen.getByTestId('view-order-modal')).toBeInTheDocument();
      });

      // Modal Header
      expect(screen.getByTestId('modal-order-number')).toHaveTextContent(
        'VJ-20260220-001'
      );
      expect(screen.getByTestId('modal-order-status')).toHaveTextContent(
        'Confirmed'
      );
      expect(screen.getByTestId('modal-order-total')).toHaveTextContent(
        '₦7,500'
      );

      // Buyer Info
      expect(screen.getByTestId('modal-buyer-name')).toHaveTextContent(
        'Amina Bello'
      );
      expect(screen.getByTestId('modal-buyer-email')).toHaveTextContent(
        'buyer@example.com'
      );
      expect(screen.getByTestId('modal-buyer-phone')).toHaveTextContent(
        '+2348078901234'
      );

      // Seller Info
      expect(screen.getByTestId('modal-seller-name')).toHaveTextContent(
        'Arewa Fresh Farms'
      );
      expect(screen.getByTestId('modal-seller-location')).toHaveTextContent(
        'Gombe'
      );

      // Delivery Destination
      expect(screen.getByTestId('modal-delivery-name')).toHaveTextContent(
        'Amina Bello'
      );
      expect(screen.getByTestId('modal-delivery-address')).toHaveTextContent(
        '12 Ahmadu Bello Way, Victoria Island, Lagos'
      );
      expect(screen.getByTestId('modal-order-notes')).toHaveTextContent(
        'Please call before arrival.'
      );

      // Items Table
      expect(screen.getByTestId('modal-order-items-table')).toBeInTheDocument();
      expect(screen.getByTestId('modal-item-row-1')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
      expect(screen.getByTestId('modal-item-row-1')).toHaveTextContent(
        '3 baskets'
      );

      // Status History
      expect(screen.getByTestId('modal-status-history')).toBeInTheDocument();
      expect(screen.getByTestId('modal-status-history')).toHaveTextContent(
        'Initial Status: pending'
      );
      expect(screen.getByTestId('modal-status-history')).toHaveTextContent(
        'pending → confirmed'
      );

      // Close modal
      const closeBtn = screen.getByTestId('modal-close-btn');
      await user.click(closeBtn);

      await waitFor(() => {
        expect(
          screen.queryByTestId('view-order-modal')
        ).not.toBeInTheDocument();
      });
    });

    it('displays cancellation reason notice in modal for cancelled orders', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminOrders />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('view-order-btn-3')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('view-order-btn-3'));

      await waitFor(() => {
        expect(screen.getByTestId('view-order-modal')).toBeInTheDocument();
      });

      expect(
        screen.getByTestId('modal-cancel-reason-block')
      ).toBeInTheDocument();
      expect(screen.getByTestId('modal-cancel-reason-block')).toHaveTextContent(
        'Seller out of stock of fresh produce items.'
      );
    });
  });

  describe('4. Error Handling, Empty State & Refresh', () => {
    it('displays error state with working retry when loading orders fails', async () => {
      adminService.getOrders.mockRejectedValueOnce(
        new Error('Network error loading orders')
      );

      render(
        <TestWrapper>
          <AdminOrders />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('orders-error-state')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Network error loading orders')
      ).toBeInTheDocument();

      // Retry
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId('orders-table')).toBeInTheDocument();
      });
    });

    it('displays empty state when no orders match search criteria', async () => {
      adminService.getOrders.mockResolvedValueOnce({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1 },
      });

      render(
        <TestWrapper>
          <AdminOrders />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('orders-empty-state')).toBeInTheDocument();
      });

      expect(screen.getByText('No Orders Found')).toBeInTheDocument();
    });
  });
});
