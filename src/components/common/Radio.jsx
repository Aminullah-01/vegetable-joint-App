import { useState, useId, forwardRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Radio — Accessible Radio Button Component
 * SRS References: UI-05, NFR-USAB-03 (Touch targets ≥ 44px), NFR-USAB-02 (WCAG 2.1 AA)
 */
export const Radio = forwardRef(function Radio(
  {
    id: explicitId,
    name,
    value,
    label,
    description,
    sublabel,
    checked,
    defaultChecked,
    onChange,
    onBlur,
    onFocus,
    required = false,
    disabled = false,
    className = '',
    style = {},
    ...restProps
  },
  ref
) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  const [isFocused, setIsFocused] = useState(false);
  const effectiveDescription = description || sublabel;

  return (
    <label
      htmlFor={id}
      className={`form-radio-wrapper ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: '0.625rem',
        minHeight: '44px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '0.5rem 0',
        userSelect: 'none',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <input
        ref={ref}
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        onFocus={(e) => {
          setIsFocused(true);
          if (onFocus) onFocus(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          if (onBlur) onBlur(e);
        }}
        required={required}
        disabled={disabled}
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

      {/* Visual Custom Radio Circle */}
      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          width: '20px',
          height: '20px',
          minWidth: '20px',
          minHeight: '20px',
          borderRadius: '50%',
          border: `2px solid ${checked ? '#15803d' : '#cbd5e1'}`,
          backgroundColor: disabled ? '#f1f5f9' : '#ffffff',
          boxShadow:
            isFocused && !disabled
              ? '0 0 0 3px rgba(21, 128, 61, 0.25)'
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
        {checked && (
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#15803d',
            }}
          />
        )}
      </div>

      {/* Text Container */}
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
  );
});

Radio.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.node,
  description: PropTypes.node,
  sublabel: PropTypes.node,
  checked: PropTypes.bool,
  defaultChecked: PropTypes.bool,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * RadioGroup — Accessible Grouping for Radios
 * Provides group label, inline error message, and direction layouts.
 */
export function RadioGroup({
  name,
  label,
  value,
  onChange,
  options,
  children,
  error,
  helperText,
  required = false,
  disabled = false,
  direction = 'vertical',
  className = '',
  style = {},
}) {
  const generatedId = useId();
  const groupId = `${name || generatedId}-group`;
  const errorId = `${groupId}-error`;
  const helperId = `${groupId}-helper`;

  const hasError = Boolean(error);

  return (
    <fieldset
      aria-describedby={
        [hasError && errorId, !hasError && helperText && helperId]
          .filter(Boolean)
          .join(' ') || undefined
      }
      className={`form-radio-group ${className}`.trim()}
      style={{
        border: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        ...style,
      }}
    >
      {label && (
        <legend
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: disabled ? '#94a3b8' : '#334155',
            marginBottom: '0.25rem',
          }}
        >
          {label}
          {required && (
            <span
              aria-hidden="true"
              style={{ color: '#dc2626', marginLeft: '0.25rem' }}
            >
              *
            </span>
          )}
        </legend>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
          gap: direction === 'horizontal' ? '1.5rem' : '0.25rem',
          flexWrap: 'wrap',
        }}
      >
        {options
          ? options.map((opt) => {
              const optVal = typeof opt === 'object' ? opt.value : opt;
              const optLbl = typeof opt === 'object' ? opt.label : opt;
              const optDesc =
                typeof opt === 'object' ? opt.description : undefined;
              const optDis =
                typeof opt === 'object' ? opt.disabled || disabled : disabled;
              const isChecked =
                value !== undefined ? value === optVal : undefined;

              return (
                <Radio
                  key={optVal}
                  name={name}
                  value={optVal}
                  label={optLbl}
                  description={optDesc}
                  checked={isChecked}
                  onChange={onChange}
                  disabled={optDis}
                  required={required}
                />
              );
            })
          : children}
      </div>

      {hasError && typeof error === 'string' && (
        <p
          id={errorId}
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8125rem',
            color: '#b91c1c',
            marginTop: '0.125rem',
            marginBottom: 0,
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

      {!hasError && helperText && (
        <p
          id={helperId}
          style={{
            fontSize: '0.8125rem',
            color: '#64748b',
            marginTop: '0.125rem',
            marginBottom: 0,
          }}
        >
          {helperText}
        </p>
      )}
    </fieldset>
  );
}

RadioGroup.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.node,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
          .isRequired,
        label: PropTypes.node,
        description: PropTypes.node,
        disabled: PropTypes.bool,
      }),
    ])
  ),
  children: PropTypes.node,
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
    PropTypes.node,
  ]),
  helperText: PropTypes.node,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  direction: PropTypes.oneOf(['vertical', 'horizontal']),
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Radio;
