import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ForgotPassword } from '../ForgotPassword';
import { ToastProvider } from '../../../context';
import { authService } from '../../../services/authService';
import { mockStore } from '../../../data/mockStore';
import { STRINGS } from '../../../constants';

function TestForgotApp({ initialEntries = ['/forgot-password'] }) {
  return (
    <ToastProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/reset-password"
            element={<div data-testid="reset-page">Reset</div>}
          />
          <Route
            path="/login"
            element={<div data-testid="login-page">Login</div>}
          />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

TestForgotApp.propTypes = {
  initialEntries: PropTypes.array,
};

describe('Forgot Password Page (FE-067 / AUTH-06)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  describe('Form layout', () => {
    it('renders the request-reset form with email, submit and back-to-sign-in', () => {
      render(<TestForgotApp />);

      expect(
        screen.getByRole('heading', { name: /Reset Password/i })
      ).toBeInTheDocument();
      expect(screen.getByTestId('forgot-email-input')).toBeInTheDocument();
      expect(screen.getByTestId('forgot-submit-btn')).toHaveTextContent(
        /Send Reset Link/i
      );
      expect(screen.getByTestId('forgot-back-link')).toHaveAttribute(
        'href',
        '/login'
      );
    });
  });

  describe('Validation (UI-05)', () => {
    it('blocks submission and shows an inline error for an empty email', async () => {
      const user = userEvent.setup();
      const spy = vi.spyOn(authService, 'forgotPassword');
      render(<TestForgotApp />);

      await user.click(screen.getByTestId('forgot-submit-btn'));

      expect(await screen.findByTestId('forgot-email-error')).toHaveTextContent(
        /email address is required/i
      );
      expect(spy).not.toHaveBeenCalled();
    });

    it('rejects an invalid email format without calling the service', async () => {
      const user = userEvent.setup();
      const spy = vi.spyOn(authService, 'forgotPassword');
      render(<TestForgotApp />);

      await user.type(screen.getByTestId('forgot-email-input'), 'not-an-email');
      await user.click(screen.getByTestId('forgot-submit-btn'));

      expect(await screen.findByTestId('forgot-email-error')).toHaveTextContent(
        /valid email address/i
      );
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Request reset link (AUTH-06)', () => {
    it('sends the email and shows a generic success message', async () => {
      const user = userEvent.setup();
      const spy = vi
        .spyOn(authService, 'forgotPassword')
        .mockResolvedValue({ message: STRINGS.AUTH.FORGOT_SUCCESS });
      render(<TestForgotApp />);

      await user.type(
        screen.getByTestId('forgot-email-input'),
        'buyer@example.com'
      );
      await user.click(screen.getByTestId('forgot-submit-btn'));

      await waitFor(() =>
        expect(spy).toHaveBeenCalledWith({ email: 'buyer@example.com' })
      );
      expect(
        await screen.findByTestId('forgot-success-message')
      ).toHaveTextContent(/if an account exists/i);
      // The form is replaced by the confirmation state.
      expect(
        screen.queryByTestId('forgot-email-input')
      ).not.toBeInTheDocument();
    });

    it('does not reveal whether the email exists (identical generic response)', async () => {
      const user = userEvent.setup();
      const spy = vi
        .spyOn(authService, 'forgotPassword')
        .mockResolvedValue({ message: STRINGS.AUTH.FORGOT_SUCCESS });
      render(<TestForgotApp />);

      await user.type(
        screen.getByTestId('forgot-email-input'),
        'ghost@nowhere.example'
      );
      await user.click(screen.getByTestId('forgot-submit-btn'));

      expect(
        await screen.findByTestId('forgot-success-message')
      ).toHaveTextContent(/if an account exists/i);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId('forgot-mock-reset-link')
      ).not.toBeInTheDocument();
    });

    it('surfaces a service error without crashing', async () => {
      const user = userEvent.setup();
      vi.spyOn(authService, 'forgotPassword').mockRejectedValue(
        new Error('Server unavailable')
      );
      render(<TestForgotApp />);

      await user.type(
        screen.getByTestId('forgot-email-input'),
        'buyer@example.com'
      );
      await user.click(screen.getByTestId('forgot-submit-btn'));

      expect(
        await screen.findByTestId('forgot-error-message')
      ).toHaveTextContent(/server unavailable/i);
    });
  });

  describe('Mock-mode reset link (no email provider in demo)', () => {
    it('exposes a simulated reset link when the mock returns a token', async () => {
      const user = userEvent.setup();
      vi.spyOn(authService, 'forgotPassword').mockResolvedValue({
        message: STRINGS.AUTH.FORGOT_SUCCESS,
        reset_token: 'mock-reset-xyz',
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
      });
      render(<TestForgotApp />);

      await user.type(
        screen.getByTestId('forgot-email-input'),
        'buyer@example.com'
      );
      await user.click(screen.getByTestId('forgot-submit-btn'));

      const link = await screen.findByTestId('forgot-mock-reset-link');
      expect(link.getAttribute('href')).toContain('token=mock-reset-xyz');
      expect(link.getAttribute('href')).toContain('email=buyer%40example.com');
    });
  });
});
