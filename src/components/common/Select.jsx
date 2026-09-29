import { useState, useId, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { FormField } from './FormField';

/**
 * Select — Accessible Form Select Dropdown
 * SRS References: UI-05 (Simple forms with inline validation), NFR-USAB-05 (Correct input types & autocomplete), NFR-USAB-03 (Touch targets ≥ 44px)
 *
 * Supports array of options, nested optgroups, direct JSX children, custom placeholder,
 * inline validation errors, and clean chevron indicator.
 */
export const Select = forwardRef(function Select(
  {
    id: explicitId,
    name,
    label,
    placeholder,
    options,
    children,
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    autoComplete,
    required = false,
    optional = false,
    disabled = false,
    error,
    helperText,
    success,
    startIcon,
    prefix,
    size = 'md',
    fullWidth = true,
    className = '',
    selectClassName = '',
    style = {},
    selectStyle = {},
    ...restProps
  },
  ref
) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(error);
  const hasSuccess = Boolean(success);

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

  const sizeStyles = {
    sm: {
      minHeight: '38px',
      fontSize: '0.8125rem',
      padding: '0.375rem 2rem 0.375rem 0.625rem',
    },
    md: {
      minHeight: '44px',
      fontSize: '0.875rem',
      padding: '0.625rem 2.25rem 0.625rem 0.875rem',
    },
    lg: {
      minHeight: '48px',
      fontSize: '1rem',
      padding: '0.75rem 2.5rem 0.75rem 1rem',
    },
  }[size] || {
    minHeight: '44px',
    fontSize: '0.875rem',
    padding: '0.625rem 2.25rem 0.625rem 0.875rem',
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

  const effectiveStart = startIcon || prefix;

  // Render options helper
  const renderOptions = () => {
    if (children) return children;

    if (!Array.isArray(options)) return null;

    return options.map((opt, index) => {
      // Optgroup support
      if (opt && typeof opt === 'object' && Array.isArray(opt.options)) {
        return (
          <optgroup key={opt.label || index} label={opt.label}>
            {opt.options.map((subOpt, subIdx) => {
              const subVal = typeof subOpt === 'object' ? subOpt.value : subOpt;
              const subLbl = typeof subOpt === 'object' ? subOpt.label : subOpt;
              const subDis =
                typeof subOpt === 'object' ? subOpt.disabled : false;
              return (
                <option
                  key={`${subVal}-${subIdx}`}
                  value={subVal}
                  disabled={subDis}
                >
                  {subLbl}
                </option>
              );
            })}
          </optgroup>
        );
      }

      // Single option
      const optVal = typeof opt === 'object' ? opt.value : opt;
      const optLbl = typeof opt === 'object' ? opt.label : opt;
      const optDis = typeof opt === 'object' ? opt.disabled : false;

      return (
        <option key={`${optVal}-${index}`} value={optVal} disabled={optDis}>
          {optLbl}
        </option>
      );
    });
  };

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

        <select
          ref={ref}
          id={id}
          name={name}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-required={required ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`form-select ${selectClassName}`.trim()}
          style={{
            flex: 1,
            width: '100%',
            minWidth: 0,
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: disabled
              ? '#94a3b8'
              : value === '' && placeholder
                ? '#94a3b8'
                : '#0f172a',
            fontFamily: 'inherit',
            fontSize: sizeStyles.fontSize,
            lineHeight: 1.5,
            padding: sizeStyles.padding,
            minHeight: sizeStyles.minHeight,
            paddingLeft: effectiveStart
              ? '0.5rem'
              : sizeStyles.padding.split(' ')[3],
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxSizing: 'border-box',
            ...selectStyle,
          }}
          {...restProps}
        >
          {placeholder && (
            <option value="" disabled hidden={required}>
              {placeholder}
            </option>
          )}
          {renderOptions()}
        </select>

        {/* Custom Chevron Indicator */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: disabled ? '#cbd5e1' : '#64748b',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </FormField>
  );
});

Select.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.node,
  placeholder: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
          .isRequired,
        label: PropTypes.node,
        disabled: PropTypes.bool,
      }),
      PropTypes.shape({
        label: PropTypes.node.isRequired,
        options: PropTypes.array.isRequired,
      }),
    ])
  ),
  children: PropTypes.node,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  autoComplete: PropTypes.string,
  required: PropTypes.bool,
  optional: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  disabled: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
    PropTypes.node,
  ]),
  helperText: PropTypes.node,
  success: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  startIcon: PropTypes.node,
  prefix: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  selectClassName: PropTypes.string,
  style: PropTypes.object,
  selectStyle: PropTypes.object,
};

export default Select;
