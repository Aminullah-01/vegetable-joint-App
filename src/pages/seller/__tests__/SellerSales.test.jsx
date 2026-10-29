import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SellerSales } from '../SellerSales';
import { sellerService } from '../../../services/sellerService';
import { AuthContext } from '../../../context/authContextDef';
import { ToastContext } from '../../../context/toastContextDef';

/**
 * Task FE-093 / SEL-12: Seller Sales Page
 *
 * SRS References:
 * - SEL-12: The Sales view shall show, for a selectable period:
 *   total sales value (Completed orders), number of orders, products sold
 *   (quantity per product), and recent orders.
 * - BR-12: Sales figures count only orders with status Completed.
 * - SEL-14 / BR-08: Object-level authorization: seller only views their own sales,
 *   products, and orders.
 * - SEL-15: Advanced charts and trend analytics are deferred from Release 1.0.
 * - Figma Section 13: Summary cards (Total Sales Value, Orders, Products Sold),
 *   period selector, products sold table, and recent orders list.
 */

const mockApprovedSeller = {
  id: 2,
  name: 'Bello Ibrahim',
  email: 'bello@example.com',
  role: 'seller',
  seller_id: 1,
  approval_status: 'approved',
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    approval_status: 'approved',
  },
};

const mockPendingSeller = {
  id: 3,
  name: 'Danbatta Greens',
  email: 'danbatta@example.com',
  role: 'seller',
  seller_id: 2,
  approval_status: 'pending',
  seller: {
    id: 2,
    business_name: 'Danbatta Greens Hub',
    approval_status: 'pending',
  },
};

const sampleSalesPayloadAllTime = {
  seller_id: 1,
  seller_name: 'Arewa Fresh Farms',
  period: 'all',
  date_from: null,
  date_to: null,
  total_sales: 12500, // Completed orders only (BR-12)
  completed_orders_count: 1,
  total_orders_count: 4,
  total_products_sold: 5,
  average_order_value: 12500,
  products_sold: [
    {
      product_id: 1,
      product_name: 'Fresh Roma Tomatoes',
      unit: 'basket',
      quantity_sold: 5,
      total_revenue: 12500,
      order_count: 1,
      percentage_of_sales: 100,
    },
  ],
  recent_orders: [
    {
      id: 6,
      order_number: 'VJ-20260224-006',
      seller_id: 1,
      buyer_id: 6,
      total_amount: 12500,
      status: 'completed',
      delivery_name: 'Amina Bello',
      delivery_phone: '+2348078901234',
      created_at: '2026-02-24T13:00:00Z',
      items: [
        {
          id: 1,
          product_name: 'Fresh Roma Tomatoes',
          quantity: 5,
          unit: 'basket',
          price: 2500,
          subtotal: 12500,
        },
      ],
    },
    {
      id: 5,
      order_number: 'VJ-20260224-005',
      seller_id: 1,
      buyer_id: 6,
      total_amount: 10000,
      status: 'pending',
      delivery_name: 'Amina Bello',
      delivery_phone: '+2348078901234',
      created_at: '2026-02-24T11:20:00Z',
      items: [
        {
          id: 2,
          product_name: 'Hot Peppers',
          quantity: 4,
          unit: 'basket',
          price: 2500,
          subtotal: 10000,
        },
      ],
    },
    {
      id: 4,
      order_number: 'VJ-20260223-004',
      seller_id: 1,
      buyer_id: 7,
      total_amount: 3600,
      status: 'cancelled',
      delivery_name: 'Usman Dan',
      delivery_phone: '+2348055556666',
      created_at: '2026-02-23T08:30:00Z',
      items: [],
    },
    {
      id: 1,
      order_number: 'VJ-20260220-001',
      seller_id: 1,
      buyer_id: 6,
      total_amount: 7500,
      status: 'confirmed',
      delivery_name: 'Amina Bello',
      delivery_phone: '+2348078901234',
      created_at: '2026-02-20T10:00:00Z',
      items: [
        {
          id: 3,
          product_name: 'Fresh Roma Tomatoes',
          quantity: 3,
          unit: 'basket',
          price: 2500,
          subtotal: 7500,
        },
      ],
    },
  ],
};

const sampleSalesPayloadEmpty = {
  seller_id: 1,
  seller_name: 'Arewa Fresh Farms',
  period: 'today',
  date_from: '2026-10-29T00:00:00.000Z',
  date_to: '2026-10-29T23:59:59.999Z',
  total_sales: 0,
  completed_orders_count: 0,
  total_orders_count: 0,
  total_products_sold: 0,
  average_order_value: 0,
  products_sold: [],
  recent_orders: [],
};

function renderSellerSalesPage({
  user = mockApprovedSeller,
  initialEntries = ['/seller/sales'],
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
            <SellerSales />
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
  };
}

renderSellerSalesPage.propTypes = {
  user: PropTypes.object,
  initialEntries: PropTypes.arrayOf(PropTypes.string),
  toast: PropTypes.object,
};

describe('FE-093 / SEL-12: Seller Sales Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Page Layout and Header (SEL-12, SEL-15)', () => {
    it('renders page title, subtitle, refresh button, and charts deferral notice', async () => {
      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        sampleSalesPayloadAllTime
      );

      renderSellerSalesPage();

      expect(await screen.findByTestId('sales-page-title')).toHaveTextContent(
        /Sales & Analytics/i
      );

      expect(
        screen.getByText(
          /Track revenue, completed orders, and produce sales performance \(SEL-12\)/i
        )
      ).toBeInTheDocument();

      expect(screen.getByTestId('sales-refresh-btn')).toBeInTheDocument();

      // Release 1.0 Note verifying SEL-15 chart deferral
      const chartsNotice = screen.getByTestId('charts-deferred-notice');
      expect(chartsNotice).toBeInTheDocument();
      expect(chartsNotice).toHaveTextContent(
        /Graphical analytics and trend charts are deferred from Release 1.0 per specification SEL-15/i
      );
    });

    it('renders all period selector buttons and active period indicator', async () => {
      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        sampleSalesPayloadAllTime
      );

      renderSellerSalesPage();

      await screen.findByTestId('sales-page-title');

      expect(screen.getByTestId('period-selector')).toBeInTheDocument();
      expect(screen.getByTestId('period-btn-all')).toBeInTheDocument();
      expect(screen.getByTestId('period-btn-today')).toBeInTheDocument();
      expect(screen.getByTestId('period-btn-this_week')).toBeInTheDocument();
      expect(screen.getByTestId('period-btn-this_month')).toBeInTheDocument();
      expect(screen.getByTestId('period-btn-this_year')).toBeInTheDocument();
      expect(screen.getByTestId('period-btn-custom')).toBeInTheDocument();

      const activeIndicator = screen.getByTestId('active-period-indicator');
      expect(activeIndicator).toHaveTextContent(/Active Period:\s*All Time/i);
    });
  });

  describe('2. Key Metric Summary Cards (SEL-12, BR-12)', () => {
    it('displays total sales (Completed only), order counts, products sold, and average order value', async () => {
      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        sampleSalesPayloadAllTime
      );

      renderSellerSalesPage();

      await screen.findByTestId('sales-kpi-grid');

      // Total Sales: Completed orders only (BR-12)
      const totalSalesCard = screen.getByTestId('sales-total-value');
      expect(totalSalesCard).toHaveTextContent(/₦12,500/i);
      expect(
        screen.getByText(/Completed orders only \(BR-12\)/i)
      ).toBeInTheDocument();

      // Completed Orders count out of total orders
      const orderCountCard = screen.getByTestId('sales-order-count');
      expect(orderCountCard).toHaveTextContent('1');
      expect(
        screen.getByText(/Out of 4 total orders placed/i)
      ).toBeInTheDocument();

      // Total Products Sold
      const productsSoldCard = screen.getByTestId('sales-products-sold-count');
      expect(productsSoldCard).toHaveTextContent('5');
      expect(screen.getByText(/Across 1 produce item/i)).toBeInTheDocument();

      // Average Order Value
      const aovCard = screen.getByTestId('sales-average-order-value');
      expect(aovCard).toHaveTextContent(/₦12,500/i);
    });
  });

  describe('3. Products Sold Breakdown Table (SEL-12)', () => {
    it('renders produce name, unit, quantity sold, order count, revenue, and share of sales', async () => {
      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        sampleSalesPayloadAllTime
      );

      renderSellerSalesPage();

      await screen.findByTestId('products-sold-table');

      const row = screen.getByTestId('product-sold-row-1');
      expect(within(row).getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
      expect(within(row).getByText('basket')).toBeInTheDocument();
      expect(within(row).getByText('5 basket')).toBeInTheDocument();
      expect(within(row).getByText(/1 order/i)).toBeInTheDocument();
      expect(within(row).getByText(/₦12,500/i)).toBeInTheDocument();
      expect(within(row).getByText('100%')).toBeInTheDocument();
    });

    it('filters products sold table when typing into search input', async () => {
      const user = userEvent.setup();
      const multiProductPayload = {
        ...sampleSalesPayloadAllTime,
        products_sold: [
          {
            product_id: 1,
            product_name: 'Fresh Roma Tomatoes',
            unit: 'basket',
            quantity_sold: 10,
            total_revenue: 25000,
            order_count: 2,
            percentage_of_sales: 70,
          },
          {
            product_id: 2,
            product_name: 'Organic Spinach (Alayahu)',
            unit: 'bunch',
            quantity_sold: 15,
            total_revenue: 12000,
            order_count: 3,
            percentage_of_sales: 30,
          },
        ],
      };

      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        multiProductPayload
      );

      renderSellerSalesPage();

      await screen.findByTestId('products-sold-table');
      expect(screen.getByTestId('product-sold-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('product-sold-row-2')).toBeInTheDocument();

      const searchInput = screen.getByTestId('products-sold-search');
      await user.type(searchInput, 'Spinach');

      expect(
        screen.queryByTestId('product-sold-row-1')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('product-sold-row-2')).toBeInTheDocument();
    });

    it('renders empty state when no products were sold in the period', async () => {
      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        sampleSalesPayloadEmpty
      );

      renderSellerSalesPage();

      await screen.findByTestId('no-products-sold');
      expect(
        screen.getByText(/No products sold during this period/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Items from completed orders will appear here with units and revenue breakdown/i
        )
      ).toBeInTheDocument();
    });
  });

  describe('4. Recent Orders Table (SEL-12)', () => {
    it('renders recent orders with links, date, buyer, items, amount, and status badge', async () => {
      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        sampleSalesPayloadAllTime
      );

      renderSellerSalesPage();

      await screen.findByTestId('recent-orders-table');

      const completedRow = screen.getByTestId('recent-order-row-6');
      expect(
        within(completedRow).getByText('VJ-20260224-006')
      ).toBeInTheDocument();
      expect(within(completedRow).getByText('Amina Bello')).toBeInTheDocument();
      expect(
        within(completedRow).getByText(/5 basket Fresh Roma Tomatoes/i)
      ).toBeInTheDocument();
      expect(within(completedRow).getByText(/₦12,500/i)).toBeInTheDocument();
      expect(within(completedRow).getByText(/Completed/i)).toBeInTheDocument();

      // Link to order detail
      const orderLink = within(completedRow).getByRole('link', {
        name: 'VJ-20260224-006',
      });
      expect(orderLink).toHaveAttribute('href', '/seller/orders/6');
    });

    it('allows toggling between All Orders and Completed Orders tabs', async () => {
      const user = userEvent.setup();
      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        sampleSalesPayloadAllTime
      );

      renderSellerSalesPage();

      await screen.findByTestId('recent-orders-table');

      // By default, all 4 orders are visible
      expect(screen.getByTestId('recent-order-row-6')).toBeInTheDocument();
      expect(screen.getByTestId('recent-order-row-5')).toBeInTheDocument();
      expect(screen.getByTestId('recent-order-row-4')).toBeInTheDocument();
      expect(screen.getByTestId('recent-order-row-1')).toBeInTheDocument();

      // Switch to Completed Orders
      const completedTab = screen.getByTestId('filter-completed-orders');
      await user.click(completedTab);

      // Only order 6 should be visible
      expect(screen.getByTestId('recent-order-row-6')).toBeInTheDocument();
      expect(
        screen.queryByTestId('recent-order-row-5')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('recent-order-row-4')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('recent-order-row-1')
      ).not.toBeInTheDocument();
    });

    it('renders empty state when no recent orders match the period', async () => {
      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        sampleSalesPayloadEmpty
      );

      renderSellerSalesPage();

      await screen.findByTestId('no-recent-orders');
      expect(
        screen.getByText(/No orders found for the selected period/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /Go to Orders Management →/i })
      ).toHaveAttribute('href', '/seller/orders');
    });
  });

  describe('5. Period Selection & Custom Date Range (SEL-12)', () => {
    it('requests sales for selected preset periods (Today, This Week, This Month)', async () => {
      const user = userEvent.setup();
      const getSalesSpy = vi
        .spyOn(sellerService, 'getSellerSales')
        .mockResolvedValue(sampleSalesPayloadAllTime);

      renderSellerSalesPage();

      await screen.findByTestId('sales-page-title');

      // Click "Today"
      const todayBtn = screen.getByTestId('period-btn-today');
      await user.click(todayBtn);

      await waitFor(() => {
        expect(getSalesSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            seller_id: 1,
            period: 'today',
          })
        );
      });

      // Click "This Month"
      const monthBtn = screen.getByTestId('period-btn-this_month');
      await user.click(monthBtn);

      await waitFor(() => {
        expect(getSalesSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            seller_id: 1,
            period: 'this_month',
          })
        );
      });
    });

    it('expands custom date range form and validates start date vs end date', async () => {
      const user = userEvent.setup();
      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        sampleSalesPayloadAllTime
      );

      renderSellerSalesPage();

      await screen.findByTestId('sales-page-title');

      // Click "Custom Range"
      const customBtn = screen.getByTestId('period-btn-custom');
      await user.click(customBtn);

      expect(screen.getByTestId('custom-date-form')).toBeInTheDocument();
      const fromInput = screen.getByTestId('custom-date-from');
      const toInput = screen.getByTestId('custom-date-to');
      const applyBtn = screen.getByTestId('apply-custom-date');

      // Enter invalid range: from 2026-03-01 to 2026-02-01
      await user.clear(fromInput);
      await user.type(fromInput, '2026-03-01');
      await user.clear(toInput);
      await user.type(toInput, '2026-02-01');

      await user.click(applyBtn);

      // Validation error shown inline
      const errorMsg = await screen.findByTestId('custom-date-error');
      expect(errorMsg).toHaveTextContent(
        /Start date cannot be after end date/i
      );
    });

    it('submits valid custom date range and fetches filtered sales data', async () => {
      const user = userEvent.setup();
      const getSalesSpy = vi
        .spyOn(sellerService, 'getSellerSales')
        .mockResolvedValue({
          ...sampleSalesPayloadAllTime,
          period: 'custom',
          date_from: '2026-02-01',
          date_to: '2026-02-28',
        });

      renderSellerSalesPage({
        initialEntries: ['/seller/sales?period=custom'],
      });

      await screen.findByTestId('custom-date-form');

      const fromInput = screen.getByTestId('custom-date-from');
      const toInput = screen.getByTestId('custom-date-to');
      const applyBtn = screen.getByTestId('apply-custom-date');

      await user.type(fromInput, '2026-02-01');
      await user.type(toInput, '2026-02-28');
      await user.click(applyBtn);

      await waitFor(() => {
        expect(getSalesSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            seller_id: 1,
            period: 'custom',
            date_from: '2026-02-01',
            date_to: '2026-02-28',
          })
        );
      });
    });
  });

  describe('6. Object-Level Authorization (SEL-14, BR-08)', () => {
    it('strictly passes current authenticated seller ID to sellerService', async () => {
      const getSalesSpy = vi
        .spyOn(sellerService, 'getSellerSales')
        .mockResolvedValue(sampleSalesPayloadAllTime);

      renderSellerSalesPage({
        user: {
          id: 4,
          name: 'Kano Seller',
          role: 'seller',
          seller_id: 2, // Seller 2
          approval_status: 'approved',
        },
      });

      await waitFor(() => {
        expect(getSalesSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            seller_id: 2,
          })
        );
      });
    });
  });

  describe('7. Error Resilience & Refresh (ERR-01, ERR-02)', () => {
    it('renders error banner with retry button on API failure, and recovers upon retry', async () => {
      const user = userEvent.setup();
      const getSalesSpy = vi
        .spyOn(sellerService, 'getSellerSales')
        .mockRejectedValueOnce(new Error('Network error loading metrics'))
        .mockResolvedValueOnce(sampleSalesPayloadAllTime);

      renderSellerSalesPage();

      const errorBanner = await screen.findByTestId('sales-error-state');
      expect(errorBanner).toHaveTextContent(/Network error loading metrics/i);

      const retryBtn = screen.getByTestId('sales-retry-btn');
      await user.click(retryBtn);

      expect(await screen.findByTestId('sales-kpi-grid')).toBeInTheDocument();
      expect(screen.queryByTestId('sales-error-state')).not.toBeInTheDocument();
      expect(getSalesSpy).toHaveBeenCalledTimes(2);
    });

    it('calls toast.success on manual refresh', async () => {
      const user = userEvent.setup();
      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        sampleSalesPayloadAllTime
      );
      const toast = { success: vi.fn(), error: vi.fn() };

      renderSellerSalesPage({ toast });

      await screen.findByTestId('sales-page-title');

      const refreshBtn = screen.getByTestId('sales-refresh-btn');
      await user.click(refreshBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Sales performance data refreshed.'
        );
      });
    });
  });

  describe('8. Seller Approval Status Notice (AUTH-03, ADM-03)', () => {
    it('displays SellerApprovalNotice when seller is pending approval', async () => {
      vi.spyOn(sellerService, 'getSellerSales').mockResolvedValue(
        sampleSalesPayloadEmpty
      );

      renderSellerSalesPage({ user: mockPendingSeller });

      const notice = await screen.findByTestId('seller-approval-notice');
      expect(notice).toBeInTheDocument();
      expect(screen.getByTestId('seller-status-pending')).toHaveTextContent(
        /currently under review by platform administrators/i
      );
      expect(
        within(notice).getByTestId('seller-status-badge')
      ).toHaveTextContent(/Pending Approval/i);
    });
  });

  describe('9. Real Mock Store Integration (SEL-12, BR-12, SEL-14)', () => {
    it('accurately computes sales from real mock store (Completed orders only) for Seller 1', async () => {
      // Do not mock sellerService.getSellerSales; use mockStore directly
      renderSellerSalesPage({ user: mockApprovedSeller });

      await screen.findByTestId('sales-kpi-grid');

      // Total sales must be exactly ₦12,500 from Order 6 (BR-12)
      expect(screen.getByTestId('sales-total-value')).toHaveTextContent(
        /₦12,500/i
      );
      expect(screen.getByTestId('sales-order-count')).toHaveTextContent('1');
      expect(
        screen.getByText(/Out of 4 total orders placed/i)
      ).toBeInTheDocument();

      // Products sold table
      await screen.findByTestId('products-sold-table');
      const tomatoRow = screen.getByTestId('product-sold-row-1');
      expect(
        within(tomatoRow).getByText('Fresh Roma Tomatoes')
      ).toBeInTheDocument();
      expect(within(tomatoRow).getByText('5 basket')).toBeInTheDocument();
      expect(within(tomatoRow).getByText(/₦12,500/i)).toBeInTheDocument();

      // Recent orders has 4 seller orders
      await screen.findByTestId('recent-orders-table');
      expect(screen.getByTestId('recent-order-row-6')).toBeInTheDocument();
      expect(screen.getByTestId('recent-order-row-5')).toBeInTheDocument();
      expect(screen.getByTestId('recent-order-row-4')).toBeInTheDocument();
      expect(screen.getByTestId('recent-order-row-1')).toBeInTheDocument();
    });

    it('enforces object-level authorization for Seller 2 without leaking Seller 1 orders', async () => {
      const mockSeller2User = {
        id: 4,
        name: 'Kano Agro Admin',
        role: 'seller',
        seller_id: 2,
        approval_status: 'approved',
        seller: {
          id: 2,
          business_name: 'Kano Green Agro',
          approval_status: 'approved',
        },
      };

      renderSellerSalesPage({ user: mockSeller2User });

      await screen.findByTestId('sales-kpi-grid');

      // Seller 2 total sales is ₦3,300 from Order 2 (SEL-12, BR-12)
      expect(screen.getByTestId('sales-total-value')).toHaveTextContent(
        /₦3,300/i
      );
      expect(screen.getByTestId('sales-order-count')).toHaveTextContent('1');

      // Products sold table has Ugwu and Spinach
      await screen.findByTestId('products-sold-table');
      expect(screen.getByTestId('product-sold-row-5')).toBeInTheDocument(); // Ugwu
      expect(screen.getByTestId('product-sold-row-4')).toBeInTheDocument(); // Spinach
      // Seller 1's Roma Tomatoes (ID 1) must NOT be present
      expect(
        screen.queryByTestId('product-sold-row-1')
      ).not.toBeInTheDocument();

      // Recent orders must only have Order 2 (SEL-14 object authorization)
      await screen.findByTestId('recent-orders-table');
      expect(screen.getByTestId('recent-order-row-2')).toBeInTheDocument();
      expect(
        screen.queryByTestId('recent-order-row-6')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('recent-order-row-1')
      ).not.toBeInTheDocument();
    });
  });
});
