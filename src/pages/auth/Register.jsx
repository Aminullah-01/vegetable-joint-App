import { useState, useId } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../../hooks';
import { STRINGS } from '../../constants';
import { getPostLoginRedirect } from '../../routes';
import { Input } from '../../components/common/Input';
import {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  getPasswordCriteria,
  validateConfirmPassword,
} from '../../utils/validation';

/**
 * Register — Account Registration Page
 *
 * SRS References:
 * - AUTH-01: Guest registration as a Buyer (Name, email address, phone number, password).
 * - AUTH-02: Guest registration as a Seller (Buyer fields + business name, location, description).
 * - AUTH-08: Enforce unique email addresses and minimum password length of 8 characters containing letters and digits.
 * - CART-09 & TC-12: Guest proceeding to checkout is prompted to log in/register and retains cart.
 * - UI-05: Simple forms with inline validation, helpful error messages, and disabled state during submission.
 * - NFR-USAB-02 / NFR-USAB-03: Accessible labels, inline error alerts, touch targets ≥ 44px.
 */
export function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract fromLocation from state or query params (CART-09, AUTH-07)
  const searchParams = new URLSearchParams(location.search);
  const redirectParam =
    searchParams.get('redirect') || searchParams.get('returnUrl');
  const roleParam = searchParams.get('role');
  const fromLocation =
    location.state?.from ||
    (redirectParam ? { pathname: redirectParam } : null);

  const fromPath =
    typeof fromLocation === 'string'
      ? fromLocation
      : fromLocation?.pathname || '';
  const isCheckoutRedirect = Boolean(
    fromPath && fromPath.startsWith('/checkout')
  );

  const [role, setRole] = useState(() =>
    roleParam === 'seller' ? 'seller' : 'buyer'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Seller specific fields (AUTH-02)
  const [businessName, setBusinessName] = useState('');
  const [sellerLocation, setSellerLocation] = useState('');
  const [description, setDescription] = useState('');

  // Form states and validation
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const nameInputId = useId();
  const emailInputId = useId();
  const phoneInputId = useId();
  const passwordInputId = useId();
  const confirmPasswordInputId = useId();
  const businessNameInputId = useId();
  const locationInputId = useId();
  const descriptionInputId = useId();

  // Real-time password criteria assessment (AUTH-08)
  const passwordCriteria = getPasswordCriteria(password);

  const handleBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    validateField(fieldName);
  };

  const validateField = (fieldName) => {
    let error = null;

    switch (fieldName) {
      case 'name':
        error = validateName(name);
        break;
      case 'email':
        error = validateEmail(email);
        break;
      case 'phone':
        if (phone.trim()) {
          error = validatePhone(phone, false);
        }
        break;
      case 'password':
        error = validatePassword(password);
        break;
      case 'confirmPassword':
        if (confirmPassword) {
          error = validateConfirmPassword(password, confirmPassword);
        }
        break;
      default:
        break;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[fieldName] = error;
      } else {
        delete next[fieldName];
      }
      return next;
    });

    return !error;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    // Validate fields
    const errors = {};
    const nameErr = validateName(name);
    if (nameErr) errors.name = nameErr;

    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;

    if (phone.trim()) {
      const phoneErr = validatePhone(phone, false);
      if (phoneErr) errors.phone = phoneErr;
    }

    const passErr = validatePassword(password);
    if (passErr) errors.password = passErr;

    if (confirmPassword && confirmPassword !== password) {
      errors.confirmPassword =
        STRINGS.AUTH.PASSWORDS_DONT_MATCH || 'Passwords do not match.';
    }

    if (role === 'seller' && !businessName.trim()) {
      errors.businessName = 'Business or Farm name is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      setErrorMessage(firstError);
      toast.error(firstError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '+2348000000000',
        role,
        password,
      };

      if (role === 'seller') {
        payload.business_name =
          businessName.trim() || `${name.trim()}'s Farm Produce`;
        payload.location = sellerLocation.trim() || 'Lagos';
        payload.description =
          description.trim() || 'Verified vegetable farm seller';
      }

      const response = await register(payload);
      const userRole = response?.user?.role || role;
      const registeredName = response?.user?.name || name.trim();
      const welcomeMsg =
        typeof STRINGS.AUTH.BUYER_REGISTRATION_SUCCESS === 'function'
          ? STRINGS.AUTH.BUYER_REGISTRATION_SUCCESS(registeredName)
          : `Welcome to Vegetable Joint, ${registeredName}!`;

      setSuccessMessage(welcomeMsg);
      toast.success(welcomeMsg);

      // Post-registration redirect logic (CART-09 preserves cart and returns to /checkout)
      const destination = getPostLoginRedirect(userRole, fromLocation);
      navigate(destination, { replace: true });
    } catch (err) {
      // Map 422 validation errors to specific fields per AUTH-08 & TC-13
      if (err?.errors) {
        setFieldErrors((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(err.errors).map(([k, v]) => [
              k,
              Array.isArray(v) ? v[0] : v,
            ])
          ),
        }));
      }

      const emailConflict =
        err?.errors?.email?.[0] ||
        (err?.message && err.message.toLowerCase().includes('email')
          ? err.message
          : null);

      const errText =
        emailConflict ||
        err?.message ||
        STRINGS.AUTH.EMAIL_ALREADY_EXISTS ||
        'Registration failed. Please check your details.';

      setErrorMessage(errText);
      toast.error(errText);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFillBuyer = () => {
    const timestamp = Date.now().toString().slice(-4);
    setName(`Buyer User ${timestamp}`);
    setEmail(`newbuyer${timestamp}@example.ng`);
    setPhone('+2348091234567');
    setRole('buyer');
    setPassword('password123');
    setConfirmPassword('password123');
    setFieldErrors({});
    setErrorMessage('');
    toast.info('Filled quick buyer registration details');
  };

  return (
    <div style={{ maxWidth: '520px', margin: '2rem auto', width: '100%' }}>
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2.25rem 2rem',
          boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Header (Figma Section 8 / AUTH-01) */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <span
            style={{ fontSize: '2.5rem', display: 'inline-block' }}
            role="img"
            aria-label="Vegetable Joint sprout"
          >
            🌱
          </span>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0.5rem 0 0.35rem 0',
              lineHeight: 1.25,
            }}
          >
            {STRINGS.AUTH.REGISTER_TITLE || 'Join Vegetable Joint'}
          </h1>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.875rem',
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            {role === 'seller'
              ? STRINGS.AUTH.REGISTER_SELLER_SUBTITLE ||
                'Register as Vegetable Seller — List farm produce and reach thousands of buyers across Nigeria (AUTH-02)'
              : STRINGS.AUTH.REGISTER_BUYER_SUBTITLE ||
                'Create a Buyer Account — Buy fresh vegetables directly from local farmers and vendors (AUTH-01, AUTH-08)'}
          </p>
        </div>

        {/* Role Segmented Selection (Figma Section 8: Allow visitor to choose Buyer or Seller) */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            id="role-selection-label"
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '0.5rem',
            }}
          >
            {STRINGS.AUTH.ROLE_CHOICE_LABEL || 'Select Account Type:'}
          </label>
          <div
            role="tablist"
            aria-labelledby="role-selection-label"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              backgroundColor: '#f1f5f9',
              padding: '0.25rem',
              borderRadius: '10px',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={role === 'buyer'}
              data-testid="register-role-buyer-tab"
              onClick={() => {
                setRole('buyer');
                setFieldErrors({});
                setErrorMessage('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                minHeight: '44px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: role === 'buyer' ? '#ffffff' : 'transparent',
                color: role === 'buyer' ? '#15803d' : '#64748b',
                fontWeight: role === 'buyer' ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow:
                  role === 'buyer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🛒</span>
              <span>{STRINGS.AUTH.ROLE_BUYER_TAB || 'Register as Buyer'}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === 'seller'}
              data-testid="register-role-seller-tab"
              onClick={() => {
                setRole('seller');
                setFieldErrors({});
                setErrorMessage('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                minHeight: '44px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: role === 'seller' ? '#ffffff' : 'transparent',
                color: role === 'seller' ? '#15803d' : '#64748b',
                fontWeight: role === 'seller' ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow:
                  role === 'seller' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🌾</span>
              <span>
                {STRINGS.AUTH.ROLE_SELLER_TAB || 'Register as Seller'}
              </span>
            </button>
          </div>
          {/* Hidden select preserved for backward compatibility */}
          <select
            id="reg-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            data-testid="register-role-select"
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          >
            <option value="buyer">Buy fresh vegetables (Buyer)</option>
            <option value="seller">
              Sell vegetables / Farm produce (Seller)
            </option>
          </select>
        </div>

        {/* Redirect Notice Banner (CART-09, TC-12) */}
        {isCheckoutRedirect && (
          <div
            data-testid="checkout-guest-notice"
            role="status"
            style={{
              backgroundColor: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '0.875rem 1rem',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              lineHeight: 1.45,
            }}
          >
            <span
              style={{ fontSize: '1.35rem', lineHeight: 1 }}
              aria-hidden="true"
            >
              🛒
            </span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>
                {STRINGS.AUTH.CHECKOUT_REDIRECT_HEADING ||
                  'Ready to complete your order?'}
              </div>
              <div>
                {STRINGS.AUTH.CHECKOUT_REDIRECT_TEXT ||
                  'Create an account to complete your checkout. Your shopping cart has been preserved and will remain intact.'}
              </div>
            </div>
          </div>
        )}

        {/* Global Error Alert */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              lineHeight: 1.4,
            }}
            role="alert"
            data-testid="register-error-alert"
          >
            <span aria-hidden="true">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
            }}
            role="status"
            data-testid="register-success-alert"
          >
            {successMessage}
          </div>
        )}

        {/* Registration Form */}
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}
          onSubmit={handleSubmit}
          noValidate
        >
          {/* 1. Full Name (AUTH-01) */}
          <Input
            id={nameInputId}
            name="name"
            type="text"
            label={STRINGS.AUTH.FULL_NAME_LABEL || 'Full Name'}
            placeholder={STRINGS.AUTH.NAME_PLACEHOLDER || 'e.g. Amina Bello'}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) validateField('name');
            }}
            onBlur={() => handleBlur('name')}
            error={touched.name ? fieldErrors.name : null}
            required
            autoComplete="name"
            disabled={isSubmitting}
            data-testid="register-name-input"
          />

          {/* 2. Email Address (AUTH-01, AUTH-08) */}
          <Input
            id={emailInputId}
            name="email"
            type="email"
            label={STRINGS.AUTH.EMAIL_LABEL || 'Email Address'}
            placeholder={
              STRINGS.AUTH.EMAIL_PLACEHOLDER || 'e.g. amina@example.ng'
            }
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) validateField('email');
            }}
            onBlur={() => handleBlur('email')}
            error={fieldErrors.email}
            required
            autoComplete="email"
            disabled={isSubmitting}
            data-testid="register-email-input"
          />

          {/* 3. Phone Number (AUTH-01) */}
          <Input
            id={phoneInputId}
            name="phone"
            type="tel"
            label={STRINGS.AUTH.PHONE_LABEL || 'Phone Number'}
            placeholder={
              STRINGS.AUTH.PHONE_PLACEHOLDER ||
              'e.g. 08012345678 or +2348012345678'
            }
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (fieldErrors.phone) validateField('phone');
            }}
            onBlur={() => handleBlur('phone')}
            error={touched.phone ? fieldErrors.phone : null}
            autoComplete="tel"
            disabled={isSubmitting}
            data-testid="register-phone-input"
          />

          {/* 4. Password (AUTH-01, AUTH-08: ≥ 8 chars with letters & digits) */}
          <div>
            <Input
              id={passwordInputId}
              name="password"
              type="password"
              label={
                <span>
                  {STRINGS.AUTH.PASSWORD_LABEL || 'Password'}{' '}
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      color: '#64748b',
                    }}
                  >
                    (min 8 characters)
                  </span>
                </span>
              }
              placeholder={
                STRINGS.AUTH.PASSWORD_PLACEHOLDER ||
                'Minimum 8 characters with letters & numbers'
              }
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) validateField('password');
              }}
              onBlur={() => handleBlur('password')}
              error={fieldErrors.password}
              required
              autoComplete="new-password"
              showPasswordToggle={true}
              disabled={isSubmitting}
              data-testid="register-password-input"
            />

            {/* Live Password Criteria Visual Checklist (AUTH-08) */}
            <div
              style={{
                marginTop: '0.45rem',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #f1f5f9',
                fontSize: '0.75rem',
              }}
              data-testid="password-criteria-checklist"
              aria-label="Password requirements"
            >
              <div
                style={{
                  color: '#475569',
                  fontWeight: 600,
                  marginBottom: '0.35rem',
                }}
              >
                Password requirements:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <div
                  data-testid="criteria-min-length"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: passwordCriteria.hasMinLength
                      ? '#16a34a'
                      : '#64748b',
                    fontWeight: passwordCriteria.hasMinLength ? 600 : 400,
                  }}
                >
                  <span>{passwordCriteria.hasMinLength ? '✓' : '○'}</span>
                  <span>
                    {STRINGS.AUTH.PASSWORD_RULE_LENGTH ||
                      'At least 8 characters'}
                  </span>
                </div>
                <div
                  data-testid="criteria-letters"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: passwordCriteria.hasLetter ? '#16a34a' : '#64748b',
                    fontWeight: passwordCriteria.hasLetter ? 600 : 400,
                  }}
                >
                  <span>{passwordCriteria.hasLetter ? '✓' : '○'}</span>
                  <span>
                    {STRINGS.AUTH.PASSWORD_RULE_LETTERS ||
                      'Contains letters (a-z)'}
                  </span>
                </div>
                <div
                  data-testid="criteria-digits"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: passwordCriteria.hasDigit ? '#16a34a' : '#64748b',
                    fontWeight: passwordCriteria.hasDigit ? 600 : 400,
                  }}
                >
                  <span>{passwordCriteria.hasDigit ? '✓' : '○'}</span>
                  <span>
                    {STRINGS.AUTH.PASSWORD_RULE_NUMBERS ||
                      'Contains numbers (0-9)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Confirm Password */}
          <Input
            id={confirmPasswordInputId}
            name="confirmPassword"
            type="password"
            label={STRINGS.AUTH.CONFIRM_PASSWORD_LABEL || 'Confirm Password'}
            placeholder={
              STRINGS.AUTH.CONFIRM_PASSWORD_PLACEHOLDER ||
              'Re-enter your password'
            }
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) validateField('confirmPassword');
            }}
            onBlur={() => handleBlur('confirmPassword')}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
            showPasswordToggle={true}
            disabled={isSubmitting}
            data-testid="register-confirm-password-input"
          />

          {/* 6. Seller Fields (AUTH-02) */}
          {role === 'seller' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                paddingTop: '0.5rem',
                borderTop: '1px dashed #e2e8f0',
              }}
            >
              <Input
                id={businessNameInputId}
                name="businessName"
                type="text"
                label="Business / Farm Name"
                placeholder="e.g. Arewa Fresh Farms Ltd"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                error={fieldErrors.businessName}
                required
                disabled={isSubmitting}
                data-testid="register-business-name-input"
              />

              <Input
                id={locationInputId}
                name="sellerLocation"
                type="text"
                label="Farm / Stall Location"
                placeholder="e.g. Kano, Nigeria"
                value={sellerLocation}
                onChange={(e) => setSellerLocation(e.target.value)}
                disabled={isSubmitting}
                data-testid="register-location-input"
              />

              <div>
                <label
                  htmlFor={descriptionInputId}
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.375rem',
                  }}
                >
                  Farm / Seller Description
                </label>
                <textarea
                  id={descriptionInputId}
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="2"
                  placeholder="Briefly describe the vegetables you grow or sell..."
                  disabled={isSubmitting}
                  data-testid="register-description-input"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="register-submit-btn"
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              marginTop: '0.5rem',
              minHeight: '44px',
              opacity: isSubmitting ? 0.75 : 1,
              transition: 'background-color 0.2s ease, opacity 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {isSubmitting ? (
              <>
                <span>⏳</span>
                <span>
                  {STRINGS.AUTH.SUBMITTING_BTN || 'Creating Account...'}
                </span>
              </>
            ) : role === 'seller' ? (
              STRINGS.AUTH.ROLE_SELLER_TAB || 'Register as Seller'
            ) : (
              STRINGS.AUTH.REGISTER_BUYER_BTN || 'Create Buyer Account'
            )}
          </button>
        </form>

        {/* Quick Fill for Testing / Development */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '0.85rem',
            borderTop: '1px dashed #e2e8f0',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={handleQuickFillBuyer}
            data-testid="register-quick-fill-buyer"
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              color: '#334155',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>⚡</span>
            <span>Quick Fill New Buyer</span>
          </button>
        </div>

        {/* Navigation Link to Sign In */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '1.25rem',
            fontSize: '0.875rem',
            color: '#64748b',
          }}
        >
          {STRINGS.AUTH.HAVE_ACCOUNT_PROMPT || 'Already have an account?'}{' '}
          <Link
            to={{
              pathname: '/login',
              search: location.search,
            }}
            state={location.state}
            data-testid="register-login-link"
            style={{
              color: '#15803d',
              fontWeight: 700,
              textDecoration: 'none',
              padding: '0.25rem',
              display: 'inline-block',
              minHeight: '44px',
              lineHeight: '44px',
            }}
          >
            {STRINGS.AUTH.SIGN_IN_LINK || 'Sign In'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
