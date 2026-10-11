import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../../hooks';
import { STRINGS } from '../../constants';
import { getPostLoginRedirect } from '../../routes';

/**
 * Register — Account Registration Page
 *
 * SRS References:
 * - AUTH-01: Buyer registration (Name, email, phone, password).
 * - AUTH-02: Seller registration (Buyer fields + business name, location, description).
 * - CART-09: A guest who proceeds to checkout shall be asked to log in or register
 *   and shall retain their cart after authenticating.
 * - TC-12: Guest proceeds to checkout -> Prompted to log in/register; cart retained afterwards.
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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('buyer');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [sellerLocation, setSellerLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      const requiredMsg = STRINGS.ERRORS.REQUIRED_FIELD;
      setErrorMessage(requiredMsg);
      toast.error(requiredMsg);
      return;
    }

    if (password.length < 8) {
      const passMsg = 'Password must be at least 8 characters.';
      setErrorMessage(passMsg);
      toast.error(passMsg);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
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
      toast.success(
        `Welcome to Vegetable Joint, ${response?.user?.name || name}!`
      );

      // Post-registration redirect logic (CART-09 returns to /checkout for buyer)
      const destination = getPostLoginRedirect(userRole, fromLocation);
      navigate(destination, { replace: true });
    } catch (err) {
      const errText =
        err?.errors?.email?.[0] ||
        err?.message ||
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
    setErrorMessage('');
    toast.info('Filled quick buyer registration details');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto', width: '100%' }}>
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2.5rem' }}>🌱</span>
          <h1
            style={{
              fontSize: '1.5rem',
              color: '#1e293b',
              margin: '0.5rem 0 0.25rem 0',
            }}
          >
            Join Vegetable Joint
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Create an account as a Buyer or Vegetable Seller (AUTH-01, AUTH-02)
          </p>
        </div>

        {/* Redirect Notice Banner (CART-09) */}
        {isCheckoutRedirect && (
          <div
            data-testid="checkout-guest-notice"
            role="status"
            style={{
              backgroundColor: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '0.875rem 1rem',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
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
                Ready to complete your order?
              </div>
              <div>
                Create an account to complete your checkout. Your shopping cart
                has been preserved and will remain intact.
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              padding: '0.75rem',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
            role="alert"
            data-testid="register-error-alert"
          >
            {errorMessage}
          </div>
        )}

        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="reg-name"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
              }}
            >
              Full Name *
            </label>
            <input
              id="reg-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aminu Abubakar"
              required
              data-testid="register-name-input"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="reg-email"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
              }}
            >
              Email Address *
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aminu@example.ng"
              required
              data-testid="register-email-input"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="reg-phone"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
              }}
            >
              Phone Number
            </label>
            <input
              id="reg-phone"
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +2348012345678"
              data-testid="register-phone-input"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="reg-role"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
              }}
            >
              I want to:
            </label>
            <select
              id="reg-role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              data-testid="register-role-select"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="buyer">Buy fresh vegetables (Buyer)</option>
              <option value="seller">
                Sell vegetables / Farm produce (Seller)
              </option>
            </select>
          </div>

          {role === 'seller' && (
            <>
              <div>
                <label
                  htmlFor="reg-business-name"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    marginBottom: '0.25rem',
                  }}
                >
                  Business / Farm Name *
                </label>
                <input
                  id="reg-business-name"
                  name="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Arewa Fresh Farms Ltd"
                  data-testid="register-business-name-input"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="reg-seller-location"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    marginBottom: '0.25rem',
                  }}
                >
                  Location / State
                </label>
                <input
                  id="reg-seller-location"
                  name="sellerLocation"
                  type="text"
                  value={sellerLocation}
                  onChange={(e) => setSellerLocation(e.target.value)}
                  placeholder="e.g. Kano, Nigeria"
                  data-testid="register-location-input"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="reg-description"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    marginBottom: '0.25rem',
                  }}
                >
                  Farm / Seller Description
                </label>
                <textarea
                  id="reg-description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="2"
                  placeholder="Briefly describe the vegetables you grow or sell..."
                  data-testid="register-description-input"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="reg-password"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
              }}
            >
              Password * (Minimum 8 characters)
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              data-testid="register-password-input"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="register-submit-btn"
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              marginTop: '0.5rem',
              minHeight: '44px',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'background-color 0.2s',
            }}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Quick Fill for testing */}
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '0.75rem',
            borderTop: '1px dashed #e2e8f0',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={handleQuickFillBuyer}
            data-testid="register-quick-fill-buyer"
            style={{
              fontSize: '0.75rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              color: '#0f172a',
            }}
          >
            ⚡ Quick Fill New Buyer
          </button>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.25rem',
            fontSize: '0.85rem',
            color: '#64748b',
          }}
        >
          Already have an account?{' '}
          <Link
            to={{
              pathname: '/login',
              search: location.search,
            }}
            state={location.state}
            data-testid="register-login-link"
            style={{
              color: '#15803d',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
