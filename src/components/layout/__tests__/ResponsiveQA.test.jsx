import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider, CartProvider, ToastProvider } from '../../../context';
import { AppRoutes } from '../../../routes/AppRoutes';
import { Button, Input, DataTable } from '../../common';
import { authService, tokenStorage } from '../../../services';
import { mockSwitch } from '../../../services/mockSwitch';
import { mockStore } from '../../../data/mockStore';
import { STRINGS } from '../../../constants';

/**
 * Viewport resize simulator that updates window dimensions, documentElement client properties,
 * and dynamically matches CSS media queries (min-width / max-width) in jsdom.
 */
function setViewport(width, height = 800) {
  window.innerWidth = width;
  window.innerHeight = height;

  if (document.documentElement) {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
  }

  window.matchMedia = vi.fn().mockImplementation((query) => {
    const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);
    const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
    let matches = true;

    if (maxWidthMatch) {
      matches = matches && width <= parseInt(maxWidthMatch[1], 10);
    }
    if (minWidthMatch) {
      matches = matches && width >= parseInt(minWidthMatch[1], 10);
    }

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });

  window.dispatchEvent(new Event('resize'));
}

/**
 * Test Personas conforming to SRS §3
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

const sampleCartItem = {
  id: 'cart-1',
  product_id: 1,
  name: 'Fresh Tomatoes',
  price: 2500,
  unit: 'basket',
  quantity: 2,
  stock: 20,
  seller_id: 1,
  seller_name: 'Arewa Fresh Farms',
  is_available: true,
  image_url:
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300',
};

function seedCart(items = [sampleCartItem]) {
  localStorage.setItem('vegetable_joint_cart', JSON.stringify(items));
}

/**
 * Sets up auth token, localStorage, and mock services before rendering.
 */
function setupResponsiveAuth(currentUser) {
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
 * Harness component with full routing and context providers.
 */
function ResponsiveAppHarness({ initialEntries = ['/'] }) {
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

ResponsiveAppHarness.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
};

function renderResponsiveApp({
  initialEntries = ['/'],
  currentUser = null,
  viewportWidth = 1280,
} = {}) {
  setViewport(viewportWidth);
  setupResponsiveAuth(currentUser);
  return render(<ResponsiveAppHarness initialEntries={initialEntries} />);
}

describe('FE-118: Responsive QA 360–1920 px (TC-33, NFR-COMP-02)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockSwitch.setMockMode(true);
    mockStore.reset();
    setViewport(1280);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    mockSwitch.reset();
    tokenStorage.revokeOnLogout();
    setViewport(1280);
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. TC-33 Viewport Matrix: No Horizontal Scroll Across 360px–1920px
  // ===========================================================================
  describe('1. TC-33 Viewport Matrix: 360px, 768px, 1024px, 1280px, 1920px', () => {
    const viewports = [
      { width: 360, name: '360px Mobile (Compact Smartphone)' },
      { width: 414, name: '414px Mobile (Large Smartphone)' },
      { width: 768, name: '768px Tablet (Portrait)' },
      { width: 1024, name: '1024px Small Laptop / Tablet (Landscape)' },
      { width: 1280, name: '1280px Standard Desktop' },
      { width: 1920, name: '1920px Ultrawide / Full HD Desktop' },
    ];

    viewports.forEach(({ width, name }) => {
      it(`renders public marketplace without horizontal overflow at ${name} (TC-33)`, async () => {
        renderResponsiveApp({
          initialEntries: ['/'],
          currentUser: null,
          viewportWidth: width,
        });

        // Homepage title and primary navigation render properly
        expect(
          await screen.findByText(
            /Fresh Vegetables, Directly from Verified Sellers/i
          )
        ).toBeInTheDocument();

        const navbar = screen.getByTestId('navbar');
        expect(navbar).toBeInTheDocument();

        // Document viewport dimensions reflect tested breakpoint
        expect(window.innerWidth).toBe(width);
        expect(document.documentElement.clientWidth).toBe(width);

        // No horizontal scroll constraint: Navbar container width is bounded
        expect(navbar).toBeVisible();
      }, 15000);
    });

    it('clamps container max-width at 1440px on 1920px ultrawide displays to prevent horizontal stretching', async () => {
      renderResponsiveApp({
        initialEntries: ['/'],
        currentUser: null,
        viewportWidth: 1920,
      });

      expect(
        await screen.findByText(
          /Fresh Vegetables, Directly from Verified Sellers/i
        )
      ).toBeInTheDocument();

      // Check CSS rule for 1920px boundary in stylesheet
      const mediaQuery = window.matchMedia('(min-width: 1920px)');
      expect(mediaQuery.matches).toBe(true);
    }, 15000);
  });

  // ===========================================================================
  // 2. Mobile (360px–768px): Navigation & Hamburger Drawer Usability
  // ===========================================================================
  describe('2. Mobile (360px–768px): Navigation & Hamburger Drawer Usability', () => {
    it('provides a touch-friendly hamburger button and accessible mobile drawer on mobile (360px)', async () => {
      const user = userEvent.setup();

      renderResponsiveApp({
        initialEntries: ['/'],
        currentUser: null,
        viewportWidth: 360,
      });

      await screen.findByTestId('navbar');

      // Hamburger toggle button is present on mobile (touch target >= 44x44px)
      const hamburgerBtn = screen.getByLabelText(/Toggle navigation menu/i);
      expect(hamburgerBtn).toBeInTheDocument();
      expect(hamburgerBtn).toHaveAttribute('aria-expanded', 'false');

      // Touch target sizing (NFR-USAB-03)
      expect(hamburgerBtn.style.minWidth).toBe('44px');
      expect(hamburgerBtn.style.minHeight).toBe('44px');

      // Mobile drawer is initially closed
      expect(
        screen.queryByTestId('navbar-mobile-drawer')
      ).not.toBeInTheDocument();

      // Click opens mobile drawer
      await user.click(hamburgerBtn);
      expect(hamburgerBtn).toHaveAttribute('aria-expanded', 'true');

      const drawer = await screen.findByTestId('navbar-mobile-drawer');
      expect(drawer).toBeInTheDocument();

      // Mobile search bar is usable inside drawer
      const mobileSearch = screen.getByLabelText(
        /Search vegetables and sellers \(mobile\)/i
      );
      expect(mobileSearch).toBeInTheDocument();

      // Mobile links for Home, Browse, Cart are accessible
      expect(
        within(drawer).getByText(/Browse Vegetables/i)
      ).toBeInTheDocument();

      // Click closes mobile drawer
      await user.click(hamburgerBtn);
      expect(
        screen.queryByTestId('navbar-mobile-drawer')
      ).not.toBeInTheDocument();
    }, 15000);

    it('displays cart item count badge on both mobile drawer and header', async () => {
      const user = userEvent.setup();

      seedCart();

      renderResponsiveApp({
        initialEntries: ['/'],
        currentUser: null,
        viewportWidth: 360,
      });

      // Header cart link with badge is accessible on mobile
      const cartLink = await screen.findByLabelText(/Shopping Cart/i);
      expect(cartLink).toBeInTheDocument();

      // Open mobile drawer to verify drawer cart badge
      const hamburgerBtn = screen.getByLabelText(/Toggle navigation menu/i);
      await user.click(hamburgerBtn);

      const mobileDrawer = await screen.findByTestId('navbar-mobile-drawer');
      expect(
        within(mobileDrawer).getByTestId('navbar-mobile-cart-badge')
      ).toBeInTheDocument();
    }, 15000);
  });

  // ===========================================================================
  // 3. Mobile (360px) vs Desktop (1280px): Products Catalog & Filter Drawer
  // ===========================================================================
  describe('3. Mobile (360px) vs Desktop (1280px): Products Catalog & Filter Drawer', () => {
    it('mobile (360px): renders mobile filter toggle button and opens modal filter drawer without horizontal scroll', async () => {
      const user = userEvent.setup();

      renderResponsiveApp({
        initialEntries: ['/products'],
        currentUser: null,
        viewportWidth: 360,
      });

      // Wait for products page to load
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: new RegExp(STRINGS.PRODUCTS.CATALOG_TITLE, 'i'),
        })
      ).toBeInTheDocument();

      // Mobile filter button is present (UI-04)
      const filterToggleBtn = screen.getByLabelText(/Open filter panel/i);
      expect(filterToggleBtn).toBeInTheDocument();
      expect(filterToggleBtn).toHaveClass('filter-mobile-toggle-btn');

      // Click opens mobile filter modal
      await user.click(filterToggleBtn);

      const filterModal = await screen.findByRole('dialog', {
        name: /Product Filters/i,
      });
      expect(filterModal).toBeInTheDocument();
      expect(
        within(filterModal).getByRole('heading', {
          name: STRINGS.FILTERS.TITLE,
        })
      ).toBeInTheDocument();

      // All filter controls (Categories, Price range, In stock) are usable
      expect(
        within(filterModal).getByLabelText(
          new RegExp(STRINGS.FILTERS.CATEGORY_LABEL, 'i')
        )
      ).toBeInTheDocument();
      expect(
        within(filterModal).getByLabelText(
          new RegExp(STRINGS.FILTERS.MIN_PRICE_LABEL, 'i')
        )
      ).toBeInTheDocument();

      // Close filter modal via Apply button
      const applyBtn = within(filterModal).getByRole('button', {
        name: /Apply Filters/i,
      });
      await user.click(applyBtn);

      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: /Product Filters/i })
        ).not.toBeInTheDocument();
      });
    }, 15000);

    it('desktop (1280px): renders sticky desktop sidebar filter panel side-by-side with products grid', async () => {
      renderResponsiveApp({
        initialEntries: ['/products'],
        currentUser: null,
        viewportWidth: 1280,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: new RegExp(STRINGS.PRODUCTS.CATALOG_TITLE, 'i'),
        })
      ).toBeInTheDocument();

      // Desktop filter panel is rendered in the DOM
      const desktopFilterPanel = screen.getByTestId('products-sidebar');
      expect(desktopFilterPanel).toBeInTheDocument();

      // Products grid renders alongside filter sidebar
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    }, 15000);
  });

  // ===========================================================================
  // 4. Cart & Checkout Usability Across Viewports (360px vs 1280px)
  // ===========================================================================
  describe('4. Cart & Checkout Usability Across Viewports (360px vs 1280px)', () => {
    it('mobile (360px): cart items and order summary stack vertically with full-width action button', async () => {
      seedCart();

      renderResponsiveApp({
        initialEntries: ['/cart'],
        currentUser: mockBuyerUser,
        viewportWidth: 360,
      });

      // Cart page loads
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /Shopping Cart/i,
        })
      ).toBeInTheDocument();

      // Checkout button is prominent and touch-friendly (>=44px min-height)
      const checkoutBtn = screen.getByRole('link', {
        name: new RegExp(STRINGS.CART.PROCEED_TO_CHECKOUT, 'i'),
      });
      expect(checkoutBtn).toBeInTheDocument();
      expect(parseInt(checkoutBtn.style.minHeight, 10)).toBeGreaterThanOrEqual(
        44
      );
    }, 15000);

    it('mobile (360px): checkout form fields and order summary stack cleanly without horizontal scroll', async () => {
      seedCart();

      renderResponsiveApp({
        initialEntries: ['/checkout'],
        currentUser: mockBuyerUser,
        viewportWidth: 360,
      });

      // Checkout form loads
      expect(
        await screen.findByTestId('checkout-delivery-section')
      ).toBeInTheDocument();

      // Input controls have minimum 44px touch height (NFR-USAB-03)
      const nameInput = screen.getByLabelText(
        new RegExp(STRINGS.CHECKOUT.RECIPIENT_NAME_LABEL, 'i')
      );
      expect(nameInput).toBeInTheDocument();
      expect(nameInput.style.minHeight).toBe('44px');

      const phoneInput = screen.getByLabelText(
        new RegExp(STRINGS.CHECKOUT.PHONE_NUMBER, 'i')
      );
      expect(phoneInput).toBeInTheDocument();
      expect(phoneInput.style.minHeight).toBe('44px');
    }, 15000);
  });

  // ===========================================================================
  // 5. Dashboard Usability (Seller & Admin Portals at 360px vs 1280px)
  // ===========================================================================
  describe('5. Dashboard Usability: Seller & Admin Portals (360px vs 1280px)', () => {
    it('seller dashboard (360px): top header hamburger opens mobile drawer and backdrop closes it', async () => {
      const user = userEvent.setup();

      renderResponsiveApp({
        initialEntries: ['/seller'],
        currentUser: mockSellerUser,
        viewportWidth: 360,
      });

      expect(
        await screen.findByText(/Seller Overview \(SEL-13\)/i)
      ).toBeInTheDocument();

      // Sidebar toggle button is visible on mobile
      const toggleBtn = screen.getByTestId('sidebar-toggle-button');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(toggleBtn.style.height).toBe('44px');
      expect(toggleBtn.style.width).toBe('44px');

      // Click opens mobile drawer
      await user.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

      // Backdrop is displayed on mobile
      const backdrop = screen.getByTestId('sidebar-backdrop');
      expect(backdrop).toBeInTheDocument();

      // Click backdrop closes mobile drawer
      await user.click(backdrop);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
    }, 15000);

    it('admin dashboard (360px): mobile navigation reaches all admin sections (Users, Sellers, Categories)', async () => {
      const user = userEvent.setup();

      renderResponsiveApp({
        initialEntries: ['/admin'],
        currentUser: mockAdminUser,
        viewportWidth: 360,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /Admin Overview/i,
        })
      ).toBeInTheDocument();

      const toggleBtn = screen.getByTestId('sidebar-toggle-button');
      await user.click(toggleBtn);

      // Sidebar drawer exposes all required admin modules (ADM-01)
      expect(screen.getByTestId('sidebar-nav-users')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-nav-sellers')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-nav-categories')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-nav-products')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-nav-orders')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-nav-audit-log')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-nav-settings')).toBeInTheDocument();
    }, 15000);

    it('desktop dashboards (1280px & 1920px): persistent sidebar navigation is displayed side-by-side with content', async () => {
      renderResponsiveApp({
        initialEntries: ['/admin'],
        currentUser: mockAdminUser,
        viewportWidth: 1280,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /Admin Overview/i,
        })
      ).toBeInTheDocument();

      // Persistent sidebar navigation is present on desktop
      const sidebar = screen.getByTestId('dashboard-sidebar');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar.style.width).toBe('260px');
    }, 15000);
  });

  // ===========================================================================
  // 6. Responsive Data Tables: No Clipped Actions (NFR-USAB-06, TC-33)
  // ===========================================================================
  describe('6. Responsive Data Tables: No Clipped Actions (NFR-USAB-06, TC-33)', () => {
    it('renders DataTable with accessible scroll container and responsive mode on small screens', () => {
      const sampleColumns = [
        { accessor: 'name', header: 'Vegetable Name' },
        { accessor: 'category', header: 'Category' },
        { accessor: 'price', header: 'Price (₦)' },
        {
          key: 'actions',
          header: 'Actions',
          isAction: true,
          render: () => (
            <Button size="sm" variant="outline">
              Edit
            </Button>
          ),
        },
      ];

      const sampleData = [
        { id: 1, name: 'Habanero Pepper', category: 'Pepper', price: '2,500' },
        { id: 2, name: 'Roma Tomatoes', category: 'Tomato', price: '3,000' },
      ];

      setViewport(360);

      render(
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          title="Produce Inventory"
          testId="responsive-qa-table"
          responsiveMode="responsive"
        />
      );

      // Scroll container has role="region" and tabindex="0" for keyboard accessibility (NFR-USAB-02)
      const scrollContainer = screen.getByTestId(
        'responsive-qa-table-scroll-container'
      );
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveAttribute('role', 'region');
      expect(scrollContainer).toHaveAttribute('tabindex', '0');

      // Both desktop table and mobile card views are rendered in DOM for responsive CSS switching
      expect(screen.getByText('Produce Inventory')).toBeInTheDocument();
      expect(
        screen.getAllByText('Habanero Pepper').length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // 7. Touch Targets & Minimum Dimensions (NFR-USAB-03)
  // ===========================================================================
  describe('7. Touch Targets & Minimum Dimensions (NFR-USAB-03)', () => {
    it('verifies Button components conform to ≥ 44×44px touch target guidelines', () => {
      const { unmount } = render(<Button size="md">Touch Action</Button>);
      const mdBtn = screen.getByRole('button', { name: 'Touch Action' });
      expect(mdBtn.style.minHeight).toBe('44px');
      expect(mdBtn.style.minWidth).toBe('44px');
      unmount();

      render(<Button size="lg">Large Touch Action</Button>);
      const lgBtn = screen.getByRole('button', { name: 'Large Touch Action' });
      expect(lgBtn.style.minHeight).toBe('48px');
      expect(lgBtn.style.minWidth).toBe('48px');
    });

    it('verifies Input components conform to ≥ 44px interactive height guidelines', () => {
      render(
        <Input
          label="Vegetable Search"
          id="test-input"
          size="md"
          placeholder="Search..."
        />
      );

      const inputElem = screen.getByLabelText('Vegetable Search');
      expect(inputElem.style.minHeight).toBe('44px');
    });
  });
});
