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

describe('Login throttling & suspended messages (FE-066 / AUTH-09, AUTH-12)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  describe('Failed-login throttling (AUTH-09, NFR-SEC-07)', () => {
    it('throttles after 5 failed attempts and returns HTTP 429 with a retry window', async () => {
      const attempt = () =>
        authService.login({
          email: 'buyer@example.com',
          password: 'wrongPassword1',
        });

      // First 5 failed attempts stay under the throttle and return generic 401.
      for (let i = 0; i < 5; i += 1) {
        await expect(attempt()).rejects.toMatchObject({
          status: 401,
          code: 'UNAUTHORIZED',
          message: STRINGS.ERRORS.INVALID_CREDENTIALS,
        });
      }

      // 6th attempt within the window is rate limited (429).
      const throttled = await attempt().catch((err) => err);
      expect(throttled.status).toBe(429);
      expect(throttled.code).toBe('RATE_LIMITED');
      expect(throttled.isRateLimited).toBe(true);
      expect(throttled.retryAfter).toBeGreaterThan(0);
      expect(throttled.message).toMatch(/too many login attempts/i);
    });

    it('throttles unknown emails identically (no user enumeration)', async () => {
      const attempt = () =>
        authService.login({
          email: 'ghost@example.ng',
          password: 'whatever123',
        });

      for (let i = 0; i < 5; i += 1) {
        await expect(attempt()).rejects.toMatchObject({ status: 401 });
      }

      const throttled = await attempt().catch((err) => err);
      expect(throttled.status).toBe(429);
    });

    it('resets the throttle after a successful login', async () => {
      // Burn 4 failed attempts on the buyer account (just under the limit).
      for (let i = 0; i < 4; i += 1) {
        await authService
          .login({ email: 'buyer@example.com', password: 'wrong123' })
          .catch(() => {});
      }
      expect(mockStore.getLoginRetryAfter('buyer@example.com')).toBe(0);

      // A successful login must clear the failed-attempt history for this email.
      const response = await authService.login({
        email: 'buyer@example.com',
        password: 'password123',
      });
      expect(response.user.role).toBe('buyer');
      expect(mockStore.loginAttempts['buyer@example.com']).toBeUndefined();

      // Because the throttle cleared, another 4 failures still stay under the limit.
      for (let i = 0; i < 4; i += 1) {
        await expect(
          authService.login({
            email: 'buyer@example.com',
            password: 'wrong123',
          })
        ).rejects.toMatchObject({ status: 401 });
      }
      expect(mockStore.getLoginRetryAfter('buyer@example.com')).toBe(0);
    });

    it('does not leak account existence through the throttled message', async () => {
      const attempt = () =>
        authService.login({ email: 'buyer@example.com', password: 'nope999' });
      for (let i = 0; i < 6; i += 1) {
        await attempt().catch(() => {});
      }
      const err = await attempt().catch((e) => e);
      expect(err.status).toBe(429);
      expect(err.message).not.toMatch(/email|account exists|not found/i);
    });

    it('allows login again once the throttle window expires', async () => {
      // Exhaust the throttle window.
      for (let i = 0; i < 6; i += 1) {
        await authService
          .login({ email: 'buyer@example.com', password: 'wrong123' })
          .catch(() => {});
      }
      expect(mockStore.getLoginRetryAfter('buyer@example.com')).toBeGreaterThan(
        0
      );

      // Backdate every recorded attempt beyond the 60-second window.
      const past = Date.now() - 61 * 1000;
      mockStore.loginAttempts['buyer@example.com'] = mockStore.loginAttempts[
        'buyer@example.com'
      ].map(() => past);

      // The throttle window has passed, so a correct login succeeds again.
      const response = await authService.login({
        email: 'buyer@example.com',
        password: 'password123',
      });
      expect(response.user.role).toBe('buyer');
      expect(mockStore.loginAttempts['buyer@example.com']).toBeUndefined();
    });
  });

  describe('Friendly throttle UI (FE-066)', () => {
    it('shows a cooldown countdown and disables submit when rate limited', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TestLoginApp />);

      // Exhaust the throttle window through the real UI.
      for (let i = 0; i < 6; i += 1) {
        await submitLogin(user, {
          email: 'buyer@example.com',
          password: 'wrongPassword1',
        });
      }

      const error = await screen.findByTestId('login-error-message');
      expect(error).toHaveTextContent(/too many login attempts/i);

      const countdown = screen.getByTestId('login-cooldown-countdown');
      expect(countdown).toHaveTextContent(/try again in \d+ second/i);

      const submitBtn = screen.getByTestId('login-submit-btn');
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveTextContent(/Retry in \d+s/i);
    }, 15000);
  });

  describe('Suspended / deactivated accounts (AUTH-12, TC-30)', () => {
    it('blocks a suspended buyer with a friendly message and no session', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TestLoginApp />);

      await submitLogin(user, {
        email: 'suspended@example.ng',
        password: 'password123',
      });

      const error = await screen.findByTestId('login-error-message');
      expect(error).toHaveTextContent(/suspended/i);
      expect(screen.getByTestId('login-error-title')).toHaveTextContent(
        /Account Suspended/i
      );
      expect(localStorage.getItem('vegetable_joint_token')).toBeNull();
      expect(
        screen.getByRole('heading', { name: /Sign In to Vegetable Joint/i })
      ).toBeInTheDocument();
    });

    it('blocks a suspended seller (seller profile suspended) with a friendly message', async () => {
      await expect(
        authService.login({
          email: 'suspended@seller.ng',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
        message: STRINGS.AUTH.SELLER_ACCOUNT_SUSPENDED_MESSAGE,
      });
    });

    it('reports suspended status at the service layer (403, no token)', async () => {
      const err = await authService
        .login({ email: 'suspended@example.ng', password: 'password123' })
        .catch((e) => e);

      expect(err.status).toBe(403);
      expect(err.isForbidden).toBe(true);
      expect(err.message).toMatch(/suspended/i);
      expect(localStorage.getItem('vegetable_joint_token')).toBeNull();
    });

    it('still allows an approved seller to log in', async () => {
      const response = await authService.login({
        email: 'seller@arewafarms.ng',
        password: 'password123',
      });
      expect(response.user.role).toBe('seller');
      expect(response.user.seller_profile.approval_status).toBe('approved');
    });
  });
});
