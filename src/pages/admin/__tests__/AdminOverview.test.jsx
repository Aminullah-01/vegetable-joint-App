import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminOverview } from '../AdminOverview';
import { adminService } from '../../../services/adminService';
import { ROUTES } from '../../../routes/routeConfig';

// Mock sample statistics conforming to ADM-10 & Figma Section 14
const mockStatsData = {
  total_users: 152,
  total_sellers: 24,
  pending_seller_approvals: 3,
  active_products: 64,
  total_products: 64,
  total_orders: 89,
  total_sales_value: 1240000,
  platform_gmv: 1240000,
};

// Mock audit logs conforming to ADM-07 / NFR-OBS-01
const mockAuditData = {
  data: [
    {
      id: 101,
      user_id: 1,
      action: 'seller.approved',
      entity_type: 'seller_profile',
      entity_id: 4,
      ip_address: '197.210.65.12',
      metadata: {
        business_name: 'Kaduna Fresh Cooperative',
        reviewed_by: 'Platform Administrator',
      },
      created_at: '2026-10-28T14:30:00Z',
    },
    {
      id: 102,
      user_id: 1,
      action: 'user.suspended',
      entity_type: 'user',
      entity_id: 19,
      ip_address: '197.210.65.12',
      metadata: {
        reason: 'Violation of marketplace terms',
        reviewed_by: 'Platform Administrator',
      },
      created_at: '2026-10-27T09:15:00Z',
    },
    {
      id: 103,
      user_id: 1,
      action: 'order.override',
      entity_type: 'order',
      entity_id: 55,
      ip_address: '197.210.65.12',
      metadata: {
        reason: 'Payment confirmed via off-line bank reconciliation',
        reviewed_by: 'Platform Administrator',
      },
      created_at: '2026-10-26T16:45:00Z',
    },
  ],
  meta: {
    total: 3,
    current_page: 1,
    per_page: 5,
  },
};

function renderAdminOverview(initialRoute = ROUTES.ADMIN_OVERVIEW) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path={ROUTES.ADMIN_OVERVIEW} element={<AdminOverview />} />
        <Route
          path={ROUTES.ADMIN_USERS}
          element={<div data-testid="page-admin-users">Admin Users Page</div>}
        />
        <Route
          path={ROUTES.ADMIN_SELLERS}
          element={
            <div data-testid="page-admin-sellers">Admin Sellers Page</div>
          }
        />
        <Route
          path={ROUTES.ADMIN_PRODUCTS}
          element={
            <div data-testid="page-admin-products">Admin Products Page</div>
          }
        />
        <Route
          path={ROUTES.ADMIN_CATEGORIES}
          element={
            <div data-testid="page-admin-categories">Admin Categories Page</div>
          }
        />
        <Route
          path={ROUTES.ADMIN_ORDERS}
          element={<div data-testid="page-admin-orders">Admin Orders Page</div>}
        />
        <Route
          path={ROUTES.ADMIN_SETTINGS}
          element={
            <div data-testid="page-admin-settings">Admin Settings Page</div>
          }
        />
        <Route
          path={ROUTES.ADMIN_AUDIT_LOG}
          element={
            <div data-testid="page-admin-audit">Admin Audit Log Page</div>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('FE-096 / ADM-10: Admin Overview Dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminService, 'getStats').mockResolvedValue(mockStatsData);
    vi.spyOn(adminService, 'getAuditLogs').mockResolvedValue(mockAuditData);
  });

  describe('1. Core Metrics & Statistics Rendering (SRS ADM-10, Figma Section 14)', () => {
    it('renders the 5 mandatory counts: users, sellers, products, orders, and total sales value', async () => {
      renderAdminOverview();

      // Ensure loading finishes
      await waitFor(() => {
        expect(
          screen.queryByTestId('overview-loading-state')
        ).not.toBeInTheDocument();
      });

      // Verify Header
      expect(screen.getByTestId('admin-overview-header')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 1, name: /admin overview/i })
      ).toBeInTheDocument();

      // Metric 1: Total Users (ADM-10)
      const usersCard = screen.getByTestId('stat-card-users');
      expect(usersCard).toBeInTheDocument();
      expect(screen.getByTestId('stat-users-count')).toHaveTextContent('152');

      // Metric 2: Total Sellers (ADM-10)
      const sellersCard = screen.getByTestId('stat-card-sellers');
      expect(sellersCard).toBeInTheDocument();
      expect(screen.getByTestId('stat-sellers-count')).toHaveTextContent('24');
      // Sub-badge for pending approvals
      expect(screen.getByTestId('stat-sellers-pending')).toHaveTextContent(
        '3 pending'
      );

      // Metric 3: Total Products (ADM-10)
      const productsCard = screen.getByTestId('stat-card-products');
      expect(productsCard).toBeInTheDocument();
      expect(screen.getByTestId('stat-products-count')).toHaveTextContent('64');

      // Metric 4: Total Orders (ADM-10)
      const ordersCard = screen.getByTestId('stat-card-orders');
      expect(ordersCard).toBeInTheDocument();
      expect(screen.getByTestId('stat-orders-count')).toHaveTextContent('89');

      // Metric 5: Total Sales Value (ADM-10, BR-13, completed orders revenue)
      const salesCard = screen.getByTestId('stat-card-sales');
      expect(salesCard).toBeInTheDocument();
      // Formatted in Nigerian Naira
      expect(screen.getByTestId('stat-sales-value')).toHaveTextContent(
        /₦1,240,000/
      );
    });

    it('renders zero state safely when numeric counts are 0 or null', async () => {
      vi.spyOn(adminService, 'getStats').mockResolvedValue({
        total_users: 0,
        total_sellers: 0,
        pending_seller_approvals: 0,
        total_products: 0,
        total_orders: 0,
        total_sales_value: 0,
      });

      renderAdminOverview();

      await waitFor(() => {
        expect(
          screen.queryByTestId('overview-loading-state')
        ).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('stat-users-count')).toHaveTextContent('0');
      expect(screen.getByTestId('stat-sellers-count')).toHaveTextContent('0');
      expect(screen.getByTestId('stat-products-count')).toHaveTextContent('0');
      expect(screen.getByTestId('stat-orders-count')).toHaveTextContent('0');
      expect(screen.getByTestId('stat-sales-value')).toHaveTextContent('₦0');
    });
  });

  describe('2. Important Pending Actions Queue (Figma Section 14)', () => {
    it('shows alert banner when there are pending seller approvals', async () => {
      renderAdminOverview();

      await waitFor(() => {
        expect(screen.getByTestId('pending-sellers-alert')).toBeInTheDocument();
      });

      expect(screen.getByTestId('pending-sellers-alert')).toHaveTextContent(
        /3.*seller applications awaiting administrative verification/i
      );

      const reviewBtn = screen.getByTestId('review-pending-sellers-btn');
      expect(reviewBtn).toHaveAttribute('href', ROUTES.ADMIN_SELLERS);
    });

    it('shows all-clear indicator when there are 0 pending seller approvals', async () => {
      vi.spyOn(adminService, 'getStats').mockResolvedValue({
        ...mockStatsData,
        pending_seller_approvals: 0,
      });

      renderAdminOverview();

      await waitFor(() => {
        expect(screen.getByTestId('pending-sellers-clear')).toBeInTheDocument();
      });

      expect(
        screen.queryByTestId('pending-sellers-alert')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('pending-sellers-clear')).toHaveTextContent(
        /all seller verification applications are up to date/i
      );
    });
  });

  describe('3. Recent Platform Activity Feed (Figma Section 14)', () => {
    it('displays recent governance and audit events with formatted labels', async () => {
      renderAdminOverview();

      await waitFor(() => {
        expect(
          screen.getByTestId('recent-activity-section')
        ).toBeInTheDocument();
      });

      expect(screen.getByTestId('activity-item-101')).toHaveTextContent(
        /Seller Approved/i
      );
      expect(screen.getByTestId('activity-item-101')).toHaveTextContent(
        /Kaduna Fresh Cooperative/i
      );

      expect(screen.getByTestId('activity-item-102')).toHaveTextContent(
        /User Suspended/i
      );
      expect(screen.getByTestId('activity-item-102')).toHaveTextContent(
        /Violation of marketplace terms/i
      );

      expect(screen.getByTestId('activity-item-103')).toHaveTextContent(
        /Order Override/i
      );

      // Link to full audit log
      const fullLogLink = screen.getByTestId('view-all-audit-logs-link');
      expect(fullLogLink).toHaveAttribute('href', ROUTES.ADMIN_AUDIT_LOG);
    });

    it('renders graceful empty state when no activity exists', async () => {
      vi.spyOn(adminService, 'getAuditLogs').mockResolvedValue({
        data: [],
        meta: { total: 0 },
      });

      renderAdminOverview();

      await waitFor(() => {
        expect(screen.getByTestId('no-activity-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('no-activity-message')).toHaveTextContent(
        /no administrative activity recorded yet/i
      );
    });
  });

  describe('4. User Interactions & Refresh Functionality', () => {
    it('refetches overview data when the Refresh button is clicked', async () => {
      const user = userEvent.setup();
      renderAdminOverview();

      await waitFor(() => {
        expect(
          screen.queryByTestId('overview-loading-state')
        ).not.toBeInTheDocument();
      });

      expect(adminService.getStats).toHaveBeenCalledTimes(1);

      // Click refresh button
      const refreshBtn = screen.getByTestId('admin-overview-refresh-btn');
      await user.click(refreshBtn);

      await waitFor(() => {
        expect(adminService.getStats).toHaveBeenCalledTimes(2);
      });
      expect(adminService.getAuditLogs).toHaveBeenCalledTimes(2);
    });
  });

  describe('5. Error Handling & Retry Logic', () => {
    it('renders ErrorState with retry button when initial fetch fails', async () => {
      vi.spyOn(adminService, 'getStats').mockRejectedValueOnce(
        new Error('Network connection timeout')
      );

      renderAdminOverview();

      await waitFor(() => {
        expect(screen.getByTestId('overview-error-state')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Network connection timeout/i)
      ).toBeInTheDocument();

      // Retry fetching
      vi.spyOn(adminService, 'getStats').mockResolvedValueOnce(mockStatsData);
      const user = userEvent.setup();
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId('stat-users-count')).toHaveTextContent('152');
      });
    });

    it('displays non-blocking error banner if refresh fails when stats are already loaded', async () => {
      renderAdminOverview();

      await waitFor(() => {
        expect(screen.getByTestId('stat-users-count')).toHaveTextContent('152');
      });

      // Subsequent refresh failure
      vi.spyOn(adminService, 'getStats').mockRejectedValueOnce(
        new Error('Server temporarily unavailable')
      );

      const user = userEvent.setup();
      const refreshBtn = screen.getByTestId('admin-overview-refresh-btn');
      await user.click(refreshBtn);

      await waitFor(() => {
        expect(
          screen.getByTestId('overview-refresh-error')
        ).toBeInTheDocument();
      });

      // Existing data is preserved
      expect(screen.getByTestId('stat-users-count')).toHaveTextContent('152');
    });
  });

  describe('6. Module Navigation Links (ADM-01)', () => {
    it('links to all administrative sections from cards and quick directory', async () => {
      renderAdminOverview();

      await waitFor(() => {
        expect(
          screen.queryByTestId('overview-loading-state')
        ).not.toBeInTheDocument();
      });

      // Quick links
      expect(screen.getByTestId('quick-link-users')).toHaveAttribute(
        'href',
        ROUTES.ADMIN_USERS
      );
      expect(screen.getByTestId('quick-link-sellers')).toHaveAttribute(
        'href',
        ROUTES.ADMIN_SELLERS
      );
      expect(screen.getByTestId('quick-link-products')).toHaveAttribute(
        'href',
        ROUTES.ADMIN_PRODUCTS
      );
      expect(screen.getByTestId('quick-link-categories')).toHaveAttribute(
        'href',
        ROUTES.ADMIN_CATEGORIES
      );
      expect(screen.getByTestId('quick-link-orders')).toHaveAttribute(
        'href',
        ROUTES.ADMIN_ORDERS
      );
      expect(screen.getByTestId('quick-link-settings')).toHaveAttribute(
        'href',
        ROUTES.ADMIN_SETTINGS
      );
      expect(screen.getByTestId('quick-link-audit')).toHaveAttribute(
        'href',
        ROUTES.ADMIN_AUDIT_LOG
      );
    });

    it('navigates to users page when clicking Manage Users link on user card', async () => {
      const user = userEvent.setup();
      renderAdminOverview();

      await waitFor(() => {
        expect(screen.getByTestId('link-users-card')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('link-users-card'));

      await waitFor(() => {
        expect(screen.getByTestId('page-admin-users')).toBeInTheDocument();
      });
    });
  });
});
