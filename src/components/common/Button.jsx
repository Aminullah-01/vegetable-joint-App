import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import { Spinner } from './Spinner';

/**
 * Button — Reusable Accessible Button Component
 * SRS References: UI-03 (Prominent calls to action), NFR-USAB-03 (Touch targets ≥ 44×44px), NFR-USAB-02 (WCAG 2.1 AA)
 *
 * Supports Primary, Secondary, Danger, Outline, Ghost, and Accent variants.
 * Handles loading spinner with aria-busy, disabled state, fullWidth CTAs, start/end icons,
 * and polymorphic link navigation (via `to` or `href`).
 */
export const Button = forwardRef(function Button(
  {
    children,
    type = 'button',
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    loadingText,
    startIcon,
    endIcon,
    prefix,
    suffix,
    fullWidth = false,
    to,
    href,
    onClick,
    className = '',
    style = {},
    ...restProps
  },
  ref
) {
  const isDisabled = disabled || loading;
  const effectiveStart = startIcon || prefix;
  const effectiveEnd = endIcon || suffix;

  // Size specifications (NFR-USAB-03: touch targets ≥ 44×44px for standard/md & lg)
  const sizeStyles = {
    sm: {
      minHeight: '38px',
      minWidth: '38px',
      padding: '0.375rem 0.75rem',
      fontSize: '0.8125rem',
      gap: '0.375rem',
    },
    md: {
      minHeight: '44px',
      minWidth: '44px',
      padding: '0.625rem 1.25rem',
      fontSize: '0.875rem',
      gap: '0.5rem',
    },
    lg: {
      minHeight: '48px',
      minWidth: '48px',
      padding: '0.75rem 1.5rem',
      fontSize: '1rem',
      gap: '0.625rem',
    },
  }[size] || {
    minHeight: '44px',
    minWidth: '44px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    gap: '0.5rem',
  };

  // Base and variant styling
  const variantStyles = {
    primary: {
      backgroundColor: '#15803d',
      color: '#ffffff',
      border: '1px solid #15803d',
    },
    secondary: {
      backgroundColor: '#f1f5f9',
      color: '#0f172a',
      border: '1px solid #cbd5e1',
    },
    danger: {
      backgroundColor: '#dc2626',
      color: '#ffffff',
      border: '1px solid #dc2626',
    },
    destructive: {
      backgroundColor: '#dc2626',
      color: '#ffffff',
      border: '1px solid #dc2626',
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#15803d',
      border: '1px solid #15803d',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#334155',
      border: '1px solid transparent',
    },
    accent: {
      backgroundColor: '#f97316',
      color: '#ffffff',
      border: '1px solid #f97316',
    },
  }[variant] || {
    backgroundColor: '#15803d',
    color: '#ffffff',
    border: '1px solid #15803d',
  };

  const spinnerColor =
    variant === 'secondary' || variant === 'outline' || variant === 'ghost'
      ? 'primary'
      : 'white';

  const spinnerSize = size === 'lg' ? 'md' : 'sm';

  const combinedStyle = {
    display: fullWidth ? 'flex' : 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : 'auto',
    borderRadius: '8px',
    fontWeight: 600,
    fontFamily: 'inherit',
    lineHeight: 1.5,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: 'all 0.15s ease-in-out',
    userSelect: 'none',
    boxSizing: 'border-box',
    textDecoration: 'none',
    boxShadow:
      variant === 'primary' || variant === 'accent' || variant === 'danger'
        ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        : 'none',
    ...sizeStyles,
    ...variantStyles,
    ...style,
  };

  const combinedClassName =
    `btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full-width' : ''} ${
      isDisabled ? 'btn-disabled' : ''
    } ${loading ? 'btn-loading' : ''} ${className}`.trim();

  const content = (
    <>
      {loading ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Spinner
            inline
            size={spinnerSize}
            color={spinnerColor}
            label="Loading"
          />
          {loadingText ? <span>{loadingText}</span> : children}
        </span>
      ) : (
        <>
          {effectiveStart && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {effectiveStart}
            </span>
          )}
          <span>{children}</span>
          {effectiveEnd && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {effectiveEnd}
            </span>
          )}
        </>
      )}
    </>
  );

  // Polymorphic navigation support: Client-side React Router Link
  if (to && !isDisabled) {
    return (
      <RouterLink
        ref={ref}
        to={to}
        className={combinedClassName}
        style={combinedStyle}
        onClick={onClick}
        aria-disabled={isDisabled ? 'true' : undefined}
        {...restProps}
      >
        {content}
      </RouterLink>
    );
  }

  // Polymorphic navigation support: Native Anchor Link
  if (href && !isDisabled) {
    return (
      <a
        ref={ref}
        href={href}
        className={combinedClassName}
        style={combinedStyle}
        onClick={onClick}
        aria-disabled={isDisabled ? 'true' : undefined}
        {...restProps}
      >
        {content}
      </a>
    );
  }

  // Standard Button Element
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
      className={combinedClassName}
      style={combinedStyle}
      onClick={isDisabled ? (e) => e.preventDefault() : onClick}
      {...restProps}
    >
      {content}
    </button>
  );
});

Button.propTypes = {
  children: PropTypes.node,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf([
    'primary',
    'secondary',
    'danger',
    'destructive',
    'outline',
    'ghost',
    'accent',
  ]),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  loadingText: PropTypes.string,
  startIcon: PropTypes.node,
  endIcon: PropTypes.node,
  prefix: PropTypes.node,
  suffix: PropTypes.node,
  fullWidth: PropTypes.bool,
  to: PropTypes.string,
  href: PropTypes.string,
  onClick: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Button;
