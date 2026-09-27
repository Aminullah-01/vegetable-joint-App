import { Link } from 'react-router-dom';
import { STRINGS } from '../../constants';

export function ServerError() {
  return (
    <div
      style={{
        maxWidth: '500px',
        margin: '4rem auto',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <span
        style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}
      >
        ⚠️
      </span>
      <h1
        style={{ fontSize: '2rem', color: '#dc2626', marginBottom: '0.5rem' }}
      >
        {STRINGS.ERRORS.SERVER_ERROR_500_TITLE}
      </h1>
      <p
        style={{
          color: '#64748b',
          fontSize: '0.95rem',
          marginBottom: '2rem',
          lineHeight: 1.5,
        }}
      >
        {STRINGS.ERRORS.SERVER_ERROR_500_MESSAGE}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#15803d',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.9rem',
          }}
        >
          {STRINGS.BUTTONS.RELOAD}
        </button>
        <Link
          to="/"
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
          {STRINGS.NAV.VIEW_MARKETPLACE}
        </Link>
      </div>
    </div>
  );
}

export default ServerError;
