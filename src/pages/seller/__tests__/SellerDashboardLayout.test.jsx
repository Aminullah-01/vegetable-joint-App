import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import { ToastProvider } from '../../../context/ToastContext.jsx';
import { authService } from '../../../services/authService';
import { mockStore } from '../../../data/mockStore';
import { SELLER_NAV_ITEMS } from '../../../routes/routeConfig';

const STORAGE_TOKEN_KEY = 'vegetable_joint_token';
const STORAGE_USER_KEY = 'vegetable_joint_user';

const approvedSeller = {
  id: 2,
  name: 'Tanimu Produce Hub',
  email: 'tanimu@example.com',
  role: 'seller',
  approval_status: 'approved',
};

const pendingSeller = {
  id: 3,
  name: 'Danbatta Greens',
  email: 'danbatta@example.com',
  role: 'seller',
  approval_status: 'pending',
};

function renderDashboardLayout({
  initialRoute = '/seller',
  user = approvedSeller,
  navItems = SELLER_NAV_ITEMS,
} = {}) {
  localStorage.setItem(STORAGE_TOKEN_KEY, 'mock-jwt-token');
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  vi.spyOn(authService, 'getProfile').mockResolvedValue(user);

  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route
              element={
                <DashboardLayout
                  title="Seller Portal"
                  role="seller"
                  navItems={navItems}
                />
              }
            >
              <Route
                path="/seller"
                element={
                  <div data-testid="page-overview">Overview Section</div>
                }
              />
              <Route
                path="/seller/products"
                element={
                  <div data-testid="page-products">Products Section</div>
                }
              />
              <Route
                path="/seller/products/new"
                element={
                  <div data-testid="page-add-product">Add Product Section</div>
                }
              />
              <Route
                path="/seller/orders"
                element={<div data-testid="page-orders">Orders Section</div>}
              />
              <Route
                path="/seller/inventory"
                element={
                  <div data-testid="page-inventory">Inventory Section</div>
                }
              />
              <Route
                path="/seller/sales"
                element={<div data-testid="page-sales">Sales Section</div>}
              />
              <Route
                path="/seller/profile"
                element={<div data-testid="page-profile">Profile Section</div>}
              />
            </Route>
            <Route
              path="/"
              element={<div data-testid="page-home">Marketplace Home</div>}
            />
            <Route
              path="/login"
              element={<div data-testid="page-login">Login</div>}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

describe('FE-080: Seller Dashboard Layout and Navigation (SEL-01, Figma Section 13)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  describe('1. Sidebar Sections Rendering (SEL-01)', () => {
    it('renders all 7 required navigation sections: Overview, Products, Add Product, Orders, Inventory, Sales, Profile', async () => {
      renderDashboardLayout({ initialRoute: '/seller' });

      // Verify sidebar navigation container
      const sidebar = await screen.findByTestId('dashboard-sidebar');
      expect(sidebar).toBeInTheDocument();

      // 1. Overview
      const overviewLink = screen.getByTestId('sidebar-nav-overview');
      expect(overviewLink).toBeInTheDocument();
      expect(overviewLink).toHaveTextContent(/Overview/i);
      expect(overviewLink).toHaveAttribute('href', '/seller');

      // 2. Products
      const productsLink = screen.getByTestId('sidebar-nav-products');
      expect(productsLink).toBeInTheDocument();
      expect(productsLink).toHaveTextContent(/Products/i);
      expect(productsLink).toHaveAttribute('href', '/seller/products');

      // 3. Add Product
      const addProductLink = screen.getByTestId('sidebar-nav-add-product');
      expect(addProductLink).toBeInTheDocument();
      expect(addProductLink).toHaveTextContent(/Add Product/i);
      expect(addProductLink).toHaveAttribute('href', '/seller/products/new');

      // 4. Orders
      const ordersLink = screen.getByTestId('sidebar-nav-orders');
      expect(ordersLink).toBeInTheDocument();
      expect(ordersLink).toHaveTextContent(/Orders/i);
      expect(ordersLink).toHaveAttribute('href', '/seller/orders');

      // 5. Inventory
      const inventoryLink = screen.getByTestId('sidebar-nav-inventory');
      expect(inventoryLink).toBeInTheDocument();
      expect(inventoryLink).toHaveTextContent(/Inventory/i);
      expect(inventoryLink).toHaveAttribute('href', '/seller/inventory');

      // 6. Sales
      const salesLink = screen.getByTestId('sidebar-nav-sales');
      expect(salesLink).toBeInTheDocument();
      expect(salesLink).toHaveTextContent(/Sales/i);
      expect(salesLink).toHaveAttribute('href', '/seller/sales');

      // 7. Profile
      const profileLink = screen.getByTestId('sidebar-nav-profile');
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveTextContent(/Profile/i);
      expect(profileLink).toHaveAttribute('href', '/seller/profile');

      // 8. Logout Button (Figma Section 13)
      const logoutBtn = screen.getByTestId('sidebar-logout-button');
      expect(logoutBtn).toBeInTheDocument();
      expect(logoutBtn).toHaveTextContent(/Logout/i);
    });

    it('highlights the active section with aria-current="page"', async () => {
      renderDashboardLayout({ initialRoute: '/seller/inventory' });

      await screen.findByTestId('page-inventory');

      const inventoryLink = screen.getByTestId('sidebar-nav-inventory');
      expect(inventoryLink).toHaveAttribute('aria-current', 'page');

      const overviewLink = screen.getByTestId('sidebar-nav-overview');
      expect(overviewLink).not.toHaveAttribute('aria-current', 'page');
    });
  });

  describe('2. Navigation Between Sections', () => {
    it('navigates from Overview to Products, Orders, and Profile when sidebar links are clicked', async () => {
      const user = userEvent.setup();
      renderDashboardLayout({ initialRoute: '/seller' });

      expect(await screen.findByTestId('page-overview')).toBeInTheDocument();

      // Click Products
      await user.click(screen.getByTestId('sidebar-nav-products'));
      expect(await screen.findByTestId('page-products')).toBeInTheDocument();

      // Click Orders
      await user.click(screen.getByTestId('sidebar-nav-orders'));
      expect(await screen.findByTestId('page-orders')).toBeInTheDocument();

      // Click Profile
      await user.click(screen.getByTestId('sidebar-nav-profile'));
      expect(await screen.findByTestId('page-profile')).toBeInTheDocument();
    });
  });

  describe('3. Responsive Mobile Sidebar Drawer', () => {
    it('toggles mobile sidebar drawer when hamburger toggle button is clicked', async () => {
      const user = userEvent.setup();
      renderDashboardLayout({ initialRoute: '/seller' });

      const toggleBtn = await screen.findByTestId('sidebar-toggle-button');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(toggleBtn).toHaveTextContent('☰');

      // Backdrop not shown initially
      expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();

      // Click toggle to open drawer
      await user.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(toggleBtn).toHaveTextContent('✕');

      // Backdrop should now be visible
      const backdrop = await screen.findByTestId('sidebar-backdrop');
      expect(backdrop).toBeInTheDocument();

      // Click backdrop to close drawer
      await user.click(backdrop);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
    });

    it('closes mobile drawer when pressing Escape key', async () => {
      const user = userEvent.setup();
      renderDashboardLayout({ initialRoute: '/seller' });

      const toggleBtn = await screen.findByTestId('sidebar-toggle-button');
      await user.click(toggleBtn);

      expect(await screen.findByTestId('sidebar-backdrop')).toBeInTheDocument();

      // Press Escape
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(
          screen.queryByTestId('sidebar-backdrop')
        ).not.toBeInTheDocument();
      });
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes mobile drawer after clicking a navigation link', async () => {
      const user = userEvent.setup();
      renderDashboardLayout({ initialRoute: '/seller' });

      const toggleBtn = await screen.findByTestId('sidebar-toggle-button');
      await user.click(toggleBtn);

      expect(await screen.findByTestId('sidebar-backdrop')).toBeInTheDocument();

      // Click a link
      await user.click(screen.getByTestId('sidebar-nav-sales'));

      await waitFor(() => {
        expect(
          screen.queryByTestId('sidebar-backdrop')
        ).not.toBeInTheDocument();
      });
      expect(await screen.findByTestId('page-sales')).toBeInTheDocument();
    });
  });

  describe('4. Locked State for Unapproved Sellers (FE-064 / AUTH-03)', () => {
    it('shows locked indicator on Add Product link when seller is pending approval', async () => {
      renderDashboardLayout({ initialRoute: '/seller', user: pendingSeller });

      const addProductLink = await screen.findByTestId(
        'sidebar-nav-add-product'
      );
      expect(addProductLink).toBeInTheDocument();

      const lockedBadge = screen.getByTestId('sidebar-locked-badge');
      expect(lockedBadge).toBeInTheDocument();
      expect(lockedBadge).toHaveTextContent(/Locked/i);
    });

    it('does NOT show locked indicator when seller is approved', async () => {
      renderDashboardLayout({ initialRoute: '/seller', user: approvedSeller });

      await screen.findByTestId('dashboard-sidebar');
      expect(
        screen.queryByTestId('sidebar-locked-badge')
      ).not.toBeInTheDocument();
    });
  });

  describe('5. Header & Session Termination Controls (AUTH-05)', () => {
    it('renders dashboard header with user name, status badge, marketplace link, and profile link', async () => {
      renderDashboardLayout({ initialRoute: '/seller', user: approvedSeller });

      expect(await screen.findByText('Tanimu Produce Hub')).toBeInTheDocument();
      expect(
        screen.getByTestId('header-seller-status-badge')
      ).toHaveTextContent(/Verified Seller/i);
      expect(screen.getByTestId('header-profile-link')).toHaveAttribute(
        'href',
        '/seller/profile'
      );
      expect(screen.getByTestId('header-marketplace-link')).toHaveAttribute(
        'href',
        '/'
      );
    });

    it('terminates session and logs out when sidebar Logout button is clicked', async () => {
      const user = userEvent.setup();
      renderDashboardLayout({ initialRoute: '/seller', user: approvedSeller });

      const logoutBtn = await screen.findByTestId('sidebar-logout-button');
      await user.click(logoutBtn);

      await waitFor(() => {
        expect(localStorage.getItem(STORAGE_TOKEN_KEY)).toBeNull();
      });
      expect(localStorage.getItem(STORAGE_USER_KEY)).toBeNull();
    });

    it('terminates session when header Sign Out button is clicked', async () => {
      const user = userEvent.setup();
      renderDashboardLayout({ initialRoute: '/seller', user: approvedSeller });

      const headerSignOutBtn = await screen.findByTestId(
        'header-signout-button'
      );
      await user.click(headerSignOutBtn);

      await waitFor(() => {
        expect(localStorage.getItem(STORAGE_TOKEN_KEY)).toBeNull();
      });
      expect(localStorage.getItem(STORAGE_USER_KEY)).toBeNull();
    });
  });
});
