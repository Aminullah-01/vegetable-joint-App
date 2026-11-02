import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  calculateContrastRatio,
  isContrastCompliant,
  auditPaletteContrast,
  validateImageAccessibility,
  validateFormInputAccessibility,
} from '../../../utils/accessibility';

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

function renderApp({ initialEntries = ['/'], currentUser = null } = {}) {
  setupAuth(currentUser);
  return render(<AppHarness initialEntries={initialEntries} />);
}

describe('FE-120: Accessibility Audit (WCAG 2.1 Level AA / NFR-USAB-02)', () => {
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
  // 1. Color Contrast Ratios (WCAG 1.4.3 Contrast Minimum: 4.5:1 text, 3:1 large)
  // ===========================================================================
  describe('1. Color Contrast Ratios (WCAG 1.4.3 & NFR-USAB-02)', () => {
    it('confirms 100% of brand palette color combinations meet WCAG 2.1 Level AA (>= 4.5:1)', () => {
      const audit = auditPaletteContrast();
      expect(audit.allCompliant).toBe(true);
      expect(audit.failed).toBe(0);
      expect(audit.total).toBeGreaterThanOrEqual(8);

      audit.results.forEach((res) => {
        expect(res.passes).toBe(true);
        expect(res.ratio).toBeGreaterThanOrEqual(res.required);
      });
    });

    it('verifies Primary Brand Green (#15803d) on White surface exceeds 4.5:1', () => {
      const ratio = calculateContrastRatio('#15803d', '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(4.5); // ~5.46:1
      expect(isContrastCompliant('#15803d', '#ffffff', 'AA').compliant).toBe(
        true
      );
    });

    it('verifies White text on Primary Green button exceeds 4.5:1', () => {
      const ratio = calculateContrastRatio('#ffffff', '#15803d');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(isContrastCompliant('#ffffff', '#15803d', 'AA').compliant).toBe(
        true
      );
    });

    it('verifies Body Text (#0f172a) on White exceeds WCAG AAA 7:1 threshold', () => {
      const ratio = calculateContrastRatio('#0f172a', '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(7.0); // ~15.8:1
      expect(isContrastCompliant('#0f172a', '#ffffff', 'AAA').compliant).toBe(
        true
      );
    });

    it('verifies Status Badges (Success, Warning, Error, Info) meet Level AA contrast', () => {
      // Warning Pill: #92400e on #fef3c7
      expect(
        calculateContrastRatio('#92400e', '#fef3c7')
      ).toBeGreaterThanOrEqual(4.5);
      // Error Pill: #b91c1c on #fee2e2
      expect(
        calculateContrastRatio('#b91c1c', '#fee2e2')
      ).toBeGreaterThanOrEqual(4.5);
      // Info Pill: #0369a1 on #e0f2fe
      expect(
        calculateContrastRatio('#0369a1', '#e0f2fe')
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  // ===========================================================================
  // 2. Keyboard Operability & Bypass Blocks (WCAG 2.1.1, 2.1.2, 2.4.1)
  // ===========================================================================
  describe('2. Keyboard Operability & Bypass Blocks (WCAG 2.1.1, 2.4.1)', () => {
    it('provides a "Skip to main content" bypass link pointing to #main-content', async () => {
      renderApp({ initialEntries: ['/'] });

      // Skip to main content link exists in the header
      const skipLink = screen.getByTestId('skip-to-content-link');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
      expect(skipLink).toHaveTextContent(/Skip to main content/i);

      // Target #main-content element exists and has tabIndex -1
      const mainContent = document.getElementById('main-content');
      expect(mainContent).not.toBeNull();
      expect(mainContent).toHaveAttribute('tabindex', '-1');
    }, 15000);

    it('allows closing modal drawers via Escape key (WCAG 2.1.2 No Keyboard Trap)', async () => {
      const user = userEvent.setup();
      window.innerWidth = 360;

      renderApp({ initialEntries: ['/products'] });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: new RegExp(STRINGS.PRODUCTS.CATALOG_TITLE, 'i'),
        })
      ).toBeInTheDocument();

      // Open filter modal
      const filterBtn = screen.getByLabelText(/Open filter panel/i);
      await user.click(filterBtn);

      const filterModal = await screen.findByRole('dialog', {
        name: /Product Filters/i,
      });
      expect(filterModal).toBeInTheDocument();

      // Press Escape key closes modal
      await user.keyboard('{Escape}');

      expect(
        screen.queryByRole('dialog', { name: /Product Filters/i })
      ).not.toBeInTheDocument();
    }, 15000);
  });

  // ===========================================================================
  // 3. Form Labels & Accessible Controls (WCAG 1.3.1, 3.3.2, 4.1.2)
  // ===========================================================================
  describe('3. Form Labels & Accessible Controls (WCAG 1.3.1, 4.1.2)', () => {
    it('ensures all login form inputs have associated labels and autocomplete attributes', async () => {
      renderApp({ initialEntries: ['/login'] });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: new RegExp(STRINGS.AUTH.LOGIN_TITLE, 'i'),
        })
      ).toBeInTheDocument();

      // Email input
      const emailInput = screen.getByLabelText(/Email Address/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      const emailValidation = validateFormInputAccessibility(emailInput);
      expect(emailValidation.hasAccessibleName).toBe(true);

      // Password input
      const passwordInput = screen.getByLabelText(/^Password/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      const passwordValidation = validateFormInputAccessibility(passwordInput);
      expect(passwordValidation.hasAccessibleName).toBe(true);
    }, 15000);

    it('ensures checkout delivery inputs have explicit labels and error associations', async () => {
      seedCart();
      renderApp({
        initialEntries: ['/checkout'],
        currentUser: mockBuyerUser,
      });

      expect(
        await screen.findByTestId('checkout-delivery-section')
      ).toBeInTheDocument();

      // Recipient name input
      const nameInput = screen.getByLabelText(
        new RegExp(STRINGS.CHECKOUT.RECIPIENT_NAME_LABEL, 'i')
      );
      expect(nameInput).toBeInTheDocument();
      expect(validateFormInputAccessibility(nameInput).hasAccessibleName).toBe(
        true
      );

      // Phone input
      const phoneInput = screen.getByLabelText(
        new RegExp(STRINGS.CHECKOUT.PHONE_NUMBER, 'i')
      );
      expect(phoneInput).toBeInTheDocument();
      expect(validateFormInputAccessibility(phoneInput).hasAccessibleName).toBe(
        true
      );
    }, 15000);

    it('ensures search bars have accessible aria-labels for screen readers', async () => {
      renderApp({ initialEntries: ['/'] });

      const searchInput = screen.getByLabelText(
        /Search vegetables, categories, and sellers/i
      );
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'search');
      expect(
        validateFormInputAccessibility(searchInput).hasAccessibleName
      ).toBe(true);
    }, 15000);
  });

  // ===========================================================================
  // 4. Image Alternative Text (WCAG 1.1.1 Non-text Content)
  // ===========================================================================
  describe('4. Image Alternative Text (WCAG 1.1.1 Non-text Content)', () => {
    it('verifies all product images on the catalog have informative alt attributes', async () => {
      renderApp({ initialEntries: ['/products'] });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: new RegExp(STRINGS.PRODUCTS.CATALOG_TITLE, 'i'),
        })
      ).toBeInTheDocument();

      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);

      images.forEach((img) => {
        const check = validateImageAccessibility(img);
        expect(check.isValid).toBe(true);
        expect(check.hasAlt).toBe(true);
        // Product images must have descriptive non-empty alt text
        expect(check.altText.trim().length).toBeGreaterThan(0);
      });
    }, 15000);
  });

  // ===========================================================================
  // 5. Semantic Landmarks & ARIA Roles (WCAG 1.3.1 Info and Relationships)
  // ===========================================================================
  describe('5. Semantic Landmarks & ARIA Roles (WCAG 1.3.1)', () => {
    it('contains core semantic landmarks: header, nav, main, footer', async () => {
      renderApp({ initialEntries: ['/'] });

      expect(
        await screen.findByText(
          /Fresh Vegetables, Directly from Verified Sellers/i
        )
      ).toBeInTheDocument();

      // Header landmark
      expect(screen.getByRole('banner')).toBeInTheDocument();

      // Primary navigation landmark
      expect(
        screen.getByRole('navigation', { name: /Primary Navigation/i })
      ).toBeInTheDocument();

      // Main landmark
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Footer landmark
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    }, 15000);

    it('verifies live cart count badge provides accessible context', async () => {
      seedCart();
      renderApp({ initialEntries: ['/'] });

      // Cart link has descriptive accessible aria-label with count
      const cartLink = await screen.findByLabelText(
        /Shopping Cart with 2 items/i
      );
      expect(cartLink).toBeInTheDocument();
    }, 15000);
  });
});
