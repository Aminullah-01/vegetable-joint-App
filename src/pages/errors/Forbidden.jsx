import { Link } from 'react-router-dom';
import { STRINGS } from '../../constants';
import { useAuth } from '../../hooks';

/**
 * Friendly 403 Forbidden Error Page
 * Strictly adheres to SRS ERR-04 and Figma guidelines:
 * - Friendly user-facing messaging
 * - No exposure of technical details, stack traces, or internal paths
 * - Contextual actions to return to marketplace or switch accounts
 */
export function Forbidden() {
  const { user, logout } = useAuth();

  return (
    <div
      style={{
        maxWidth: '540px',
        margin: '4rem auto',
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      }}
      role="region"
      aria-labelledby="forbidden-title"
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#fef3c7',
          color: '#b45309',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          margin: '0 auto 1.5rem auto',
        }}
        aria-hidden="true"
      >
        🔒
      </div>

      <h1
        id="forbidden-title"
        style={{
          fontSize: '1.75rem',
          color: '#1e293b',
          marginBottom: '0.75rem',
          fontWeight: '700',
        }}
      >
        {STRINGS.ERRORS.FORBIDDEN_403_TITLE}
      </h1>

      <p
        style={{
          color: '#64748b',
          fontSize: '0.95rem',
          marginBottom: '1.5rem',
          lineHeight: 1.6,
        }}
      >
        {STRINGS.ERRORS.FORBIDDEN_403_MESSAGE}
      </p>

      {user && (
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.75rem',
            fontSize: '0.85rem',
            color: '#475569',
          }}
        >
          Signed in as <strong>{user.name}</strong> ({user.role}). This area
          requires appropriate role permissions.
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/"
          style={{
            backgroundColor: '#15803d',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>🥦</span>
          <span>{STRINGS.NAV.VIEW_MARKETPLACE}</span>
        </Link>

        {user ? (
          <button
            type="button"
            onClick={logout}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#334155',
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.9rem',
            }}
          >
            Sign Out / Switch Account
          </button>
        ) : (
          <Link
            to="/login"
            style={{
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '0.9rem',
            }}
          >
            {STRINGS.NAV.SIGN_IN}
          </Link>
        )}
      </div>
    </div>
  );
}

export default Forbidden;
