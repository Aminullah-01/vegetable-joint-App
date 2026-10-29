import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SellerOrders } from '../SellerOrders';
import { sellerService } from '../../../services/sellerService';
import { AuthContext } from '../../../context/authContextDef';
import { ToastContext } from '../../../context/toastContextDef';

/**
 * Task FE-090 / SEL-10: Seller Orders List
 *
 * SRS References:
 * - SEL-10: The Orders view shall list only orders that contain the seller’s own products,
 *           filterable by status and date, and show buyer name, phone and delivery details
 *           needed to fulfil the order.
 * - SEL-14 / BR-08: A seller shall never be able to view, edit or delete another seller’s
 *                   products, orders or profile (object-level authorization).
 * - TC-23: Seller views orders: Only orders containing own products are listed.
 * - Figma Section 13: Seller Orders table with status and date filters, buyer details, and lifecycle actions.
 */

const mockSeller1 = {
  id: 2,
  name: 'Bello Ibrahim',
  email: 'seller@example.com',
  role: 'seller',
  seller_id: 1,
  approval_status: 'approved',
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    approval_status: 'approved',
  },
};

const mockSeller2 = {
  id: 4,
  name: 'Kano Agro Admin',
  email: 'kano@example.com',
  role: 'seller',
  seller_id: 2,
  approval_status: 'approved',
  seller: {
    id: 2,
    business_name: 'Kano Green Agro',
    approval_status: 'approved',
  },
};

const sampleOrders = [
  {
    id: 101,
    order_number: 'VJ-20260220-001',
    seller_id: 1,
    buyer_id: 6,
    total_amount: 7500,
    status: 'pending',
    delivery_name: 'Amina Bello',
    delivery_phone: '+2348012345678',
    delivery_address: '12 Ahmadu Bello Way, Victoria Island, Lagos',
    notes: 'Please call on arrival, ring doorbell twice.',
    created_at: '2026-02-20T10:00:00Z',
    items: [
      {
        id: 1,
        product_name: 'Fresh Roma Tomatoes',
        quantity: 3,
        unit: 'basket',
        price: 2500,
      },
    ],
  },
  {
    id: 102,
    order_number: 'VJ-20260221-002',
    seller_id: 1,
    buyer_id: 7,
    total_amount: 12000,
    status: 'confirmed',
    delivery_name: 'Emeka Okafor',
    delivery_phone: '+2348098765432',
    delivery_address: '45 Marina Street, Lagos Island',
    notes: null,
    created_at: '2026-02-21T14:30:00Z',
    items: [
      {
        id: 2,
        product_name: 'Organic Spinach (Alayahu)',
        quantity: 15,
        unit: 'bunch',
        price: 800,
      },
    ],
  },
  {
    id: 103,
    order_number: 'VJ-20260222-003',
    seller_id: 1,
    buyer_id: 8,
    total_amount: 4500,
    status: 'completed',
    delivery_name: 'Fatima Garba',
    delivery_phone: '+2348033334444',
    delivery_address: '8 Zoo Road, Kano Municipal, Kano',
    notes: 'Leave at security gate.',
    created_at: '2026-02-22T09:15:00Z',
    items: [
      {
        id: 3,
        product_name: 'Hot Habanero Pepper',
        quantity: 3,
        unit: 'basket',
        price: 1500,
      },
    ],
  },
  {
    id: 104,
    order_number: 'VJ-20260223-004',
    seller_id: 2, // Belongs to SELLER 2 (Object-level authorization check: SEL-14)
    buyer_id: 9,
    total_amount: 18000,
    status: 'pending',
    delivery_name: 'Foreign Buyer',
    delivery_phone: '+2348000000000',
    delivery_address: 'Secret Other Seller Address',
    notes: null,
    created_at: '2026-02-23T11:00:00Z',
    items: [
      {
        id: 4,
        product_name: 'Competitor Produce',
        quantity: 10,
        unit: 'bag',
        price: 1800,
      },
    ],
  },
];

function renderSellerOrdersPage({
  user = mockSeller1,
  initialEntries = ['/seller/orders'],
  toast = { success: vi.fn(), error: vi.fn() },
} = {}) {
  const authContextValue = {
    user,
    isAuthenticated: true,
    isSeller: true,
    isAdmin: false,
    isBuyer: false,
  };

  return {
    toast,
    ...render(
      <AuthContext.Provider value={authContextValue}>
        <ToastContext.Provider value={toast}>
          <MemoryRouter initialEntries={initialEntries}>
            <SellerOrders />
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
  };
}

renderSellerOrdersPage.propTypes = {
  user: PropTypes.object,
  initialEntries: PropTypes.array,
  toast: PropTypes.object,
};

describe('FE-090 / SEL-10: Seller Orders List', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(sellerService, 'getSellerOrders').mockImplementation(
      async (params = {}) => {
        let filtered = [...sampleOrders];

        // Scoped by seller_id (SEL-10, SEL-14)
        if (params.seller_id) {
          filtered = filtered.filter(
            (o) => Number(o.seller_id) === Number(params.seller_id)
          );
        }

        // Status filter
        if (params.status && params.status !== 'all') {
          filtered = filtered.filter((o) => o.status === params.status);
        }

        // Search query
        if (params.search && params.search.trim()) {
          const q = params.search.trim().toLowerCase();
          filtered = filtered.filter(
            (o) =>
              (o.order_number && o.order_number.toLowerCase().includes(q)) ||
              (o.delivery_name && o.delivery_name.toLowerCase().includes(q)) ||
              (o.delivery_phone && o.delivery_phone.includes(q))
          );
        }

        // Date range filter
        if (params.date_from) {
          const fromTime = new Date(params.date_from).setHours(0, 0, 0, 0);
          filtered = filtered.filter(
            (o) => new Date(o.created_at).getTime() >= fromTime
          );
        }
        if (params.date_to) {
          const toTime = new Date(params.date_to).setHours(23, 59, 59, 999);
          filtered = filtered.filter(
            (o) => new Date(o.created_at).getTime() <= toTime
          );
        }

        return {
          data: filtered,
          meta: {
            total: filtered.length,
            current_page: Number(params.page) || 1,
            last_page: 1,
            per_page: 10,
          },
        };
      }
    );
  });

  describe('1. Object-Level Authorization & Only Own Orders (SEL-10, SEL-14, BR-08, TC-23)', () => {
    it('requests orders scoped to the authenticated seller ID and renders only own orders', async () => {
      renderSellerOrdersPage({ user: mockSeller1 });

      await waitFor(() => {
        expect(sellerService.getSellerOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            seller_id: 1,
          })
        );
      });

      // Seller 1 owns orders 101, 102, 103
      await waitFor(() => {
        expect(screen.getByTestId('seller-order-row-101')).toBeInTheDocument();
        expect(screen.getByTestId('seller-order-row-102')).toBeInTheDocument();
        expect(screen.getByTestId('seller-order-row-103')).toBeInTheDocument();
      });

      // Order 104 belongs to Seller 2 -> MUST NOT be in the document
      expect(
        screen.queryByTestId('seller-order-row-104')
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Foreign Buyer/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Secret Other Seller Address/i)
      ).not.toBeInTheDocument();
    });

    it('switches view for Seller 2 and shows only Seller 2 orders (SEL-10, SEL-14)', async () => {
      renderSellerOrdersPage({ user: mockSeller2 });

      await waitFor(() => {
        expect(sellerService.getSellerOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            seller_id: 2,
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('seller-order-row-104')).toBeInTheDocument();
      });

      expect(
        screen.queryByTestId('seller-order-row-101')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('seller-order-row-102')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('seller-order-row-103')
      ).not.toBeInTheDocument();
    });

    it('enforces client-side authorization guard even if backend returned a mixed list', async () => {
      // Backend simulation sending mixed orders containing foreign seller
      sellerService.getSellerOrders.mockResolvedValueOnce({
        data: sampleOrders,
        meta: { total: 4, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderSellerOrdersPage({ user: mockSeller1 });

      await waitFor(() => {
        expect(screen.getByTestId('seller-order-row-101')).toBeInTheDocument();
      });

      // Client guard strips Order 104
      expect(
        screen.queryByTestId('seller-order-row-104')
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Competitor Produce/i)).not.toBeInTheDocument();
    });
  });

  describe('2. Required Order Fields Display (SEL-10, Figma Section 13)', () => {
    it('renders all required table headers: Order Ref, Date, Buyer & Phone, Delivery Details, Items, Total, Status, Actions', async () => {
      renderSellerOrdersPage();

      await waitFor(() => {
        expect(screen.getByTestId('seller-orders-table')).toBeInTheDocument();
      });

      const table = screen.getByTestId('seller-orders-table');
      expect(
        within(table).getByRole('columnheader', { name: /Order Ref/i })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Date/i })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Buyer & Phone/i })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Delivery Details/i })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Items Ordered/i })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Total Amount/i })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Status/i })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Actions/i })
      ).toBeInTheDocument();
    });

    it('displays order reference, buyer name, phone, delivery address, notes, items, total price and status badge', async () => {
      renderSellerOrdersPage();

      await waitFor(() => {
        expect(screen.getByTestId('seller-order-ref-101')).toBeInTheDocument();
      });

      // Order Reference
      expect(screen.getByTestId('seller-order-ref-101')).toHaveTextContent(
        'VJ-20260220-001'
      );

      // Buyer Name & Phone (SEL-10)
      expect(screen.getByTestId('seller-order-buyer-101')).toHaveTextContent(
        'Amina Bello'
      );
      expect(screen.getByTestId('seller-order-phone-101')).toHaveTextContent(
        '+2348012345678'
      );

      // Delivery Address & Notes (SEL-10)
      expect(screen.getByTestId('seller-order-address-101')).toHaveTextContent(
        '12 Ahmadu Bello Way, Victoria Island, Lagos'
      );
      expect(screen.getByTestId('seller-order-notes-101')).toHaveTextContent(
        'Please call on arrival, ring doorbell twice.'
      );

      // Items Ordered
      expect(screen.getByTestId('seller-order-items-101')).toHaveTextContent(
        'Fresh Roma Tomatoes (3 basket)'
      );

      // Total in Naira
      expect(screen.getByTestId('seller-order-total-101')).toHaveTextContent(
        '₦7,500'
      );

      // Status Badge
      const statusBadge = screen.getByTestId('seller-order-status-101');
      expect(statusBadge).toHaveAttribute('data-status', 'pending');

      // View details action link
      expect(screen.getByTestId('seller-order-view-link-101')).toHaveAttribute(
        'href',
        '/seller/orders/101'
      );
    });
  });

  describe('3. KPI Metrics Summary Bar (SEL-10)', () => {
    it('displays accurate counts for Total Orders, Pending, In Progress, Completed, and Revenue', async () => {
      renderSellerOrdersPage();

      await waitFor(() => {
        expect(screen.getByTestId('seller-orders-kpi-bar')).toBeInTheDocument();
      });

      // Total seller orders = 3
      expect(screen.getByTestId('orders-kpi-total')).toHaveTextContent('3');

      // Pending = 1 (Order 101)
      expect(screen.getByTestId('orders-kpi-pending')).toHaveTextContent('1');

      // In Progress / Confirmed = 1 (Order 102)
      expect(screen.getByTestId('orders-kpi-processing')).toHaveTextContent(
        '1'
      );

      // Completed = 1 (Order 103)
      expect(screen.getByTestId('orders-kpi-completed')).toHaveTextContent('1');

      // Completed Revenue = ₦4,500 (from order 103)
      expect(screen.getByTestId('orders-kpi-revenue')).toHaveTextContent(
        '₦4,500'
      );
    });
  });

  describe('4. Status Filtering (SEL-10, Figma Section 13)', () => {
    it('filters orders by selected status dropdown', async () => {
      const user = userEvent.setup();
      renderSellerOrdersPage();

      await waitFor(() => {
        expect(
          screen.getByTestId('seller-orders-status-filter')
        ).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId('seller-orders-status-filter');
      await user.selectOptions(statusSelect, 'pending');

      await waitFor(() => {
        expect(sellerService.getSellerOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'pending',
          })
        );
      });

      // Only pending order 101 should appear
      await waitFor(() => {
        expect(screen.getByTestId('seller-order-row-101')).toBeInTheDocument();
        expect(
          screen.queryByTestId('seller-order-row-102')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByTestId('seller-order-row-103')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('5. Date Range Filtering (SEL-10, Figma Section 13)', () => {
    it('filters orders by custom From and To date inputs', async () => {
      const user = userEvent.setup();
      renderSellerOrdersPage();

      await waitFor(() => {
        expect(
          screen.getByTestId('seller-orders-date-from')
        ).toBeInTheDocument();
      });

      const fromInput = screen.getByTestId('seller-orders-date-from');
      const toInput = screen.getByTestId('seller-orders-date-to');
      const applyBtn = screen.getByTestId('seller-orders-apply-dates-btn');

      // Pick date range covering only Order 101 (2026-02-20)
      await user.clear(fromInput);
      await user.type(fromInput, '2026-02-20');
      await user.clear(toInput);
      await user.type(toInput, '2026-02-20');
      await user.click(applyBtn);

      await waitFor(() => {
        expect(sellerService.getSellerOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            date_from: '2026-02-20',
            date_to: '2026-02-20',
          })
        );
      });

      // Only Order 101 rendered
      await waitFor(() => {
        expect(screen.getByTestId('seller-order-row-101')).toBeInTheDocument();
        expect(
          screen.queryByTestId('seller-order-row-102')
        ).not.toBeInTheDocument();
      });
    });

    it('filters orders using quick date preset buttons', async () => {
      const user = userEvent.setup();
      renderSellerOrdersPage();

      await waitFor(() => {
        expect(screen.getByTestId('date-preset-today')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('date-preset-today'));

      await waitFor(() => {
        expect(sellerService.getSellerOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            date_from: expect.any(String),
            date_to: expect.any(String),
          })
        );
      });
    });
  });

  describe('6. Search and Reset Filters (SEL-10)', () => {
    it('searches orders by buyer phone number', async () => {
      const user = userEvent.setup();
      renderSellerOrdersPage();

      await waitFor(() => {
        expect(
          screen.getByTestId('seller-orders-search-input')
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('seller-orders-search-input');
      const searchSubmit = screen.getByTestId('seller-orders-search-submit');

      await user.type(searchInput, '+2348098765432');
      await user.click(searchSubmit);

      await waitFor(() => {
        expect(sellerService.getSellerOrders).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '+2348098765432',
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('seller-order-row-102')).toBeInTheDocument();
        expect(
          screen.queryByTestId('seller-order-row-101')
        ).not.toBeInTheDocument();
      });
    });

    it('resets all filters when clicking Clear Filters', async () => {
      const user = userEvent.setup();
      renderSellerOrdersPage({
        initialEntries: ['/seller/orders?status=pending&search=Amina'],
      });

      await waitFor(() => {
        expect(
          screen.getByTestId('seller-orders-reset-filters-btn')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('seller-orders-reset-filters-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('seller-orders-search-input')).toHaveValue(
          ''
        );
        expect(screen.getByTestId('seller-orders-status-filter')).toHaveValue(
          'all'
        );
      });
    });
  });

  describe('7. Refresh Flow', () => {
    it('refreshes order list when clicking the refresh button', async () => {
      const user = userEvent.setup();
      const { toast } = renderSellerOrdersPage();

      await waitFor(() => {
        expect(
          screen.getByTestId('seller-orders-refresh-btn')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('seller-orders-refresh-btn'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringMatching(/refreshed successfully/i)
        );
      });
    });
  });

  describe('8. Empty States & Error Handling', () => {
    it('displays loading skeleton while fetching orders', () => {
      sellerService.getSellerOrders.mockReturnValue(new Promise(() => {}));
      renderSellerOrdersPage();

      expect(
        screen.getByTestId('seller-orders-loading-skeleton')
      ).toBeInTheDocument();
    });

    it('displays error state with retry button when initial fetch fails', async () => {
      sellerService.getSellerOrders.mockRejectedValueOnce(
        new Error('Failed to connect to database')
      );

      const user = userEvent.setup();
      renderSellerOrdersPage();

      await waitFor(() => {
        expect(
          screen.getByTestId('seller-orders-error-state')
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/Unable to Load Orders/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Failed to connect to database/i)
      ).toBeInTheDocument();

      // Retry
      sellerService.getSellerOrders.mockResolvedValueOnce({
        data: sampleOrders.slice(0, 2),
        meta: { total: 2, current_page: 1, last_page: 1, per_page: 10 },
      });

      await user.click(screen.getByTestId('seller-orders-retry-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('seller-orders-table')).toBeInTheDocument();
      });
    });

    it('displays empty state when seller has no customer orders', async () => {
      sellerService.getSellerOrders.mockResolvedValueOnce({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderSellerOrdersPage();

      await waitFor(() => {
        expect(
          screen.getByTestId('seller-orders-empty-state')
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/No customer orders yet/i)).toBeInTheDocument();
    });

    it('displays search empty state when active filters match 0 orders', async () => {
      sellerService.getSellerOrders.mockResolvedValueOnce({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderSellerOrdersPage({
        initialEntries: ['/seller/orders?status=cancelled'],
      });

      await waitFor(() => {
        expect(
          screen.getByTestId('seller-orders-search-empty')
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/No customer orders found/i)).toBeInTheDocument();
      expect(
        screen.getByTestId('seller-orders-search-empty-reset')
      ).toBeInTheDocument();
    });
  });
});
