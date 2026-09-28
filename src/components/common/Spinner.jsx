import PropTypes from 'prop-types';

const SIZE_MAP = {
  xs: { size: '16px', stroke: '2px' },
  sm: { size: '20px', stroke: '2.5px' },
  md: { size: '28px', stroke: '3px' },
  lg: { size: '36px', stroke: '3.5px' },
  xl: { size: '48px', stroke: '4px' },
};

const COLOR_MAP = {
  primary: '#15803d',
  secondary: '#64748b',
  white: '#ffffff',
  accent: '#f97316',
  current: 'currentColor',
};

/**
 * Reusable Spinner Component
 * Conforms to SRS MKT-10 and Figma UI Design System:
 * - Supports xs, sm, md, lg, xl sizes
 * - Works inline (inside buttons), standalone, or centered in full sections
 * - Accessible with role="status" and sr-only label
 */
export function Spinner({
  size = 'md',
  color = 'primary',
  label = 'Loading...',
  text = null,
  center = false,
  inline = false,
  className = '',
  style = {},
}) {
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const activeColor = COLOR_MAP[color] || color;

  const spinnerElement = (
    <div
      role="status"
      aria-label={label}
      style={{
        display: inline ? 'inline-flex' : 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        ...style,
      }}
      className={className}
    >
      <div
        className="animate-spin"
        style={{
          width: sizeConfig.size,
          height: sizeConfig.size,
          border: `${sizeConfig.stroke} solid #e2e8f0`,
          borderTopColor: activeColor,
          borderRadius: '50%',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      {text && (
        <span
          style={{
            fontSize: size === 'sm' || size === 'xs' ? '0.8rem' : '0.9rem',
            color: '#64748b',
            fontWeight: '500',
          }}
        >
          {text}
        </span>
      )}
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
        {label}
      </span>
    </div>
  );

  if (center) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '240px',
          width: '100%',
          padding: '2rem',
        }}
        data-testid="spinner-center"
      >
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
}

Spinner.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  color: PropTypes.string,
  label: PropTypes.string,
  text: PropTypes.string,
  center: PropTypes.bool,
  inline: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Spinner;
