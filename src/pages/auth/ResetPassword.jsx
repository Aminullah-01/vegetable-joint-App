import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../hooks';
import { STRINGS } from '../../constants';
import { authService } from '../../services';
import {
  getPasswordCriteria,
  validatePassword,
  validateConfirmPassword,
} from '../../utils';

// Delay before returning the user to the sign-in page after a successful reset.
const RESET_REDIRECT_MS = 1600;

export function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = (searchParams.get('token') || '').trim();
  const email = (searchParams.get('email') || '').trim();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordCriteria = getPasswordCriteria(password);

  // Return to sign in shortly after a successful reset (AUTH-06).
  useEffect(() => {
    if (!successMessage) return undefined;
    const id = setTimeout(
      () => navigate('/login', { replace: true }),
      RESET_REDIRECT_MS
    );
    return () => clearTimeout(id);
  }, [successMessage, navigate]);

  const validateField = (fieldName) => {
    let error = null;
    if (fieldName === 'password') {
      error = validatePassword(password);
    } else if (fieldName === 'confirmPassword') {
      error = confirmPassword
        ? validateConfirmPassword(password, confirmPassword)
        : null;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[fieldName] = error;
      else delete next[fieldName];
      return next;
    });

    return !error;
  };

  const handleBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    validateField(fieldName);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    const passwordErr = validatePassword(password);
    if (passwordErr) errors.password = passwordErr;

    const confirmErr = confirmPassword
      ? validateConfirmPassword(password, confirmPassword)
      : 'Please confirm your password.';
    if (confirmErr) errors.confirmPassword = confirmErr;

    setTouched({ password: true, confirmPassword: true });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      setErrorMessage(firstError);
      toast.error(firstError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await authService.resetPassword({
        token,
        email: email || undefined,
        password,
        password_confirmation: confirmPassword,
      });
      const message = response?.message || STRINGS.AUTH.RESET_SUCCESS;
      setSuccessMessage(message);
      toast.success(message);
    } catch (err) {
      // AUTH-06: invalid, expired or already-used tokens show a recovery path.
      if (err?.code === 'INVALID_RESET_TOKEN') {
        setTokenInvalid(true);
        const friendly = err?.message || STRINGS.AUTH.RESET_TOKEN_INVALID;
        setErrorMessage(friendly);
        toast.error(friendly);
      } else if (err?.errors && Object.keys(err.errors).length > 0) {
        const mapped = {};
        if (err.errors.password) {
          mapped.password = [err.errors.password].flat()[0];
        }
        if (err.errors.password_confirmation) {
          mapped.confirmPassword = [err.errors.password_confirmation].flat()[0];
        }
        setFieldErrors(mapped);
        const firstError =
          mapped.password || mapped.confirmPassword || err?.message;
        setErrorMessage(firstError);
        toast.error(firstError);
      } else {
        const errText = err?.message || STRINGS.ERRORS.UNABLE_TO_LOAD;
        setErrorMessage(errText);
        toast.error(errText);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCard = (children) => (
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
        {children}
        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.85rem',
          }}
        >
          <Link
            to="/login"
            data-testid="reset-back-link"
            style={{ color: '#15803d', textDecoration: 'none' }}
          >
            {STRINGS.AUTH.BACK_TO_SIGN_IN}
          </Link>
        </div>
      </div>
    </div>
  );

  // Missing token from the URL: the link itself is unusable.
  if (!token || tokenInvalid) {
    return renderCard(
      <div>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '2.5rem' }} role="img" aria-label="Warning">
            ⚠️
          </span>
          <h1
            style={{
              fontSize: '1.5rem',
              color: '#1e293b',
              margin: '0.5rem 0 0.25rem 0',
            }}
          >
            {STRINGS.AUTH.RESET_TITLE}
          </h1>
        </div>
        <div
          data-testid="reset-token-invalid-notice"
          role="alert"
          style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            padding: '0.875rem 1rem',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            marginBottom: '1.25rem',
          }}
        >
          {errorMessage ||
            (tokenInvalid
              ? STRINGS.AUTH.RESET_TOKEN_INVALID
              : STRINGS.AUTH.RESET_TOKEN_MISSING)}
        </div>
        <Link
          to="/forgot-password"
          data-testid="reset-request-new-link"
          style={{
            display: 'block',
            textAlign: 'center',
            backgroundColor: '#15803d',
            color: '#ffffff',
            padding: '0.75rem',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '0.95rem',
            textDecoration: 'none',
          }}
        >
          {STRINGS.AUTH.RESET_REQUEST_NEW_LINK}
        </Link>
      </div>
    );
  }

  if (successMessage) {
    return renderCard(
      <div
        data-testid="reset-success-message"
        role="status"
        style={{
          textAlign: 'center',
          backgroundColor: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '1.25rem',
          fontSize: '0.9rem',
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>✅</div>
        <div>{successMessage}</div>
        <div
          data-testid="reset-redirecting"
          style={{ marginTop: '0.6rem', fontSize: '0.8rem', opacity: 0.85 }}
        >
          {STRINGS.AUTH.RESET_REDIRECTING}
        </div>
        <Link
          to="/login"
          style={{
            display: 'inline-block',
            marginTop: '0.85rem',
            color: '#166534',
            fontWeight: 700,
          }}
        >
          {STRINGS.AUTH.SIGN_IN_LINK}
        </Link>
      </div>
    );
  }

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '0.65rem 0.8rem',
    borderRadius: '6px',
    border: `1px solid ${hasError ? '#fca5a5' : '#cbd5e1'}`,
    boxSizing: 'border-box',
    fontSize: '0.9rem',
  });

  return renderCard(
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2.5rem' }} role="img" aria-label="Lock">
          🔒
        </span>
        <h1
          style={{
            fontSize: '1.5rem',
            color: '#1e293b',
            margin: '0.5rem 0 0.25rem 0',
          }}
        >
          {STRINGS.AUTH.RESET_TITLE}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
          {STRINGS.AUTH.RESET_SUBTITLE} (AUTH-06)
        </p>
      </div>

      <form
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        onSubmit={handleSubmit}
      >
        {errorMessage && (
          <div
            role="alert"
            data-testid="reset-error-message"
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
            htmlFor="reset-password"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '500',
              marginBottom: '0.25rem',
              color: '#334155',
            }}
          >
            {STRINGS.AUTH.NEW_PASSWORD_LABEL}
          </label>
          <input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (touched.password) validateField('password');
            }}
            onBlur={() => handleBlur('password')}
            placeholder={STRINGS.AUTH.PASSWORD_PLACEHOLDER}
            required
            disabled={isSubmitting}
            autoComplete="new-password"
            data-testid="reset-password-input"
            aria-invalid={fieldErrors.password ? 'true' : 'false'}
            style={inputStyle(fieldErrors.password)}
          />
          {fieldErrors.password && (
            <p
              data-testid="reset-password-error"
              style={{
                color: '#b91c1c',
                fontSize: '0.75rem',
                margin: '0.25rem 0 0 0',
              }}
            >
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="reset-confirm-password"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '500',
              marginBottom: '0.25rem',
              color: '#334155',
            }}
          >
            {STRINGS.AUTH.CONFIRM_PASSWORD_LABEL}
          </label>
          <input
            id="reset-confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (touched.confirmPassword) validateField('confirmPassword');
            }}
            onBlur={() => handleBlur('confirmPassword')}
            placeholder={STRINGS.AUTH.CONFIRM_PASSWORD_PLACEHOLDER}
            required
            disabled={isSubmitting}
            autoComplete="new-password"
            data-testid="reset-confirm-input"
            aria-invalid={fieldErrors.confirmPassword ? 'true' : 'false'}
            style={inputStyle(fieldErrors.confirmPassword)}
          />
          {fieldErrors.confirmPassword && (
            <p
              data-testid="reset-confirm-error"
              style={{
                color: '#b91c1c',
                fontSize: '0.75rem',
                margin: '0.25rem 0 0 0',
              }}
            >
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            color: '#475569',
          }}
        >
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            data-testid="reset-show-password-toggle"
          />
          {showPassword
            ? STRINGS.AUTH.RESET_HIDE_PASSWORD
            : STRINGS.AUTH.RESET_SHOW_PASSWORD}
        </label>

        <ul
          data-testid="reset-password-criteria"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontSize: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.15rem',
          }}
        >
          <li
            style={{
              color: passwordCriteria.hasMinLength ? '#16a34a' : '#64748b',
            }}
          >
            {passwordCriteria.hasMinLength ? '✓' : '○'}{' '}
            {STRINGS.AUTH.PASSWORD_RULE_LENGTH}
          </li>
          <li
            style={{
              color: passwordCriteria.hasLetter ? '#16a34a' : '#64748b',
            }}
          >
            {passwordCriteria.hasLetter ? '✓' : '○'}{' '}
            {STRINGS.AUTH.PASSWORD_RULE_LETTERS}
          </li>
          <li
            style={{ color: passwordCriteria.hasDigit ? '#16a34a' : '#64748b' }}
          >
            {passwordCriteria.hasDigit ? '✓' : '○'}{' '}
            {STRINGS.AUTH.PASSWORD_RULE_NUMBERS}
          </li>
        </ul>

        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="reset-submit-btn"
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
            ? STRINGS.AUTH.UPDATING_PASSWORD_BTN
            : STRINGS.AUTH.UPDATE_PASSWORD_BTN}
        </button>
      </form>
    </div>
  );
}

export default ResetPassword;
