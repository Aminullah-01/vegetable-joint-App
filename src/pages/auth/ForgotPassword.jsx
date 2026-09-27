import { Link } from 'react-router-dom';

export function ForgotPassword() {
  return (
    <div style={{ maxWidth: '420px', margin: '2rem auto', width: '100%' }}>
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
          <span style={{ fontSize: '2.5rem' }}>🔑</span>
          <h1
            style={{
              fontSize: '1.5rem',
              color: '#1e293b',
              margin: '0.5rem 0 0.25rem 0',
            }}
          >
            Reset Password
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Enter your email to receive a password reset link (AUTH-06)
          </p>
        </div>

        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <label
              htmlFor="forgot-email"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
              }}
            >
              Email Address
            </label>
            <input
              id="forgot-email"
              type="email"
              placeholder="e.g. user@example.ng"
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
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Send Reset Link
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.85rem',
          }}
        >
          <Link
            to="/login"
            style={{ color: '#15803d', textDecoration: 'none' }}
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
