import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Login } from '../Login';
import { AuthProvider, ToastProvider } from '../../../context';
import { authService } from '../../../services/authService';
import { mockStore } from '../../../data/mockStore';
import { STRINGS } from '../../../constants';

function TestLoginApp({ initialEntries = ['/login'] }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<div data-testid="home-page">Home</div>} />
            <Route
              path="/register"
              element={<div data-testid="register-page">Register</div>}
            />
            <Route
              path="/forgot-password"
              element={<div data-testid="forgot-page">Forgot</div>}
            />
            <Route
              path="/seller"
              element={<div data-testid="seller-dashboard">Seller</div>}
            />
            <Route
              path="/admin"
              element={<div data-testid="admin-dashboard">Admin</div>}
            />
            <Route
              path="/checkout"
              element={<div data-testid="checkout-page">Checkout</div>}
            />
            <Route
              path="/products"
              element={<div data-testid="products-page">Products</div>}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

TestLoginApp.propTypes = {
  initialEntries: PropTypes.array,
};

async function submitLogin(user, { email, password }) {
  const emailInput = screen.getByTestId('login-email-input');
  const passwordInput = screen.getByTestId('login-password-input');
  await user.clear(emailInput);
  await user.type(emailInput, email);
  await user.clear(passwordInput);
  await user.type(passwordInput, password);
  await user.click(screen.getByTestId('login-submit-btn'));
}

describe('Login Page (FE-065 / AUTH-04, AUTH-09, AUTH-13)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  describe('Form layout (Figma Section 5 / AUTH-04)', () => {
    it('renders email and password fields with sign-in, forgot-password and create-account actions', () => {
      render(<TestLoginApp />);

      expect(
        screen.getByRole('heading', { name: /Sign In to Vegetable Joint/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^Sign In$/i })
      ).toBeInTheDocument();
      expect(screen.getByTestId('login-forgot-link')).toHaveAttribute(
        'href',
        '/forgot-password'
      );
      expect(screen.getByTestId('login-register-link')).toBeInTheDocument();
    });

    it('uses a masked password input (security, AUTH-04)', () => {
      render(<TestLoginApp />);
      expect(screen.getByTestId('login-password-input')).toHaveAttribute(
        'type',
        'password'
      );
    });

    it('shows required-field validation when submitting an empty form', async () => {
      const user = userEvent.setup();
      const loginSpy = vi.spyOn(authService, 'login');
      render(<TestLoginApp />);

      await user.click(screen.getByTestId('login-submit-btn'));

      expect(
        await screen.findByTestId('login-error-message')
      ).toHaveTextContent(new RegExp(STRINGS.ERRORS.REQUIRED_FIELD, 'i'));
      expect(loginSpy).not.toHaveBeenCalled();
    });
  });

  describe('Generic invalid credentials (AUTH-04, AUTH-09, TC-14)', () => {
    it('rejects a wrong password with the generic message and stays on login', async () => {
      const user = userEvent.setup();
      render(<TestLoginApp />);

      await submitLogin(user, {
        email: 'buyer@example.com',
        password: 'totallyWrong99',
      });

      const error = await screen.findByTestId('login-error-message');
      expect(error).toHaveTextContent(
        new RegExp(STRINGS.ERRORS.INVALID_CREDENTIALS.replace('.', '\\.'), 'i')
      );
      // Still on the login page; no session established
      expect(
        screen.getByRole('heading', { name: /Sign In to Vegetable Joint/i })
      ).toBeInTheDocument();
      expect(localStorage.getItem('vegetable_joint_token')).toBeNull();
    });

    it('does not reveal whether the email exists (unknown email uses same generic message)', async () => {
      const user = userEvent.setup();
      render(<TestLoginApp />);

      await submitLogin(user, {
        email: 'nobody@nowhere.example',
        password: 'whatever123',
      });

      const unKnownEmailError = await screen.findByTestId(
        'login-error-message'
      );
      expect(unKnownEmailError).toHaveTextContent(/Invalid login credentials/i);
      expect(unKnownEmailError).not.toHaveTextContent(/not found|no account/i);
    });

    it('returns the same message for wrong password and unknown email (no user enumeration)', async () => {
      await expect(
        authService.login({ email: 'buyer@example.com', password: 'wrong123' })
      ).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: STRINGS.ERRORS.INVALID_CREDENTIALS,
      });

      await expect(
        authService.login({
          email: 'ghost@example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: STRINGS.ERRORS.INVALID_CREDENTIALS,
      });
    });
  });

  describe('Session token and role (AUTH-04)', () => {
    it('issues a session token and persists the authenticated user without credential material', async () => {
      const response = await authService.login({
        email: 'buyer@example.com',
        password: 'password123',
      });

      expect(response.token).toEqual(expect.any(String));
      expect(response.user.role).toBe('buyer');
      // NFR-SEC-01: password hashes must never be returned in responses
      expect(response.user).not.toHaveProperty('password_hash');
      expect(response.user).not.toHaveProperty('password');
    });
  });

  describe('Role-based redirect after login (AUTH-13)', () => {
    it('redirects a buyer to the home page by default', async () => {
      const user = userEvent.setup();
      render(<TestLoginApp />);

      await submitLogin(user, {
        email: 'buyer@example.com',
        password: 'password123',
      });

      expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    });

    it('redirects a seller to the seller dashboard', async () => {
      const user = userEvent.setup();
      render(<TestLoginApp />);

      await submitLogin(user, {
        email: 'seller@arewafarms.ng',
        password: 'password123',
      });

      expect(await screen.findByTestId('seller-dashboard')).toBeInTheDocument();
    });

    it('redirects an admin to the admin dashboard', async () => {
      const user = userEvent.setup();
      render(<TestLoginApp />);

      await submitLogin(user, {
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(await screen.findByTestId('admin-dashboard')).toBeInTheDocument();
    });

    it('returns a buyer to the previously requested page (e.g. /checkout)', async () => {
      const user = userEvent.setup();
      render(
        <TestLoginApp
          initialEntries={[
            { pathname: '/login', state: { from: { pathname: '/checkout' } } },
          ]}
        />
      );

      await submitLogin(user, {
        email: 'buyer@example.com',
        password: 'password123',
      });

      expect(await screen.findByTestId('checkout-page')).toBeInTheDocument();
    });

    it('sends a buyer attempting a seller-only page back to home (role mismatch, AUTH-07, AUTH-13)', async () => {
      const user = userEvent.setup();
      render(
        <TestLoginApp
          initialEntries={[
            { pathname: '/login', state: { from: { pathname: '/seller' } } },
          ]}
        />
      );

      await submitLogin(user, {
        email: 'buyer@example.com',
        password: 'password123',
      });

      expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    });
  });

  describe('Submission state', () => {
    it('disables the submit button and shows progress while authenticating', async () => {
      const user = userEvent.setup();
      vi.spyOn(authService, 'login').mockImplementation(
        () => new Promise(() => {})
      );
      render(<TestLoginApp />);

      await submitLogin(user, {
        email: 'buyer@example.com',
        password: 'password123',
      });

      const submitBtn = screen.getByTestId('login-submit-btn');
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveTextContent(/Signing in\.\.\./i);
    });
  });
});
