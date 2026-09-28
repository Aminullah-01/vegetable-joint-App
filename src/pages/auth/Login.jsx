import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../../hooks';
import { STRINGS } from '../../constants';
import { getPostLoginRedirect } from '../../routes';

export function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check if user was redirected from a protected route
  const fromLocation = location.state?.from;
  const redirectNotice = fromLocation
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

    try {
      const response = await login({ email, password });
      const userRole = response?.user?.role;
      toast.success(`Welcome back, ${response?.user?.name || 'User'}!`);
      // Post-login redirect logic strictly adhering to AUTH-07, AUTH-13, and FE-015
      const destination = getPostLoginRedirect(userRole, fromLocation);
      navigate(destination, { replace: true });
    } catch (err) {
      const errText = err?.message || STRINGS.ERRORS.INVALID_CREDENTIALS;
      setErrorMessage(errText);
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
    toast.info(`Filled credentials for ${demoRole || demoEmail}`);
  };

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

        {/* Redirect Notice Banner */}
        {redirectNotice && (
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
          >
            <span>🔒</span>
            <span>{redirectNotice}</span>
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
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isSubmitting}
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

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '0.8rem',
            }}
          >
            <Link
              to="/forgot-password"
              style={{ color: '#15803d', textDecoration: 'none' }}
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'background-color 0.2s',
            }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
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
            style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}
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
              🌾 Seller
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
            to="/register"
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
