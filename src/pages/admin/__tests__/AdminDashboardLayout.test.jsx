import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { ProtectedRoute } from '../../../routes/ProtectedRoute';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import { ToastProvider } from '../../../context/ToastContext.jsx';
import { authService } from '../../../services/authService';
import { mockStore } from '../../../data/mockStore';
import { ADMIN_NAV_ITEMS } from '../../../routes/routeConfig';

/**
 * Task FE-095 / ADM-01: Admin Layout and Navigation
 *
 * SRS References:
 * - ADM-01: The Admin Dashboard shall provide: Overview, Users, Sellers,
 *   Products, Categories, Orders and Settings (+ Audit log).
 * - AUTH-07: Role-based access control protecting administrative routes.
 * - AUTH-09: Unauthenticated users redirected to login; unauthorized users redirected to 403.
 * - BR-14: Role boundaries strictly enforced.
 * - Figma Section 14 (Administrator Dashboard): Professional admin interface with sidebar:
 *   Overview, Users, Sellers, Products, Categories, Orders, Settings, Audit Log, Logout.
 */

const STORAGE_TOKEN_KEY = 'vegetable_joint_token';
const STORAGE_USER_KEY = 'vegetable_joint_user';

const mockAdminUser = {
  id: 1,
  name: 'Platform Administrator',
  email: 'admin@example.com',
  phone: '+2348010000001',
  role: 'admin',
  status: 'active',
};

const mockSellerUser = {
  id: 2,
  name: 'Bello Ibrahim',
  email: 'seller@example.com',
  phone: '+2348031234567',
  role: 'seller',
  status: 'active',
};

const mockBuyerUser = {
  id: 6,
  name: 'Amina Bello',
  email: 'buyer@example.com',
  phone: '+2348078901234',
  role: 'buyer',
  status: 'active',
};

function renderAdminApp({
  initialRoute = '/admin',
  user = mockAdminUser,
  navItems = ADMIN_NAV_ITEMS,
} = {}) {
  if (user) {
    localStorage.setItem(STORAGE_TOKEN_KEY, 'mock-admin-token');
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    vi.spyOn(authService, 'getProfile').mockResolvedValue(user);
  } else {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    vi.spyOn(authService, 'getProfile').mockResolvedValue(null);
  }

  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            {/* Admin Dashboard Protected Routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout
                    title="Admin Portal"
                    role="admin"
                    navItems={navItems}
                  />
                </ProtectedRoute>
              }
            >
              <Route
                path="/admin"
                element={
                  <div data-testid="page-admin-overview">
                    Admin Overview Page
                  </div>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <div data-testid="page-admin-users">
                    Users Management Page
                  </div>
                }
              />
              <Route
                path="/admin/sellers"
                element={
                  <div data-testid="page-admin-sellers">
                    Sellers Management Page
                  </div>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <div data-testid="page-admin-products">
                    Product Moderation Page
                  </div>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <div data-testid="page-admin-categories">
                    Categories Management Page
                  </div>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <div data-testid="page-admin-orders">Orders Monitor Page</div>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <div data-testid="page-admin-settings">
                    Admin Settings Page
                  </div>
                }
              />
              <Route
                path="/admin/audit-log"
                element={
                  <div data-testid="page-admin-audit-log">Audit Log Page</div>
                }
              />
            </Route>

            {/* Fallback routes for auth and access control */}
            <Route
              path="/login"
              element={<div data-testid="login-page">Login Page</div>}
            />
            <Route
              path="/403"
              element={<div data-testid="forbidden-page">403 Forbidden</div>}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

renderAdminApp.propTypes = {
  initialRoute: PropTypes.string,
  user: PropTypes.object,
  navItems: PropTypes.array,
};

describe('FE-095 / ADM-01: Admin Layout and Navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  describe('1. Admin Layout Header and Role Styling (ADM-01, Figma Section 14)', () => {
    it('renders top header with Admin Portal badge, administrator name, and action links', async () => {
      renderAdminApp();

      expect(
        await screen.findByTestId('page-admin-overview')
      ).toBeInTheDocument();

      // Header role badge
      const roleBadge = screen.getByTestId('header-role-badge');
      expect(roleBadge).toBeInTheDocument();
      expect(roleBadge).toHaveTextContent(/Admin Portal/i);

      // Current admin name
      expect(screen.getByText('Platform Administrator')).toBeInTheDocument();

      // Links in header
      const marketplaceLink = screen.getByTestId('header-marketplace-link');
      expect(marketplaceLink).toHaveAttribute('href', '/');
      expect(marketplaceLink).toHaveTextContent(/← Marketplace/i);

      const profileLink = screen.getByTestId('header-profile-link');
      expect(profileLink).toHaveAttribute('href', '/account/profile');

      // Sign out button
      expect(screen.getByTestId('header-signout-button')).toBeInTheDocument();

      // Ensure SellerApprovalNotice is NOT rendered in admin portal
      expect(
        screen.queryByTestId('seller-approval-notice')
      ).not.toBeInTheDocument();
    });
  });

  describe('2. Required Navigation Sections in Sidebar (ADM-01, Figma Section 14)', () => {
    it('renders all 8 required navigation sections in the sidebar: Overview, Users, Sellers, Products, Categories, Orders, Settings, and Audit Log', async () => {
      renderAdminApp();

      await screen.findByTestId('page-admin-overview');

      const sidebar = screen.getByTestId('dashboard-sidebar');
      expect(sidebar).toBeInTheDocument();

      // Section header: Administration
      expect(sidebar).toHaveTextContent(/Administration/i);

      // 1. Overview
      const overviewLink = screen.getByTestId('sidebar-nav-overview');
      expect(overviewLink).toBeInTheDocument();
      expect(overviewLink).toHaveTextContent(/Overview/i);
      expect(overviewLink).toHaveAttribute('href', '/admin');

      // 2. Users
      const usersLink = screen.getByTestId('sidebar-nav-users');
      expect(usersLink).toBeInTheDocument();
      expect(usersLink).toHaveTextContent(/Users/i);
      expect(usersLink).toHaveAttribute('href', '/admin/users');

      // 3. Sellers
      const sellersLink = screen.getByTestId('sidebar-nav-sellers');
      expect(sellersLink).toBeInTheDocument();
      expect(sellersLink).toHaveTextContent(/Sellers/i);
      expect(sellersLink).toHaveAttribute('href', '/admin/sellers');

      // 4. Products
      const productsLink = screen.getByTestId('sidebar-nav-products');
      expect(productsLink).toBeInTheDocument();
      expect(productsLink).toHaveTextContent(/Products/i);
      expect(productsLink).toHaveAttribute('href', '/admin/products');

      // 5. Categories
      const categoriesLink = screen.getByTestId('sidebar-nav-categories');
      expect(categoriesLink).toBeInTheDocument();
      expect(categoriesLink).toHaveTextContent(/Categories/i);
      expect(categoriesLink).toHaveAttribute('href', '/admin/categories');

      // 6. Orders
      const ordersLink = screen.getByTestId('sidebar-nav-orders');
      expect(ordersLink).toBeInTheDocument();
      expect(ordersLink).toHaveTextContent(/Orders/i);
      expect(ordersLink).toHaveAttribute('href', '/admin/orders');

      // 7. Settings
      const settingsLink = screen.getByTestId('sidebar-nav-settings');
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveTextContent(/Settings/i);
      expect(settingsLink).toHaveAttribute('href', '/admin/settings');

      // 8. Audit Log
      const auditLogLink = screen.getByTestId('sidebar-nav-audit-log');
      expect(auditLogLink).toBeInTheDocument();
      expect(auditLogLink).toHaveTextContent(/Audit Log/i);
      expect(auditLogLink).toHaveAttribute('href', '/admin/audit-log');

      // Sidebar Logout button (Figma Section 14)
      const logoutBtn = screen.getByTestId('sidebar-logout-button');
      expect(logoutBtn).toBeInTheDocument();
      expect(logoutBtn).toHaveTextContent(/Logout/i);
    });
  });

  describe('3. Navigation Interaction Across Sections (ADM-01)', () => {
    it('navigates seamlessly between admin sections when sidebar links are clicked', async () => {
      const user = userEvent.setup();
      renderAdminApp();

      expect(
        await screen.findByTestId('page-admin-overview')
      ).toBeInTheDocument();

      // Click Users
      await user.click(screen.getByTestId('sidebar-nav-users'));
      expect(await screen.findByTestId('page-admin-users')).toBeInTheDocument();

      // Click Sellers
      await user.click(screen.getByTestId('sidebar-nav-sellers'));
      expect(
        await screen.findByTestId('page-admin-sellers')
      ).toBeInTheDocument();

      // Click Products
      await user.click(screen.getByTestId('sidebar-nav-products'));
      expect(
        await screen.findByTestId('page-admin-products')
      ).toBeInTheDocument();

      // Click Categories
      await user.click(screen.getByTestId('sidebar-nav-categories'));
      expect(
        await screen.findByTestId('page-admin-categories')
      ).toBeInTheDocument();

      // Click Orders
      await user.click(screen.getByTestId('sidebar-nav-orders'));
      expect(
        await screen.findByTestId('page-admin-orders')
      ).toBeInTheDocument();

      // Click Settings
      await user.click(screen.getByTestId('sidebar-nav-settings'));
      expect(
        await screen.findByTestId('page-admin-settings')
      ).toBeInTheDocument();

      // Click Audit Log
      await user.click(screen.getByTestId('sidebar-nav-audit-log'));
      expect(
        await screen.findByTestId('page-admin-audit-log')
      ).toBeInTheDocument();

      // Click back to Overview
      await user.click(screen.getByTestId('sidebar-nav-overview'));
      expect(
        await screen.findByTestId('page-admin-overview')
      ).toBeInTheDocument();
    });
  });

  describe('4. Mobile Responsive Drawer & Keyboard Navigation (NFR-USAB-01, NFR-USAB-02)', () => {
    it('opens mobile sidebar drawer when toggle button is clicked and closes on backdrop click', async () => {
      const user = userEvent.setup();
      renderAdminApp();

      await screen.findByTestId('page-admin-overview');

      const toggleBtn = screen.getByTestId('sidebar-toggle-button');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

      // Click toggle
      await user.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

      // Backdrop overlay visible
      const backdrop = screen.getByTestId('sidebar-backdrop');
      expect(backdrop).toBeInTheDocument();

      // Click backdrop to dismiss
      await user.click(backdrop);
      expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes mobile drawer when Escape key is pressed (NFR-USAB-02)', async () => {
      const user = userEvent.setup();
      renderAdminApp();

      await screen.findByTestId('page-admin-overview');

      const toggleBtn = screen.getByTestId('sidebar-toggle-button');
      await user.click(toggleBtn);
      expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument();

      // Press Escape
      await user.keyboard('{Escape}');
      expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes mobile drawer when a navigation link is clicked', async () => {
      const user = userEvent.setup();
      renderAdminApp();

      await screen.findByTestId('page-admin-overview');

      const toggleBtn = screen.getByTestId('sidebar-toggle-button');
      await user.click(toggleBtn);
      expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument();

      // Click nav link
      await user.click(screen.getByTestId('sidebar-nav-categories'));
      expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
      expect(
        await screen.findByTestId('page-admin-categories')
      ).toBeInTheDocument();
    });
  });

  describe('5. Session & Logout Controls (AUTH-05, Figma Section 14)', () => {
    it('clears session when sidebar Logout button is clicked', async () => {
      const user = userEvent.setup();
      renderAdminApp();

      await screen.findByTestId('page-admin-overview');

      const logoutBtn = screen.getByTestId('sidebar-logout-button');
      await user.click(logoutBtn);

      await waitFor(() => {
        expect(localStorage.getItem(STORAGE_TOKEN_KEY)).toBeNull();
      });
      expect(localStorage.getItem(STORAGE_USER_KEY)).toBeNull();
    });

    it('clears session when header Sign Out button is clicked', async () => {
      const user = userEvent.setup();
      renderAdminApp();

      await screen.findByTestId('page-admin-overview');

      const signOutBtn = screen.getByTestId('header-signout-button');
      await user.click(signOutBtn);

      await waitFor(() => {
        expect(localStorage.getItem(STORAGE_TOKEN_KEY)).toBeNull();
      });
      expect(localStorage.getItem(STORAGE_USER_KEY)).toBeNull();
    });
  });

  describe('6. Role Authorization & Access Control (AUTH-07, BR-14, TC-28)', () => {
    it('redirects unauthenticated visitor to /login', async () => {
      renderAdminApp({ user: null });

      expect(await screen.findByTestId('login-page')).toBeInTheDocument();
      expect(
        screen.queryByTestId('page-admin-overview')
      ).not.toBeInTheDocument();
    });

    it('blocks authenticated buyer user and redirects to /403 Forbidden (BR-14)', async () => {
      renderAdminApp({ user: mockBuyerUser });

      expect(await screen.findByTestId('forbidden-page')).toBeInTheDocument();
      expect(
        screen.queryByTestId('page-admin-overview')
      ).not.toBeInTheDocument();
    });

    it('blocks authenticated seller user and redirects to /403 Forbidden (BR-14)', async () => {
      renderAdminApp({ user: mockSellerUser });

      expect(await screen.findByTestId('forbidden-page')).toBeInTheDocument();
      expect(
        screen.queryByTestId('page-admin-overview')
      ).not.toBeInTheDocument();
    });
  });
});
