import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ResetPassword } from '../ResetPassword';
import { ToastProvider } from '../../../context';
import { authService } from '../../../services/authService';
import { mockStore } from '../../../data/mockStore';
import { ApiError } from '../../../services/apiErrors';
import { STRINGS } from '../../../constants';

function TestResetApp({ initialEntries = ['/reset-password'] }) {
  return (
    <ToastProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/forgot-password"
            element={<div data-testid="forgot-page">Forgot</div>}
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

TestResetApp.propTypes = {
  initialEntries: PropTypes.array,
};

const VALID_URL =
  '/reset-password?token=mock-reset-abc&email=buyer@example.com';

describe('Reset Password Page (FE-067 / AUTH-06)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  describe('Token presence handling', () => {
    it('shows an invalid-link notice when no token is present in the URL', () => {
      render(<TestResetApp initialEntries={['/reset-password']} />);

      expect(
        screen.getByTestId('reset-token-invalid-notice')
      ).toHaveTextContent(/missing or invalid/i);
      expect(
        screen.queryByTestId('reset-password-input')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('reset-request-new-link')).toHaveAttribute(
        'href',
        '/forgot-password'
      );
    });

    it('renders the reset form when a token is present', () => {
      render(<TestResetApp initialEntries={[VALID_URL]} />);

      expect(screen.getByTestId('reset-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('reset-confirm-input')).toBeInTheDocument();
      expect(screen.getByTestId('reset-submit-btn')).toHaveTextContent(
        /Update Password/i
      );
    });
  });

  describe('Client-side validation (AUTH-08, UI-05)', () => {
    it('blocks submission when the password is empty', async () => {
      const user = userEvent.setup();
      const spy = vi.spyOn(authService, 'resetPassword');
      render(<TestResetApp initialEntries={[VALID_URL]} />);

      await user.click(screen.getByTestId('reset-submit-btn'));

      expect(
        await screen.findByTestId('reset-password-error')
      ).toHaveTextContent(/password is required/i);
      expect(spy).not.toHaveBeenCalled();
    });

    it('rejects a weak password that lacks letters/digits', async () => {
      const user = userEvent.setup();
      const spy = vi.spyOn(authService, 'resetPassword');
      render(<TestResetApp initialEntries={[VALID_URL]} />);

      await user.type(screen.getByTestId('reset-password-input'), 'password');
      await user.type(screen.getByTestId('reset-confirm-input'), 'password');
      await user.click(screen.getByTestId('reset-submit-btn'));

      expect(
        await screen.findByTestId('reset-password-error')
      ).toHaveTextContent(/letters and digits/i);
      expect(spy).not.toHaveBeenCalled();
    });

    it('rejects mismatched password confirmation', async () => {
      const user = userEvent.setup();
      const spy = vi.spyOn(authService, 'resetPassword');
      render(<TestResetApp initialEntries={[VALID_URL]} />);

      await user.type(screen.getByTestId('reset-password-input'), 'newPass123');
      await user.type(
        screen.getByTestId('reset-confirm-input'),
        'different123'
      );
      await user.click(screen.getByTestId('reset-submit-btn'));

      expect(
        await screen.findByTestId('reset-confirm-error')
      ).toHaveTextContent(/do not match/i);
      expect(spy).not.toHaveBeenCalled();
    });

    it('reflects live password criteria as the user types (AUTH-08)', async () => {
      const user = userEvent.setup();
      render(<TestResetApp initialEntries={[VALID_URL]} />);

      await user.type(screen.getByTestId('reset-password-input'), 'abc12345');
      const criteria = screen.getByTestId('reset-password-criteria');
      expect(criteria).toHaveTextContent(/At least 8 characters/);
      // All three criteria rows show the satisfied marker.
      expect(criteria.textContent.match(/✓/g)?.length).toBe(3);
    });
  });

  describe('Successful reset (AUTH-06)', () => {
    it('submits the token and new password, then shows success', async () => {
      const user = userEvent.setup();
      const spy = vi
        .spyOn(authService, 'resetPassword')
        .mockResolvedValue({ message: STRINGS.AUTH.RESET_SUCCESS });
      render(<TestResetApp initialEntries={[VALID_URL]} />);

      await user.type(screen.getByTestId('reset-password-input'), 'newPass123');
      await user.type(screen.getByTestId('reset-confirm-input'), 'newPass123');
      await user.click(screen.getByTestId('reset-submit-btn'));

      await waitFor(() =>
        expect(spy).toHaveBeenCalledWith({
          token: 'mock-reset-abc',
          email: 'buyer@example.com',
          password: 'newPass123',
          password_confirmation: 'newPass123',
        })
      );
      expect(
        await screen.findByTestId('reset-success-message')
      ).toHaveTextContent(/password has been reset successfully/i);
    });
  });

  describe('Invalid / expired / used token handling (AUTH-06)', () => {
    it('shows the recovery notice when the token is invalid', async () => {
      const user = userEvent.setup();
      vi.spyOn(authService, 'resetPassword').mockRejectedValue(
        new ApiError({
          message: STRINGS.AUTH.RESET_TOKEN_INVALID,
          status: 422,
          code: 'INVALID_RESET_TOKEN',
        })
      );
      render(<TestResetApp initialEntries={[VALID_URL]} />);

      await user.type(screen.getByTestId('reset-password-input'), 'newPass123');
      await user.type(screen.getByTestId('reset-confirm-input'), 'newPass123');
      await user.click(screen.getByTestId('reset-submit-btn'));

      expect(
        await screen.findByTestId('reset-token-invalid-notice')
      ).toHaveTextContent(/invalid/i);
      expect(screen.getByTestId('reset-request-new-link')).toBeInTheDocument();
    });

    it('maps server-side field errors back to the form', async () => {
      const user = userEvent.setup();
      vi.spyOn(authService, 'resetPassword').mockRejectedValue(
        new ApiError({
          message: 'The given data was invalid.',
          status: 422,
          code: 'VALIDATION_ERROR',
          errors: { password: ['Password must be at least 8 characters.'] },
        })
      );
      render(<TestResetApp initialEntries={[VALID_URL]} />);

      await user.type(screen.getByTestId('reset-password-input'), 'newPass123');
      await user.type(screen.getByTestId('reset-confirm-input'), 'newPass123');
      await user.click(screen.getByTestId('reset-submit-btn'));

      expect(
        await screen.findByTestId('reset-password-error')
      ).toHaveTextContent(/at least 8 characters/i);
    });
  });
});

describe('Password reset service behaviour (FE-067 / AUTH-06)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  it('issues a reset token for a registered email but not for an unknown email', async () => {
    const known = await authService.forgotPassword({
      email: 'buyer@example.com',
    });
    expect(known.reset_token).toEqual(expect.any(String));
    expect(known.expires_at).toEqual(expect.any(String));

    const unknown = await authService.forgotPassword({
      email: 'ghost@nowhere.example',
    });
    expect(unknown.message).toBe(STRINGS.AUTH.FORGOT_SUCCESS);
    expect(unknown.reset_token).toBeUndefined();
  });

  it('replaces the password so the new one works and the old one fails', async () => {
    const { reset_token: token } = await authService.forgotPassword({
      email: 'buyer@example.com',
    });

    await authService.resetPassword({
      token,
      password: 'brandNew123',
      password_confirmation: 'brandNew123',
    });

    await expect(
      authService.login({ email: 'buyer@example.com', password: 'brandNew123' })
    ).resolves.toMatchObject({ user: { role: 'buyer' } });

    await expect(
      authService.login({ email: 'buyer@example.com', password: 'password123' })
    ).rejects.toMatchObject({ status: 401 });
  });

  it('enforces single-use tokens', async () => {
    const { reset_token: token } = await authService.forgotPassword({
      email: 'buyer@example.com',
    });

    await authService.resetPassword({
      token,
      password: 'firstPass123',
      password_confirmation: 'firstPass123',
    });

    await expect(
      authService.resetPassword({
        token,
        password: 'secondPass123',
        password_confirmation: 'secondPass123',
      })
    ).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' });
  });

  it('rejects an expired token', async () => {
    const { reset_token: token } = await authService.forgotPassword({
      email: 'buyer@example.com',
    });
    // Force the token to be in the past.
    mockStore.resetTokens[token].expires_at = new Date(
      Date.now() - 1000
    ).toISOString();

    await expect(
      authService.resetPassword({
        token,
        password: 'newPass123',
        password_confirmation: 'newPass123',
      })
    ).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' });
  });

  it('invalidates the previous token when a new one is requested', async () => {
    const first = await authService.forgotPassword({
      email: 'buyer@example.com',
    });
    const second = await authService.forgotPassword({
      email: 'buyer@example.com',
    });

    await expect(
      authService.resetPassword({
        token: first.reset_token,
        password: 'newPass123',
        password_confirmation: 'newPass123',
      })
    ).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' });

    await expect(
      authService.resetPassword({
        token: second.reset_token,
        password: 'newPass123',
        password_confirmation: 'newPass123',
      })
    ).resolves.toMatchObject({ message: STRINGS.AUTH.RESET_SUCCESS });
  });

  it('enforces password rules server-side', async () => {
    const { reset_token: token } = await authService.forgotPassword({
      email: 'buyer@example.com',
    });

    await expect(
      authService.resetPassword({
        token,
        password: 'short',
        password_confirmation: 'short',
      })
    ).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
    });
  });
});
