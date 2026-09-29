import { useState, useId, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { FormField } from './FormField';

/**
 * Textarea — Accessible Multi-line Text Area
 * SRS References: UI-05 (Simple forms with inline validation), NFR-USAB-05 (Forms validate inline), NFR-USAB-02
 *
 * Supports auto-ID generation, character counter, resize control,
 * inline validation errors, and helper hints.
 */
export const Textarea = forwardRef(function Textarea(
  {
    id: explicitId,
    name,
    label,
    placeholder,
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    rows = 4,
    cols,
    maxLength,
    showCount = false,
    resize = 'vertical',
    autoComplete,
    required = false,
    optional = false,
    disabled = false,
    readOnly = false,
    error,
    helperText,
    success,
    fullWidth = true,
    className = '',
    textareaClassName = '',
    style = {},
    textareaStyle = {},
    ...restProps
  },
  ref
) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(error);
  const hasSuccess = Boolean(success);

  const currentLength =
    typeof value === 'string'
      ? value.length
      : typeof defaultValue === 'string'
        ? defaultValue.length
        : 0;

  const describedBy =
    [
      hasError && `${id}-error`,
      !hasError && helperText && `${id}-helper`,
      !hasError && typeof success === 'string' && `${id}-success`,
      showCount && `${id}-count`,
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

  const isNearLimit = maxLength && currentLength >= maxLength * 0.9;
  const isAtLimit = maxLength && currentLength >= maxLength;

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
        <textarea
          ref={ref}
          id={id}
          name={name}
          rows={rows}
          cols={cols}
          maxLength={maxLength}
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
          className={`form-textarea ${textareaClassName}`.trim()}
          style={{
            display: 'block',
            width: '100%',
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: disabled ? '#94a3b8' : '#0f172a',
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            padding: '0.625rem 0.875rem',
            resize,
            cursor: disabled ? 'not-allowed' : 'text',
            boxSizing: 'border-box',
            ...textareaStyle,
          }}
          {...restProps}
        />

        {/* Character Count Indicator */}
        {showCount && (
          <div
            id={`${id}-count`}
            aria-live="polite"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '0.25rem 0.625rem 0.375rem 0.625rem',
              fontSize: '0.75rem',
              color: isAtLimit
                ? '#dc2626'
                : isNearLimit
                  ? '#d97706'
                  : '#94a3b8',
              fontWeight: isNearLimit ? 600 : 400,
              borderTop: '1px dashed #f1f5f9',
              userSelect: 'none',
            }}
          >
            {maxLength
              ? `${currentLength} / ${maxLength}`
              : `${currentLength} characters`}
          </div>
        )}
      </div>
    </FormField>
  );
});

Textarea.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.node,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  defaultValue: PropTypes.string,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  rows: PropTypes.number,
  cols: PropTypes.number,
  maxLength: PropTypes.number,
  showCount: PropTypes.bool,
  resize: PropTypes.oneOf(['none', 'vertical', 'horizontal', 'both']),
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
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  textareaClassName: PropTypes.string,
  style: PropTypes.object,
  textareaStyle: PropTypes.object,
};

export default Textarea;
