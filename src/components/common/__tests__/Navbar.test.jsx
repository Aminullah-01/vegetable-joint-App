import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider, ToastProvider } from '../../../context';
import { Navbar } from '../Navbar';
import { CartContext } from '../../../context/cartContextDef';
import { authService } from '../../../services/authService';

// Wrapper with context providers
function TestWrapper({
  children,
  initialUser = null,
  initialRole = null,
  cartOverrides = null,
}) {
  if (initialUser && initialRole) {
    const userObj = { ...initialUser, role: initialRole };
    localStorage.setItem('vegetable_joint_user', JSON.stringify(userObj));
    localStorage.setItem('vegetable_joint_token', 'mock-token');
    vi.spyOn(authService, 'getProfile').mockResolvedValue(userObj);
  }

  const defaultCartValue = {
    items: [],
    itemCount: 0,
    subtotal: 0,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    getItem: vi.fn(),
  };

  return (
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <CartContext.Provider
            value={
              cartOverrides
                ? { ...defaultCartValue, ...cartOverrides }
                : defaultCartValue
            }
          >
            {children}
          </CartContext.Provider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

TestWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  initialUser: PropTypes.object,
  initialRole: PropTypes.string,
  cartOverrides: PropTypes.object,
};

describe('Navbar Component (FE-022, UI-01, UI-07, CART-07)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Brand, Navigation & Accessibility (UI-01)', () => {
    it('renders logo and application brand linking to homepage', () => {
      render(
        <TestWrapper>
          <Navbar />
        </TestWrapper>
      );

      const brandLogo = screen.getByRole('link', {
        name: /Vegetable Joint Homepage/i,
      });
      expect(brandLogo).toBeInTheDocument();
      expect(brandLogo).toHaveAttribute('href', '/');
    });

    it('renders core marketplace links (Home, Browse, Categories)', () => {
      render(
        <TestWrapper>
          <Navbar />
        </TestWrapper>
      );

      expect(screen.getByRole('link', { name: /^Home$/i })).toHaveAttribute(
        'href',
        '/'
      );
      expect(screen.getByRole('link', { name: /^Browse$/i })).toHaveAttribute(
        'href',
        '/products'
      );
      expect(
        screen.getByRole('button', { name: /Categories/i })
      ).toBeInTheDocument();
    });

    it('toggles category dropdown on click and displays category items', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Navbar />
        </TestWrapper>
      );

      const categoryBtn = screen.getByRole('button', { name: /Categories/i });
      expect(screen.queryByText(/Fresh Categories/i)).not.toBeInTheDocument();

      await user.click(categoryBtn);
      expect(await screen.findByText(/Fresh Categories/i)).toBeInTheDocument();
      expect(screen.getByText(/Tomato/i)).toBeInTheDocument();
      expect(screen.getByText(/Pepper/i)).toBeInTheDocument();

      // Click again closes the dropdown
      await user.click(categoryBtn);
      expect(screen.queryByText(/Fresh Categories/i)).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality (UI-01)', () => {
    it('renders search input with default placeholder and search button', () => {
      render(
        <TestWrapper>
          <Navbar searchPlaceholder="Find fresh crops..." />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Find fresh crops...');
      expect(searchInput).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Submit search/i })
      ).toBeInTheDocument();
    });

    it('invokes custom onSearch callback when submitted', async () => {
      const onSearchMock = vi.fn();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Navbar onSearch={onSearchMock} />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(
        /Search vegetables, categories, and sellers/i
      );
      await user.type(searchInput, 'Fresh Pepper');
      await user.click(screen.getByRole('button', { name: /Submit search/i }));

      expect(onSearchMock).toHaveBeenCalledWith('Fresh Pepper');
    });

    it('displays clear button when input has text and clears on click', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Navbar />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(
        /Search vegetables, categories, and sellers/i
      );
      expect(
        screen.queryByLabelText(/Clear search query/i)
      ).not.toBeInTheDocument();

      await user.type(searchInput, 'Onions');
      const clearBtn = screen.getByLabelText(/Clear search query/i);
      expect(clearBtn).toBeInTheDocument();

      await user.click(clearBtn);
      expect(searchInput.value).toBe('');
      expect(
        screen.queryByLabelText(/Clear search query/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Cart Item Count Indicator (CART-07)', () => {
    it('shows cart link with empty state accessible label when itemCount is 0', () => {
      render(
        <TestWrapper cartOverrides={{ itemCount: 0 }}>
          <Navbar />
        </TestWrapper>
      );

      const cartLink = screen.getByLabelText(/Shopping Cart \(empty\)/i);
      expect(cartLink).toBeInTheDocument();
      expect(cartLink).toHaveAttribute('href', '/cart');
      expect(screen.queryByTestId('navbar-cart-badge')).not.toBeInTheDocument();
    });

    it('displays numeric badge when cart contains items (CART-07)', () => {
      render(
        <TestWrapper cartOverrides={{ itemCount: 5 }}>
          <Navbar />
        </TestWrapper>
      );

      const badge = screen.getByTestId('navbar-cart-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');

      const cartLink = screen.getByLabelText(/Shopping Cart with 5 items/i);
      expect(cartLink).toBeInTheDocument();
    });
  });

  describe('Role-Dependent Navigation & Menus (UI-07)', () => {
    it('displays Sign In and Register for unauthenticated guest, hiding portals', () => {
      render(
        <TestWrapper>
          <Navbar />
        </TestWrapper>
      );

      // Auth controls
      expect(screen.getByRole('link', { name: /^Sign In$/i })).toHaveAttribute(
        'href',
        '/login'
      );
      expect(screen.getByRole('link', { name: /^Register$/i })).toHaveAttribute(
        'href',
        '/register'
      );

      // Restricted portals should NOT be visible to guests
      expect(
        screen.queryByRole('link', { name: /^My Orders$/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /^Seller Portal$/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /^Admin Portal$/i })
      ).not.toBeInTheDocument();
    });

    it('displays Buyer-specific options when logged in as Buyer', async () => {
      const buyerUser = {
        id: 10,
        name: 'Chioma Okeke',
        email: 'chioma@example.com',
      };

      render(
        <TestWrapper initialUser={buyerUser} initialRole="buyer">
          <Navbar />
        </TestWrapper>
      );

      // Should show My Orders in main nav
      expect(
        await screen.findByRole('link', { name: /^My Orders$/i })
      ).toBeInTheDocument();

      // Should NOT show Seller or Admin portals
      expect(
        screen.queryByRole('link', { name: /^Seller Portal$/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /^Admin Portal$/i })
      ).not.toBeInTheDocument();

      // Account menu shows user and role badge
      const accountBtn = screen.getByRole('button', { name: /Chioma Okeke/i });
      expect(accountBtn).toBeInTheDocument();
      expect(screen.getByText('buyer')).toBeInTheDocument();

      // Open account popover
      const user = userEvent.setup();
      await user.click(accountBtn);

      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('displays Seller-specific options when logged in as Seller', async () => {
      const sellerUser = {
        id: 20,
        name: 'Kano Fresh Farm',
        email: 'kano@example.com',
      };

      render(
        <TestWrapper initialUser={sellerUser} initialRole="seller">
          <Navbar />
        </TestWrapper>
      );

      expect(
        await screen.findByRole('link', { name: /^Seller Portal$/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /^Admin Portal$/i })
      ).not.toBeInTheDocument();

      const accountBtn = screen.getByRole('button', {
        name: /Kano Fresh Farm/i,
      });
      expect(accountBtn).toBeInTheDocument();
      expect(screen.getByText('seller')).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(accountBtn);

      expect(screen.getByText('Seller Dashboard')).toBeInTheDocument();
      expect(screen.getByText('My Products')).toBeInTheDocument();
    });

    it('displays Admin-specific options when logged in as Admin', async () => {
      const adminUser = { id: 30, name: 'Super Admin', email: 'admin@vj.ng' };

      render(
        <TestWrapper initialUser={adminUser} initialRole="admin">
          <Navbar />
        </TestWrapper>
      );

      expect(
        await screen.findByRole('link', { name: /^Admin Portal$/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /^Seller Portal$/i })
      ).not.toBeInTheDocument();

      const accountBtn = screen.getByRole('button', { name: /Super Admin/i });
      expect(accountBtn).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(accountBtn);

      expect(screen.getAllByText('Admin Portal').length).toBeGreaterThanOrEqual(
        1
      );
      expect(screen.getByText('Users & Moderation')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness & Hamburger Drawer', () => {
    it('toggles mobile menu drawer when hamburger button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Navbar />
        </TestWrapper>
      );

      const hamburgerBtn = screen.getByLabelText(/Toggle navigation menu/i);
      expect(
        screen.queryByTestId('navbar-mobile-drawer')
      ).not.toBeInTheDocument();

      await user.click(hamburgerBtn);
      expect(screen.getByTestId('navbar-mobile-drawer')).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Search vegetables and sellers \(mobile\)/i)
      ).toBeInTheDocument();

      // Click again closes drawer
      await user.click(hamburgerBtn);
      expect(
        screen.queryByTestId('navbar-mobile-drawer')
      ).not.toBeInTheDocument();
    });
  });
});
