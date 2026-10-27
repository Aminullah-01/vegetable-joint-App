import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { MyOrders } from '../MyOrders';
import { orderService } from '../../../services/orderService';
import { formatCurrency, formatDate } from '../../../utils';

const mockOrders = [
  {
    id: 1,
    order_number: 'VJ-20261025-001',
    checkout_ref: 'chk_1111-2222-3333-4444',
    buyer_id: 6,
    seller_id: 1,
    total_amount: 5000,
    status: 'pending',
    payment_method: 'pay_on_delivery',
    delivery_name: 'Amina Bello',
    created_at: '2026-10-25T14:30:00.000Z',
    seller: {
      id: 1,
      business_name: 'Arewa Fresh Farms',
      location: 'Kano',
    },
    items: [
      {
        id: 1,
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
    id: 2,
    order_number: 'VJ-20261026-002',
    checkout_ref: 'chk_5555-6666-7777-8888',
    buyer_id: 6,
    seller_id: 2,
    total_amount: 3600,
    status: 'confirmed',
    payment_method: 'pay_on_delivery',
    delivery_name: 'Amina Bello',
    created_at: '2026-10-26T09:15:00.000Z',
    seller: {
      id: 2,
      business_name: 'Danbatta Greens',
      location: 'Kaduna',
    },
    items: [
      {
        id: 2,
        product_id: 2,
        product_name: 'Red Bell Peppers',
        unit: 'kg',
        quantity: 2,
        price: 1800,
        subtotal: 3600,
      },
    ],
  },
  {
    id: 3,
    order_number: 'VJ-20261027-003',
    checkout_ref: 'chk_9999-0000-1111-2222',
    buyer_id: 6,
    seller_id: 1,
    total_amount: 8000,
    status: 'completed',
    payment_method: 'pay_on_delivery',
    delivery_name: 'Amina Bello',
    created_at: '2026-10-27T11:45:00.000Z',
    seller: {
      id: 1,
      business_name: 'Arewa Fresh Farms',
      location: 'Kano',
    },
    items: [
      {
        id: 3,
        product_id: 3,
        product_name: 'Fresh Spinach (Alayyahu)',
        unit: 'bunch',
        quantity: 4,
        price: 2000,
        subtotal: 8000,
      },
    ],
  },
];

function renderMyOrders({ initialRoute = '/account/orders' } = {}) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/account/orders" element={children} />
          <Route
            path="/account/orders/:id"
            element={<div data-testid="order-detail-page">Order Detail</div>}
          />
          <Route
            path="/products"
            element={<div data-testid="products-page">Products Page</div>}
          />
        </Routes>
      </MemoryRouter>
    );
  }

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return render(<MyOrders />, { wrapper: Wrapper });
}

describe('FE-077 / ORD-01: My Orders List Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Loading & Initial Header', () => {
    it('shows loading spinner initially while fetching orders', async () => {
      // Mock delayed response
      vi.spyOn(orderService, 'getOrders').mockImplementation(
        () => new Promise(() => {})
      );

      renderMyOrders();

      expect(screen.getByTestId('my-orders-loading')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /My Orders/i })
      ).toBeInTheDocument();
    });

    it('renders header, subtitle, and Buy Fresh Produce link', async () => {
      vi.spyOn(orderService, 'getOrders').mockResolvedValue({
        data: mockOrders,
        meta: { total: 3, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderMyOrders();

      expect(await screen.findByTestId('my-orders-heading')).toHaveTextContent(
        'My Orders'
      );
      expect(
        screen.getByRole('link', { name: /Buy Fresh Produce/i })
      ).toHaveAttribute('href', '/products');
    });
  });

  describe('2. Order History Display (ORD-01, Figma Section 12)', () => {
    it('renders orders sorted newest first with order numbers, dates, sellers, totals, and statuses', async () => {
      vi.spyOn(orderService, 'getOrders').mockResolvedValue({
        data: mockOrders,
        meta: { total: 3, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderMyOrders();

      await waitFor(() => {
        expect(
          screen.queryByTestId('my-orders-loading')
        ).not.toBeInTheDocument();
      });

      const orderCards = screen.getAllByTestId(/order-card-/);
      expect(orderCards).toHaveLength(3);

      // Order 3 was placed on Oct 27 (newest) -> Should be first in the list
      const orderNumbers = screen.getAllByTestId('order-number');
      expect(orderNumbers[0]).toHaveTextContent('VJ-20261027-003');
      expect(orderNumbers[1]).toHaveTextContent('VJ-20261026-002');
      expect(orderNumbers[2]).toHaveTextContent('VJ-20261025-001');

      // Date verification
      const orderDates = screen.getAllByTestId('order-date');
      expect(orderDates[0]).toHaveTextContent(
        formatDate('2026-10-27T11:45:00.000Z')
      );

      // Seller verification
      const sellers = screen.getAllByTestId('order-seller');
      expect(sellers[0]).toHaveTextContent('Arewa Fresh Farms');
      expect(sellers[1]).toHaveTextContent('Danbatta Greens');

      // Total verification
      const totals = screen.getAllByTestId('order-total');
      expect(totals[0]).toHaveTextContent(formatCurrency(8000));
      expect(totals[1]).toHaveTextContent(formatCurrency(3600));
      expect(totals[2]).toHaveTextContent(formatCurrency(5000));

      // Status badges
      const statusBadges = screen.getAllByTestId('order-status-badge');
      expect(statusBadges[0]).toHaveTextContent(/Completed/i);
      expect(statusBadges[1]).toHaveTextContent(/Confirmed/i);
      expect(statusBadges[2]).toHaveTextContent(/Pending/i);

      // View details action link
      const viewDetailsLink = screen.getByTestId('order-view-details-3');
      expect(viewDetailsLink).toHaveAttribute('href', '/account/orders/3');
    });

    it('displays items summary and unit count for each order', async () => {
      vi.spyOn(orderService, 'getOrders').mockResolvedValue({
        data: mockOrders,
        meta: { total: 3, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderMyOrders();

      await screen.findByTestId('order-card-1');

      const summaries = screen.getAllByTestId('order-items-summary');
      expect(summaries[0]).toHaveTextContent(
        'Fresh Spinach (Alayyahu) (4 bunch)'
      );
      expect(summaries[1]).toHaveTextContent('Red Bell Peppers (2 kg)');
      expect(summaries[2]).toHaveTextContent('Fresh Roma Tomatoes (2 basket)');
    });
  });

  describe('3. Status Filter Tabs (Figma Section 12)', () => {
    it('renders all required status filter tabs', async () => {
      vi.spyOn(orderService, 'getOrders').mockResolvedValue({
        data: mockOrders,
        meta: { total: 3, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderMyOrders();

      await screen.findByTestId('my-orders-toolbar');

      expect(screen.getByTestId('status-tab-all')).toBeInTheDocument();
      expect(screen.getByTestId('status-tab-pending')).toBeInTheDocument();
      expect(screen.getByTestId('status-tab-confirmed')).toBeInTheDocument();
      expect(screen.getByTestId('status-tab-processing')).toBeInTheDocument();
      expect(screen.getByTestId('status-tab-ready')).toBeInTheDocument();
      expect(screen.getByTestId('status-tab-completed')).toBeInTheDocument();
      expect(screen.getByTestId('status-tab-cancelled')).toBeInTheDocument();
    });

    it('filters orders when clicking a status tab and requests status from orderService', async () => {
      const user = userEvent.setup({ delay: null });
      const getOrdersSpy = vi
        .spyOn(orderService, 'getOrders')
        .mockResolvedValue({
          data: [mockOrders[0]], // only pending
          meta: { total: 1, current_page: 1, last_page: 1, per_page: 10 },
        });

      renderMyOrders();

      await screen.findByTestId('my-orders-toolbar');

      const pendingTab = screen.getByTestId('status-tab-pending');
      await user.click(pendingTab);

      await waitFor(() => {
        expect(getOrdersSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'pending',
          })
        );
      });

      expect(pendingTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('4. Search Functionality (Figma Section 12)', () => {
    it('searches orders when entering a keyword and submitting the search form', async () => {
      const user = userEvent.setup({ delay: null });
      const getOrdersSpy = vi
        .spyOn(orderService, 'getOrders')
        .mockResolvedValue({
          data: [mockOrders[1]],
          meta: { total: 1, current_page: 1, last_page: 1, per_page: 10 },
        });

      renderMyOrders();

      const searchInput = await screen.findByTestId('my-orders-search-input');
      const searchButton = screen.getByTestId('my-orders-search-button');

      await user.type(searchInput, 'Danbatta');
      await user.click(searchButton);

      await waitFor(() => {
        expect(getOrdersSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Danbatta',
          })
        );
      });
    });

    it('clears search input when clear (✕) button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      vi.spyOn(orderService, 'getOrders').mockResolvedValue({
        data: mockOrders,
        meta: { total: 3, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderMyOrders();

      const searchInput = await screen.findByTestId('my-orders-search-input');
      await user.type(searchInput, 'Peppers');
      expect(searchInput).toHaveValue('Peppers');

      const clearBtn = screen.getByRole('button', {
        name: /clear search input/i,
      });
      await user.click(clearBtn);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('5. Reset Filters', () => {
    it('resets all filters when clicking the Reset Filters button', async () => {
      const user = userEvent.setup({ delay: null });
      const getOrdersSpy = vi
        .spyOn(orderService, 'getOrders')
        .mockResolvedValue({
          data: [mockOrders[0]],
          meta: { total: 1, current_page: 1, last_page: 1, per_page: 10 },
        });

      renderMyOrders({ initialRoute: '/account/orders?status=pending' });

      await screen.findByTestId('my-orders-clear-filters');

      const resetBtn = screen.getByTestId('my-orders-clear-filters');
      await user.click(resetBtn);

      await waitFor(() => {
        expect(getOrdersSpy).toHaveBeenCalledWith(
          expect.not.objectContaining({
            status: 'pending',
          })
        );
      });
    });
  });

  describe('6. Empty States', () => {
    it('renders empty state with Start Shopping CTA when buyer has no orders', async () => {
      vi.spyOn(orderService, 'getOrders').mockResolvedValue({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderMyOrders();

      const emptyNotice = await screen.findByTestId('my-orders-empty');
      expect(emptyNotice).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /No Orders Placed Yet/i })
      ).toBeInTheDocument();

      const shopBtn = screen.getByTestId('start-shopping-btn');
      expect(shopBtn).toHaveAttribute('href', '/products');
    });

    it('renders filter empty state with Clear All Filters when search yields 0 matches', async () => {
      vi.spyOn(orderService, 'getOrders').mockResolvedValue({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderMyOrders({
        initialRoute: '/account/orders?search=NonExistentVegetable',
      });

      const noResults = await screen.findByTestId('my-orders-no-results');
      expect(noResults).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /No Orders Match Your Filter/i })
      ).toBeInTheDocument();

      expect(screen.getByTestId('clear-filters-btn')).toBeInTheDocument();
    });
  });

  describe('7. Error Handling & Retry', () => {
    it('displays error notice and retries when clicking Try Again', async () => {
      const user = userEvent.setup({ delay: null });
      const getOrdersSpy = vi
        .spyOn(orderService, 'getOrders')
        .mockRejectedValueOnce(new Error('Network error: server unreachable'))
        .mockResolvedValueOnce({
          data: mockOrders,
          meta: { total: 3, current_page: 1, last_page: 1, per_page: 10 },
        });

      renderMyOrders();

      const errorNotice = await screen.findByTestId('my-orders-error');
      expect(errorNotice).toBeInTheDocument();
      expect(errorNotice).toHaveTextContent(
        'Network error: server unreachable'
      );

      const retryBtn = screen.getByTestId('my-orders-retry-button');
      await user.click(retryBtn);

      await waitFor(() => {
        expect(getOrdersSpy).toHaveBeenCalledTimes(2);
      });

      expect(await screen.findByTestId('order-card-1')).toBeInTheDocument();
    });
  });

  describe('8. Pagination Controls (ORD-01)', () => {
    it('renders pagination when total orders exceed per_page limit', async () => {
      vi.spyOn(orderService, 'getOrders').mockResolvedValue({
        data: mockOrders,
        meta: { total: 25, current_page: 1, last_page: 3, per_page: 10 },
      });

      renderMyOrders();

      const pagination = await screen.findByTestId('my-orders-pagination');
      expect(pagination).toBeInTheDocument();
      expect(
        screen.getByRole('navigation', { name: /Pagination Navigation/i })
      ).toBeInTheDocument();
    });
  });
});
