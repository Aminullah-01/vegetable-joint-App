import PropTypes from 'prop-types';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils';
import { STRINGS } from '../../constants';

/**
 * CartSummary — Order Summary and Navigation Actions
 *
 * SRS References:
 * - CART-04: The cart shall show the grand total.
 * - CART-05: The cart shall offer "Continue shopping" and "Proceed to checkout".
 * - CHK-05 / BR-06: Notifies buyer that multiple seller items create separate orders.
 * - NFR-USAB-03: Touch targets >= 44x44px.
 * - NFR-USAB-04: Currency in Nigerian Naira (₦).
 */
export function CartSummary({
  subtotal = 0,
  total = 0,
  itemCount = 0,
  uniqueItemCount = 0,
  sellersCount = 1,
  disabled = false,
  className = '',
  style = {},
}) {
  const isMultiSeller = sellersCount > 1;

  return (
    <aside
      aria-label="Order summary"
      data-testid="cart-summary"
      className={`cart-summary ${className}`.trim()}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        position: 'sticky',
        top: '1.5rem',
        ...style,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#0f172a',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '0.75rem',
        }}
      >
        Order Summary
      </h2>

      {/* Breakdown Lines */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {/* Items Subtotal (CART-04) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.95rem',
          }}
        >
          <span style={{ color: '#64748b' }}>
            {STRINGS.CART.SUBTOTAL} ({itemCount}{' '}
            {itemCount === 1 ? 'item' : 'items'}
            {uniqueItemCount > 0 && uniqueItemCount !== itemCount
              ? `, ${uniqueItemCount} varieties`
              : ''}
            ):
          </span>
          <span
            style={{
              fontWeight: 700,
              color: '#0f172a',
              fontVariantNumeric: 'tabular-nums',
            }}
            data-testid="cart-summary-subtotal"
          >
            {formatCurrency(subtotal)}
          </span>
        </div>

        {/* Estimated Delivery Note */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.95rem',
          }}
        >
          <span style={{ color: '#64748b' }}>Estimated Delivery:</span>
          <span
            style={{
              color: '#15803d',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Calculated at checkout
          </span>
        </div>

        {/* Multi-Seller Notice (CHK-05, BR-06) */}
        {isMultiSeller && (
          <div
            role="status"
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.8125rem',
              color: '#1e40af',
              lineHeight: 1.45,
            }}
            data-testid="cart-multi-seller-notice"
          >
            <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>
              ℹ️ Items from {sellersCount} different sellers
            </div>
            Per marketplace rules, items from each seller will be placed as
            independent orders during checkout.
          </div>
        )}
      </div>

      {/* Divider */}
      <hr
        style={{
          border: 'none',
          borderTop: '1px solid #e2e8f0',
          margin: 0,
        }}
      />

      {/* Grand Total Line (CART-04) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#0f172a',
              display: 'block',
            }}
          >
            {STRINGS.CART.TOTAL}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            VAT & standard fees included
          </span>
        </div>
        <span
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#15803d',
            fontVariantNumeric: 'tabular-nums',
          }}
          data-testid="cart-grand-total"
        >
          {formatCurrency(total)}
        </span>
      </div>

      {/* Action Buttons (CART-05) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginTop: '0.5rem',
        }}
      >
        {/* Proceed to Checkout Button */}
        <Button
          to="/checkout"
          variant="primary"
          size="lg"
          fullWidth
          disabled={disabled || itemCount === 0}
          data-testid="cart-checkout-button"
        >
          {STRINGS.CART.PROCEED_TO_CHECKOUT}
        </Button>

        {/* Continue Shopping Button */}
        <Button
          to="/products"
          variant="outline"
          size="md"
          fullWidth
          data-testid="cart-continue-shopping-button"
        >
          {STRINGS.CART.CONTINUE_SHOPPING}
        </Button>
      </div>

      {/* Trust & Guarantee Badges */}
      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          fontSize: '0.75rem',
          color: '#64748b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>🥬</span>
          <span>Fresh harvested produce from verified sellers</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>📦</span>
          <span>Delivery arranged directly upon order placement</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>🇳🇬</span>
          <span>Nigerian Naira (₦) transparent market pricing</span>
        </div>
      </div>
    </aside>
  );
}

CartSummary.propTypes = {
  subtotal: PropTypes.number,
  total: PropTypes.number,
  itemCount: PropTypes.number,
  uniqueItemCount: PropTypes.number,
  sellersCount: PropTypes.number,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default CartSummary;
