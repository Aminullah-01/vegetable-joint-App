import PropTypes from 'prop-types';
import { formatCurrency } from '../../utils';
import { Button } from '../common/Button';

/**
 * OrderSummary — Checkout Order Summary Component
 *
 * SRS References:
 * - CHK-03: The checkout page shall show an order summary: selected products,
 *   quantities, unit prices, subtotals, and total amount, and require explicit confirmation.
 * - CHK-05 / BR-06: Notifies buyer when items belong to several sellers.
 * - CHK-09: Displays payment method ("Pay on delivery / pay seller directly").
 * - BR-02: Line subtotal = unit price × quantity. Order total = sum of line subtotals.
 * - NFR-USAB-03: Touch targets >= 44x44px.
 * - NFR-USAB-04: Currency in Nigerian Naira (₦).
 */
export function OrderSummary({
  items = [],
  subtotal = 0,
  total = 0,
  itemCount = 0,
  disabled = false,
  isSubmitting = false,
  to = '/checkout/confirmation/ORD-2026-001',
  onProceedToReview,
  onPlaceOrder,
  hasConfirmed = false,
  onToggleConfirm,
  showExplicitConfirm = true,
  className = '',
  style = {},
}) {
  // Count unique sellers (CHK-05)
  const sellerIds = new Set(
    items.map((it) => it.seller_id ?? it.seller?.id).filter(Boolean)
  );
  const isMultiSeller = sellerIds.size > 1;

  const handleActionClick = (e) => {
    if (onProceedToReview) {
      e?.preventDefault();
      onProceedToReview();
    } else if (onPlaceOrder) {
      e?.preventDefault();
      onPlaceOrder();
    }
  };

  return (
    <aside
      aria-label="Checkout Order Summary"
      data-testid="checkout-order-summary"
      className={`checkout-order-summary ${className}`.trim()}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '0.75rem',
        }}
      >
        <h2 style={{ fontSize: '1.15rem', color: '#1e293b', margin: 0 }}>
          Order Summary
        </h2>
        <span
          style={{
            fontSize: '0.8rem',
            backgroundColor: '#f1f5f9',
            color: '#475569',
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            fontWeight: 600,
          }}
          data-testid="checkout-summary-badge"
        >
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Multi-Seller Notice (CHK-05 / BR-06) */}
      {isMultiSeller && (
        <div
          role="status"
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '0.75rem',
            fontSize: '0.8rem',
            color: '#1e40af',
            lineHeight: 1.45,
          }}
          data-testid="checkout-multi-seller-notice"
        >
          <strong style={{ display: 'block', marginBottom: '0.2rem' }}>
            🛒 Multi-Seller Order ({sellerIds.size} sellers)
          </strong>
          Items from each seller will be processed as separate orders under your
          checkout reference (CHK-05).
        </div>
      )}

      {/* Selected Products List (CHK-03) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxHeight: '280px',
          overflowY: 'auto',
          paddingRight: '0.25rem',
        }}
        data-testid="checkout-order-items"
      >
        {items.map((item) => {
          const itemId = item.product_id ?? item.id;
          const itemSubtotal = item.subtotal ?? item.price * item.quantity;
          const sellerName =
            item.seller?.business_name ||
            item.seller_name ||
            (item.seller_id ? `Seller #${item.seller_id}` : null);

          return (
            <div
              key={itemId}
              data-testid={`checkout-item-${itemId}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                fontSize: '0.85rem',
                paddingBottom: '0.625rem',
                borderBottom: '1px solid #f1f5f9',
                gap: '0.75rem',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  data-testid={`checkout-item-name-${itemId}`}
                  style={{
                    fontWeight: 600,
                    color: '#1e293b',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                </span>

                {sellerName && (
                  <span
                    data-testid={`checkout-item-seller-${itemId}`}
                    style={{
                      fontSize: '0.75rem',
                      color: '#15803d',
                      display: 'block',
                      marginTop: '0.1rem',
                    }}
                  >
                    🏪 {sellerName}
                  </span>
                )}

                <span
                  data-testid={`checkout-item-meta-${itemId}`}
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    display: 'block',
                    marginTop: '0.15rem',
                  }}
                >
                  {item.quantity} × {formatCurrency(item.price)} per{' '}
                  {item.unit || 'unit'}
                </span>
              </div>

              <span
                data-testid={`checkout-item-subtotal-${itemId}`}
                style={{
                  fontWeight: 700,
                  color: '#0f172a',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatCurrency(itemSubtotal)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Financial Breakdown (BR-02, CHK-03) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '0.75rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ color: '#64748b' }}>Items ({itemCount}):</span>
          <span
            data-testid="checkout-subtotal"
            style={{ fontWeight: 600, color: '#1e293b' }}
          >
            {formatCurrency(subtotal)}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            color: '#64748b',
          }}
        >
          <span>Estimated Delivery:</span>
          <span style={{ color: '#15803d', fontWeight: 500 }}>
            Calculated on delivery (BR-02)
          </span>
        </div>

        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '0.75rem',
            marginTop: '0.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontWeight: '700',
            fontSize: '1.15rem',
            color: '#15803d',
          }}
        >
          <span>Total:</span>
          <span
            data-testid="checkout-total"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Payment Method Notice (CHK-09, OI-01) */}
      <div
        style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          padding: '0.75rem',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#166534',
          lineHeight: 1.45,
        }}
        data-testid="checkout-payment-method-notice"
      >
        <strong>Payment Method:</strong> Pay on delivery / pay seller directly
        (Cash or Bank Transfer on Delivery, CHK-09, OI-01). Pay seller directly
        upon receipt of fresh produce.
      </div>

      {/* Optional In-Page Explicit Confirm Checkbox (CHK-03) */}
      {showExplicitConfirm && onToggleConfirm && (
        <label
          data-testid="checkout-explicit-confirm-label"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#334155',
            cursor: 'pointer',
            padding: '0.5rem',
            backgroundColor: hasConfirmed ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${hasConfirmed ? '#86efac' : '#e2e8f0'}`,
            borderRadius: '6px',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            data-testid="checkout-explicit-confirm-checkbox"
            checked={hasConfirmed}
            onChange={(e) => onToggleConfirm(e.target.checked)}
            style={{ marginTop: '0.15rem', cursor: 'pointer' }}
          />
          <span>
            I have reviewed the selected vegetables, quantities, prices, and
            delivery terms, and explicitly confirm this order (CHK-03).
          </span>
        </label>
      )}

      {/* Primary Action Button (Place Order / Review Order) */}
      <Button
        to={
          disabled || isSubmitting
            ? undefined
            : to || '/checkout/confirmation/ORD-2026-001'
        }
        onClick={handleActionClick}
        disabled={disabled || isSubmitting}
        loading={isSubmitting}
        loadingText="Placing Order..."
        variant="primary"
        size="lg"
        fullWidth
        data-testid="checkout-place-order-button"
        style={{
          textAlign: 'center',
          textDecoration: 'none',
          marginTop: '0.25rem',
          minHeight: '44px',
        }}
      >
        Review & Place Order →
      </Button>
    </aside>
  );
}

OrderSummary.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      product_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      quantity: PropTypes.number.isRequired,
      unit: PropTypes.string,
      subtotal: PropTypes.number,
      seller_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      seller: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        business_name: PropTypes.string,
      }),
    })
  ),
  subtotal: PropTypes.number,
  total: PropTypes.number,
  itemCount: PropTypes.number,
  disabled: PropTypes.bool,
  isSubmitting: PropTypes.bool,
  onProceedToReview: PropTypes.func,
  onPlaceOrder: PropTypes.func,
  hasConfirmed: PropTypes.bool,
  onToggleConfirm: PropTypes.func,
  showExplicitConfirm: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default OrderSummary;
