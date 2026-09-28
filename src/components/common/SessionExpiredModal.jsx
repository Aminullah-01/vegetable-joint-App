import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { STRINGS } from '../../constants';
import { ROUTES } from '../../routes';

/**
 * Session Expired Modal Prompt
 * Strictly adheres to SRS ERR-04 and FE-016:
 * - "a session-expired prompt that returns the user to login and back."
 * - Catches 401 unauthorized token expirations and guides user to sign in again
 * - Preserves the user's active page in route state to return post-authentication
 */
export function SessionExpiredModal() {
  const { isSessionExpired, dismissSessionExpired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isSessionExpired) {
    return null;
  }

  const handleSignInAgain = () => {
    dismissSessionExpired();
    // Navigate to login with current location preserved in state.from
    navigate(ROUTES.LOGIN, {
      state: { from: location },
      replace: true,
    });
  };

  const handleDismiss = () => {
    dismissSessionExpired();
    // If currently on a protected route, redirect to home as guest
    const currentPath = location.pathname;
    const isProtectedRoute =
      currentPath.startsWith('/seller') ||
      currentPath.startsWith('/admin') ||
      currentPath.startsWith('/account') ||
      currentPath.startsWith('/checkout');

    if (isProtectedRoute) {
      navigate(ROUTES.HOME, { replace: true });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(2px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      data-testid="session-expired-modal"
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          maxWidth: '440px',
          width: '100%',
          padding: '2rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1.25rem auto',
          }}
          aria-hidden="true"
        >
          ⌛
        </div>

        <h2
          id="session-expired-title"
          style={{
            fontSize: '1.35rem',
            color: '#1e293b',
            marginBottom: '0.5rem',
            fontWeight: '700',
          }}
        >
          Session Expired
        </h2>

        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            marginBottom: '1.75rem',
          }}
        >
          {STRINGS.ERRORS.SESSION_EXPIRED}
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          <button
            type="button"
            onClick={handleSignInAgain}
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'background-color 0.15s ease-in-out',
            }}
          >
            Sign In Again
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              backgroundColor: '#f8fafc',
              color: '#475569',
              padding: '0.65rem 1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionExpiredModal;
