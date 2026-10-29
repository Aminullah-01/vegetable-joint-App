import PropTypes from 'prop-types';
import { isLowStock, isOutOfStock } from '../../utils/stock.js';

/**
 * LowStockIndicator — Dedicated highlight indicator for low stock produce
 *
 * SRS References:
 * - SEL-09: The Inventory view shall flag low stock (default threshold 5 units, configurable per product). [ASSUMPTION A-09]
 * - SEL-07 / BR-01 / TC-21: Quantity 0 flags Out of Stock automatically.
 * - Figma Section 13: Seller Dashboard Low-Stock indicators and warning badges.
 *
 * Acceptance Criteria (FE-089):
 * - Highlight items at or below threshold (default 5).
 */
export function LowStockIndicator({
  quantity = 0,
  threshold = 5,
  unit = '',
  availability = 'available',
  showThreshold = true,
  showCount = false,
  showWhenNormal = false,
  variant = 'badge',
  size = 'sm',
  testId,
  className = '',
  style = {},
}) {
  const qty = Number(quantity);
  const thresh = Number(threshold || 5);

  const isDelisted = availability === 'unavailable' || availability === false;
  const outOfStock = isOutOfStock(qty);
  const lowStock = !isDelisted && isLowStock(qty, thresh);

  // If item is neither out of stock nor low stock, and showWhenNormal is false, return null
  if (!isDelisted && !outOfStock && !lowStock && !showWhenNormal) {
    return null;
  }

  // If item is manually delisted and showWhenNormal is false, return null
  if (isDelisted && !showWhenNormal) {
    return null;
  }

  // Determine status, label, icon, and colors
  let status = 'in_stock';
  let label = 'In Stock';
  let icon = '✅';
  let theme = {
    bg: '#dcfce7',
    color: '#15803d',
    border: '#bbf7d0',
  };

  if (isDelisted) {
    status = 'unavailable';
    label = 'Unavailable';
    icon = '⏸';
    theme = {
      bg: '#f1f5f9',
      color: '#475569',
      border: '#cbd5e1',
    };
  } else if (outOfStock) {
    status = 'out_of_stock';
    label = 'Out of Stock';
    icon = '🚫';
    theme = {
      bg: '#fee2e2',
      color: '#dc2626',
      border: '#fca5a5',
    };
  } else if (lowStock) {
    status = 'low_stock';
    icon = '⚠️';
    theme = {
      bg: '#fef3c7',
      color: '#b45309',
      border: '#fde68a',
    };

    if (showCount) {
      label = unit ? `Only ${qty} ${unit} left` : `Only ${qty} left`;
    } else if (showThreshold) {
      label = `Low (≤ ${thresh})`;
    } else {
      label = 'Low Stock';
    }
  }

  // Size configurations
  const sizeStyles =
    {
      sm: {
        fontSize: '0.7rem',
        padding: '0.125rem 0.4rem',
        gap: '0.25rem',
        borderRadius: variant === 'pill' ? '9999px' : '4px',
      },
      md: {
        fontSize: '0.785rem',
        padding: '0.2rem 0.55rem',
        gap: '0.35rem',
        borderRadius: variant === 'pill' ? '9999px' : '6px',
      },
      lg: {
        fontSize: '0.875rem',
        padding: '0.35rem 0.75rem',
        gap: '0.45rem',
        borderRadius: variant === 'pill' ? '9999px' : '8px',
      },
    }[size] || sizeStyles.sm;

  if (variant === 'text') {
    return (
      <span
        role="status"
        data-testid={testId || 'low-stock-indicator'}
        data-status={status}
        data-quantity={qty}
        data-threshold={thresh}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          color: theme.color,
          fontSize: sizeStyles.fontSize,
          fontWeight: 600,
          ...style,
        }}
        title={`Stock level: ${qty} ${unit} (threshold: ${thresh})`}
      >
        <span aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        role="alert"
        data-testid={testId || 'low-stock-indicator'}
        data-status={status}
        data-quantity={qty}
        data-threshold={thresh}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.bg,
          border: `1px solid ${theme.border}`,
          color: theme.color,
          borderRadius: '8px',
          padding: '0.625rem 0.875rem',
          fontSize: '0.825rem',
          fontWeight: 600,
          lineHeight: 1.4,
          ...style,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <span aria-hidden="true">{icon}</span>
          <span>
            {lowStock
              ? `Low Stock Warning: Only ${qty} ${unit || 'units'} left in stock (alert threshold is ${thresh} units).`
              : outOfStock
                ? 'Out of Stock Alert: This product is sold out.'
                : label}
          </span>
        </span>
      </div>
    );
  }

  // Default: 'badge' or 'pill'
  return (
    <span
      role="status"
      data-testid={testId || 'low-stock-indicator'}
      data-status={status}
      data-quantity={qty}
      data-threshold={thresh}
      aria-label={
        lowStock
          ? `Low stock warning: ${qty} ${unit} remaining, at or below threshold of ${thresh}`
          : outOfStock
            ? 'Out of stock'
            : label
      }
      title={`Stock level: ${qty} ${unit} (alert threshold: ${thresh})`}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 600,
        backgroundColor: theme.bg,
        color: theme.color,
        border: `1px solid ${theme.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.25,
        ...sizeStyles,
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '0.85em' }}>
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
}

LowStockIndicator.propTypes = {
  quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  threshold: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  unit: PropTypes.string,
  availability: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  showThreshold: PropTypes.bool,
  showCount: PropTypes.bool,
  showWhenNormal: PropTypes.bool,
  variant: PropTypes.oneOf(['badge', 'pill', 'text', 'card', 'banner']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  testId: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default LowStockIndicator;
