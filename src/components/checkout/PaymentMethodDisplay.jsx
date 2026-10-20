import PropTypes from 'prop-types';
import { PAYMENT_METHOD_INFO } from '../../constants';

/**
 * PaymentMethodDisplay — Payment Method Section & Disclosure Component
 *
 * Conforms to:
 * - FE-073: Show "Pay on delivery / pay seller directly"; no online payment in 1.0.
 * - SRS CHK-09, A-07, OI-01.
 * - Figma Section 10 & Section 19 (MVP Restrictions).
 * - NFR-USAB-01, NFR-USAB-02: WCAG 2.1 AA accessible semantics and color contrast.
 *
 * @param {Object} props
 * @param {'card'|'inline'|'compact'} [props.variant='card'] - Display layout style.
 * @param {boolean} [props.showNotice=true] - Whether to show the detailed explanation notice.
 * @param {string} [props.className=''] - Additional CSS class names.
 * @param {Object} [props.style={}] - Inline style overrides.
 */
export function PaymentMethodDisplay({
  variant = 'card',
  showNotice = true,
  className = '',
  style = {},
}) {
  const isInline = variant === 'inline';
  const isCompact = variant === 'compact';

  if (isInline || isCompact) {
    return (
      <div
        role="region"
        aria-label="Payment Method"
        data-testid="checkout-payment-method-display"
        data-variant={variant}
        className={`checkout-payment-method checkout-payment-method-${variant} ${className}`.trim()}
        style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: isCompact ? '0.625rem 0.75rem' : '0.75rem 1rem',
          fontSize: isCompact ? '0.8rem' : '0.85rem',
          color: '#166534',
          lineHeight: 1.45,
          ...style,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontWeight: 700,
            marginBottom: showNotice ? '0.25rem' : 0,
            color: '#15803d',
          }}
        >
          <span aria-hidden="true">💵</span>
          <span data-testid="payment-method-label">
            Payment Method: {PAYMENT_METHOD_INFO.label}
          </span>
        </div>

        {showNotice && (
          <p
            data-testid="payment-method-notice"
            style={{
              margin: 0,
              color: '#166534',
              fontSize: isCompact ? '0.75rem' : '0.8rem',
            }}
          >
            {PAYMENT_METHOD_INFO.disclaimer}
          </p>
        )}
      </div>
    );
  }

  // Standard 'card' variant for Checkout Page or Order Details
  return (
    <section
      aria-labelledby="payment-method-heading"
      data-testid="checkout-payment-method-display"
      data-variant="card"
      className={`checkout-payment-method checkout-payment-method-card ${className}`.trim()}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
            💵
          </span>
          <h2
            id="payment-method-heading"
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0,
            }}
          >
            Payment Method (CHK-09)
          </h2>
        </div>

        <span
          style={{
            fontSize: '0.75rem',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            fontWeight: 700,
          }}
          data-testid="payment-method-badge"
        >
          Pay on Delivery
        </span>
      </div>

      {/* Selected Option (Fixed for 1.0 per ASSUMPTION A-07) */}
      <div
        data-testid="payment-method-selected-option"
        style={{
          border: '2px solid #15803d',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          padding: '0.875rem 1rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}
      >
        <input
          type="radio"
          id="payment_method_pod"
          name="payment_method"
          value="pay_on_delivery"
          checked={true}
          readOnly
          aria-checked="true"
          data-testid="payment-method-radio"
          style={{
            accentColor: '#15803d',
            marginTop: '0.2rem',
            cursor: 'default',
            width: '16px',
            height: '16px',
          }}
        />

        <div style={{ flex: 1 }}>
          <label
            htmlFor="payment_method_pod"
            style={{
              display: 'block',
              fontWeight: 700,
              color: '#15803d',
              fontSize: '0.95rem',
              cursor: 'default',
            }}
            data-testid="payment-method-title"
          >
            Pay on delivery / pay seller directly
          </label>

          <p
            style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.825rem',
              color: '#334155',
              lineHeight: 1.45,
            }}
          >
            Settle payment directly with each seller via <strong>cash</strong>{' '}
            or <strong>instant bank transfer</strong> upon receiving and
            inspecting your fresh produce.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
              marginTop: '0.5rem',
            }}
          >
            <span
              style={{
                fontSize: '0.725rem',
                backgroundColor: '#ffffff',
                border: '1px solid #bbf7d0',
                color: '#166534',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              💵 Cash on Delivery
            </span>
            <span
              style={{
                fontSize: '0.725rem',
                backgroundColor: '#ffffff',
                border: '1px solid #bbf7d0',
                color: '#166534',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              📱 Mobile / Bank Transfer
            </span>
          </div>
        </div>
      </div>

      {/* Explicit No Online Payment Disclosure (Figma Section 10 & 19) */}
      <div
        role="note"
        data-testid="payment-method-no-online-disclosure"
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          fontSize: '0.8rem',
          color: '#1e40af',
          lineHeight: 1.45,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '1rem' }} aria-hidden="true">
          ℹ️
        </span>
        <div>
          <strong style={{ display: 'block', marginBottom: '0.15rem' }}>
            No Online Payment in Release 1.0 (OI-01, A-07)
          </strong>
          Vegetable Joint does not process online payments or charge debit cards
          through the platform in this version. You do not need to share card or
          banking credentials on this website.
        </div>
      </div>
    </section>
  );
}

PaymentMethodDisplay.propTypes = {
  variant: PropTypes.oneOf(['card', 'inline', 'compact']),
  showNotice: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default PaymentMethodDisplay;
