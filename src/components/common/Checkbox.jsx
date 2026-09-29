import { useState, useId, forwardRef, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Checkbox — Accessible Form Checkbox Component
 * SRS References: UI-05 (Simple forms with inline validation), NFR-USAB-03 (Touch targets ≥ 44px), NFR-USAB-02 (WCAG 2.1 AA)
 *
 * Supports label and sublabel/description, indeterminate state, inline validation error messages,
 * keyboard accessibility, and minimum 44px touch target comfort.
 */
export const Checkbox = forwardRef(function Checkbox(
  {
    id: explicitId,
    name,
    label,
    description,
    sublabel,
    checked,
    defaultChecked,
    onChange,
    onBlur,
    onFocus,
    indeterminate = false,
    required = false,
    disabled = false,
    error,
    helperText,
    className = '',
    style = {},
    ...restProps
  },
  forwardedRef
) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  const innerRef = useRef(null);
  const ref = forwardedRef || innerRef;

  const [isFocused, setIsFocused] = useState(false);

  // Sync indeterminate property with DOM node
  useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current) {
      ref.current.indeterminate = Boolean(indeterminate);
    }
  }, [ref, indeterminate]);

  const hasError = Boolean(error);
  const effectiveDescription = description || sublabel;

  const errorId = id ? `${id}-error` : undefined;
  const helperId = id ? `${id}-helper` : undefined;

  const describedBy =
    [
      hasError && errorId,
      !hasError && (effectiveDescription || helperText) && helperId,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  // Determine border & background
  let boxBorderColor = '#cbd5e1';
  let boxBgColor = '#ffffff';

  if (disabled) {
    boxBgColor = '#f1f5f9';
    boxBorderColor = '#e2e8f0';
  } else if (hasError) {
    boxBorderColor = '#dc2626';
    boxBgColor = '#fffafa';
  }

  return (
    <div
      className={`form-checkbox-wrapper ${hasError ? 'form-checkbox-error' : ''} ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        ...style,
      }}
    >
      <label
        htmlFor={id}
        style={{
          display: 'inline-flex',
          alignItems: 'flex-start',
          gap: '0.625rem',
          minHeight: '44px', // Meets NFR-USAB-03 touch target size
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '0.5rem 0',
          userSelect: 'none',
          boxSizing: 'border-box',
        }}
      >
        {/* Hidden Native Input overlaid / accessible */}
        <input
          ref={ref}
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-required={required ? 'true' : undefined}
          aria-describedby={describedBy}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '1px',
            height: '1px',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
          }}
          {...restProps}
        />

        {/* Visual Custom Checkbox Box */}
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            width: '20px',
            height: '20px',
            minWidth: '20px',
            minHeight: '20px',
            borderRadius: '4px',
            border: `2px solid ${
              checked || indeterminate ? '#15803d' : boxBorderColor
            }`,
            backgroundColor: checked || indeterminate ? '#15803d' : boxBgColor,
            boxShadow:
              isFocused && !disabled
                ? hasError
                  ? '0 0 0 3px rgba(220, 38, 38, 0.25)'
                  : '0 0 0 3px rgba(21, 128, 61, 0.25)'
                : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '0.125rem',
            transition: 'all 0.15s ease-in-out',
            boxSizing: 'border-box',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {indeterminate ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 20 20"
              fill="currentColor"
              style={{ color: '#ffffff' }}
            >
              <rect x="3" y="8.5" width="14" height="3" rx="1.5" />
            </svg>
          ) : checked ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 20 20"
              fill="currentColor"
              style={{ color: '#ffffff' }}
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : null}
        </div>

        {/* Label & Description Text */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}
        >
          {label && (
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: disabled ? '#94a3b8' : '#334155',
                lineHeight: 1.4,
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
            </span>
          )}

          {effectiveDescription && (
            <span
              id={helperId}
              style={{
                fontSize: '0.8125rem',
                color: disabled ? '#cbd5e1' : '#64748b',
                lineHeight: 1.4,
              }}
            >
              {effectiveDescription}
            </span>
          )}
        </div>
      </label>

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
            marginTop: '-0.25rem',
            marginBottom: '0.25rem',
            paddingLeft: '1.875rem',
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

      {/* Standalone helper text if no error and no description */}
      {!hasError && !effectiveDescription && helperText && (
        <p
          id={helperId}
          style={{
            fontSize: '0.8125rem',
            color: '#64748b',
            marginTop: '-0.25rem',
            marginBottom: '0.25rem',
            paddingLeft: '1.875rem',
            lineHeight: 1.4,
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Checkbox.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.node,
  description: PropTypes.node,
  sublabel: PropTypes.node,
  checked: PropTypes.bool,
  defaultChecked: PropTypes.bool,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  indeterminate: PropTypes.bool,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
    PropTypes.node,
  ]),
  helperText: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Checkbox;
