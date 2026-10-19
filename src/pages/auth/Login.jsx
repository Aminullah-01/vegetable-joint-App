import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../../hooks';
import { STRINGS } from '../../constants';
import { getPostLoginRedirect } from '../../routes';

// SRS AUTH-12 / AUTH-09: classify thrown API errors for friendly messaging.
function classifyAuthError(err) {
  if (err?.status === 429) return 'rate-limited';
  if (err?.status === 403) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('deactivat')) return 'deactivated';
    return 'suspended';
  }
  return 'invalid';
}

export function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // SRS AUTH-12: title for account-status messages (suspended / deactivated).
  const [errorTitle, setErrorTitle] = useState('');
  // SRS AUTH-09 / NFR-SEC-07: seconds remaining on the login throttle cooldown.
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Countdown the throttle window down to zero (then re-enable the form).
  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const id = setInterval(() => {
      setCooldownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  // Check if user was redirected from a protected route or query param (CART-09, AUTH-07)
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

  const redirectNotice = isCheckoutRedirect
    ? STRINGS.CART.GUEST_CHECKOUT_NOTICE ||
      'Please sign in or register to complete your checkout. Your shopping cart has been preserved.'
    : fromLocation
      ? 'Please sign in to access that page.'
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      const requiredMsg = STRINGS.ERRORS.REQUIRED_FIELD;
      setErrorMessage(requiredMsg);
      toast.error(requiredMsg);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setErrorTitle('');

    try {
      const response = await login({ email, password });
      const userRole = response?.user?.role;
      toast.success(`Welcome back, ${response?.user?.name || 'User'}!`);
      // Post-login redirect logic strictly adhering to AUTH-07, AUTH-13, and FE-015
      const destination = getPostLoginRedirect(userRole, fromLocation);
      navigate(destination, { replace: true });
    } catch (err) {
      const kind = classifyAuthError(err);
      const errText =
        err?.message ||
        (kind === 'rate-limited'
          ? STRINGS.AUTH.TOO_MANY_ATTEMPTS
          : STRINGS.ERRORS.INVALID_CREDENTIALS);

      if (kind === 'rate-limited') {
        // SRS AUTH-09 / NFR-SEC-07: friendly cooldown before re-enabling submit.
        setErrorMessage(
          STRINGS.AUTH.TOO_MANY_ATTEMPTS_WAIT(err?.retryAfter || 60)
        );
        setCooldownSeconds(err?.retryAfter || 60);
      } else {
        setErrorMessage(errText);
        setErrorTitle(
          kind === 'suspended'
            ? STRINGS.AUTH.ACCOUNT_SUSPENDED_TITLE
            : kind === 'deactivated'
              ? STRINGS.AUTH.ACCOUNT_DEACTIVATED_TITLE
              : ''
        );
      }
      toast.error(errText);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (
    demoEmail,
    demoPassword = 'password123',
    demoRole = ''
  ) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage('');
    setErrorTitle('');
    toast.info(`Filled credentials for ${demoRole || demoEmail}`);
  };

  const isRateLimited = cooldownSeconds > 0;
  const isSubmitDisabled = isSubmitting || isRateLimited;

  return (
    <div style={{ maxWidth: '440px', margin: '2rem auto', width: '100%' }}>
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
          <span
            style={{ fontSize: '2.5rem' }}
            role="img"
            aria-label="Vegetable"
          >
            🥦
          </span>
          <h1
            style={{
              fontSize: '1.5rem',
              color: '#1e293b',
              margin: '0.5rem 0 0.25rem 0',
            }}
          >
            Sign In to Vegetable Joint
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Access buyer, seller, or admin areas (SRS: AUTH-04, AUTH-07)
          </p>
        </div>

        {/* Redirect Notice Banner (CART-09, AUTH-07) */}
        {isCheckoutRedirect ? (
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
                Please sign in or register to complete your checkout. Your
                shopping cart has been preserved and will remain intact.
              </div>
            </div>
          </div>
        ) : redirectNotice ? (
          <div
            style={{
              backgroundColor: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              padding: '0.75rem',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            data-testid="login-redirect-notice"
          >
            <span>🔒</span>
            <span>{redirectNotice}</span>
          </div>
        ) : null}

        {/* Error Alert (AUTH-04, AUTH-09, ERR-01: generic, non-enumerating) */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: isRateLimited ? '#fef3c7' : '#fee2e2',
              color: isRateLimited ? '#92400e' : '#b91c1c',
              border: `1px solid ${isRateLimited ? '#fde68a' : '#fca5a5'}`,
              borderRadius: '6px',
              padding: '0.75rem',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
            role="alert"
            data-testid="login-error-message"
          >
            {errorTitle && (
              <div
                style={{ fontWeight: 700, marginBottom: '0.25rem' }}
                data-testid="login-error-title"
              >
                {errorTitle}
              </div>
            )}
            <div>{errorMessage}</div>
            {isRateLimited && (
              <div
                style={{ marginTop: '0.4rem', fontWeight: 600 }}
                data-testid="login-cooldown-countdown"
                role="status"
              >
                You can try again in {cooldownSeconds}{' '}
                {cooldownSeconds === 1 ? 'second' : 'seconds'}.
              </div>
            )}
          </div>
        )}

        <form
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="login-email"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
                color: '#334155',
              }}
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. buyer@example.com"
              required
              disabled={isSubmitting}
              autoComplete="email"
              data-testid="login-email-input"
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
                color: '#334155',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isSubmitting}
                autoComplete="current-password"
                data-testid="login-password-input"
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                  fontSize: '0.9rem',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                data-testid="login-password-toggle-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '0.25rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '0.8rem',
            }}
          >
            <Link
              to="/forgot-password"
              data-testid="login-forgot-link"
              style={{ color: '#15803d', textDecoration: 'none' }}
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            data-testid="login-submit-btn"
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              opacity: isSubmitDisabled ? 0.7 : 1,
              transition: 'background-color 0.2s',
            }}
          >
            {isRateLimited
              ? `Retry in ${cooldownSeconds}s`
              : isSubmitting
                ? 'Signing in...'
                : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Role Selectors (Facilitates testing FE-015 route guards) */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px dashed #e2e8f0',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
              textAlign: 'center',
            }}
          >
            Quick Role Switcher for Testing (AUTH-07):
          </p>
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() =>
                handleQuickFill('buyer@example.com', 'password123', 'Buyer')
              }
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                color: '#0f172a',
              }}
            >
              🛒 Buyer
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickFill('seller@arewafarms.ng', 'password123', 'Seller')
              }
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                color: '#0f172a',
              }}
            >
              🌾 Seller (Approved)
            </button>
            <button
              type="button"
              data-testid="login-quick-fill-pending-seller"
              onClick={() =>
                handleQuickFill(
                  'pending@newfarm.ng',
                  'password123',
                  'Pending Seller'
                )
              }
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid #fde68a',
                backgroundColor: '#fffbeb',
                cursor: 'pointer',
                color: '#92400e',
              }}
            >
              ⏳ Pending Seller
            </button>
            <button
              type="button"
              data-testid="login-quick-fill-suspended-seller"
              onClick={() =>
                handleQuickFill(
                  'suspended@seller.ng',
                  'password123',
                  'Suspended Seller'
                )
              }
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid #fecdd3',
                backgroundColor: '#fff1f2',
                cursor: 'pointer',
                color: '#9f1239',
              }}
            >
              🚫 Suspended Seller
            </button>
            <button
              type="button"
              data-testid="login-quick-fill-rejected-seller"
              onClick={() =>
                handleQuickFill(
                  'rejected@farm.ng',
                  'password123',
                  'Rejected Seller'
                )
              }
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                cursor: 'pointer',
                color: '#991b1b',
              }}
            >
              ✕ Rejected Seller
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickFill('admin@example.com', 'password123', 'Admin')
              }
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                color: '#0f172a',
              }}
            >
              ⚙️ Admin
            </button>
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.25rem',
            fontSize: '0.85rem',
            color: '#64748b',
          }}
        >
          Don&apos;t have an account?{' '}
          <Link
            to={{
              pathname: '/register',
              search: location.search,
            }}
            state={location.state}
            data-testid="login-register-link"
            style={{
              color: '#15803d',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
