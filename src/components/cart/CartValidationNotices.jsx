import PropTypes from 'prop-types';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils';

/**
 * CartValidationNotices — Re-validation Notice Component (CART-08, TC-18)
 *
 * Displays detailed price updates, stock adjustments, and unavailable items
 * detected during checkout re-validation before allowing order placement.
 */
export function CartValidationNotices({
  changes = [],
  notice = 'Some items in your cart have updated prices or stock availability.',
  onAccept,
  onReviewCart,
  showActions = true,
  className = '',
  style = {},
}) {
  if (!changes || changes.length === 0) {
    if (!notice) return null;
  }

  const priceChanges = (changes || []).filter(
    (c) => c.type === 'price_changed'
  );
  const stockChanges = (changes || []).filter(
    (c) => c.type === 'stock_reduced'
  );
  const unavailableChanges = (changes || []).filter(
    (c) => c.type === 'unavailable' || c.type === 'seller_suspended'
  );

  return (
    <div
      role="alert"
      data-testid="cart-validation-notices"
      className={`cart-validation-notices ${className}`.trim()}
      style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          marginBottom: changes.length > 0 ? '1rem' : 0,
        }}
      >
        <span
          style={{
            fontSize: '1.4rem',
            lineHeight: 1,
            color: '#b45309',
            marginTop: '0.1rem',
          }}
          aria-hidden="true"
        >
          ⚠️
        </span>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#92400e',
            }}
          >
            Important Cart Updates Before Checkout
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#78350f',
              lineHeight: 1.45,
            }}
          >
            {notice}
          </p>
        </div>
      </div>

      {/* Itemized Changes Breakdown */}
      {changes.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            margin: '1rem 0',
          }}
        >
          {/* Price Changes Section */}
          {priceChanges.map((change, idx) => (
            <div
              key={`price-${change.product_id || idx}`}
              data-testid="notice-price-change"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                border: '1px solid #fef3c7',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  Price Changed
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: '#1e293b',
                    fontSize: '0.9rem',
                  }}
                >
                  {change.name}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {change.old_price !== undefined && (
                  <span
                    style={{
                      textDecoration: 'line-through',
                      color: '#94a3b8',
                    }}
                  >
                    {formatCurrency(change.old_price)}
                  </span>
                )}
                <span
                  style={{
                    fontWeight: 700,
                    color: '#15803d',
                  }}
                >
                  {change.new_price !== undefined
                    ? formatCurrency(change.new_price)
                    : ''}
                </span>
              </div>
            </div>
          ))}

          {/* Stock Reductions Section */}
          {stockChanges.map((change, idx) => (
            <div
              key={`stock-${change.product_id || idx}`}
              data-testid="notice-stock-issue"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                border: '1px solid #e0f2fe',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span
                  style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  Stock Adjusted
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: '#1e293b',
                    fontSize: '0.9rem',
                  }}
                >
                  {change.name}
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#0369a1' }}>
                Quantity adjusted to {change.new_quantity} (requested{' '}
                {change.old_quantity})
              </div>
            </div>
          ))}

          {/* Unavailable / Removed Items Section */}
          {unavailableChanges.map((change, idx) => (
            <div
              key={`unavail-${change.product_id || idx}`}
              data-testid="notice-unavailable"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                border: '1px solid #fee2e2',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  Unavailable
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: '#1e293b',
                    fontSize: '0.9rem',
                  }}
                >
                  {change.name}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#b91c1c',
                  fontWeight: 500,
                }}
              >
                Item is out of stock / unavailable and removed from order
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action CTAs */}
      {showActions && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginTop: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          {onAccept && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={onAccept}
              data-testid="accept-cart-changes-button"
              style={{ minHeight: '44px' }}
            >
              Accept Changes & Proceed
            </Button>
          )}
          {onReviewCart && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onReviewCart}
              data-testid="review-cart-button"
              style={{ minHeight: '44px' }}
            >
              Review in Cart
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

CartValidationNotices.propTypes = {
  changes: PropTypes.arrayOf(
    PropTypes.shape({
      product_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      name: PropTypes.string,
      type: PropTypes.string,
      message: PropTypes.string,
      old_price: PropTypes.number,
      new_price: PropTypes.number,
      old_quantity: PropTypes.number,
      new_quantity: PropTypes.number,
    })
  ),
  notice: PropTypes.string,
  onAccept: PropTypes.func,
  onReviewCart: PropTypes.func,
  showActions: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default CartValidationNotices;
