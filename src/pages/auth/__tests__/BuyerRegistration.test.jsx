import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Register } from '../Register';
import { AuthProvider, ToastProvider } from '../../../context';
import { authService } from '../../../services/authService';
import { STRINGS } from '../../../constants';

function TestRegisterApp({ initialEntries = ['/register'] }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<div data-testid="home-page">Home</div>} />
            <Route
              path="/checkout"
              element={<div data-testid="checkout-page">Checkout</div>}
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

TestRegisterApp.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
};

describe('Buyer Registration Page (FE-062 / AUTH-01, AUTH-08)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Form Layout and Role Selection (AUTH-01, Figma Section 8)', () => {
    it('renders heading, role selection tabs, and all 4 core buyer fields', () => {
      render(<TestRegisterApp />);

      // Main headings
      expect(
        screen.getByRole('heading', { name: /Join Vegetable Joint/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Buy fresh vegetables directly from local farmers and vendors/i
        )
      ).toBeInTheDocument();

      // Role Selection Tabs
      expect(screen.getByTestId('register-role-buyer-tab')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByTestId('register-role-seller-tab')).toHaveAttribute(
        'aria-selected',
        'false'
      );

      // Core Buyer Fields (AUTH-01)
      expect(screen.getByTestId('register-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('register-email-input')).toBeInTheDocument();
      expect(screen.getByTestId('register-phone-input')).toBeInTheDocument();
      expect(screen.getByTestId('register-password-input')).toBeInTheDocument();
      expect(
        screen.getByTestId('register-confirm-password-input')
      ).toBeInTheDocument();

      // Submit Button and Sign In Link
      expect(screen.getByTestId('register-submit-btn')).toHaveTextContent(
        /Create Buyer Account/i
      );
      expect(screen.getByTestId('register-login-link')).toBeInTheDocument();

      // Password requirements checklist (AUTH-08)
      expect(
        screen.getByTestId('password-criteria-checklist')
      ).toBeInTheDocument();
      expect(screen.getByTestId('criteria-min-length')).toHaveTextContent(
        /At least 8 characters/i
      );
      expect(screen.getByTestId('criteria-letters')).toHaveTextContent(
        /Contains letters/i
      );
      expect(screen.getByTestId('criteria-digits')).toHaveTextContent(
        /Contains numbers/i
      );
    });
  });

  describe('Field Validation & Error Handling (AUTH-01, AUTH-08, UI-05)', () => {
    it('validates required name field and rejects empty or too short input', async () => {
      const user = userEvent.setup();
      render(<TestRegisterApp />);

      const nameInput = screen.getByTestId('register-name-input');
      const submitBtn = screen.getByTestId('register-submit-btn');

      // Attempt to submit empty form
      await user.click(submitBtn);

      const nameErrors = await screen.findAllByText(/Full name is required/i);
      expect(nameErrors.length).toBeGreaterThan(0);

      // Single character name
      await user.type(nameInput, 'A');
      await user.tab();

      expect(
        await screen.findByText(/Full name must be at least 2 characters/i)
      ).toBeInTheDocument();
    });

    it('validates email format and displays inline error on invalid format', async () => {
      const user = userEvent.setup();
      render(<TestRegisterApp />);

      const nameInput = screen.getByTestId('register-name-input');
      const emailInput = screen.getByTestId('register-email-input');
      const submitBtn = screen.getByTestId('register-submit-btn');

      await user.type(nameInput, 'Amina Bello');
      await user.type(emailInput, 'not-an-email');
      await user.click(submitBtn);

      const errors = await screen.findAllByText(
        /Please enter a valid email address/i
      );
      expect(errors.length).toBeGreaterThan(0);
    });

    it('enforces AUTH-08 password criteria (min 8 chars containing letters and numbers)', async () => {
      const user = userEvent.setup();
      render(<TestRegisterApp />);

      const passwordInput = screen.getByTestId('register-password-input');
      const minLengthCriteria = screen.getByTestId('criteria-min-length');
      const lettersCriteria = screen.getByTestId('criteria-letters');
      const digitsCriteria = screen.getByTestId('criteria-digits');
      const submitBtn = screen.getByTestId('register-submit-btn');

      // 1. Password < 8 characters: "abc1"
      await user.type(passwordInput, 'abc1');
      expect(minLengthCriteria).toHaveTextContent('○');
      expect(lettersCriteria).toHaveTextContent('✓');
      expect(digitsCriteria).toHaveTextContent('✓');

      await user.click(submitBtn);
      const lenErrors = await screen.findAllByText(
        /Password must be at least 8 characters/i
      );
      expect(lenErrors.length).toBeGreaterThan(0);

      // 2. Password ≥ 8 characters with ONLY letters: "abcdefghi"
      await user.clear(passwordInput);
      await user.type(passwordInput, 'abcdefghi');
      expect(minLengthCriteria).toHaveTextContent('✓');
      expect(lettersCriteria).toHaveTextContent('✓');
      expect(digitsCriteria).toHaveTextContent('○');

      await user.click(submitBtn);
      const letterErrors = await screen.findAllByText(
        /Password must contain both letters and digits/i
      );
      expect(letterErrors.length).toBeGreaterThan(0);

      // 3. Password ≥ 8 characters with ONLY digits: "123456789"
      await user.clear(passwordInput);
      await user.type(passwordInput, '123456789');
      expect(minLengthCriteria).toHaveTextContent('✓');
      expect(lettersCriteria).toHaveTextContent('○');
      expect(digitsCriteria).toHaveTextContent('✓');

      await user.click(submitBtn);
      const digitErrors = await screen.findAllByText(
        /Password must contain both letters and digits/i
      );
      expect(digitErrors.length).toBeGreaterThan(0);

      // 4. Valid password with ≥ 8 chars containing letters and digits: "password123"
      await user.clear(passwordInput);
      await user.type(passwordInput, 'password123');
      expect(minLengthCriteria).toHaveTextContent('✓');
      expect(lettersCriteria).toHaveTextContent('✓');
      expect(digitsCriteria).toHaveTextContent('✓');
    });

    it('validates password confirmation match', async () => {
      const user = userEvent.setup();
      render(<TestRegisterApp />);

      const nameInput = screen.getByTestId('register-name-input');
      const emailInput = screen.getByTestId('register-email-input');
      const passwordInput = screen.getByTestId('register-password-input');
      const confirmInput = screen.getByTestId(
        'register-confirm-password-input'
      );
      const submitBtn = screen.getByTestId('register-submit-btn');

      await user.type(nameInput, 'Amina Bello');
      await user.type(emailInput, 'amina@example.ng');
      await user.type(passwordInput, 'password123');
      await user.type(confirmInput, 'different123');
      await user.click(submitBtn);

      const mismatchErrors = await screen.findAllByText(
        /Passwords do not match/i
      );
      expect(mismatchErrors.length).toBeGreaterThan(0);
    });

    it('validates phone number format when provided', async () => {
      const user = userEvent.setup();
      render(<TestRegisterApp />);

      const phoneInput = screen.getByTestId('register-phone-input');
      const submitBtn = screen.getByTestId('register-submit-btn');

      // Invalid short phone
      await user.type(phoneInput, '12345');
      await user.click(submitBtn);

      const phoneErrors = await screen.findAllByText(
        /Please enter a valid phone number \(at least 10 digits\)/i
      );
      expect(phoneErrors.length).toBeGreaterThan(0);
    });

    it('rejects registration with duplicate email with field error (AUTH-08, TC-13)', async () => {
      const user = userEvent.setup();
      render(<TestRegisterApp />);

      const nameInput = screen.getByTestId('register-name-input');
      const emailInput = screen.getByTestId('register-email-input');
      const passwordInput = screen.getByTestId('register-password-input');
      const submitBtn = screen.getByTestId('register-submit-btn');

      // Existing email in mockStore is buyer@example.com
      await user.type(nameInput, 'Amina Bello');
      await user.type(emailInput, 'buyer@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitBtn);

      // Verify rejected with field error without creating account (TC-13)
      const duplicateErrors = await screen.findAllByText(
        /The email has already been taken/i
      );
      expect(duplicateErrors.length).toBeGreaterThan(0);

      // Remains on registration form
      expect(screen.getByTestId('register-submit-btn')).toBeInTheDocument();
    });
  });

  describe('Successful Registration & Features (AUTH-01, CART-09, TC-12)', () => {
    it('successfully registers buyer and redirects to destination', async () => {
      const registerSpy = vi.spyOn(authService, 'register');
      const user = userEvent.setup();
      render(<TestRegisterApp />);

      const nameInput = screen.getByTestId('register-name-input');
      const emailInput = screen.getByTestId('register-email-input');
      const phoneInput = screen.getByTestId('register-phone-input');
      const passwordInput = screen.getByTestId('register-password-input');
      const confirmInput = screen.getByTestId(
        'register-confirm-password-input'
      );
      const submitBtn = screen.getByTestId('register-submit-btn');

      const uniqueEmail = `buyer_${Date.now()}@example.ng`;
      await user.type(nameInput, 'Zainab Umar');
      await user.type(emailInput, uniqueEmail);
      await user.type(phoneInput, '08098765432');
      await user.type(passwordInput, 'strongpass99');
      await user.type(confirmInput, 'strongpass99');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(registerSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Zainab Umar',
            email: uniqueEmail.toLowerCase(),
            phone: '08098765432',
            role: 'buyer',
            password: 'strongpass99',
          })
        );
      });

      // Navigates to home (default for buyer without redirect)
      expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    });

    it('toggles password visibility when show/hide button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestRegisterApp />);

      const passwordInput = screen.getByTestId('register-password-input');
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleBtn = screen.getAllByLabelText(/Show password/i)[0];
      await user.click(toggleBtn);

      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getAllByLabelText(/Hide password/i)[0]).toBeInTheDocument();
    });

    it('supports quick fill button for testing developer productivity', async () => {
      const user = userEvent.setup();
      render(<TestRegisterApp />);

      const quickFillBtn = screen.getByTestId('register-quick-fill-buyer');
      await user.click(quickFillBtn);

      const nameInput = screen.getByTestId('register-name-input');
      const emailInput = screen.getByTestId('register-email-input');
      const passwordInput = screen.getByTestId('register-password-input');

      expect(nameInput.value).toMatch(/Buyer User/i);
      expect(emailInput.value).toMatch(/@example.ng/i);
      expect(passwordInput.value).toBe('password123');
    });

    it('displays preserved cart notice when redirected from checkout (CART-09, TC-12)', () => {
      render(
        <TestRegisterApp initialEntries={['/register?redirect=/checkout']} />
      );

      const notice = screen.getByTestId('checkout-guest-notice');
      expect(notice).toBeInTheDocument();
      expect(notice).toHaveTextContent(STRINGS.AUTH.CHECKOUT_REDIRECT_HEADING);
      expect(notice).toHaveTextContent(/shopping cart has been preserved/i);
    });
  });
});
