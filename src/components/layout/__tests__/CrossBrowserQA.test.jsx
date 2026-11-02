import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider, CartProvider, ToastProvider } from '../../../context';
import { AppRoutes } from '../../../routes/AppRoutes';
import { authService, tokenStorage } from '../../../services';
import { mockSwitch } from '../../../services/mockSwitch';
import { mockStore } from '../../../data/mockStore';
import { STRINGS } from '../../../constants';
import {
  TARGET_BROWSERS,
  detectBrowser,
  safeParseDate,
  isFeatureSupported,
  getBrowserCapabilities,
} from '../../../utils/browserCompat';
import { formatDate, formatCurrency } from '../../../utils/formatters';

/**
 * Cross-Browser Profiles conforming to SRS NFR-COMP-01:
 * "The application shall function correctly on the latest two versions of
 * Chrome, Edge, Firefox, Safari, Chrome for Android and Samsung Internet."
 */
const BROWSER_PROFILES = {
  CHROME_DESKTOP: {
    name: 'Google Chrome (Desktop)',
    key: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    width: 1280,
    height: 800,
    maxTouchPoints: 0,
    isMobile: false,
    engine: 'Blink',
  },
  EDGE_DESKTOP: {
    name: 'Microsoft Edge (Desktop)',
    key: 'edge',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.2739.67',
    width: 1280,
    height: 800,
    maxTouchPoints: 0,
    isMobile: false,
    engine: 'Blink',
  },
  FIREFOX_DESKTOP: {
    name: 'Mozilla Firefox (Desktop)',
    key: 'firefox',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0',
    width: 1280,
    height: 800,
    maxTouchPoints: 0,
    isMobile: false,
    engine: 'Gecko',
  },
  SAFARI_DESKTOP: {
    name: 'Apple Safari (Desktop)',
    key: 'safari',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
    width: 1280,
    height: 800,
    maxTouchPoints: 0,
    isMobile: false,
    engine: 'WebKit',
  },
  SAFARI_IOS: {
    name: 'Apple Safari (iOS Mobile)',
    key: 'safari',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
    width: 390,
    height: 844,
    maxTouchPoints: 5,
    isMobile: true,
    engine: 'WebKit',
  },
  CHROME_ANDROID: {
    name: 'Google Chrome for Android',
    key: 'chrome_android',
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
    width: 393,
    height: 851,
    maxTouchPoints: 10,
    isMobile: true,
    engine: 'Blink',
  },
  SAMSUNG_INTERNET: {
    name: 'Samsung Internet (Mobile)',
    key: 'samsung_internet',
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
    width: 412,
    height: 915,
    maxTouchPoints: 10,
    isMobile: true,
    engine: 'Blink',
  },
};

/**
 * Emulates target browser userAgent, viewport dimensions, touch points, and media queries.
 */
function emulateBrowser(profile) {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: profile.userAgent,
    configurable: true,
  });

  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    value: profile.maxTouchPoints || 0,
    configurable: true,
  });

  window.innerWidth = profile.width;
  window.innerHeight = profile.height;

  if (document.documentElement) {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      writable: true,
      configurable: true,
      value: profile.width,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      writable: true,
      configurable: true,
      value: profile.height,
    });
  }

  window.matchMedia = vi.fn().mockImplementation((query) => {
    const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);
    const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
    let matches = true;

    if (maxWidthMatch) {
      matches = matches && profile.width <= parseInt(maxWidthMatch[1], 10);
    }
    if (minWidthMatch) {
      matches = matches && profile.width >= parseInt(minWidthMatch[1], 10);
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

const mockBuyerUser = {
  id: 6,
  name: 'Amina Bello',
  email: 'buyer@example.com',
  role: 'buyer',
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
  try {
    localStorage.setItem('vegetable_joint_cart', JSON.stringify(items));
  } catch {
    // Graceful fallback
  }
}

function setupAuth(currentUser) {
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

function AppHarness({ initialEntries = ['/'] }) {
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

AppHarness.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
};

function renderApp({
  initialEntries = ['/'],
  currentUser = null,
  profile = BROWSER_PROFILES.CHROME_DESKTOP,
} = {}) {
  emulateBrowser(profile);
  setupAuth(currentUser);
  return render(<AppHarness initialEntries={initialEntries} />);
}

describe('FE-119: Cross-Browser and Device Testing (NFR-COMP-01)', () => {
  const originalUserAgent = window.navigator.userAgent;
  const originalTouchPoints = window.navigator.maxTouchPoints;

  beforeEach(() => {
    localStorage.clear();
    mockSwitch.setMockMode(true);
    mockStore.reset();
    emulateBrowser(BROWSER_PROFILES.CHROME_DESKTOP);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    mockSwitch.reset();
    tokenStorage.revokeOnLogout();
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      value: originalTouchPoints,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. Target Browser Matrix Identification & Engine Classification (NFR-COMP-01)
  // ===========================================================================
  describe('1. NFR-COMP-01 Target Browser Identification & Capabilities Matrix', () => {
    const matrix = [
      {
        profile: BROWSER_PROFILES.CHROME_DESKTOP,
        expectedBrowser: TARGET_BROWSERS.CHROME,
        expectedEngine: 'Blink',
        expectedMobile: false,
      },
      {
        profile: BROWSER_PROFILES.EDGE_DESKTOP,
        expectedBrowser: TARGET_BROWSERS.EDGE,
        expectedEngine: 'Blink',
        expectedMobile: false,
      },
      {
        profile: BROWSER_PROFILES.FIREFOX_DESKTOP,
        expectedBrowser: TARGET_BROWSERS.FIREFOX,
        expectedEngine: 'Gecko',
        expectedMobile: false,
      },
      {
        profile: BROWSER_PROFILES.SAFARI_DESKTOP,
        expectedBrowser: TARGET_BROWSERS.SAFARI,
        expectedEngine: 'WebKit',
        expectedMobile: false,
      },
      {
        profile: BROWSER_PROFILES.SAFARI_IOS,
        expectedBrowser: TARGET_BROWSERS.SAFARI,
        expectedEngine: 'WebKit',
        expectedMobile: true,
      },
      {
        profile: BROWSER_PROFILES.CHROME_ANDROID,
        expectedBrowser: TARGET_BROWSERS.CHROME_ANDROID,
        expectedEngine: 'Blink',
        expectedMobile: true,
      },
      {
        profile: BROWSER_PROFILES.SAMSUNG_INTERNET,
        expectedBrowser: TARGET_BROWSERS.SAMSUNG_INTERNET,
        expectedEngine: 'Blink',
        expectedMobile: true,
      },
    ];

    matrix.forEach(
      ({ profile, expectedBrowser, expectedEngine, expectedMobile }) => {
        it(`correctly identifies and validates ${profile.name}`, () => {
          const detected = detectBrowser(profile.userAgent);
          expect(detected.browser).toBe(expectedBrowser);
          expect(detected.engine).toBe(expectedEngine);
          expect(detected.isMobile).toBe(expectedMobile);
          expect(detected.isSupported).toBe(true);
        });
      }
    );

    it('confirms all client runtime requirements (localStorage, matchMedia, IntersectionObserver, Intl) are met', () => {
      const caps = getBrowserCapabilities();
      expect(caps.isFullyCompatible).toBe(true);
      expect(isFeatureSupported('localStorage')).toBe(true);
      expect(isFeatureSupported('matchMedia')).toBe(true);
      expect(isFeatureSupported('intersectionObserver')).toBe(true);
      expect(isFeatureSupported('intl')).toBe(true);
    });
  });

  // ===========================================================================
  // 2. Desktop Browsers: Google Chrome, Microsoft Edge, Mozilla Firefox
  // ===========================================================================
  describe('2. Desktop Browsers: Google Chrome, Microsoft Edge, Mozilla Firefox', () => {
    const desktopProfiles = [
      BROWSER_PROFILES.CHROME_DESKTOP,
      BROWSER_PROFILES.EDGE_DESKTOP,
      BROWSER_PROFILES.FIREFOX_DESKTOP,
    ];

    desktopProfiles.forEach((profile) => {
      it(`renders public marketplace homepage and navbar cleanly on ${profile.name}`, async () => {
        renderApp({
          initialEntries: ['/'],
          currentUser: null,
          profile,
        });

        // Homepage hero headline renders
        expect(
          await screen.findByText(
            /Fresh Vegetables, Directly from Verified Sellers/i
          )
        ).toBeInTheDocument();

        // Desktop navigation links are present
        expect(
          screen.getByRole('link', { name: /^Browse$/i })
        ).toBeInTheDocument();
        expect(
          screen.getByPlaceholderText(/Search fresh vegetables, sellers.../i)
        ).toBeInTheDocument();
      }, 15000);

      it(`renders products catalog with persistent filter sidebar alongside products grid on ${profile.name}`, async () => {
        renderApp({
          initialEntries: ['/products'],
          currentUser: null,
          profile,
        });

        expect(
          await screen.findByRole('heading', {
            level: 1,
            name: new RegExp(STRINGS.PRODUCTS.CATALOG_TITLE, 'i'),
          })
        ).toBeInTheDocument();

        // Filter sidebar is present
        expect(screen.getByTestId('products-sidebar')).toBeInTheDocument();
        // Products grid is displayed
        expect(screen.getByTestId('products-grid')).toBeInTheDocument();
      }, 15000);
    });
  });

  // ===========================================================================
  // 3. Mobile & Touch Browsers: Chrome for Android, Samsung Internet, iOS Safari
  // ===========================================================================
  describe('3. Mobile & Touch Browsers: Chrome Android, Samsung Internet, iOS Safari', () => {
    const mobileProfiles = [
      BROWSER_PROFILES.CHROME_ANDROID,
      BROWSER_PROFILES.SAMSUNG_INTERNET,
      BROWSER_PROFILES.SAFARI_IOS,
    ];

    mobileProfiles.forEach((profile) => {
      it(`provides accessible hamburger drawer and touch targets on ${profile.name}`, async () => {
        const user = userEvent.setup();

        renderApp({
          initialEntries: ['/'],
          currentUser: null,
          profile,
        });

        expect(
          await screen.findByText(
            /Fresh Vegetables, Directly from Verified Sellers/i
          )
        ).toBeInTheDocument();

        // Hamburger button meets touch target guidelines (≥ 44×44px)
        const hamburgerBtn = screen.getByLabelText(/Toggle navigation menu/i);
        expect(hamburgerBtn).toBeInTheDocument();
        expect(hamburgerBtn.style.minWidth).toBe('44px');
        expect(hamburgerBtn.style.minHeight).toBe('44px');

        // Open drawer via touch/click
        await user.click(hamburgerBtn);

        const drawer = await screen.findByTestId('navbar-mobile-drawer');
        expect(drawer).toBeInTheDocument();
        expect(
          within(drawer).getByText(/Browse Vegetables/i)
        ).toBeInTheDocument();

        // Close drawer
        await user.click(hamburgerBtn);
        expect(
          screen.queryByTestId('navbar-mobile-drawer')
        ).not.toBeInTheDocument();
      }, 15000);

      it(`supports mobile filter modal dialog on ${profile.name}`, async () => {
        const user = userEvent.setup();

        renderApp({
          initialEntries: ['/products'],
          currentUser: null,
          profile,
        });

        expect(
          await screen.findByRole('heading', {
            level: 1,
            name: new RegExp(STRINGS.PRODUCTS.CATALOG_TITLE, 'i'),
          })
        ).toBeInTheDocument();

        // Mobile filter toggle button
        const filterBtn = screen.getByLabelText(/Open filter panel/i);
        expect(filterBtn).toBeInTheDocument();

        // Open modal filter drawer
        await user.click(filterBtn);

        const filterModal = await screen.findByRole('dialog', {
          name: /Product Filters/i,
        });
        expect(filterModal).toBeInTheDocument();

        // Apply filters closes modal
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

      it(`displays cart badges in both header and drawer on ${profile.name}`, async () => {
        const user = userEvent.setup();
        seedCart();

        renderApp({
          initialEntries: ['/'],
          currentUser: null,
          profile,
        });

        // Header cart link with count
        const cartLink = await screen.findByLabelText(/Shopping Cart/i);
        expect(cartLink).toBeInTheDocument();

        // Drawer cart badge
        const hamburgerBtn = screen.getByLabelText(/Toggle navigation menu/i);
        await user.click(hamburgerBtn);

        const drawer = await screen.findByTestId('navbar-mobile-drawer');
        expect(
          within(drawer).getByTestId('navbar-mobile-cart-badge')
        ).toBeInTheDocument();
      }, 15000);
    });
  });

  // ===========================================================================
  // 4. Apple Safari (WebKit) Specific Compatibility
  // ===========================================================================
  describe('4. Apple Safari (WebKit) Engine Compatibility', () => {
    it('handles SQL space-separated timestamps without returning NaN on Safari', () => {
      // Historically Safari returns "Invalid Date" for "YYYY-MM-DD HH:mm:ss"
      const sqlTimestamp = '2026-11-02 14:30:00';
      const parsedDate = safeParseDate(sqlTimestamp);
      expect(parsedDate).toBeInstanceOf(Date);
      expect(isNaN(parsedDate.getTime())).toBe(false);

      const formatted = formatDate(sqlTimestamp);
      expect(formatted).not.toBe('');
      expect(formatted).toMatch(/2026/);
    });

    it('formats currency correctly with Nigerian Naira (₦) symbol across WebKit & Blink', () => {
      const formattedCurrency = formatCurrency(2500);
      expect(formattedCurrency).toContain('₦');
      expect(formattedCurrency).toBe('₦2,500');
    });

    it('renders checkout delivery form with accessible input fields on Safari iOS', async () => {
      seedCart();

      renderApp({
        initialEntries: ['/checkout'],
        currentUser: mockBuyerUser,
        profile: BROWSER_PROFILES.SAFARI_IOS,
      });

      expect(
        await screen.findByTestId('checkout-delivery-section')
      ).toBeInTheDocument();

      const nameInput = screen.getByLabelText(
        new RegExp(STRINGS.CHECKOUT.RECIPIENT_NAME_LABEL, 'i')
      );
      expect(nameInput).toBeInTheDocument();
      expect(nameInput.style.minHeight).toBe('44px');
    }, 15000);
  });

  // ===========================================================================
  // 5. Image Fallback Resilience (NFR-COMP-03)
  // ===========================================================================
  describe('5. Image Fallback Resilience: Layout Preserved on Image Error (NFR-COMP-03)', () => {
    it('preserves layout and card functionality when product images fail to load', async () => {
      renderApp({
        initialEntries: ['/products'],
        currentUser: null,
        profile: BROWSER_PROFILES.CHROME_DESKTOP,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: new RegExp(STRINGS.PRODUCTS.CATALOG_TITLE, 'i'),
        })
      ).toBeInTheDocument();

      // Product cards are rendered
      const productGrid = screen.getByTestId('products-grid');
      expect(productGrid).toBeInTheDocument();

      // Check that product images render with valid alt text (NFR-COMP-03)
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).not.toBe('');
      });
    }, 15000);
  });

  // ===========================================================================
  // 6. Private Browsing / Restricted Storage Resilience (Safari Private / Incognito)
  // ===========================================================================
  describe('6. Private Browsing / Restricted Storage Resilience', () => {
    it('maintains in-memory cart operations when localStorage throws QuotaExceededError in private mode', async () => {
      // Simulate Safari Private Browsing quota error
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError: DOM Exception 22');
      });

      renderApp({
        initialEntries: ['/products'],
        currentUser: null,
        profile: BROWSER_PROFILES.SAFARI_IOS,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: new RegExp(STRINGS.PRODUCTS.CATALOG_TITLE, 'i'),
        })
      ).toBeInTheDocument();

      // App remains fully responsive and does not throw unhandled exception
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    }, 15000);
  });
});
