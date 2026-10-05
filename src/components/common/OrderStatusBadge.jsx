import PropTypes from 'prop-types';
import {
  getOrderStatusConfig,
  normalizeOrderStatus,
} from '../../utils/orderStatus';

/**
 * OrderStatusBadge — Reusable Color-coded Order Status Badge
 * SRS References: ORD-02, ORD-05, ORD-06, BR-07, NFR-USAB-02 (WCAG 2.1 AA)
 *
 * Visually distinguishes order statuses:
 * - Pending: Amber / Yellow
 * - Confirmed: Blue
 * - Processing: Purple
 * - Ready: Teal
 * - Completed: Agricultural Green
 * - Cancelled: Red (visually distinct per design prompt)
 */
export function OrderStatusBadge({
  status = 'pending',
  size = 'md',
  showDot = true,
  className = '',
  style = {},
  testId = 'order-status-badge',
  ...restProps
}) {
  const normStatus = normalizeOrderStatus(status);
  const config = getOrderStatusConfig(normStatus);

  const sizeStyles = {
    sm: {
      fontSize: '0.75rem',
      padding: '0.2rem 0.55rem',
      gap: '0.35rem',
      dotSize: '6px',
    },
    md: {
      fontSize: '0.8125rem',
      padding: '0.3rem 0.75rem',
      gap: '0.45rem',
      dotSize: '7px',
    },
    lg: {
      fontSize: '0.875rem',
      padding: '0.4rem 0.95rem',
      gap: '0.5rem',
      dotSize: '8px',
    },
  }[size] || {
    fontSize: '0.8125rem',
    padding: '0.3rem 0.75rem',
    gap: '0.45rem',
    dotSize: '7px',
  };

  return (
    <span
      role="status"
      aria-label={`Order status: ${config.label}`}
      data-testid={testId}
      data-status={normStatus}
      className={`order-status-badge order-status-${normStatus} ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        lineHeight: 1.25,
        borderRadius: '9999px',
        border: `1px solid ${config.border}`,
        backgroundColor: config.bg,
        color: config.text,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...sizeStyles,
        ...style,
      }}
      {...restProps}
    >
      {showDot && (
        <span
          data-testid={`${testId}-dot`}
          aria-hidden="true"
          style={{
            width: sizeStyles.dotSize,
            height: sizeStyles.dotSize,
            minWidth: sizeStyles.dotSize,
            minHeight: sizeStyles.dotSize,
            borderRadius: '50%',
            backgroundColor: config.dotColor,
            flexShrink: 0,
          }}
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}

OrderStatusBadge.propTypes = {
  status: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showDot: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  testId: PropTypes.string,
};

export default OrderStatusBadge;
