import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Register } from '../Register';
import { AuthProvider, ToastProvider } from '../../../context';
import { authService } from '../../../services/authService';
import { ApiError } from '../../../services/apiErrors';

function TestSellerRegisterApp({ initialEntries = ['/register?role=seller'] }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route
              path="/register/seller"
              element={<Register defaultRole="seller" />}
            />
            <Route path="/" element={<div data-testid="home-page">Home</div>} />
            <Route
              path="/seller"
              element={
                <div data-testid="seller-overview-page">Seller Overview</div>
              }
            />
            <Route
              path="/login"
              element={<div data-testid="login-page">Login</div>}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

TestSellerRegisterApp.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
};

describe('Seller Registration Page (FE-063 / AUTH-02)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Form Layout and Seller Fields (AUTH-02, Figma Section 8)', () => {
    it('renders seller heading, selected seller tab, buyer fields, and seller specific fields', () => {
      render(
        <TestSellerRegisterApp initialEntries={['/register?role=seller']} />
      );

      // Main headings & role-aware title
      expect(
        screen.getByRole('heading', { name: /Register as Vegetable Seller/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /List farm produce and reach thousands of buyers across Nigeria/i
        )
      ).toBeInTheDocument();

      // Role Selection Tabs
      expect(screen.getByTestId('register-role-seller-tab')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByTestId('register-role-buyer-tab')).toHaveAttribute(
        'aria-selected',
        'false'
      );

      // Pending approval info notice (AUTH-03)
      expect(screen.getByTestId('seller-approval-notice')).toBeInTheDocument();
      expect(screen.getByTestId('seller-approval-notice')).toHaveTextContent(
        /Pending approval/i
      );

      // Core Buyer Fields (AUTH-01)
      expect(screen.getByTestId('register-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('register-email-input')).toBeInTheDocument();
      expect(screen.getByTestId('register-phone-input')).toBeInTheDocument();
      expect(screen.getByTestId('register-password-input')).toBeInTheDocument();
      expect(
        screen.getByTestId('register-confirm-password-input')
      ).toBeInTheDocument();

      // Seller Specific Fields (AUTH-02)
      expect(
        screen.getByTestId('seller-registration-fields')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('register-business-name-input')
      ).toBeInTheDocument();
      expect(screen.getByTestId('register-location-input')).toBeInTheDocument();
      expect(
        screen.getByTestId('register-description-input')
      ).toBeInTheDocument();

      // Submit Button and Quick Fill
      expect(screen.getByTestId('register-submit-btn')).toHaveTextContent(
        /Register as Seller/i
      );
      expect(
        screen.getByTestId('register-quick-fill-seller')
      ).toBeInTheDocument();
    });

    it('supports direct /register/seller route with defaultRole="seller"', () => {
      render(<TestSellerRegisterApp initialEntries={['/register/seller']} />);

      expect(
        screen.getByRole('heading', { name: /Register as Vegetable Seller/i })
      ).toBeInTheDocument();
      expect(screen.getByTestId('register-role-seller-tab')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(
        screen.getByTestId('seller-registration-fields')
      ).toBeInTheDocument();
    });
  });

  describe('Field Validations & Error Handling (AUTH-02, AUTH-08, UI-05)', () => {
    it('validates required business name field and rejects empty or too short input', async () => {
      const user = userEvent.setup();
      render(<TestSellerRegisterApp />);

      const businessInput = screen.getByTestId('register-business-name-input');
      const submitBtn = screen.getByTestId('register-submit-btn');

      // Attempt to submit empty form
      await user.click(submitBtn);

      const businessErrors = await screen.findAllByText(
        /Business or Farm name is required/i
      );
      expect(businessErrors.length).toBeGreaterThan(0);

      // Single character business name
      await user.type(businessInput, 'A');
      await user.tab();

      expect(
        await screen.findByText(/Business name must be at least 2 characters/i)
      ).toBeInTheDocument();
    });

    it('validates required location field and rejects empty or too short input', async () => {
      const user = userEvent.setup();
      render(<TestSellerRegisterApp />);

      const locationInput = screen.getByTestId('register-location-input');
      const submitBtn = screen.getByTestId('register-submit-btn');

      await user.click(submitBtn);

      const locationErrors = await screen.findAllByText(
        /Farm or stall location is required/i
      );
      expect(locationErrors.length).toBeGreaterThan(0);

      // Single character location
      await user.type(locationInput, 'L');
      await user.tab();

      expect(
        await screen.findByText(/Location must be at least 2 characters/i)
      ).toBeInTheDocument();
    });

    it('enforces AUTH-08 password criteria in seller mode', async () => {
      const user = userEvent.setup();
      render(<TestSellerRegisterApp />);

      const passwordInput = screen.getByTestId('register-password-input');
      const submitBtn = screen.getByTestId('register-submit-btn');

      await user.type(passwordInput, 'simple');
      await user.click(submitBtn);

      const lenErrors = await screen.findAllByText(
        /Password must be at least 8 characters/i
      );
      expect(lenErrors.length).toBeGreaterThan(0);
    });

    it('validates password confirmation match for seller registration', async () => {
      const user = userEvent.setup();
      render(<TestSellerRegisterApp />);

      const passwordInput = screen.getByTestId('register-password-input');
      const confirmInput = screen.getByTestId(
        'register-confirm-password-input'
      );
      const submitBtn = screen.getByTestId('register-submit-btn');

      await user.type(passwordInput, 'farmpassword123');
      await user.type(confirmInput, 'differentpass123');
      await user.click(submitBtn);

      const mismatchErrors = await screen.findAllByText(
        /Passwords do not match/i
      );
      expect(mismatchErrors.length).toBeGreaterThan(0);
    });

    it('rejects duplicate email for seller registration (AUTH-08, TC-13)', async () => {
      const user = userEvent.setup();
      render(<TestSellerRegisterApp />);

      const nameInput = screen.getByTestId('register-name-input');
      const emailInput = screen.getByTestId('register-email-input');
      const passwordInput = screen.getByTestId('register-password-input');
      const confirmInput = screen.getByTestId(
        'register-confirm-password-input'
      );
      const businessInput = screen.getByTestId('register-business-name-input');
      const locationInput = screen.getByTestId('register-location-input');
      const submitBtn = screen.getByTestId('register-submit-btn');

      // Existing email in mockStore is seller@arewafarms.ng
      await user.type(nameInput, 'Existing Seller');
      await user.type(emailInput, 'seller@arewafarms.ng');
      await user.type(passwordInput, 'password123');
      await user.type(confirmInput, 'password123');
      await user.type(businessInput, 'Lagos Veggies Ltd');
      await user.type(locationInput, 'Mile 12, Lagos');
      await user.click(submitBtn);

      const duplicateErrors = await screen.findAllByText(
        /The email has already been taken/i
      );
      expect(duplicateErrors.length).toBeGreaterThan(0);
    });

    it('maps server 422 validation errors to seller fields', async () => {
      vi.spyOn(authService, 'register').mockRejectedValueOnce(
        new ApiError({
          message: 'The given data was invalid.',
          status: 422,
          code: 'VALIDATION_ERROR',
          errors: {
            business_name: ['This business name is already registered.'],
            location: ['Selected location is outside delivery coverage.'],
          },
        })
      );

      const user = userEvent.setup();
      render(<TestSellerRegisterApp />);

      await user.type(screen.getByTestId('register-name-input'), 'Audu Bello');
      await user.type(
        screen.getByTestId('register-email-input'),
        'audu@example.ng'
      );
      await user.type(
        screen.getByTestId('register-phone-input'),
        '08022223333'
      );
      await user.type(
        screen.getByTestId('register-password-input'),
        'password123'
      );
      await user.type(
        screen.getByTestId('register-confirm-password-input'),
        'password123'
      );
      await user.type(
        screen.getByTestId('register-business-name-input'),
        'Duplicate Farms'
      );
      await user.type(
        screen.getByTestId('register-location-input'),
        'Remote Area'
      );
      await user.click(screen.getByTestId('register-submit-btn'));

      expect(
        await screen.findByText(/This business name is already registered/i)
      ).toBeInTheDocument();
      expect(
        await screen.findByText(
          /Selected location is outside delivery coverage/i
        )
      ).toBeInTheDocument();
    });
  });

  describe('Successful Seller Registration & Navigation (AUTH-02, AUTH-03, AUTH-13)', () => {
    it('successfully registers seller and redirects to seller overview dashboard', async () => {
      const registerSpy = vi.spyOn(authService, 'register');
      const user = userEvent.setup();
      render(<TestSellerRegisterApp />);

      const uniqueEmail = `seller_${Date.now()}@farms.ng`;

      await user.type(
        screen.getByTestId('register-name-input'),
        'Haruna Abubakar'
      );
      await user.type(screen.getByTestId('register-email-input'), uniqueEmail);
      await user.type(
        screen.getByTestId('register-phone-input'),
        '08034567890'
      );
      await user.type(
        screen.getByTestId('register-password-input'),
        'farmStrong1'
      );
      await user.type(
        screen.getByTestId('register-confirm-password-input'),
        'farmStrong1'
      );
      await user.type(
        screen.getByTestId('register-business-name-input'),
        'Haruna Organic Farm Ltd'
      );
      await user.type(
        screen.getByTestId('register-location-input'),
        'Dawanau Grain & Veg Market, Kano'
      );
      await user.type(
        screen.getByTestId('register-description-input'),
        'Grower of fresh carrots, bell peppers, tomatoes, and cabbage.'
      );

      await user.click(screen.getByTestId('register-submit-btn'));

      await waitFor(() => {
        expect(registerSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Haruna Abubakar',
            email: uniqueEmail.toLowerCase(),
            phone: '08034567890',
            role: 'seller',
            password: 'farmStrong1',
            business_name: 'Haruna Organic Farm Ltd',
            location: 'Dawanau Grain & Veg Market, Kano',
            description:
              'Grower of fresh carrots, bell peppers, tomatoes, and cabbage.',
          })
        );
      });

      // Role-based post-login destination for seller is /seller (AUTH-13)
      expect(
        await screen.findByTestId('seller-overview-page')
      ).toBeInTheDocument();
    });

    it('pre-populates valid seller data via Quick Fill Seller button', async () => {
      const user = userEvent.setup();
      render(<TestSellerRegisterApp />);

      const quickFillSellerBtn = screen.getByTestId(
        'register-quick-fill-seller'
      );
      await user.click(quickFillSellerBtn);

      const nameInput = screen.getByTestId('register-name-input');
      const emailInput = screen.getByTestId('register-email-input');
      const businessInput = screen.getByTestId('register-business-name-input');
      const locationInput = screen.getByTestId('register-location-input');
      const descriptionInput = screen.getByTestId('register-description-input');

      expect(nameInput.value).toMatch(/Seller User/i);
      expect(emailInput.value).toMatch(/newseller.*@example\.ng/i);
      expect(businessInput.value).toMatch(/Arewa Green Farms/i);
      expect(locationInput.value).toBe('Mile 12 Market, Lagos');
      expect(descriptionInput.value).toContain('Specializing in farm-fresh');
    });

    it('allows toggling between Buyer and Seller tabs while preserving common fields', async () => {
      const user = userEvent.setup();
      render(<TestSellerRegisterApp initialEntries={['/register']} />);

      // Initially on Buyer tab
      expect(screen.getByTestId('register-role-buyer-tab')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(
        screen.queryByTestId('seller-registration-fields')
      ).not.toBeInTheDocument();

      // Enter common buyer details
      await user.type(
        screen.getByTestId('register-name-input'),
        'Khadija Musa'
      );
      await user.type(
        screen.getByTestId('register-email-input'),
        'khadija@example.ng'
      );
      await user.type(
        screen.getByTestId('register-phone-input'),
        '08099887766'
      );

      // Click Seller tab
      await user.click(screen.getByTestId('register-role-seller-tab'));

      // Seller fields should now appear
      expect(
        screen.getByTestId('seller-registration-fields')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /Register as Vegetable Seller/i })
      ).toBeInTheDocument();

      // Common fields should be preserved
      expect(screen.getByTestId('register-name-input').value).toBe(
        'Khadija Musa'
      );
      expect(screen.getByTestId('register-email-input').value).toBe(
        'khadija@example.ng'
      );
      expect(screen.getByTestId('register-phone-input').value).toBe(
        '08099887766'
      );

      // Click Buyer tab again
      await user.click(screen.getByTestId('register-role-buyer-tab'));
      expect(
        screen.queryByTestId('seller-registration-fields')
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /Join Vegetable Joint/i })
      ).toBeInTheDocument();
    });
  });
});
