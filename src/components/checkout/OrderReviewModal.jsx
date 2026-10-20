import PropTypes from 'prop-types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CheckoutStepper } from './CheckoutStepper';
import { formatCurrency } from '../../utils';

/**
 * OrderReviewModal — Explicit Order Review & Confirmation Step
 *
 * SRS References:
 * - CHK-03: The checkout page shall show an order summary: selected products,
 *   quantities, unit prices, subtotals, and total amount, and require explicit confirmation.
 * - CHK-05 / BR-06: Shows seller per-order split when multi-seller items are ordered.
 * - CHK-09: Explicitly discloses "Pay on delivery / pay seller directly".
 * - BR-02: Line subtotal = unit price × quantity. Order total = sum of line subtotals.
 * - Figma Section 10: Review step shows product, seller, quantity, unit price,
 *   subtotal, total, delivery information, and payment method; CTA: Place Order.
 */
export function OrderReviewModal({
  isOpen = false,
  onClose,
  onConfirmOrder,
  items = [],
  deliveryDetails = {},
  subtotal = 0,
  total = 0,
  isSubmitting = false,
  hasConfirmed = false,
  onToggleConfirm,
}) {
  // Group items by seller for clear order split visibility (CHK-05)
  const itemsBySeller = items.reduce((acc, item) => {
    const sId = item.seller_id ?? item.seller?.id ?? 'unknown';
    const sName =
      item.seller?.business_name || item.seller_name || `Seller #${sId}`;
    const sLocation = item.seller?.location || null;

    if (!acc[sId]) {
      acc[sId] = {
        sellerId: sId,
        sellerName: sName,
        sellerLocation: sLocation,
        items: [],
        sellerSubtotal: 0,
      };
    }

    const lineSubtotal = item.subtotal ?? item.price * item.quantity;
    acc[sId].items.push(item);
    acc[sId].sellerSubtotal += lineSubtotal;
    return acc;
  }, {});

  const sellerGroups = Object.values(itemsBySeller);
  const isMultiSeller = sellerGroups.length > 1;

  const fullAddress = [
    deliveryDetails.street,
    deliveryDetails.town,
    deliveryDetails.state,
  ]
    .filter(Boolean)
    .join(', ');

  const footerActions = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '0.75rem',
        width: '100%',
      }}
    >
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={isSubmitting}
        data-testid="checkout-review-back-button"
      >
        ← Back to Edit
      </Button>

      <Button
        variant="primary"
        onClick={onConfirmOrder}
        disabled={!hasConfirmed || isSubmitting}
        loading={isSubmitting}
        loadingText="Placing Order..."
        data-testid="checkout-confirm-place-order-button"
      >
        Confirm & Place Order ({formatCurrency(total)}) →
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Review & Confirm Your Order (CHK-03)"
      footer={footerActions}
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
      showCloseButton={!isSubmitting}
      testId="checkout-review-modal"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          maxHeight: '65vh',
          overflowY: 'auto',
          paddingRight: '0.25rem',
        }}
      >
        {/* 4-Step Visual Stepper at Step 3: Review (CHK-10, Figma Section 10) */}
        <CheckoutStepper
          currentStep={3}
          compact
          onStepClick={(step) => {
            if (step <= 2) onClose();
          }}
        />

        {/* Step 1: Delivery Information Review */}
        <section
          aria-labelledby="review-delivery-heading"
          data-testid="review-delivery-section"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <h3
              id="review-delivery-heading"
              style={{
                margin: 0,
                fontSize: '0.95rem',
                color: '#1e293b',
                fontWeight: 700,
              }}
            >
              📍 Delivery Details
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="review-edit-delivery-button"
              style={{
                background: 'none',
                border: 'none',
                color: '#15803d',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Edit Details
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.5rem',
              fontSize: '0.85rem',
              color: '#334155',
            }}
          >
            <div>
              <span
                style={{
                  color: '#64748b',
                  display: 'block',
                  fontSize: '0.75rem',
                }}
              >
                Recipient Name:
              </span>
              <strong data-testid="review-recipient-name">
                {deliveryDetails.name || 'Not provided'}
              </strong>
            </div>

            <div>
              <span
                style={{
                  color: '#64748b',
                  display: 'block',
                  fontSize: '0.75rem',
                }}
              >
                Phone Number:
              </span>
              <strong data-testid="review-phone">
                {deliveryDetails.phone || 'Not provided'}
              </strong>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <span
                style={{
                  color: '#64748b',
                  display: 'block',
                  fontSize: '0.75rem',
                }}
              >
                Delivery Address:
              </span>
              <strong data-testid="review-address">
                {fullAddress || 'No address specified'}
              </strong>
            </div>

            {deliveryDetails.notes && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span
                  style={{
                    color: '#64748b',
                    display: 'block',
                    fontSize: '0.75rem',
                  }}
                >
                  Delivery Notes:
                </span>
                <span
                  data-testid="review-notes"
                  style={{ fontStyle: 'italic', color: '#475569' }}
                >
                  &ldquo;{deliveryDetails.notes}&rdquo;
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Selected Products Grouped by Seller (CHK-05) */}
        <section
          aria-labelledby="review-items-heading"
          data-testid="review-items-section"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <h3
              id="review-items-heading"
              style={{
                margin: 0,
                fontSize: '0.95rem',
                color: '#1e293b',
                fontWeight: 700,
              }}
            >
              🥦 Order Items & Seller Breakdown
            </h3>
            {isMultiSeller && (
              <span
                style={{
                  fontSize: '0.75rem',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                }}
              >
                {sellerGroups.length} independent seller orders
              </span>
            )}
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {sellerGroups.map((group) => (
              <div
                key={group.sellerId}
                data-testid={`review-seller-group-${group.sellerId}`}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.825rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#15803d' }}>
                    🏪 {group.sellerName}
                    {group.sellerLocation && (
                      <span
                        style={{
                          color: '#64748b',
                          fontWeight: 400,
                          marginLeft: '0.35rem',
                        }}
                      >
                        ({group.sellerLocation})
                      </span>
                    )}
                  </span>
                  <span style={{ color: '#475569', fontWeight: 600 }}>
                    Seller Subtotal: {formatCurrency(group.sellerSubtotal)}
                  </span>
                </div>

                <div style={{ padding: '0.5rem 0.75rem' }}>
                  {group.items.map((item) => {
                    const itemId = item.product_id ?? item.id;
                    const lineSubtotal =
                      item.subtotal ?? item.price * item.quantity;
                    return (
                      <div
                        key={itemId}
                        data-testid={`review-item-${itemId}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.35rem 0',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#1e293b' }}>
                            {item.name}
                          </strong>
                          <span
                            style={{
                              color: '#64748b',
                              fontSize: '0.775rem',
                              marginLeft: '0.5rem',
                            }}
                          >
                            {item.quantity} × {formatCurrency(item.price)} per{' '}
                            {item.unit || 'unit'}
                          </span>
                        </div>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                          {formatCurrency(lineSubtotal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Step 3: Payment Method (CHK-09) */}
        <section
          aria-labelledby="review-payment-heading"
          data-testid="review-payment-section"
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
            color: '#166534',
          }}
        >
          <h3
            id="review-payment-heading"
            style={{
              margin: '0 0 0.25rem 0',
              fontSize: '0.875rem',
              fontWeight: 700,
            }}
          >
            💵 Payment Method (CHK-09)
          </h3>
          <p style={{ margin: 0, lineHeight: 1.45 }}>
            <strong>Pay on delivery / pay seller directly:</strong> In Release
            1.0, all payments are made directly to the seller via cash or mobile
            bank transfer upon delivery of fresh produce. No online payment is
            processed on the platform.
          </p>
        </section>

        {/* Step 4: Summary Totals (BR-02) */}
        <section
          aria-labelledby="review-totals-heading"
          data-testid="review-totals-section"
          style={{
            borderTop: '2px dashed #e2e8f0',
            paddingTop: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Items Subtotal:</span>
            <span data-testid="review-subtotal" style={{ fontWeight: 600 }}>
              {formatCurrency(subtotal)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Delivery Fee:</span>
            <span style={{ color: '#15803d', fontWeight: 500 }}>
              Calculated on delivery (BR-02)
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '0.5rem',
              marginTop: '0.25rem',
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#15803d',
            }}
          >
            <span>Total Order Amount:</span>
            <span data-testid="review-order-total">
              {formatCurrency(total)}
            </span>
          </div>
        </section>

        {/* Step 5: Explicit Confirmation Step (CHK-03) */}
        <div
          style={{
            backgroundColor: hasConfirmed ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${hasConfirmed ? '#86efac' : '#fde68a'}`,
            borderRadius: '8px',
            padding: '0.75rem 1rem',
          }}
        >
          <label
            data-testid="review-confirm-label"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: hasConfirmed ? '#166534' : '#92400e',
              lineHeight: 1.45,
            }}
          >
            <input
              type="checkbox"
              data-testid="checkout-explicit-confirm-checkbox"
              checked={hasConfirmed}
              onChange={(e) => onToggleConfirm?.(e.target.checked)}
              disabled={isSubmitting}
              style={{ marginTop: '0.15rem', cursor: 'pointer' }}
            />
            <span>
              <strong>I explicitly confirm this order (CHK-03):</strong> I have
              reviewed the selected vegetables, quantities, prices, delivery
              address, and agree to pay the seller directly on delivery.
            </span>
          </label>
        </div>
      </div>
    </Modal>
  );
}

OrderReviewModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirmOrder: PropTypes.func.isRequired,
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
        location: PropTypes.string,
      }),
    })
  ),
  deliveryDetails: PropTypes.shape({
    name: PropTypes.string,
    phone: PropTypes.string,
    street: PropTypes.string,
    town: PropTypes.string,
    state: PropTypes.string,
    notes: PropTypes.string,
  }),
  subtotal: PropTypes.number,
  total: PropTypes.number,
  isSubmitting: PropTypes.bool,
  hasConfirmed: PropTypes.bool,
  onToggleConfirm: PropTypes.func,
};

export default OrderReviewModal;
