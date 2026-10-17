import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  render,
  renderHook,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider, ToastProvider } from '..';
import { useAuth } from '../../hooks';
import { apiClient } from '../../services';
import { authService } from '../../services/authService';
import { mockStore } from '../../data/mockStore';
import { Login } from '../../pages/auth/Login';
import { ProtectedRoute } from '../../routes/ProtectedRoute';
import { SessionExpiredModal } from '../../components/common/SessionExpiredModal';

const STORAGE_TOKEN_KEY = 'vegetable_joint_token';
const STORAGE_USER_KEY = 'vegetable_joint_user';

const buyerUser = {
  id: 6,
  name: 'Amina Bello',
  email: 'buyer@example.com',
  role: 'buyer',
};

function Providers({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}

Providers.propTypes = { children: PropTypes.node };

function TestSessionApp({ initialEntries = ['/'] }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={['buyer']} />}>
              <Route
                path="/checkout"
                element={<div data-testid="checkout-page">Checkout</div>}
              />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<div data-testid="home-page">Home</div>} />
            <Route
              path="/seller"
              element={<div data-testid="seller-dashboard">Seller</div>}
            />
          </Routes>
          <SessionExpiredModal />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

TestSessionApp.propTypes = { initialEntries: PropTypes.array };

async function submitLogin(user, { email, password }) {
  const emailInput = screen.getByTestId('login-email-input');
  const passwordInput = screen.getByTestId('login-password-input');
  await user.clear(emailInput);
  await user.type(emailInput, email);
  await user.clear(passwordInput);
  await user.type(passwordInput, password);
  await user.click(screen.getByTestId('login-submit-btn'));
}

describe('Logout & Session Expiry (FE-068 / AUTH-05, ERR-04, NFR-SEC-03)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  describe('Logout clears credentials (AUTH-05)', () => {
    it('clears token, user and persisted storage when logging out', async () => {
      localStorage.setItem(STORAGE_TOKEN_KEY, 'seed-token');
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(buyerUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: Providers,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem(STORAGE_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(STORAGE_USER_KEY)).toBeNull();
      expect(apiClient.getToken()).toBeNull();
    });

    it('still clears the local session when the logout request fails', async () => {
      localStorage.setItem(STORAGE_TOKEN_KEY, 'seed-token');
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(buyerUser));
      vi.spyOn(authService, 'logout').mockRejectedValue(
        new Error('network down')
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: Providers,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem(STORAGE_TOKEN_KEY)).toBeNull();
    });

    it('dismisses an active session-expired prompt on logout', async () => {
      localStorage.setItem(STORAGE_TOKEN_KEY, 'seed-token');
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(buyerUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: Providers,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        apiClient.notifyUnauthorized({ status: 401 });
      });
      expect(result.current.isSessionExpired).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isSessionExpired).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('invokes mock logout and clears the active mock user', async () => {
      const spy = vi.spyOn(mockStore, 'logoutUser');

      localStorage.setItem(STORAGE_TOKEN_KEY, 'seed-token');
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(buyerUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: Providers,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.logout();
      });

      expect(spy).toHaveBeenCalled();
      expect(mockStore.currentUser).toBeNull();
    });
  });

  describe('Session expired prompt (ERR-04)', () => {
    it('shows the prompt and clears credentials when any request returns 401', async () => {
      localStorage.setItem(STORAGE_TOKEN_KEY, 'seed-token');
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(buyerUser));

      render(<TestSessionApp initialEntries={['/']} />);

      expect(await screen.findByTestId('home-page')).toBeInTheDocument();

      act(() => {
        apiClient.notifyUnauthorized({ status: 401, message: 'expired' });
      });

      expect(await screen.findByTestId('session-expired-modal')).toBeVisible();
      expect(screen.getByText('Session Expired')).toBeInTheDocument();
      expect(localStorage.getItem(STORAGE_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(STORAGE_USER_KEY)).toBeNull();
    });

    it('returns the user to login and back to the original page after signing in again', async () => {
      const user = userEvent.setup();

      render(<TestSessionApp initialEntries={['/checkout']} />);

      // Unauthenticated attempt is bounced to login preserving /checkout.
      expect(
        await screen.findByRole('heading', {
          name: /Sign In to Vegetable Joint/i,
        })
      ).toBeInTheDocument();

      await submitLogin(user, {
        email: 'buyer@example.com',
        password: 'password123',
      });

      // Signed in and returned to the originally requested page.
      expect(await screen.findByTestId('checkout-page')).toBeInTheDocument();

      // Simulate a background 401 while on the protected page.
      act(() => {
        apiClient.notifyUnauthorized({ status: 401 });
      });

      expect(await screen.findByTestId('session-expired-modal')).toBeVisible();

      await user.click(screen.getByRole('button', { name: /Sign In Again/i }));

      // Prompt sends the user back to login.
      expect(
        await screen.findByRole('heading', {
          name: /Sign In to Vegetable Joint/i,
        })
      ).toBeInTheDocument();

      await submitLogin(user, {
        email: 'buyer@example.com',
        password: 'password123',
      });

      // And back to the original destination (not the role default home).
      expect(await screen.findByTestId('checkout-page')).toBeInTheDocument();
      expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
    });

    it('sends an authenticated user to login (preserving origin) when a 401 interrupts a protected page', async () => {
      localStorage.setItem(STORAGE_TOKEN_KEY, 'seed-token');
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(buyerUser));
      vi.spyOn(authService, 'getProfile').mockResolvedValue(buyerUser);

      render(<TestSessionApp initialEntries={['/checkout']} />);

      expect(await screen.findByTestId('checkout-page')).toBeInTheDocument();

      act(() => {
        apiClient.notifyUnauthorized({ status: 401 });
      });

      expect(await screen.findByTestId('session-expired-modal')).toBeVisible();

      // Protected route must not race the prompt with its own redirect.
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /Sign In Again/i }));

      expect(
        await screen.findByRole('heading', {
          name: /Sign In to Vegetable Joint/i,
        })
      ).toBeInTheDocument();
    });

    it('lets the user continue as a guest and lands on the marketplace', async () => {
      const user = userEvent.setup();

      render(<TestSessionApp initialEntries={['/checkout']} />);

      await screen.findByRole('heading', {
        name: /Sign In to Vegetable Joint/i,
      });
      await submitLogin(user, {
        email: 'buyer@example.com',
        password: 'password123',
      });
      expect(await screen.findByTestId('checkout-page')).toBeInTheDocument();

      act(() => {
        apiClient.notifyUnauthorized({ status: 401 });
      });

      expect(await screen.findByTestId('session-expired-modal')).toBeVisible();

      await user.click(
        screen.getByRole('button', { name: /Continue as Guest/i })
      );

      expect(await screen.findByTestId('home-page')).toBeInTheDocument();
      expect(
        screen.queryByTestId('session-expired-modal')
      ).not.toBeInTheDocument();
    });
  });
});
