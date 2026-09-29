import PropTypes from 'prop-types';

/**
 * FormField — Shared layout wrapper for form inputs
 * SRS References: UI-05 (Inline validation & easy-to-understand messages), NFR-USAB-02 (WCAG 2.1 AA accessible labels)
 *
 * Provides accessible label binding, required indicator (*), optional badge,
 * inline validation error alerts, and helper hints.
 */
export function FormField({
  id,
  label,
  required = false,
  optional = false,
  error,
  helperText,
  success,
  disabled = false,
  className = '',
  style = {},
  labelStyle = {},
  children,
}) {
  const hasError = Boolean(error);
  const errorId = id ? `${id}-error` : undefined;
  const helperId = id ? `${id}-helper` : undefined;
  const successId = id ? `${id}-success` : undefined;

  return (
    <div
      className={`form-field-group ${hasError ? 'form-field-has-error' : ''} ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        width: '100%',
        ...style,
      }}
    >
      {label && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <label
            htmlFor={id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: disabled ? '#94a3b8' : '#334155',
              cursor: disabled ? 'not-allowed' : 'pointer',
              lineHeight: 1.3,
              userSelect: 'none',
              ...labelStyle,
            }}
          >
            {label}
            {required && (
              <span
                aria-hidden="true"
                style={{
                  color: '#dc2626',
                  marginLeft: '0.25rem',
                  fontWeight: 700,
                }}
              >
                *
              </span>
            )}
          </label>
          {optional && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                fontWeight: 400,
              }}
            >
              {typeof optional === 'string' ? optional : '(optional)'}
            </span>
          )}
        </div>
      )}

      {/* Input or Control slot */}
      <div style={{ position: 'relative', width: '100%' }}>{children}</div>

      {/* Inline Validation Error Message (UI-05) */}
      {hasError && typeof error === 'string' && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8125rem',
            color: '#b91c1c',
            marginTop: '0.125rem',
            marginBottom: 0,
            lineHeight: 1.4,
          }}
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="currentColor"
            style={{ flexShrink: 0 }}
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </p>
      )}

      {/* Success Message (if string and no error) */}
      {!hasError && typeof success === 'string' && success.length > 0 && (
        <p
          id={successId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8125rem',
            color: '#15803d',
            marginTop: '0.125rem',
            marginBottom: 0,
            lineHeight: 1.4,
          }}
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="currentColor"
            style={{ flexShrink: 0 }}
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>{success}</span>
        </p>
      )}

      {/* Helper text (displayed when no error exists or alongside) */}
      {!hasError && helperText && (
        <p
          id={helperId}
          style={{
            fontSize: '0.8125rem',
            color: '#64748b',
            marginTop: '0.125rem',
            marginBottom: 0,
            lineHeight: 1.4,
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

FormField.propTypes = {
  id: PropTypes.string,
  label: PropTypes.node,
  required: PropTypes.bool,
  optional: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
    PropTypes.node,
  ]),
  helperText: PropTypes.node,
  success: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  disabled: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  labelStyle: PropTypes.object,
  children: PropTypes.node.isRequired,
};

export default FormField;
