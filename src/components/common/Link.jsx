import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Link — Reusable Accessible Link Component
 * SRS References: UI-01, UI-03, NFR-USAB-03 (Touch targets ≥ 44×44px), NFR-USAB-02 (WCAG 2.1 AA)
 *
 * Supports client-side React Router navigation (via `to`) and native/external links (via `href`).
 * Includes primary, secondary, muted, and danger color variants, touch target expansion,
 * external link attributes (`rel="noopener noreferrer"`), and accessible disabled state.
 */
export const Link = forwardRef(function Link(
  {
    children,
    to,
    href,
    variant = 'primary',
    external = false,
    touchTarget = false,
    disabled = false,
    startIcon,
    endIcon,
    prefix,
    suffix,
    onClick,
    className = '',
    style = {},
    ...restProps
  },
  ref
) {
  const isExternal =
    external ||
    (typeof href === 'string' &&
      (href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('//')));

  const effectiveStart = startIcon || prefix;
  const effectiveEnd = endIcon || suffix;

  const variantColors = {
    primary: {
      color: '#15803d',
      hoverColor: '#166534',
    },
    secondary: {
      color: '#334155',
      hoverColor: '#0f172a',
    },
    muted: {
      color: '#64748b',
      hoverColor: '#334155',
    },
    danger: {
      color: '#dc2626',
      hoverColor: '#b91c1c',
    },
  }[variant] || {
    color: '#15803d',
    hoverColor: '#166534',
  };

  const combinedStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    color: disabled ? '#94a3b8' : variantColors.color,
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'color 0.15s ease-in-out',
    minHeight: touchTarget ? '44px' : undefined,
    minWidth: touchTarget ? '44px' : undefined,
    padding: touchTarget ? '0.5rem' : undefined,
    boxSizing: 'border-box',
    ...style,
  };

  const combinedClassName = `link link-${variant} ${
    touchTarget ? 'link-touch-target' : ''
  } ${disabled ? 'link-disabled' : ''} ${className}`.trim();

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) onClick(e);
  };

  const content = (
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
      {isExternal && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '0.75em',
            marginLeft: '0.125rem',
          }}
        >
          ↗
        </span>
      )}
      {isExternal && (
        <span
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: 0,
          }}
        >
          (opens in a new tab)
        </span>
      )}
    </>
  );

  // If disabled, render as span or inert anchor with aria-disabled
  if (disabled) {
    return (
      <span
        ref={ref}
        role="link"
        aria-disabled="true"
        className={combinedClassName}
        style={combinedStyle}
        {...restProps}
      >
        {content}
      </span>
    );
  }

  // Client-side Router Link
  if (to) {
    return (
      <RouterLink
        ref={ref}
        to={to}
        className={combinedClassName}
        style={combinedStyle}
        onClick={handleClick}
        {...restProps}
      >
        {content}
      </RouterLink>
    );
  }

  // Native Anchor / External link
  return (
    <a
      ref={ref}
      href={href || '#'}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={combinedClassName}
      style={combinedStyle}
      onClick={handleClick}
      {...restProps}
    >
      {content}
    </a>
  );
});

Link.propTypes = {
  children: PropTypes.node.isRequired,
  to: PropTypes.string,
  href: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'secondary', 'muted', 'danger']),
  external: PropTypes.bool,
  touchTarget: PropTypes.bool,
  disabled: PropTypes.bool,
  startIcon: PropTypes.node,
  endIcon: PropTypes.node,
  prefix: PropTypes.node,
  suffix: PropTypes.node,
  onClick: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Link;
