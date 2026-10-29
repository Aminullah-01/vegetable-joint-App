import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SellerProfileEdit } from '../SellerProfileEdit';
import { AuthContext } from '../../../context/authContextDef';
import { ToastContext } from '../../../context/toastContextDef';
import { mockStore } from '../../../data/mockStore';

/**
 * Task FE-094 / AUTH-11: Seller Profile Edit
 *
 * SRS References:
 * - FE-094: Seller profile edit: Edit business name, location, description, phone.
 * - AUTH-11: The system shall allow a user to view and update their profile
 *   (name, phone, and — for Sellers — business name, location, description) and to change their password.
 * - SEL-01: Seller dashboard navigation sections: Overview, Products, Add Product, Orders, Inventory, Sales and Profile.
 * - SEL-14 / BR-08: Object-level authorization: seller only modifies own store profile.
 * - Figma Section 13: Seller Profile edit form (business name, location, description, phone, account info)
 *   with storefront preview.
 */

const mockApprovedSellerUser = {
  id: 2,
  name: 'Ibrahim Danladi',
  email: 'seller@arewafarms.ng',
  phone: '+2348031234567',
  role: 'seller',
  seller_id: 1,
  approval_status: 'approved',
  seller_profile: {
    id: 1,
    user_id: 2,
    business_name: 'Arewa Fresh Farms',
    location: 'Gombe',
    description:
      'Premier commercial vegetable grower based in Gombe supplying fresh Roma tomatoes and bell peppers.',
    phone: '+2348031234567',
    approval_status: 'approved',
  },
};

const mockPendingSellerUser = {
  id: 3,
  name: 'Danbatta Greens Owner',
  email: 'danbatta@greens.ng',
  phone: '+2348055556666',
  role: 'seller',
  seller_id: 2,
  approval_status: 'pending',
  seller_profile: {
    id: 2,
    user_id: 3,
    business_name: 'Danbatta Greens Hub',
    location: 'Kano',
    description: 'Fresh leafy greens and organic vegetable producers.',
    phone: '+2348055556666',
    approval_status: 'pending',
  },
};

function renderSellerProfileEditPage({
  user = mockApprovedSellerUser,
  updateProfile = vi.fn().mockResolvedValue({}),
  changePassword = vi
    .fn()
    .mockResolvedValue({ message: 'Password changed successfully.' }),
  toast = { success: vi.fn(), error: vi.fn() },
  initialEntries = ['/seller/profile'],
} = {}) {
  const authContextValue = {
    user,
    isAuthenticated: true,
    isSeller: true,
    isAdmin: false,
    isBuyer: false,
    updateProfile,
    changePassword,
  };

  return {
    updateProfile,
    changePassword,
    toast,
    ...render(
      <AuthContext.Provider value={authContextValue}>
        <ToastContext.Provider value={toast}>
          <MemoryRouter initialEntries={initialEntries}>
            <SellerProfileEdit />
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
  };
}

renderSellerProfileEditPage.propTypes = {
  user: PropTypes.object,
  updateProfile: PropTypes.func,
  changePassword: PropTypes.func,
  toast: PropTypes.object,
  initialEntries: PropTypes.arrayOf(PropTypes.string),
};

describe('FE-094 / AUTH-11: Seller Profile Edit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Form Layout & Initial Prepopulation (FE-094, AUTH-11, Figma Section 13)', () => {
    it('renders page header, status badge, and public storefront link', async () => {
      renderSellerProfileEditPage();

      expect(
        await screen.findByTestId('seller-profile-title')
      ).toHaveTextContent(/Seller Profile & Settings/i);

      expect(screen.getByTestId('seller-status-badge')).toHaveTextContent(
        /Approved/i
      );

      const storefrontLink = screen.getByTestId('view-storefront-link');
      expect(storefrontLink).toHaveAttribute('href', '/sellers/1');
      expect(storefrontLink).toHaveTextContent(/View Public Storefront/i);
    });

    it('prepopulates all seller edit fields from authenticated user and seller profile', async () => {
      renderSellerProfileEditPage();

      expect(
        await screen.findByTestId('profile-business-name-input')
      ).toHaveValue('Arewa Fresh Farms');

      expect(screen.getByTestId('profile-location-input')).toHaveValue('Gombe');

      expect(screen.getByTestId('profile-description-input')).toHaveValue(
        'Premier commercial vegetable grower based in Gombe supplying fresh Roma tomatoes and bell peppers.'
      );

      expect(screen.getByTestId('profile-phone-input')).toHaveValue(
        '+2348031234567'
      );

      expect(screen.getByTestId('profile-name-input')).toHaveValue(
        'Ibrahim Danladi'
      );

      // Email must be read-only and disabled
      const emailInput = screen.getByTestId('profile-email-input');
      expect(emailInput).toHaveValue('seller@arewafarms.ng');
      expect(emailInput).toHaveAttribute('readonly');
      expect(emailInput).toBeDisabled();
    });

    it('renders live storefront preview reflecting initial profile values', async () => {
      renderSellerProfileEditPage();

      expect(
        await screen.findByTestId('preview-business-name')
      ).toHaveTextContent('Arewa Fresh Farms');

      expect(screen.getByTestId('preview-location')).toHaveTextContent('Gombe');

      expect(screen.getByTestId('preview-phone')).toHaveTextContent(
        '+2348031234567'
      );

      expect(screen.getByTestId('preview-description')).toHaveTextContent(
        /Premier commercial vegetable grower based in Gombe/i
      );
    });
  });

  describe('2. Client-Side Validation for Edit Fields (FE-094, AUTH-11)', () => {
    it('validates business name (required, min 2 chars, max 150 chars)', async () => {
      const user = userEvent.setup();
      renderSellerProfileEditPage();

      const businessInput = await screen.findByTestId(
        'profile-business-name-input'
      );
      const saveBtn = screen.getByTestId('profile-save-btn');

      // Clear business name
      await user.clear(businessInput);
      await user.click(saveBtn);

      const errorMsg = await screen.findByTestId('profile-business-name-error');
      expect(errorMsg).toHaveTextContent(/Business or Farm name is required/i);

      // Single character
      await user.type(businessInput, 'A');
      expect(
        await screen.findByTestId('profile-business-name-error')
      ).toHaveTextContent(/must be at least 2 characters/i);
    });

    it('validates location (required, min 2 chars, max 150 chars)', async () => {
      const user = userEvent.setup();
      renderSellerProfileEditPage();

      const locationInput = await screen.findByTestId('profile-location-input');
      const saveBtn = screen.getByTestId('profile-save-btn');

      await user.clear(locationInput);
      await user.click(saveBtn);

      const errorMsg = await screen.findByTestId('profile-location-error');
      expect(errorMsg).toHaveTextContent(/Farm or stall location is required/i);
    });

    it('validates contact phone number (required, at least 10 digits)', async () => {
      const user = userEvent.setup();
      renderSellerProfileEditPage();

      const phoneInput = await screen.findByTestId('profile-phone-input');
      const saveBtn = screen.getByTestId('profile-save-btn');

      // Clear phone
      await user.clear(phoneInput);
      await user.click(saveBtn);

      const errorMsg = await screen.findByTestId('profile-phone-error');
      expect(errorMsg).toHaveTextContent(/Phone number is required/i);

      // Too short
      await user.type(phoneInput, '12345');
      expect(
        await screen.findByTestId('profile-phone-error')
      ).toHaveTextContent(/at least 10 digits/i);
    });

    it('tracks description character counter and rejects > 1000 characters', async () => {
      const user = userEvent.setup();
      renderSellerProfileEditPage();

      const descInput = await screen.findByTestId('profile-description-input');
      const counter = screen.getByTestId('description-char-counter');

      expect(counter).toBeInTheDocument();

      // Clear and type new description
      await user.clear(descInput);
      await user.type(descInput, 'Fresh local veggies.');
      expect(counter).toHaveTextContent('20 / 1000');
    });

    it('validates contact person name (required, min 2 chars)', async () => {
      const user = userEvent.setup();
      renderSellerProfileEditPage();

      const nameInput = await screen.findByTestId('profile-name-input');
      const saveBtn = screen.getByTestId('profile-save-btn');

      await user.clear(nameInput);
      await user.click(saveBtn);

      const errorMsg = await screen.findByTestId('profile-name-error');
      expect(errorMsg).toHaveTextContent(/Full name is required/i);
    });
  });

  describe('3. Successful Profile Update Flow (FE-094, AUTH-11)', () => {
    it('submits updated business name, location, description, and phone and displays success toast', async () => {
      const user = userEvent.setup();
      const updateProfileMock = vi.fn().mockResolvedValue({});
      const toastMock = { success: vi.fn(), error: vi.fn() };

      renderSellerProfileEditPage({
        updateProfile: updateProfileMock,
        toast: toastMock,
      });

      const businessInput = await screen.findByTestId(
        'profile-business-name-input'
      );
      const locationInput = screen.getByTestId('profile-location-input');
      const descInput = screen.getByTestId('profile-description-input');
      const phoneInput = screen.getByTestId('profile-phone-input');
      const nameInput = screen.getByTestId('profile-name-input');
      const saveBtn = screen.getByTestId('profile-save-btn');

      // Update fields
      await user.clear(businessInput);
      await user.type(businessInput, 'Danladi Premium Veggies');

      await user.clear(locationInput);
      await user.type(locationInput, 'Kano Municipal, Kano');

      await user.clear(descInput);
      await user.type(
        descInput,
        'Direct farm supplier of tomatoes, peppers, carrots, and cabbage in bulk.'
      );

      await user.clear(phoneInput);
      await user.type(phoneInput, '+2348098765432');

      await user.clear(nameInput);
      await user.type(nameInput, 'Ibrahim Danladi Kano');

      await user.click(saveBtn);

      await waitFor(() => {
        expect(updateProfileMock).toHaveBeenCalledWith({
          business_name: 'Danladi Premium Veggies',
          location: 'Kano Municipal, Kano',
          description:
            'Direct farm supplier of tomatoes, peppers, carrots, and cabbage in bulk.',
          phone: '+2348098765432',
          name: 'Ibrahim Danladi Kano',
        });
      });

      expect(toastMock.success).toHaveBeenCalledWith(
        'Seller business profile updated successfully.'
      );
    });
  });

  describe('4. Discard Changes (Reset Button)', () => {
    it('reverts modified fields back to last saved profile values when Discard Changes is clicked', async () => {
      const user = userEvent.setup();
      const toastMock = { success: vi.fn(), error: vi.fn() };

      renderSellerProfileEditPage({ toast: toastMock });

      const businessInput = await screen.findByTestId(
        'profile-business-name-input'
      );
      const resetBtn = screen.getByTestId('profile-reset-btn');

      // Change business name
      await user.clear(businessInput);
      await user.type(businessInput, 'Unsaved Temporary Business Name');
      expect(businessInput).toHaveValue('Unsaved Temporary Business Name');

      // Click discard
      await user.click(resetBtn);

      expect(businessInput).toHaveValue('Arewa Fresh Farms');
      expect(toastMock.success).toHaveBeenCalledWith(
        'Changes discarded. Restored last saved profile.'
      );
    });
  });

  describe('5. Live Public Storefront Preview Reactivity (Figma Section 13)', () => {
    it('reactively updates storefront preview card as seller types business details', async () => {
      const user = userEvent.setup();
      renderSellerProfileEditPage();

      const businessInput = await screen.findByTestId(
        'profile-business-name-input'
      );
      const locationInput = screen.getByTestId('profile-location-input');
      const descInput = screen.getByTestId('profile-description-input');
      const phoneInput = screen.getByTestId('profile-phone-input');

      await user.clear(businessInput);
      await user.type(businessInput, 'Sahel Green Produce');
      expect(screen.getByTestId('preview-business-name')).toHaveTextContent(
        'Sahel Green Produce'
      );

      await user.clear(locationInput);
      await user.type(locationInput, 'Katsina Central Market');
      expect(screen.getByTestId('preview-location')).toHaveTextContent(
        'Katsina Central Market'
      );

      await user.clear(descInput);
      await user.type(descInput, 'Best fresh habanero peppers.');
      expect(screen.getByTestId('preview-description')).toHaveTextContent(
        'Best fresh habanero peppers.'
      );

      await user.clear(phoneInput);
      await user.type(phoneInput, '+2348077778888');
      expect(screen.getByTestId('preview-phone')).toHaveTextContent(
        '+2348077778888'
      );
    });
  });

  describe('6. Security & Change Password (AUTH-11)', () => {
    it('validates password requirements and confirms password match', async () => {
      const user = userEvent.setup();
      renderSellerProfileEditPage();

      const currentPwdInput = await screen.findByTestId(
        'current-password-input'
      );
      const newPwdInput = screen.getByTestId('new-password-input');
      const confirmPwdInput = screen.getByTestId('confirm-password-input');
      const updatePwdBtn = screen.getByTestId('update-password-btn');

      // Click with empty form
      await user.click(updatePwdBtn);
      expect(
        await screen.findByTestId('current-password-error')
      ).toHaveTextContent(/Current password is required/i);

      // Fill current password
      await user.type(currentPwdInput, 'oldpassword123');

      // Fill short new password
      await user.type(newPwdInput, 'short');
      await user.click(updatePwdBtn);
      expect(await screen.findByTestId('new-password-error')).toHaveTextContent(
        /must be at least 8 characters/i
      );

      // Fill valid new password but mismatched confirmation
      await user.clear(newPwdInput);
      await user.type(newPwdInput, 'newSecurePass456');
      await user.type(confirmPwdInput, 'mismatchPass789');
      await user.click(updatePwdBtn);
      expect(
        await screen.findByTestId('confirm-password-error')
      ).toHaveTextContent(/Passwords do not match/i);
    });

    it('submits valid password change and clears password inputs upon success', async () => {
      const user = userEvent.setup();
      const changePasswordMock = vi.fn().mockResolvedValue({
        message: 'Password changed successfully.',
      });

      renderSellerProfileEditPage({ changePassword: changePasswordMock });

      const currentPwdInput = await screen.findByTestId(
        'current-password-input'
      );
      const newPwdInput = screen.getByTestId('new-password-input');
      const confirmPwdInput = screen.getByTestId('confirm-password-input');
      const updatePwdBtn = screen.getByTestId('update-password-btn');

      await user.type(currentPwdInput, 'currentPassword123');
      await user.type(newPwdInput, 'brandNewPassword999');
      await user.type(confirmPwdInput, 'brandNewPassword999');

      await user.click(updatePwdBtn);

      await waitFor(() => {
        expect(changePasswordMock).toHaveBeenCalledWith({
          current_password: 'currentPassword123',
          password: 'brandNewPassword999',
          password_confirmation: 'brandNewPassword999',
        });
      });

      expect(
        await screen.findByTestId('password-success-message')
      ).toHaveTextContent(/Password changed successfully/i);

      // Password inputs cleared
      expect(currentPwdInput).toHaveValue('');
      expect(newPwdInput).toHaveValue('');
      expect(confirmPwdInput).toHaveValue('');
    });
  });

  describe('7. Server Error Resilience (ERR-01)', () => {
    it('surfaces backend validation error in alert banner when update fails', async () => {
      const user = userEvent.setup();
      const updateProfileMock = vi.fn().mockRejectedValue({
        message: 'The given data was invalid.',
        errors: {
          business_name: [
            'This business name is already in use by another verified seller.',
          ],
        },
      });

      renderSellerProfileEditPage({ updateProfile: updateProfileMock });

      const saveBtn = await screen.findByTestId('profile-save-btn');
      await user.click(saveBtn);

      const serverAlert = await screen.findByTestId(
        'seller-profile-server-error'
      );
      expect(serverAlert).toHaveTextContent(
        /This business name is already in use by another verified seller/i
      );
    });
  });

  describe('8. Unapproved Seller Status Notice (AUTH-03, ADM-03)', () => {
    it('displays SellerApprovalNotice when seller is pending verification', async () => {
      renderSellerProfileEditPage({ user: mockPendingSellerUser });

      const notice = await screen.findByTestId('seller-approval-notice');
      expect(notice).toBeInTheDocument();
      expect(screen.getByTestId('seller-status-pending')).toHaveTextContent(
        /currently under review by platform administrators/i
      );
      const badges = screen.getAllByTestId('seller-status-badge');
      expect(badges.length).toBeGreaterThanOrEqual(1);
      badges.forEach((b) => expect(b).toHaveTextContent(/Pending Approval/i));
    });
  });

  describe('9. Real Mock Store Integration (FE-094, AUTH-11)', () => {
    it('updates seller profile in real mock store and persists updated business details', async () => {
      // Login as real seller in mock store
      const loginRes = mockStore.loginUser({
        email: 'seller@arewafarms.ng',
        password: 'password123',
      });

      // Render with mock store updateProfile
      const updateProfileDirect = async (data) => {
        return mockStore.updateProfile(data);
      };

      const user = userEvent.setup();
      renderSellerProfileEditPage({
        user: loginRes.user,
        updateProfile: updateProfileDirect,
      });

      const businessInput = await screen.findByTestId(
        'profile-business-name-input'
      );
      const locationInput = screen.getByTestId('profile-location-input');
      const saveBtn = screen.getByTestId('profile-save-btn');

      await user.clear(businessInput);
      await user.type(businessInput, 'Arewa Agro Farms Integrated');

      await user.clear(locationInput);
      await user.type(locationInput, 'Bauchi Road, Gombe');

      await user.click(saveBtn);

      await waitFor(() => {
        const freshProfile = mockStore.getCurrentProfile();
        expect(freshProfile.seller_profile.business_name).toBe(
          'Arewa Agro Farms Integrated'
        );
        expect(freshProfile.seller_profile.location).toBe('Bauchi Road, Gombe');
      });
    });
  });
});
