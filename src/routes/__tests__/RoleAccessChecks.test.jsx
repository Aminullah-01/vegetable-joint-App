import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider, CartProvider, ToastProvider } from '../../context';
import { AppRoutes } from '../AppRoutes';
import { authService, tokenStorage } from '../../services';
import { mockSwitch } from '../../services/mockSwitch';
import { mockStore } from '../../data/mockStore';
import { ROUTES } from '../routeConfig';
import { getPostLoginRedirect, isRoleAllowed } from '../navigationHelpers';
import { STRINGS } from '../../constants';

/**
 * Test Persona Fixtures conforming to SRS §3, AUTH-07, and TC-28
 */
const mockBuyerUser = {
  id: 6,
  name: 'Amina Bello',
  email: 'buyer@example.com',
  role: 'buyer',
  status: 'active',
};

const mockSellerUser = {
  id: 2,
  name: 'Ibrahim Danladi',
  email: 'seller@arewafarms.ng',
  role: 'seller',
  status: 'active',
};

const mockAdminUser = {
  id: 1,
  name: 'Platform Administrator',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active',
};

/**
 * Sets up auth token, localStorage, and mock services before rendering.
 */
function setupRoleAuth(currentUser) {
  if (currentUser) {
    localStorage.setItem('vegetable_joint_user', JSON.stringify(currentUser));
    localStorage.setItem('vegetable_joint_token', 'mock-jwt-token');
    tokenStorage.setToken('mock-jwt-token');
    mockStore.currentUser = { ...currentUser };
    vi.spyOn(authService, 'getProfile').mockResolvedValue({ ...currentUser });
  } else {
    localStorage.removeItem('vegetable_joint_user');
    localStorage.removeItem('vegetable_joint_token');
    tokenStorage.revokeOnLogout();
    mockStore.currentUser = null;
    vi.spyOn(authService, 'getProfile').mockResolvedValue(null);
  }
}

/**
 * Harness component with full application router, layouts, and auth contexts.
 */
function RoleTestApp({ initialEntries = ['/'] }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <AppRoutes />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

RoleTestApp.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
};

function renderRoleApp({ initialEntries = ['/'], currentUser = null } = {}) {
  setupRoleAuth(currentUser);
  return render(<RoleTestApp initialEntries={initialEntries} />);
}

describe('FE-117: Role access checks in the UI (TC-28, AUTH-07)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockSwitch.setMockMode(true);
    mockStore.reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    mockSwitch.reset();
    tokenStorage.revokeOnLogout();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. TC-28: Buyer Cannot Open /seller Dashboard Routes
  // ===========================================================================
  describe('1. TC-28: Buyer Cannot Open /seller Dashboard Routes', () => {
    it('blocks authenticated buyer from opening /seller root and redirects to /403 Forbidden', async () => {
      renderRoleApp({
        initialEntries: ['/seller'],
        currentUser: mockBuyerUser,
      });

      // 403 Forbidden page is rendered
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(STRINGS.ERRORS.FORBIDDEN_403_MESSAGE)
      ).toBeInTheDocument();

      // User role identification without technical path leaks (ERR-04)
      const forbiddenRegion = screen.getByRole('region', {
        name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
      });
      expect(
        within(forbiddenRegion).getByText(/Signed in as/i)
      ).toBeInTheDocument();
      expect(
        within(forbiddenRegion).getByText('Amina Bello')
      ).toBeInTheDocument();
      expect(
        within(forbiddenRegion).getByText(/\(buyer\)/i)
      ).toBeInTheDocument();

      // Seller dashboard content must NEVER be rendered
      expect(
        screen.queryByRole('heading', { level: 1, name: /Seller Overview/i })
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-sidebar')).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId('navbar')).queryByText('Seller Portal')
      ).not.toBeInTheDocument();
    }, 15000);

    it('blocks authenticated buyer from opening nested /seller/products route', async () => {
      renderRoleApp({
        initialEntries: ['/seller/products'],
        currentUser: mockBuyerUser,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      expect(screen.queryByText(/My Produce Catalog/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('add-product-btn')).not.toBeInTheDocument();
    }, 15000);

    it('blocks authenticated buyer from opening nested /seller/orders route', async () => {
      renderRoleApp({
        initialEntries: ['/seller/orders'],
        currentUser: mockBuyerUser,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Incoming Customer Orders/i)
      ).not.toBeInTheDocument();
    }, 15000);

    it('blocks authenticated buyer from opening nested /seller/inventory, /seller/sales, and /seller/profile', async () => {
      const { unmount } = renderRoleApp({
        initialEntries: ['/seller/inventory'],
        currentUser: mockBuyerUser,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      unmount();

      // Check /seller/sales
      const { unmount: unmountSales } = renderRoleApp({
        initialEntries: ['/seller/sales'],
        currentUser: mockBuyerUser,
      });
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      unmountSales();

      // Check /seller/profile
      renderRoleApp({
        initialEntries: ['/seller/profile'],
        currentUser: mockBuyerUser,
      });
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
    }, 15000);
  });

  // ===========================================================================
  // 2. TC-28: Buyer Cannot Open /admin Dashboard Routes
  // ===========================================================================
  describe('2. TC-28: Buyer Cannot Open /admin Dashboard Routes', () => {
    it('blocks authenticated buyer from opening /admin root and redirects to /403 Forbidden', async () => {
      renderRoleApp({ initialEntries: ['/admin'], currentUser: mockBuyerUser });

      // 403 Forbidden page is rendered
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(STRINGS.ERRORS.FORBIDDEN_403_MESSAGE)
      ).toBeInTheDocument();
      const forbiddenRegion = screen.getByRole('region', {
        name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
      });
      expect(
        within(forbiddenRegion).getByText(/Signed in as/i)
      ).toBeInTheDocument();
      expect(
        within(forbiddenRegion).getByText('Amina Bello')
      ).toBeInTheDocument();
      expect(
        within(forbiddenRegion).getByText(/\(buyer\)/i)
      ).toBeInTheDocument();

      // Admin dashboard content must NEVER be rendered
      expect(
        screen.queryByRole('heading', { level: 1, name: /Admin Overview/i })
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-sidebar')).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId('navbar')).queryByText('Admin Portal')
      ).not.toBeInTheDocument();
    }, 15000);

    it('blocks authenticated buyer from opening nested /admin/sellers moderation route', async () => {
      renderRoleApp({
        initialEntries: ['/admin/sellers'],
        currentUser: mockBuyerUser,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      expect(screen.queryByTestId('sellers-table')).not.toBeInTheDocument();
    }, 15000);

    it('blocks authenticated buyer from opening nested /admin/categories management route', async () => {
      renderRoleApp({
        initialEntries: ['/admin/categories'],
        currentUser: mockBuyerUser,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      expect(screen.queryByTestId('categories-table')).not.toBeInTheDocument();
    }, 15000);

    it('blocks authenticated buyer from opening nested /admin/users, /admin/products, and /admin/settings', async () => {
      const { unmount } = renderRoleApp({
        initialEntries: ['/admin/users'],
        currentUser: mockBuyerUser,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      unmount();

      // Check /admin/products
      const { unmount: unmountProducts } = renderRoleApp({
        initialEntries: ['/admin/products'],
        currentUser: mockBuyerUser,
      });
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      unmountProducts();

      // Check /admin/settings
      renderRoleApp({
        initialEntries: ['/admin/settings'],
        currentUser: mockBuyerUser,
      });
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
    }, 15000);
  });

  // ===========================================================================
  // 3. AUTH-07: Full Role Authorization Boundaries & Symmetry
  // ===========================================================================
  describe('3. AUTH-07: Full Role Authorization Boundaries & Symmetry', () => {
    it('blocks authenticated seller from opening /admin routes and redirects to /403 Forbidden', async () => {
      renderRoleApp({
        initialEntries: ['/admin'],
        currentUser: mockSellerUser,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      const forbiddenRegion = screen.getByRole('region', {
        name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
      });
      expect(
        within(forbiddenRegion).getByText(/Signed in as/i)
      ).toBeInTheDocument();
      expect(
        within(forbiddenRegion).getByText('Ibrahim Danladi')
      ).toBeInTheDocument();
      expect(
        within(forbiddenRegion).getByText(/\(seller\)/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { level: 1, name: /Admin Overview/i })
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-sidebar')).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId('navbar')).queryByText('Admin Portal')
      ).not.toBeInTheDocument();
    }, 15000);

    it('blocks authenticated seller from opening buyer-only /checkout route', async () => {
      renderRoleApp({
        initialEntries: ['/checkout'],
        currentUser: mockSellerUser,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('checkout-shipping-section')
      ).not.toBeInTheDocument();
    }, 15000);

    it('redirects unauthenticated guest visiting /seller or /admin to /login', async () => {
      const { unmount } = renderRoleApp({
        initialEntries: ['/seller'],
        currentUser: null,
      });

      // Redirected to Login page
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /Sign In to Vegetable Joint/i,
        })
      ).toBeInTheDocument();
      unmount();

      // Guest visiting /admin
      renderRoleApp({ initialEntries: ['/admin'], currentUser: null });
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /Sign In to Vegetable Joint/i,
        })
      ).toBeInTheDocument();
    }, 15000);

    it('allows authenticated buyer to access permitted buyer routes (/orders, /account/profile)', async () => {
      const { unmount } = renderRoleApp({
        initialEntries: ['/account/profile'],
        currentUser: mockBuyerUser,
      });

      // Profile loads without 403 error
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.PROFILE.TITLE,
        })
      ).toBeInTheDocument();
      expect(
        screen.queryByText(STRINGS.ERRORS.FORBIDDEN_403_TITLE)
      ).not.toBeInTheDocument();
      unmount();

      // My Orders loads for buyer
      renderRoleApp({
        initialEntries: ['/account/orders'],
        currentUser: mockBuyerUser,
      });
      expect(await screen.findByTestId('my-orders-page')).toBeInTheDocument();
    }, 15000);
  });

  // ===========================================================================
  // 4. UI Navigation Links Scoping (AUTH-07, UI-07)
  // ===========================================================================
  describe('4. UI Navigation Links Scoping (AUTH-07, UI-07)', () => {
    it('buyer view: renders buyer navigation links but strictly hides seller and admin portal links', async () => {
      renderRoleApp({ initialEntries: ['/'], currentUser: mockBuyerUser });

      const navbar = await screen.findByTestId('navbar');
      expect(navbar).toBeInTheDocument();

      // Buyer-specific link is displayed
      expect(within(navbar).getByText('My Orders')).toBeInTheDocument();

      // Unauthorized portal links MUST NOT be rendered
      expect(
        within(navbar).queryByText('Seller Portal')
      ).not.toBeInTheDocument();
      expect(
        within(navbar).queryByText('Admin Portal')
      ).not.toBeInTheDocument();
    }, 15000);

    it('seller view: renders seller portal link but hides admin portal and buyer orders', async () => {
      renderRoleApp({ initialEntries: ['/'], currentUser: mockSellerUser });

      const navbar = await screen.findByTestId('navbar');
      expect(navbar).toBeInTheDocument();

      // Seller portal link is present
      expect(within(navbar).getByText('Seller Portal')).toBeInTheDocument();

      // Unauthorized links are hidden
      expect(
        within(navbar).queryByText('Admin Portal')
      ).not.toBeInTheDocument();
      expect(within(navbar).queryByText('My Orders')).not.toBeInTheDocument();
    }, 15000);

    it('admin view: renders admin portal link but hides seller portal and buyer orders', async () => {
      renderRoleApp({ initialEntries: ['/'], currentUser: mockAdminUser });

      const navbar = await screen.findByTestId('navbar');
      expect(navbar).toBeInTheDocument();

      // Admin portal link is present
      expect(within(navbar).getByText('Admin Portal')).toBeInTheDocument();

      // Other portal links are hidden
      expect(
        within(navbar).queryByText('Seller Portal')
      ).not.toBeInTheDocument();
      expect(within(navbar).queryByText('My Orders')).not.toBeInTheDocument();
    }, 15000);

    it('guest view: hides all role dashboard links and renders login/register options', async () => {
      renderRoleApp({ initialEntries: ['/'], currentUser: null });

      const navbar = await screen.findByTestId('navbar');
      expect(navbar).toBeInTheDocument();

      // Public auth links are visible
      expect(within(navbar).getByText(/Sign In/i)).toBeInTheDocument();
      expect(within(navbar).getByText(/Register/i)).toBeInTheDocument();

      // No protected dashboards shown
      expect(
        within(navbar).queryByText('Seller Portal')
      ).not.toBeInTheDocument();
      expect(
        within(navbar).queryByText('Admin Portal')
      ).not.toBeInTheDocument();
      expect(within(navbar).queryByText('My Orders')).not.toBeInTheDocument();
    }, 15000);
  });

  // ===========================================================================
  // 5. Forbidden Page Escape & Recovery Actions (ERR-04)
  // ===========================================================================
  describe('5. Forbidden Page Escape & Recovery Actions (ERR-04)', () => {
    it('allows buyer on /403 page to safely return to marketplace via View Marketplace link', async () => {
      const user = userEvent.setup();

      renderRoleApp({
        initialEntries: ['/seller'],
        currentUser: mockBuyerUser,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();

      const marketplaceLink = screen.getByRole('link', {
        name: new RegExp(STRINGS.NAV.VIEW_MARKETPLACE, 'i'),
      });
      expect(marketplaceLink).toBeInTheDocument();
      await user.click(marketplaceLink);

      // Returns to public homepage
      expect(
        await screen.findByText(
          /Fresh Vegetables, Directly from Verified Sellers/i
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByText(STRINGS.ERRORS.FORBIDDEN_403_TITLE)
      ).not.toBeInTheDocument();
    }, 15000);

    it('allows buyer on /403 page to switch accounts via Sign Out button', async () => {
      const user = userEvent.setup();

      renderRoleApp({ initialEntries: ['/admin'], currentUser: mockBuyerUser });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: STRINGS.ERRORS.FORBIDDEN_403_TITLE,
        })
      ).toBeInTheDocument();

      const signOutBtn = screen.getByRole('button', {
        name: /Sign Out \/ Switch Account/i,
      });
      expect(signOutBtn).toBeInTheDocument();
      await user.click(signOutBtn);

      // Auth state is wiped
      await waitFor(() => {
        expect(localStorage.getItem('vegetable_joint_token')).toBeNull();
      });
      expect(localStorage.getItem('vegetable_joint_user')).toBeNull();
    }, 15000);
  });

  // ===========================================================================
  // 6. Post-Login Role Redirection Security Guard (AUTH-07, TC-28)
  // ===========================================================================
  describe('6. Post-Login Role Redirection Security Guard (AUTH-07, TC-28)', () => {
    it('prevents buyer from landing on seller or admin paths via post-login redirect', () => {
      expect(getPostLoginRedirect('buyer', '/seller')).toBe(ROUTES.HOME);
      expect(getPostLoginRedirect('buyer', '/seller/products')).toBe(
        ROUTES.HOME
      );
      expect(getPostLoginRedirect('buyer', '/admin')).toBe(ROUTES.HOME);
      expect(getPostLoginRedirect('buyer', '/admin/settings')).toBe(
        ROUTES.HOME
      );

      // Normal buyer destinations preserved
      expect(getPostLoginRedirect('buyer', '/account/orders')).toBe(
        '/account/orders'
      );
      expect(getPostLoginRedirect('buyer', '/account/profile')).toBe(
        '/account/profile'
      );
    });

    it('prevents seller from landing on admin portal or buyer checkout via post-login redirect', () => {
      expect(getPostLoginRedirect('seller', '/admin')).toBe(
        ROUTES.SELLER_OVERVIEW
      );
      expect(getPostLoginRedirect('seller', '/admin/sellers')).toBe(
        ROUTES.SELLER_OVERVIEW
      );
      expect(getPostLoginRedirect('seller', '/checkout')).toBe(
        ROUTES.SELLER_OVERVIEW
      );

      // Normal seller destinations preserved
      expect(getPostLoginRedirect('seller', '/seller/products')).toBe(
        '/seller/products'
      );
    });

    it('prevents admin from landing on seller portal or buyer checkout via post-login redirect', () => {
      expect(getPostLoginRedirect('admin', '/seller')).toBe(
        ROUTES.ADMIN_OVERVIEW
      );
      expect(getPostLoginRedirect('admin', '/checkout')).toBe(
        ROUTES.ADMIN_OVERVIEW
      );

      // Normal admin destinations preserved
      expect(getPostLoginRedirect('admin', '/admin/users')).toBe(
        '/admin/users'
      );
    });

    it('evaluates isRoleAllowed correctly across roles (AUTH-07, TC-28)', () => {
      // Buyer allowed on buyer routes, disallowed on seller & admin
      expect(isRoleAllowed('buyer', ['buyer'])).toBe(true);
      expect(isRoleAllowed('buyer', ['seller'])).toBe(false);
      expect(isRoleAllowed('buyer', ['admin'])).toBe(false);

      // Seller allowed on seller routes, disallowed on admin & buyer
      expect(isRoleAllowed('seller', ['seller'])).toBe(true);
      expect(isRoleAllowed('seller', ['admin'])).toBe(false);
      expect(isRoleAllowed('seller', ['buyer'])).toBe(false);

      // Admin allowed on admin routes, disallowed on seller & buyer
      expect(isRoleAllowed('admin', ['admin'])).toBe(true);
      expect(isRoleAllowed('admin', ['seller'])).toBe(false);

      // Public / unrestricted routes
      expect(isRoleAllowed('buyer', [])).toBe(true);
      expect(isRoleAllowed('seller', undefined)).toBe(true);
    });
  });
});
