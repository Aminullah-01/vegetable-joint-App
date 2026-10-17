import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../hooks';
import { STRINGS } from '../../constants';
import { authService } from '../../services';
import { validateEmail } from '../../utils';

export function ForgotPassword() {
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  // AUTH-06 (mock only): a simulated reset link so the demo can complete the
  // flow without a real transactional email provider.
  const [mockResetHref, setMockResetHref] = useState('');

  const handleBlur = () => {
    setEmailError(validateEmail(email) || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    setEmailError(emailErr || '');
    if (emailErr) {
      setErrorMessage(emailErr);
      toast.error(emailErr);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setMockResetHref('');

    try {
      const response = await authService.forgotPassword({ email });
      const message = response?.message || STRINGS.AUTH.FORGOT_SUCCESS;
      setSuccessMessage(message);
      toast.success(message);

      // Mock mode returns a token because there is no email delivery.
      if (response?.reset_token) {
        const params = new URLSearchParams({
          token: response.reset_token,
          email: email.trim().toLowerCase(),
        });
        setMockResetHref(`/reset-password?${params.toString()}`);
      }
    } catch (err) {
      const errText = err?.message || STRINGS.ERRORS.UNABLE_TO_LOAD;
      setErrorMessage(errText);
      toast.error(errText);
    } finally {
      setIsSubmitting(false);
    }
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
          <span style={{ fontSize: '2.5rem' }} role="img" aria-label="Key">
            🔑
          </span>
          <h1
            style={{
              fontSize: '1.5rem',
              color: '#1e293b',
              margin: '0.5rem 0 0.25rem 0',
            }}
          >
            {STRINGS.AUTH.FORGOT_TITLE}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            {STRINGS.AUTH.FORGOT_SUBTITLE} (AUTH-06)
          </p>
        </div>

        {successMessage ? (
          <div
            data-testid="forgot-success-message"
            role="status"
            style={{
              backgroundColor: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              padding: '0.875rem 1rem',
              fontSize: '0.85rem',
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
              📧
            </div>
            {successMessage}
          </div>
        ) : (
          <form
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            onSubmit={handleSubmit}
          >
            {errorMessage && (
              <div
                role="alert"
                data-testid="forgot-error-message"
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.85rem',
                }}
              >
                {errorMessage}
              </div>
            )}

            <div>
              <label
                htmlFor="forgot-email"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                  color: '#334155',
                }}
              >
                {STRINGS.AUTH.EMAIL_LABEL}
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                onBlur={handleBlur}
                placeholder={STRINGS.AUTH.EMAIL_PLACEHOLDER}
                required
                disabled={isSubmitting}
                autoComplete="email"
                data-testid="forgot-email-input"
                aria-invalid={emailError ? 'true' : 'false'}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '6px',
                  border: `1px solid ${emailError ? '#fca5a5' : '#cbd5e1'}`,
                  boxSizing: 'border-box',
                  fontSize: '0.9rem',
                }}
              />
              {emailError && (
                <p
                  data-testid="forgot-email-error"
                  style={{
                    color: '#b91c1c',
                    fontSize: '0.75rem',
                    margin: '0.25rem 0 0 0',
                  }}
                >
                  {emailError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="forgot-submit-btn"
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
              }}
            >
              {isSubmitting
                ? STRINGS.AUTH.SENDING_RESET_LINK_BTN
                : STRINGS.AUTH.SEND_RESET_LINK_BTN}
            </button>
          </form>
        )}

        {successMessage && mockResetHref && (
          <div
            data-testid="forgot-mock-link-note"
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              border: '1px dashed #fde68a',
              borderRadius: '6px',
              fontSize: '0.78rem',
            }}
          >
            {STRINGS.AUTH.FORGOT_MOCK_LINK_NOTE}{' '}
            <Link
              to={mockResetHref}
              data-testid="forgot-mock-reset-link"
              style={{ color: '#92400e', fontWeight: 700 }}
            >
              {STRINGS.AUTH.FORGOT_OPEN_RESET_LINK}
            </Link>
          </div>
        )}

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.85rem',
          }}
        >
          <Link
            to="/login"
            data-testid="forgot-back-link"
            style={{ color: '#15803d', textDecoration: 'none' }}
          >
            {STRINGS.AUTH.BACK_TO_SIGN_IN}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
