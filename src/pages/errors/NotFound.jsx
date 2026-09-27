import { Link } from 'react-router-dom';

export function NotFound() {
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
        🔍
      </span>
      <h1
        style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '0.5rem' }}
      >
        404 — Page Not Found
      </h1>
      <p
        style={{
          color: '#64748b',
          fontSize: '0.95rem',
          marginBottom: '2rem',
          lineHeight: 1.5,
        }}
      >
        The vegetable listing or page you were looking for doesn&apos;t exist or
        may have been moved (ERR-04).
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
          Back to Home
        </Link>
        <Link
          to="/products"
          style={{
            border: '1px solid #15803d',
            color: '#15803d',
            padding: '0.65rem 1.25rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          Browse All Vegetables
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
