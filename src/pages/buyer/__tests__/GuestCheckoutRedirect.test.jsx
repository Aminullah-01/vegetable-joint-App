import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ProtectedRoute } from '../../../routes/ProtectedRoute';
import { Login } from '../../auth/Login';
import { Register } from '../../auth/Register';
import { Checkout } from '../Checkout';
import { Cart } from '../../public/Cart';
import { AuthProvider, CartProvider, ToastProvider } from '../../../context';
import { getPostLoginRedirect } from '../../../routes/navigationHelpers';

const mockProduce = [
  {
    id: 1,
    product_id: 1,
    name: 'Fresh Roma Tomatoes',
    price: 2500,
    unit: 'basket',
    quantity: 3,
    available_stock: 45,
    subtotal: 7500,
    seller_id: 1,
    seller: { id: 1, business_name: 'Arewa Fresh Farms', location: 'Gombe' },
  },
  {
    id: 2,
    product_id: 2,
    name: 'Fresh Scotch Bonnet (Ata Rodo)',
    price: 1800,
    unit: 'basket',
    quantity: 2,
    available_stock: 25,
    subtotal: 3600,
    seller_id: 1,
    seller: { id: 1, business_name: 'Arewa Fresh Farms', location: 'Gombe' },
  },
];

function TestApp({ initialEntries = ['/cart'], preloadedCart = mockProduce }) {
  if (preloadedCart) {
    localStorage.setItem('vegetable_joint_cart', JSON.stringify(preloadedCart));
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/cart" element={<Cart />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<ProtectedRoute allowedRoles={['buyer']} />}>
                <Route path="/checkout" element={<Checkout />} />
              </Route>
              <Route
                path="/seller"
                element={<div>Seller Overview Portal</div>}
              />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

TestApp.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
  preloadedCart: PropTypes.array,
};

describe('Guest Checkout Redirect Keeps Cart (FE-060 / CART-09 / TC-12)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('displays guest checkout hint on Cart page when unauthenticated (CART-09)', async () => {
    render(<TestApp initialEntries={['/cart']} preloadedCart={mockProduce} />);

    expect(await screen.findByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    expect(screen.getByTestId('cart-guest-checkout-hint')).toBeInTheDocument();
    expect(
      screen.getByText(/You will be asked to sign in or register at checkout/i)
    ).toBeInTheDocument();
  });

  it('redirects unauthenticated guest accessing /checkout to /login with checkout notice banner (CART-09, TC-12)', async () => {
    render(
      <TestApp initialEntries={['/checkout']} preloadedCart={mockProduce} />
    );

    // ProtectedRoute redirects guest to /login
    expect(
      await screen.findByRole(
        'heading',
        {
          name: /Sign In to Vegetable Joint/i,
        },
        { timeout: 4000 }
      )
    ).toBeInTheDocument();

    // Verifies guest checkout alert banner is displayed
    const guestNotice = await screen.findByTestId('checkout-guest-notice');
    expect(guestNotice).toBeInTheDocument();
    expect(guestNotice).toHaveTextContent(/Ready to complete your order\?/i);
    expect(guestNotice).toHaveTextContent(
      /Please sign in or register to complete your checkout/i
    );
    expect(guestNotice).toHaveTextContent(
      /Your shopping cart has been preserved/i
    );
  });

  it('preserves cart and redirects back to /checkout after successful buyer login (CART-09, TC-12)', async () => {
    const user = userEvent.setup();

    render(
      <TestApp initialEntries={['/checkout']} preloadedCart={mockProduce} />
    );

    // Wait for login page
    expect(
      await screen.findByTestId('checkout-guest-notice')
    ).toBeInTheDocument();

    // Fill credentials for existing buyer
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    await user.clear(emailInput);
    await user.type(emailInput, 'buyer@example.com');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'password123');
    await user.click(submitBtn);

    // Should redirect back to /checkout and load items intact
    expect(
      await screen.findByRole(
        'heading',
        {
          name: /Checkout & Delivery Details/i,
        },
        { timeout: 4000 }
      )
    ).toBeInTheDocument();

    // Confirm that the guest cart items remain intact
    expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    expect(
      screen.getByText('Fresh Scotch Bonnet (Ata Rodo)')
    ).toBeInTheDocument();
  });

  it('navigates from login to register while keeping checkout redirect state intact', async () => {
    const user = userEvent.setup();

    render(
      <TestApp initialEntries={['/checkout']} preloadedCart={mockProduce} />
    );

    expect(
      await screen.findByTestId('checkout-guest-notice')
    ).toBeInTheDocument();

    // Click "Register now" from Login
    const registerLink = screen.getByTestId('login-register-link');
    await user.click(registerLink);

    // Register page renders and displays checkout notice
    expect(
      await screen.findByRole('heading', { name: /Join Vegetable Joint/i })
    ).toBeInTheDocument();
    const regNotice = screen.getByTestId('checkout-guest-notice');
    expect(regNotice).toBeInTheDocument();
    expect(regNotice).toHaveTextContent(
      /Create an account to complete your checkout/i
    );

    // Click "Sign In" back to Login and confirm notice is still present
    const signinLink = screen.getByTestId('register-login-link');
    await user.click(signinLink);

    expect(
      await screen.findByRole(
        'heading',
        {
          name: /Sign In to Vegetable Joint/i,
        },
        { timeout: 4000 }
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('checkout-guest-notice')).toBeInTheDocument();
  });

  it('allows registering a new buyer and returns to /checkout with cart intact (CART-09, TC-12)', async () => {
    const user = userEvent.setup();

    render(
      <TestApp initialEntries={['/checkout']} preloadedCart={mockProduce} />
    );

    // Click register link from login
    const registerLink = await screen.findByTestId('login-register-link');
    await user.click(registerLink);

    // Fill buyer registration form
    const nameInput = await screen.findByTestId('register-name-input');
    const emailInput = screen.getByTestId('register-email-input');
    const passwordInput = screen.getByTestId('register-password-input');
    const submitBtn = screen.getByTestId('register-submit-btn');

    const randomEmail = `newcustomer_${Date.now()}@example.ng`;
    await user.type(nameInput, 'Fatima Aliyu');
    await user.type(emailInput, randomEmail);
    await user.type(passwordInput, 'securepass123');
    await user.click(submitBtn);

    // Navigates to /checkout after registration
    expect(
      await screen.findByRole(
        'heading',
        {
          name: /Checkout & Delivery Details/i,
        },
        { timeout: 4000 }
      )
    ).toBeInTheDocument();

    // Verify cart items are intact
    expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    expect(
      screen.getByText('Fresh Scotch Bonnet (Ata Rodo)')
    ).toBeInTheDocument();
  });

  it('supports URL redirect parameter (?redirect=/checkout) on Login page', async () => {
    render(
      <TestApp
        initialEntries={['/login?redirect=/checkout']}
        preloadedCart={mockProduce}
      />
    );

    expect(
      await screen.findByTestId('checkout-guest-notice')
    ).toBeInTheDocument();
  });

  it('routes sellers attempting to return to /checkout to their seller dashboard instead', () => {
    // Tests navigation helper logic protecting buyer-only routes
    const sellerDest = getPostLoginRedirect('seller', {
      pathname: '/checkout',
    });
    expect(sellerDest).toBe('/seller');

    const buyerDest = getPostLoginRedirect('buyer', {
      pathname: '/checkout',
    });
    expect(buyerDest).toBe('/checkout');
  });

  it('preserves cart items in localStorage throughout authentication cycle', async () => {
    const user = userEvent.setup();

    render(
      <TestApp initialEntries={['/checkout']} preloadedCart={mockProduce} />
    );

    await screen.findByTestId('checkout-guest-notice');

    // Check localStorage before login
    const storedBefore = JSON.parse(
      localStorage.getItem('vegetable_joint_cart')
    );
    expect(storedBefore).toHaveLength(2);

    // Quick fill credentials and login
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'buyer@example.com');
    await user.clear(passwordInput);
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /Checkout & Delivery Details/i,
        })
      ).toBeInTheDocument();
    });

    // Check localStorage after login
    const storedAfter = JSON.parse(
      localStorage.getItem('vegetable_joint_cart')
    );
    expect(storedAfter).toHaveLength(2);
    expect(storedAfter[0].name).toBe('Fresh Roma Tomatoes');
    expect(storedAfter[1].name).toBe('Fresh Scotch Bonnet (Ata Rodo)');
  });
});
