import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Profile } from '../Profile';
import { ProtectedRoute } from '../../../routes/ProtectedRoute';
import { AuthProvider, ToastProvider } from '../../../context';
import { authService } from '../../../services/authService';
import { mockStore } from '../../../data/mockStore';
import { verifyPassword } from '../../../utils';
import { STRINGS } from '../../../constants';

function TestProfileApp({ initialEntries = ['/account/profile'] }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/account/profile" element={<Profile />} />
            </Route>
            <Route path="/login" element={<div data-testid="login-page" />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

TestProfileApp.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
};

async function loginAs(email) {
  const result = await authService.login({ email, password: 'password123' });
  localStorage.setItem('vegetable_joint_token', result.token);
  return result;
}

async function renderProfile(initialEntries) {
  render(<TestProfileApp initialEntries={initialEntries} />);
  await screen.findByTestId('profile-page');
}

describe('Account Profile page (FE-069 / AUTH-11)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  describe('Buyer profile (view & edit name / phone)', () => {
    beforeEach(async () => {
      await loginAs('buyer@example.com');
    });

    it('shows the account fields prefilled from the session', async () => {
      await renderProfile();

      expect(screen.getByTestId('profile-name-input')).toHaveValue(
        'Amina Bello'
      );
      expect(screen.getByTestId('profile-phone-input')).toHaveValue(
        '+2348078901234'
      );
      const email = screen.getByTestId('profile-email-input');
      expect(email).toHaveValue('buyer@example.com');
      expect(email).toHaveAttribute('readonly');
    });

    it('does not show seller business details for a buyer', async () => {
      await renderProfile();

      expect(
        screen.queryByTestId('profile-business-section')
      ).not.toBeInTheDocument();
    });

    it('saves updated name and phone (AUTH-11)', async () => {
      const user = userEvent.setup();
      const spy = vi.spyOn(authService, 'updateProfile');
      await renderProfile();

      const nameInput = screen.getByTestId('profile-name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'Amina Bello-Adamu');

      const phoneInput = screen.getByTestId('profile-phone-input');
      await user.clear(phoneInput);
      await user.type(phoneInput, '08099998888');

      await user.click(screen.getByTestId('profile-save-btn'));

      expect(
        await screen.findByText(STRINGS.PROFILE.SAVE_SUCCESS)
      ).toBeInTheDocument();
      expect(spy).toHaveBeenCalledWith({
        name: 'Amina Bello-Adamu',
        phone: '08099998888',
      });

      const saved = mockStore.findUserById(6);
      expect(saved.name).toBe('Amina Bello-Adamu');
      expect(saved.phone).toBe('08099998888');
    });

    it('shows inline validation errors and does not call the service on invalid input', async () => {
      const user = userEvent.setup();
      const spy = vi.spyOn(authService, 'updateProfile');
      await renderProfile();

      const nameInput = screen.getByTestId('profile-name-input');
      await user.clear(nameInput);

      const phoneInput = screen.getByTestId('profile-phone-input');
      await user.clear(phoneInput);
      await user.type(phoneInput, '123');

      await user.click(screen.getByTestId('profile-save-btn'));

      expect(screen.getByTestId('profile-name-error')).toHaveTextContent(
        'Full name is required.'
      );
      expect(screen.getByTestId('profile-phone-error')).toHaveTextContent(
        /valid phone number/i
      );
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Seller profile (business details — AUTH-11)', () => {
    beforeEach(async () => {
      await loginAs('seller@arewafarms.ng');
    });

    it('shows prefilled business details for a seller', async () => {
      await renderProfile();

      expect(
        screen.getByTestId('profile-business-section')
      ).toBeInTheDocument();
      expect(screen.getByTestId('profile-business-name-input')).toHaveValue(
        'Arewa Fresh Farms'
      );
      expect(screen.getByTestId('profile-location-input')).toHaveValue('Gombe');
      expect(screen.getByTestId('profile-description-input')).not.toHaveValue(
        ''
      );
    });

    it('saves updated business details', async () => {
      const user = userEvent.setup();
      await renderProfile();

      const businessInput = screen.getByTestId('profile-business-name-input');
      await user.clear(businessInput);
      await user.type(businessInput, 'Arewa Fresh Farms Ltd');

      const locationInput = screen.getByTestId('profile-location-input');
      await user.clear(locationInput);
      await user.type(locationInput, 'Kano');

      await user.click(screen.getByTestId('profile-save-btn'));

      expect(
        await screen.findByText(STRINGS.PROFILE.SAVE_SUCCESS)
      ).toBeInTheDocument();

      const seller = mockStore.sellers.find((s) => s.user_id === 2);
      expect(seller.business_name).toBe('Arewa Fresh Farms Ltd');
      expect(seller.location).toBe('Kano');
    });

    it('requires a business name and location', async () => {
      const user = userEvent.setup();
      await renderProfile();

      await user.clear(screen.getByTestId('profile-business-name-input'));
      await user.clear(screen.getByTestId('profile-location-input'));
      await user.click(screen.getByTestId('profile-save-btn'));

      expect(
        screen.getByTestId('profile-business-name-error')
      ).toHaveTextContent(/Business or Farm name is required/i);
      expect(screen.getByTestId('profile-location-error')).toHaveTextContent(
        /location is required/i
      );
    });
  });

  describe('Change password (AUTH-11 / AUTH-08)', () => {
    beforeEach(async () => {
      await loginAs('buyer@example.com');
    });

    it('requires the current password and a valid new password', async () => {
      const user = userEvent.setup();
      const spy = vi.spyOn(authService, 'changePassword');
      await renderProfile();

      await user.click(screen.getByTestId('profile-password-submit-btn'));

      expect(
        screen.getByTestId('profile-password-current-error')
      ).toHaveTextContent(STRINGS.PROFILE.CURRENT_PASSWORD_REQUIRED);
      expect(
        screen.getByTestId('profile-password-new-error')
      ).toHaveTextContent(/Password is required/i);
      expect(spy).not.toHaveBeenCalled();
    });

    it('rejects a mismatched confirmation client-side', async () => {
      const user = userEvent.setup();
      const spy = vi.spyOn(authService, 'changePassword');
      await renderProfile();

      await user.type(
        screen.getByTestId('profile-password-current-input'),
        'password123'
      );
      await user.type(
        screen.getByTestId('profile-password-new-input'),
        'newpass456'
      );
      await user.type(
        screen.getByTestId('profile-password-confirm-input'),
        'different789'
      );
      await user.click(screen.getByTestId('profile-password-submit-btn'));

      expect(
        screen.getByTestId('profile-password-confirm-error')
      ).toHaveTextContent(/Passwords do not match/i);
      expect(spy).not.toHaveBeenCalled();
    });

    it('surfaces an incorrect current password from the server', async () => {
      const user = userEvent.setup();
      await renderProfile();

      await user.type(
        screen.getByTestId('profile-password-current-input'),
        'wrongpass1'
      );
      await user.type(
        screen.getByTestId('profile-password-new-input'),
        'newpass456'
      );
      await user.type(
        screen.getByTestId('profile-password-confirm-input'),
        'newpass456'
      );
      await user.click(screen.getByTestId('profile-password-submit-btn'));

      expect(
        await screen.findByTestId('profile-password-current-error')
      ).toHaveTextContent(STRINGS.PROFILE.CURRENT_PASSWORD_INCORRECT);
    });

    it('changes the password on success and clears the form', async () => {
      const user = userEvent.setup();
      await renderProfile();

      await user.type(
        screen.getByTestId('profile-password-current-input'),
        'password123'
      );
      await user.type(
        screen.getByTestId('profile-password-new-input'),
        'newpass456'
      );
      await user.type(
        screen.getByTestId('profile-password-confirm-input'),
        'newpass456'
      );
      await user.click(screen.getByTestId('profile-password-submit-btn'));

      expect(
        await screen.findByText(STRINGS.PROFILE.PASSWORD_SUCCESS)
      ).toBeInTheDocument();

      expect(screen.getByTestId('profile-password-current-input')).toHaveValue(
        ''
      );
      expect(screen.getByTestId('profile-password-new-input')).toHaveValue('');

      const updated = mockStore.findUserById(6);
      expect(verifyPassword('newpass456', updated.password_hash)).toBe(true);
      expect(verifyPassword('password123', updated.password_hash)).toBe(false);
    });

    it('rejects reusing the current password (client-side)', async () => {
      const user = userEvent.setup();
      const spy = vi.spyOn(authService, 'changePassword');
      await renderProfile();

      await user.type(
        screen.getByTestId('profile-password-current-input'),
        'password123'
      );
      await user.type(
        screen.getByTestId('profile-password-new-input'),
        'password123'
      );
      await user.type(
        screen.getByTestId('profile-password-confirm-input'),
        'password123'
      );
      await user.click(screen.getByTestId('profile-password-submit-btn'));

      expect(
        screen.getByTestId('profile-password-new-error')
      ).toHaveTextContent(STRINGS.PROFILE.PASSWORD_SAME_AS_CURRENT);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Service layer (mockStore)', () => {
    it('updateProfile throws a 401 when there is no active session', () => {
      mockStore.currentUser = null;
      expect(() =>
        mockStore.updateProfile({ name: 'X', phone: '08012345678' })
      ).toThrowError();
    });

    it('changePassword requires authentication', () => {
      mockStore.currentUser = null;
      expect(() =>
        mockStore.changePassword({
          current_password: 'password123',
          password: 'newpass456',
          password_confirmation: 'newpass456',
        })
      ).toThrowError();
    });
  });
});

describe('Profile route guarding (AUTH-11)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  it('redirects an unauthenticated visitor to login', async () => {
    render(<TestProfileApp initialEntries={['/account/profile']} />);
    await waitFor(() =>
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    );
  });
});
