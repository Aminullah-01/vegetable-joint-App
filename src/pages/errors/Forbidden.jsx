import { Link } from 'react-router-dom';
import { STRINGS } from '../../constants';

export function Forbidden() {
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
        ⛔
      </span>
      <h1
        style={{ fontSize: '2rem', color: '#b45309', marginBottom: '0.5rem' }}
      >
        {STRINGS.ERRORS.FORBIDDEN_403_TITLE}
      </h1>
      <p
        style={{
          color: '#64748b',
          fontSize: '0.95rem',
          marginBottom: '2rem',
          lineHeight: 1.5,
        }}
      >
        {STRINGS.ERRORS.FORBIDDEN_403_MESSAGE}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <Link
          to="/"
          style={{
            backgroundColor: '#15803d',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          {STRINGS.NAV.VIEW_MARKETPLACE}
        </Link>
        <Link
          to="/login"
          style={{
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '0.65rem 1.25rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          {STRINGS.NAV.SIGN_IN}
        </Link>
      </div>
    </div>
  );
}

export default Forbidden;
