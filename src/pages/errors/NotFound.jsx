import { Link } from 'react-router-dom';
import { STRINGS } from '../../constants';

/**
 * Friendly 404 Page Not Found Error Page
 * Strictly adheres to SRS ERR-04 and Figma guidelines:
 * - Friendly user-facing messaging
 * - Clear guidance to return to marketplace or browse vegetables
 */
export function NotFound() {
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
      aria-labelledby="not-found-title"
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#f0fdf4',
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          margin: '0 auto 1.5rem auto',
        }}
        aria-hidden="true"
      >
        🔍
      </div>

      <h1
        id="not-found-title"
        style={{
          fontSize: '1.75rem',
          color: '#1e293b',
          marginBottom: '0.75rem',
          fontWeight: '700',
        }}
      >
        {STRINGS.ERRORS.NOT_FOUND_404_TITLE}
      </h1>

      <p
        style={{
          color: '#64748b',
          fontSize: '0.95rem',
          marginBottom: '2rem',
          lineHeight: 1.6,
        }}
      >
        {STRINGS.ERRORS.NOT_FOUND_404_MESSAGE}
      </p>

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
          <span>{STRINGS.NAV.HOME}</span>
        </Link>
        <Link
          to="/products"
          style={{
            border: '1px solid #cbd5e1',
            color: '#334155',
            backgroundColor: '#f8fafc',
            padding: '0.65rem 1.25rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '0.9rem',
          }}
        >
          {STRINGS.NAV.BROWSE_VEGETABLES}
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
