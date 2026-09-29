import PropTypes from 'prop-types';

/**
 * AvailabilityBadge — Displays product stock availability status
 * SRS References: SEL-07, BR-01, MKT-02
 *
 * Acceptance Criteria (FE-027):
 * Shows Available / Out of Stock / Unavailable from stock and availability flag.
 *
 * Rules:
 * 1. Manual switch OFF (availability = false | 0 | 'unavailable') -> "Unavailable" (SEL-07)
 * 2. Manual switch ON & stock = 0 -> "Out of Stock" (BR-01)
 * 3. Manual switch ON & 0 < stock <= low_stock_threshold (default 5) -> "Low Stock"
 * 4. Manual switch ON & stock > low_stock_threshold -> "Available" (or "In Stock")
 */
export function AvailabilityBadge({
  product,
  status,
  quantity: propQuantity,
  availability: propAvailability,
  isAvailable: propIsAvailable,
  lowStockThreshold: propThreshold,
  labelType,
  showQuantity = false,
  size = 'md',
  className = '',
  style = {},
}) {
  // Extract values from product object if provided
  const p = product || {};
  const quantity = p.quantity ?? propQuantity;
  const rawAvailability = p.availability ?? propAvailability ?? propIsAvailable;
  const threshold = p.low_stock_threshold ?? propThreshold ?? 5;
  const rawStatus =
    status ?? (typeof p.availability === 'string' ? p.availability : undefined);

  const normalizedStatus = rawStatus ? String(rawStatus).toLowerCase() : '';

  // 1. Check if manually marked unavailable (SEL-07: seller's manual switch)
  const isManuallyUnavailable =
    rawAvailability === false ||
    rawAvailability === 0 ||
    rawAvailability === '0' ||
    rawAvailability === 'unavailable' ||
    normalizedStatus === 'unavailable';

  // 2. Derive state (SEL-07, BR-01)
  let resolvedState = 'available';
  let badgeLabel = 'Available';
  let badgeStyle = {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    dotColor: '#16a34a',
  };

  if (isManuallyUnavailable) {
    resolvedState = 'unavailable';
    badgeLabel = 'Unavailable';
    badgeStyle = {
      backgroundColor: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
      dotColor: '#64748b',
    };
  } else if (
    quantity === 0 ||
    quantity === '0' ||
    normalizedStatus === 'out_of_stock' ||
    normalizedStatus === 'out-of-stock'
  ) {
    resolvedState = 'out_of_stock';
    badgeLabel = 'Out of Stock';
    badgeStyle = {
      backgroundColor: '#fee2e2',
      color: '#b91c1c',
      border: '1px solid #fecaca',
      dotColor: '#dc2626',
    };
  } else if (
    normalizedStatus === 'low_stock' ||
    normalizedStatus === 'low-stock' ||
    (quantity !== undefined &&
      quantity !== null &&
      Number(quantity) > 0 &&
      Number(quantity) <= Number(threshold))
  ) {
    resolvedState = 'low_stock';
    badgeLabel =
      showQuantity && quantity !== undefined
        ? `Only ${quantity} left`
        : 'Low Stock';
    badgeStyle = {
      backgroundColor: '#fef3c7',
      color: '#b45309',
      border: '1px solid #fde68a',
      dotColor: '#d97706',
    };
  } else {
    resolvedState = 'available';
    if (labelType === 'in_stock' || normalizedStatus === 'in_stock') {
      badgeLabel = 'In Stock';
    } else {
      badgeLabel = 'Available';
    }
    badgeStyle = {
      backgroundColor: '#dcfce7',
      color: '#15803d',
      border: '1px solid #bbf7d0',
      dotColor: '#16a34a',
    };
  }

  // Size styling (touch comfortable, compact for card overlays)
  const sizeStyles = {
    sm: {
      padding: '0.125rem 0.5rem',
      fontSize: '0.75rem',
      gap: '0.25rem',
      dotSize: '6px',
    },
    md: {
      padding: '0.25rem 0.625rem',
      fontSize: '0.8125rem',
      gap: '0.375rem',
      dotSize: '7px',
    },
    lg: {
      padding: '0.375rem 0.75rem',
      fontSize: '0.875rem',
      gap: '0.5rem',
      dotSize: '8px',
    },
  }[size] || {
    padding: '0.25rem 0.625rem',
    fontSize: '0.8125rem',
    gap: '0.375rem',
    dotSize: '7px',
  };

  return (
    <span
      className={`availability-badge badge-${resolvedState} badge-${size} ${className}`.trim()}
      data-testid="availability-badge"
      data-status={resolvedState}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '9999px',
        fontWeight: 600,
        lineHeight: 1.2,
        userSelect: 'none',
        padding: sizeStyles.padding,
        fontSize: sizeStyles.fontSize,
        gap: sizeStyles.gap,
        backgroundColor: badgeStyle.backgroundColor,
        color: badgeStyle.color,
        border: badgeStyle.border,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: sizeStyles.dotSize,
          height: sizeStyles.dotSize,
          borderRadius: '50%',
          backgroundColor: badgeStyle.dotColor,
          flexShrink: 0,
        }}
      />
      <span>{badgeLabel}</span>
    </span>
  );
}

AvailabilityBadge.propTypes = {
  product: PropTypes.shape({
    quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    availability: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.number,
      PropTypes.string,
    ]),
    low_stock_threshold: PropTypes.number,
  }),
  status: PropTypes.string,
  quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  availability: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.number,
    PropTypes.string,
  ]),
  isAvailable: PropTypes.bool,
  lowStockThreshold: PropTypes.number,
  labelType: PropTypes.oneOf(['available', 'in_stock']),
  showQuantity: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  style: PropTypes.object,
};

export default AvailabilityBadge;
