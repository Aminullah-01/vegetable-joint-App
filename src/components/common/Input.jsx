import { useState, useId, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { FormField } from './FormField';

/**
 * Input — Accessible Form Input Field
 * SRS References: UI-05 (Simple forms with inline validation), NFR-USAB-05 (Correct input types & autocomplete), NFR-USAB-03 (Touch targets ≥ 44px)
 *
 * Supports text, email, password, tel, number, search, date and all HTML5 input types.
 * Features built-in password visibility toggle, clearable action, start/end adornments,
 * inline validation errors, and WCAG AA accessible labeling.
 */
export const Input = forwardRef(function Input(
  {
    id: explicitId,
    name,
    type = 'text',
    label,
    placeholder,
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    autoComplete,
    required = false,
    optional = false,
    disabled = false,
    readOnly = false,
    error,
    helperText,
    success,
    startIcon,
    endIcon,
    prefix,
    suffix,
    showPasswordToggle = true,
    clearable = false,
    onClear,
    size = 'md',
    fullWidth = true,
    className = '',
    inputClassName = '',
    style = {},
    inputStyle = {},
    ...restProps
  },
  ref
) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const effectiveType = isPassword && showPassword ? 'text' : type;
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success);

  // Determine aria-describedby links
  const describedBy =
    [
      hasError && `${id}-error`,
      !hasError && helperText && `${id}-helper`,
      !hasError && typeof success === 'string' && `${id}-success`,
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

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange) {
      const syntheticEvent = {
        target: { value: '', name: name || id },
        currentTarget: { value: '', name: name || id },
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(syntheticEvent);
    }
  };

  // Touch & spacing sizes (NFR-USAB-03: min 44px height for interactive targets)
  const sizeStyles = {
    sm: {
      minHeight: '38px',
      fontSize: '0.8125rem',
      padding: '0.375rem 0.625rem',
    },
    md: {
      minHeight: '44px',
      fontSize: '0.875rem',
      padding: '0.625rem 0.875rem',
    },
    lg: { minHeight: '48px', fontSize: '1rem', padding: '0.75rem 1rem' },
  }[size] || {
    minHeight: '44px',
    fontSize: '0.875rem',
    padding: '0.625rem 0.875rem',
  };

  // Border & Focus Ring styling
  let borderColor = '#cbd5e1';
  let focusRing = 'none';
  let backgroundColor = '#ffffff';

  if (disabled) {
    backgroundColor = '#f8fafc';
    borderColor = '#e2e8f0';
  } else if (hasError) {
    borderColor = '#dc2626';
    backgroundColor = '#fffafa';
    if (isFocused) {
      focusRing = '0 0 0 3px rgba(220, 38, 38, 0.15)';
    }
  } else if (isFocused) {
    borderColor = '#15803d';
    if (hasSuccess) {
      borderColor = '#16a34a';
      focusRing = '0 0 0 3px rgba(22, 163, 74, 0.15)';
    } else {
      focusRing = '0 0 0 3px rgba(21, 128, 61, 0.15)';
    }
  } else if (hasSuccess) {
    borderColor = '#16a34a';
  }

  const effectiveStart = startIcon || prefix;
  const effectiveEnd = endIcon || suffix;
  const hasValue = value !== undefined ? Boolean(value) : false;

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      optional={optional}
      error={error}
      helperText={helperText}
      success={success}
      disabled={disabled}
      className={className}
      style={{ width: fullWidth ? '100%' : 'auto', ...style }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          backgroundColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          boxShadow: focusRing,
          transition:
            'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
          boxSizing: 'border-box',
        }}
      >
        {/* Start Adornment / Icon */}
        {effectiveStart && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '0.75rem',
              color: disabled ? '#94a3b8' : '#64748b',
              fontSize: sizeStyles.fontSize,
              userSelect: 'none',
              pointerEvents: 'none',
              flexShrink: 0,
            }}
          >
            {effectiveStart}
          </div>
        )}

        {/* Core Input Element */}
        <input
          ref={ref}
          id={id}
          name={name}
          type={effectiveType}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-required={required ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`form-input ${inputClassName}`.trim()}
          style={{
            flex: 1,
            width: '100%',
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: disabled ? '#94a3b8' : '#0f172a',
            fontFamily: 'inherit',
            fontSize: sizeStyles.fontSize,
            lineHeight: 1.5,
            padding: sizeStyles.padding,
            minHeight: sizeStyles.minHeight,
            paddingLeft: effectiveStart
              ? '0.5rem'
              : sizeStyles.padding.split(' ')[1],
            paddingRight:
              isPassword || clearable || effectiveEnd
                ? '0.5rem'
                : sizeStyles.padding.split(' ')[1],
            cursor: disabled ? 'not-allowed' : 'text',
            boxSizing: 'border-box',
            ...inputStyle,
          }}
          {...restProps}
        />

        {/* Clear Button */}
        {clearable && hasValue && !disabled && !readOnly && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear input"
            style={{
              background: 'none',
              border: 'none',
              padding: '0.375rem',
              marginRight: isPassword || effectiveEnd ? '0.125rem' : '0.5rem',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              fontSize: '0.875rem',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}

        {/* Password Visibility Toggle */}
        {isPassword && showPasswordToggle && !disabled && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.375rem 0.5rem',
              marginRight: effectiveEnd ? '0.125rem' : '0.5rem',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              fontSize: '0.875rem',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {showPassword ? (
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}

        {/* End Adornment / Icon */}
        {effectiveEnd && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingRight: '0.75rem',
              color: disabled ? '#94a3b8' : '#64748b',
              fontSize: sizeStyles.fontSize,
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {effectiveEnd}
          </div>
        )}
      </div>
    </FormField>
  );
});

Input.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  type: PropTypes.string,
  label: PropTypes.node,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  autoComplete: PropTypes.string,
  required: PropTypes.bool,
  optional: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
    PropTypes.node,
  ]),
  helperText: PropTypes.node,
  success: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  startIcon: PropTypes.node,
  endIcon: PropTypes.node,
  prefix: PropTypes.node,
  suffix: PropTypes.node,
  showPasswordToggle: PropTypes.bool,
  clearable: PropTypes.bool,
  onClear: PropTypes.func,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  inputClassName: PropTypes.string,
  style: PropTypes.object,
  inputStyle: PropTypes.object,
};

export default Input;
