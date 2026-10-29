import { forwardRef, useId } from 'react';
import PropTypes from 'prop-types';

/**
 * Toggle — Accessible Switch / Toggle Component
 * Conforms to WAI-ARIA switch pattern, WCAG 2.1 AA (NFR-USAB-02), and touch target minimums (NFR-USAB-03).
 *
 * SRS References:
 * - SEL-07: Seller manual on/off switch for product availability.
 * - Figma Section 13: UI Controls / Toggle switch.
 */
export const Toggle = forwardRef(function Toggle(
  {
    id: explicitId,
    name,
    checked = false,
    onChange,
    disabled = false,
    loading = false,
    size = 'md',
    label,
    description,
    ariaLabel,
    testId = 'toggle-switch',
    className = '',
    style = {},
    ...restProps
  },
  ref
) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  // Sizing definitions
  const dimensions = {
    sm: {
      trackWidth: 36,
      trackHeight: 20,
      thumbSize: 16,
      translateOn: 16,
      padding: 2,
    },
    md: {
      trackWidth: 44,
      trackHeight: 24,
      thumbSize: 20,
      translateOn: 20,
      padding: 2,
    },
    lg: {
      trackWidth: 52,
      trackHeight: 28,
      thumbSize: 24,
      translateOn: 24,
      padding: 2,
    },
  }[size] || {
    trackWidth: 44,
    trackHeight: 24,
    thumbSize: 20,
    translateOn: 20,
    padding: 2,
  };

  const isInteractive = !disabled && !loading;

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isInteractive) return;
    onChange?.(!checked);
  };

  const handleKeyDown = (e) => {
    if (!isInteractive) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onChange?.(!checked);
    }
  };

  return (
    <div
      className={`toggle-container ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.625rem',
        cursor: isInteractive ? 'pointer' : 'not-allowed',
        opacity: disabled ? 0.6 : 1,
        userSelect: 'none',
        ...style,
      }}
      onClick={handleClick}
    >
      <button
        ref={ref}
        type="button"
        id={id}
        name={name}
        role="switch"
        aria-checked={Boolean(checked)}
        aria-disabled={disabled}
        aria-busy={loading}
        aria-label={ariaLabel || label || 'Toggle switch'}
        disabled={disabled}
        data-testid={testId}
        onKeyDown={handleKeyDown}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: `${dimensions.trackWidth}px`,
          height: `${dimensions.trackHeight}px`,
          padding: `${dimensions.padding}px`,
          borderRadius: '9999px',
          border: 'none',
          backgroundColor: checked ? '#15803d' : '#cbd5e1',
          transition: 'background-color 0.2s ease-in-out, box-shadow 0.2s ease',
          cursor: isInteractive ? 'pointer' : 'not-allowed',
          outline: 'none',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
        {...restProps}
      >
        {/* Sliding Thumb */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${dimensions.thumbSize}px`,
            height: `${dimensions.thumbSize}px`,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
            transform: checked
              ? `translateX(${dimensions.translateOn}px)`
              : 'translateX(0px)',
            transition: 'transform 0.2s ease-in-out',
            flexShrink: 0,
          }}
        >
          {loading && (
            <span
              style={{
                width: `${dimensions.thumbSize - 6}px`,
                height: `${dimensions.thumbSize - 6}px`,
                border: '2px solid #cbd5e1',
                borderTopColor: '#15803d',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }}
            />
          )}
        </span>
      </button>

      {/* Optional Label / Description */}
      {(label || description) && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {label && (
            <span
              style={{
                fontSize: size === 'sm' ? '0.8125rem' : '0.875rem',
                fontWeight: 600,
                color: '#1e293b',
              }}
            >
              {label}
            </span>
          )}
          {description && (
            <span
              style={{
                fontSize: size === 'sm' ? '0.75rem' : '0.8125rem',
                color: '#64748b',
              }}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

Toggle.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  label: PropTypes.node,
  description: PropTypes.node,
  ariaLabel: PropTypes.string,
  testId: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Toggle;
