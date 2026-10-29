import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AdminSettings } from '../AdminSettings';
import { adminService } from '../../../services/adminService';
import { ToastContext } from '../../../context/toastContextDef';

// Mock sample settings conforming to ADM-08 and site_settings schema
const mockSettingsData = {
  site_name: 'Vegetable Joint',
  site_tagline: 'Digital Vegetable Marketplace in Nigeria',
  contact_email: 'support@vegetablejoint.ng',
  contact_phone: '+234 800 000 0000',
  support_text:
    'Need help? Contact us and our support team will get back to you promptly.',
  footer_text: '© Vegetable Joint — TriNova Technologies. All rights reserved.',
  default_currency: 'NGN',
  currency_symbol: '₦',
  order_cancellation_window_hours: 24,
  max_image_upload_size_mb: 5,
  updated_at: '2026-03-15T12:00:00Z',
};

function TestWrapper({ children, toastMocks = {} }) {
  const toastValue = {
    showSuccess: toastMocks.showSuccess || vi.fn(),
    showError: toastMocks.showError || vi.fn(),
    addToast: toastMocks.addToast || vi.fn(),
  };

  return (
    <ToastContext.Provider value={toastValue}>
      <MemoryRouter initialEntries={['/admin/settings']}>
        <Routes>
          <Route path="/admin/settings" element={children} />
        </Routes>
      </MemoryRouter>
    </ToastContext.Provider>
  );
}

TestWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  toastMocks: PropTypes.object,
};

describe('FE-103 / ADM-08: Admin Marketplace Settings Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminService, 'getSettings').mockResolvedValue({
      ...mockSettingsData,
    });
    vi.spyOn(adminService, 'updateSettings').mockImplementation(
      async (payload) => ({
        ...mockSettingsData,
        ...payload,
        updated_at: new Date().toISOString(),
      })
    );
  });

  describe('1. Initial Information Rendering (ADM-08, Figma Section 14)', () => {
    it('loads and populates all marketplace settings fields correctly', async () => {
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      // Loading spinner displayed then disappears
      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      // Page Title & Breadcrumbs
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /Marketplace Settings/i,
        })
      ).toBeInTheDocument();

      // Form inputs populate with initial settings
      const siteNameInput = screen.getByTestId('input-site-name');
      expect(siteNameInput).toHaveValue('Vegetable Joint');

      const taglineInput = screen.getByTestId('input-site-tagline');
      expect(taglineInput).toHaveValue(
        'Digital Vegetable Marketplace in Nigeria'
      );

      const emailInput = screen.getByTestId('input-contact-email');
      expect(emailInput).toHaveValue('support@vegetablejoint.ng');

      const phoneInput = screen.getByTestId('input-contact-phone');
      expect(phoneInput).toHaveValue('+234 800 000 0000');

      const supportTextarea = screen.getByTestId('textarea-support-text');
      expect(supportTextarea).toHaveValue(
        'Need help? Contact us and our support team will get back to you promptly.'
      );

      const footerTextarea = screen.getByTestId('textarea-footer-text');
      expect(footerTextarea).toHaveValue(
        '© Vegetable Joint — TriNova Technologies. All rights reserved.'
      );

      // Save and Discard buttons are initially disabled (clean state)
      expect(screen.getByTestId('save-settings-button')).toBeDisabled();
      expect(screen.getByTestId('reset-settings-button')).toBeDisabled();

      // Unsaved changes banner not shown
      expect(
        screen.queryByTestId('unsaved-changes-banner')
      ).not.toBeInTheDocument();
    });

    it('renders the last updated timestamp in WAT format', async () => {
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      const updatedBadge = screen.getByTestId('settings-last-updated');
      expect(updatedBadge).toBeInTheDocument();
      expect(updatedBadge).toHaveTextContent(/Updated:/i);
    });
  });

  describe('2. Form Validation (ADM-08)', () => {
    it('prevents saving with an empty site name and shows validation error', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      const siteNameInput = screen.getByTestId('input-site-name');
      await user.clear(siteNameInput);

      // Form is now dirty, so save button is enabled
      const saveBtn = screen.getByTestId('save-settings-button');
      expect(saveBtn).toBeEnabled();

      await user.click(saveBtn);

      // Error message is displayed
      expect(await screen.findByTestId('error-site-name')).toHaveTextContent(
        /Marketplace site name is required/i
      );

      // adminService.updateSettings should not have been called
      expect(adminService.updateSettings).not.toHaveBeenCalled();
    });

    it('validates contact email format and blocks invalid email submissions', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      const emailInput = screen.getByTestId('input-contact-email');
      await user.clear(emailInput);
      await user.type(emailInput, 'not-a-valid-email');

      const saveBtn = screen.getByTestId('save-settings-button');
      await user.click(saveBtn);

      expect(
        await screen.findByTestId('error-contact-email')
      ).toHaveTextContent(/Please enter a valid contact email address/i);

      expect(adminService.updateSettings).not.toHaveBeenCalled();
    });

    it('clears validation error when user fixes the input', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      const siteNameInput = screen.getByTestId('input-site-name');
      await user.clear(siteNameInput);
      await user.click(screen.getByTestId('save-settings-button'));

      expect(screen.getByTestId('error-site-name')).toBeInTheDocument();

      // Fix site name
      await user.type(siteNameInput, 'Green Valley Market');
      expect(screen.queryByTestId('error-site-name')).not.toBeInTheDocument();
    });
  });

  describe('3. Updating & Saving Settings (ADM-08)', () => {
    it('successfully submits updated settings and displays confirmation toast', async () => {
      const user = userEvent.setup();
      const showSuccessMock = vi.fn();

      render(
        <TestWrapper toastMocks={{ showSuccess: showSuccessMock }}>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      // Update inputs
      const siteNameInput = screen.getByTestId('input-site-name');
      await user.clear(siteNameInput);
      await user.type(siteNameInput, 'Vegetable Joint NG');

      const phoneInput = screen.getByTestId('input-contact-phone');
      await user.clear(phoneInput);
      await user.type(phoneInput, '+234 812 345 6789');

      const supportTextarea = screen.getByTestId('textarea-support-text');
      await user.clear(supportTextarea);
      await user.type(
        supportTextarea,
        'Reach our 24/7 agricultural support desk anytime.'
      );

      // Verify unsaved changes banner appears
      expect(screen.getByTestId('unsaved-changes-banner')).toBeInTheDocument();

      // Submit via bottom save button
      const bottomSaveBtn = screen.getByTestId('bottom-save-button');
      await user.click(bottomSaveBtn);

      await waitFor(() => {
        expect(adminService.updateSettings).toHaveBeenCalledTimes(1);
      });

      expect(adminService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          site_name: 'Vegetable Joint NG',
          contact_phone: '+234 812 345 6789',
          support_text: 'Reach our 24/7 agricultural support desk anytime.',
        })
      );

      // Success toast / banner displayed
      expect(showSuccessMock).toHaveBeenCalledWith(
        expect.stringMatching(/Marketplace settings updated successfully/i)
      );
      expect(screen.getByTestId('settings-success-banner')).toBeInTheDocument();

      // Form is no longer dirty
      expect(screen.getByTestId('save-settings-button')).toBeDisabled();
    });

    it('allows saving via top header save button', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      const taglineInput = screen.getByTestId('input-site-tagline');
      await user.clear(taglineInput);
      await user.type(taglineInput, 'Empowering Nigerian Farmers');

      const topSaveBtn = screen.getByTestId('save-settings-button');
      await user.click(topSaveBtn);

      await waitFor(() => {
        expect(adminService.updateSettings).toHaveBeenCalledTimes(1);
      });
      expect(adminService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          site_tagline: 'Empowering Nigerian Farmers',
        })
      );
    });
  });

  describe('4. Discard & Reset Changes', () => {
    it('reverts all inputs back to original loaded settings when discard is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      const siteNameInput = screen.getByTestId('input-site-name');
      await user.clear(siteNameInput);
      await user.type(siteNameInput, 'Completely Changed Name');

      const resetBtn = screen.getByTestId('reset-settings-button');
      expect(resetBtn).toBeEnabled();

      await user.click(resetBtn);

      // Input reverted
      expect(siteNameInput).toHaveValue('Vegetable Joint');
      expect(resetBtn).toBeDisabled();
      expect(
        screen.queryByTestId('unsaved-changes-banner')
      ).not.toBeInTheDocument();
    });

    it('allows discarding changes via the unsaved changes banner button', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      const emailInput = screen.getByTestId('input-contact-email');
      await user.clear(emailInput);
      await user.type(emailInput, 'new-inbox@test.com');

      const bannerDiscardBtn = screen.getByTestId('banner-reset-button');
      await user.click(bannerDiscardBtn);

      expect(emailInput).toHaveValue('support@vegetablejoint.ng');
    });
  });

  describe('5. Real-Time Live Marketplace Preview', () => {
    it('immediately reflects edits in Header, Support Box, and Footer previews', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      // Check initial preview texts
      expect(screen.getByTestId('preview-site-name')).toHaveTextContent(
        'Vegetable Joint'
      );
      expect(screen.getByTestId('preview-contact-email')).toHaveTextContent(
        'support@vegetablejoint.ng'
      );
      expect(screen.getByTestId('preview-footer-text')).toHaveTextContent(
        /Vegetable Joint/i
      );

      // Edit site name
      const siteNameInput = screen.getByTestId('input-site-name');
      await user.clear(siteNameInput);
      await user.type(siteNameInput, 'AgroDirect Hub');

      // Live preview reflects immediately
      expect(screen.getByTestId('preview-site-name')).toHaveTextContent(
        'AgroDirect Hub'
      );

      // Edit support text
      const supportTextarea = screen.getByTestId('textarea-support-text');
      await user.clear(supportTextarea);
      await user.type(supportTextarea, 'Direct farmer hotline assistance.');

      expect(screen.getByTestId('preview-support-text')).toHaveTextContent(
        'Direct farmer hotline assistance.'
      );
    });

    it('toggles preview device between Desktop and Mobile modes', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      const mobileBtn = screen.getByTestId('preview-device-mobile');
      await user.click(mobileBtn);

      const desktopBtn = screen.getByTestId('preview-device-desktop');
      await user.click(desktopBtn);
    });
  });

  describe('6. Advanced Platform Operational Defaults', () => {
    it('expands operational settings and allows updating cancellation window', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      // Expand accordion
      const toggleBtn = screen.getByTestId('toggle-advanced-settings');
      await user.click(toggleBtn);

      const cancellationInput = screen.getByTestId('input-cancellation-window');
      expect(cancellationInput).toHaveValue(24);

      await user.clear(cancellationInput);
      await user.type(cancellationInput, '48');

      // Submit
      await user.click(screen.getByTestId('save-settings-button'));

      await waitFor(() => {
        expect(adminService.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            order_cancellation_window_hours: 48,
          })
        );
      });
    });
  });

  describe('7. Error Handling & Refresh', () => {
    it('displays error state when initial settings fetch fails, and allows retry', async () => {
      adminService.getSettings.mockRejectedValueOnce(
        new Error('Network error loading settings')
      );

      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('settings-fetch-error-state')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Network error loading settings/i)
      ).toBeInTheDocument();

      // Retry
      adminService.getSettings.mockResolvedValueOnce({ ...mockSettingsData });
      const retryBtn = screen.getByRole('button', {
        name: /Retry Loading Settings/i,
      });
      await userEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId('input-site-name')).toBeInTheDocument();
      });
    });

    it('displays error banner and toast when updateSettings fails on submission', async () => {
      const user = userEvent.setup();
      const showErrorMock = vi.fn();
      adminService.updateSettings.mockRejectedValueOnce(
        new Error('Database lock error')
      );

      render(
        <TestWrapper toastMocks={{ showError: showErrorMock }}>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      const siteNameInput = screen.getByTestId('input-site-name');
      await user.type(siteNameInput, ' Extra');

      await user.click(screen.getByTestId('save-settings-button'));

      await waitFor(() => {
        expect(screen.getByTestId('settings-error-banner')).toBeInTheDocument();
      });

      expect(screen.getByText(/Database lock error/i)).toBeInTheDocument();
      expect(showErrorMock).toHaveBeenCalledWith('Database lock error');
    });

    it('refreshes settings when Refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSettings />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId('settings-loading-state')
        ).not.toBeInTheDocument();
      });

      const refreshBtn = screen.getByTestId('refresh-settings-button');
      await user.click(refreshBtn);

      await waitFor(() => {
        expect(adminService.getSettings).toHaveBeenCalledTimes(2);
      });
    });
  });
});
