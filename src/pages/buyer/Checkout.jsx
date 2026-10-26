import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useCart, useToast } from '../../hooks';
import { EmptyState, Button, Spinner } from '../../components/common';
import { CartValidationNotices } from '../../components/cart';
import {
  DeliveryDetailsForm,
  OrderSummary,
  OrderReviewModal,
  CheckoutStepper,
  PaymentMethodDisplay,
} from '../../components/checkout';
import { STRINGS, DELIVERY_DETAILS_STORAGE_KEY } from '../../constants';
import { orderService } from '../../services/orderService';
import { parseCheckoutError } from '../../utils';

/**
 * Reads delivery details previously saved on this device (CHK-02).
 *
 * @returns {Object|null} Saved delivery details or null.
 */
function readSavedDeliveryDetails() {
  try {
    const raw = localStorage.getItem(DELIVERY_DETAILS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Checkout — Checkout, Delivery Details, Order Summary & Review Page
 *
 * SRS References:
 * - CHK-01: Checkout requires an authenticated buyer (enforced by route guard).
 * - CHK-02: Collect recipient name, phone, delivery address (street/landmark,
 *   town/area, state) and optional notes; pre-fill from the buyer's profile.
 * - CHK-03: The checkout page shall show an order summary: selected products,
 *   quantities, unit prices, subtotals, and total amount, and require explicit confirmation.
 * - CHK-05: Multi-seller checkout split into independent orders linked by checkout reference.
 * - CHK-08: Order cleared from cart after placement; confirmation page shown.
 * - CHK-09: Payment method: "Pay on delivery / pay seller directly".
 * - CHK-10: 4-step flow: Cart → Delivery details → Review → Confirmation.
 * - CART-08: Re-validates cart lines against current price, stock, availability and seller status.
 * - CART-05, TC-11: Empty cart state prevents checkout.
 * - TC-18: Price changed by seller after item in cart: Buyer is notified at checkout;
 *   new price applied only after acknowledgement.
 * - BR-02: Subtotal = sum of line subtotals. No delivery fee/tax/discount in 1.0.
 */
export function Checkout() {
  const {
    items,
    isEmpty,
    itemCount,
    subtotal,
    total,
    clearCart,
    validateCart,
    validationNotice,
    validationChanges,
    acknowledgeValidation,
  } = useCart();

  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [hasAcknowledgedChanges, setHasAcknowledgedChanges] = useState(false);

  // Explicit confirmation state (CHK-03)
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [submissionFailure, setSubmissionFailure] = useState(null);

  // Delivery details (CHK-02): profile name/phone take precedence, address is
  // restored from this device when available.
  const [deliveryDetails, setDeliveryDetails] = useState(() => {
    const saved = readSavedDeliveryDetails();
    return {
      name: user?.name || '',
      phone: user?.phone || '',
      street: saved?.street || '',
      town: saved?.town || '',
      state: saved?.state || '',
      notes: saved?.notes || '',
    };
  });

  const isCartEmpty = isEmpty || !items || items.length === 0;

  // Name/phone always fall back to the authenticated profile so the form is
  // pre-filled even if the session resolves after the first render (CHK-02).
  const deliveryInitialValues = {
    ...deliveryDetails,
    name: deliveryDetails.name || user?.name || '',
    phone: deliveryDetails.phone || user?.phone || '',
  };

  // On mount / checkout load: re-validate cart lines against current price, stock, and seller status (CART-08)
  useEffect(() => {
    let isMounted = true;

    async function revalidateCart() {
      if (isCartEmpty) {
        setIsValidating(false);
        return;
      }

      try {
        setIsValidating(true);
        setValidationError(null);
        const result = await validateCart();
        if (isMounted) {
          if (
            result &&
            !result.is_valid &&
            result.changes &&
            result.changes.length > 0
          ) {
            setPendingChanges(result.changes);
            setHasAcknowledgedChanges(false);
          } else {
            setPendingChanges([]);
            setHasAcknowledgedChanges(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          setValidationError(err?.message || 'Unable to validate cart items.');
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    }

    revalidateCart();

    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcceptChanges = () => {
    acknowledgeValidation();
    setHasAcknowledgedChanges(true);
    setPendingChanges([]);
    setSubmissionError(null);
    setSubmissionFailure(null);
  };

  const handleReviewInCart = () => {
    navigate('/cart');
  };

  const handleDeliverySubmit = (values) => {
    try {
      localStorage.setItem(
        DELIVERY_DETAILS_STORAGE_KEY,
        JSON.stringify(values)
      );
    } catch {
      // Ignore storage failures (private mode / quota) — details remain in state.
    }
    setDeliveryDetails(values);
    toast.success(STRINGS.CHECKOUT.DELIVERY_SAVED);
  };

  // Validates delivery details before allowing order review / confirmation
  const validateDeliveryDetails = () => {
    const name = (deliveryDetails.name || user?.name || '').trim();
    const phone = (deliveryDetails.phone || user?.phone || '').trim();
    const street = (deliveryDetails.street || '').trim();
    const town = (deliveryDetails.town || '').trim();
    const state = (deliveryDetails.state || '').trim();

    if (!name || !phone || !street || !town || !state) {
      toast.error(
        'Please enter and save your delivery details (address, town, and state) before proceeding to review.'
      );
      return false;
    }
    return true;
  };

  // Opens the Review & Explicit Confirmation Modal (CHK-03, CHK-10)
  const handleProceedToReview = () => {
    if (needsAcknowledgement || isValidating) return;

    if (!validateDeliveryDetails()) {
      return;
    }

    setIsReviewModalOpen(true);
  };

  // Submits the finalized order (CHK-03, CHK-05, CHK-07, CHK-08)
  const handleConfirmOrder = async () => {
    if (!hasConfirmed) {
      toast.error('Please check the box to explicitly confirm your order.');
      return;
    }

    const recipientName = (deliveryDetails.name || user?.name || '').trim();
    const recipientPhone = (deliveryDetails.phone || user?.phone || '').trim();
    const fullAddress = [
      deliveryDetails.street,
      deliveryDetails.town,
      deliveryDetails.state,
    ]
      .filter(Boolean)
      .join(', ');

    const payload = {
      items: items.map((it) => ({
        product_id: it.product_id ?? it.id,
        quantity: it.quantity,
        price: it.price,
      })),
      delivery_name: recipientName,
      delivery_phone: recipientPhone,
      delivery_address: fullAddress,
      notes: deliveryDetails.notes || '',
      payment_method: 'pay_on_delivery',
    };

    try {
      setIsSubmitting(true);
      setSubmissionError(null);
      setSubmissionFailure(null);

      const result = await orderService.createOrder(payload);

      // CHK-08: Clear the ordered items from the cart
      clearCart();

      toast.success(
        STRINGS.CHECKOUT.ORDER_SUCCESS || 'Order placed successfully!'
      );
      setIsReviewModalOpen(false);

      const orderRef =
        result?.checkout_ref ||
        result?.orders?.[0]?.order_number ||
        'ORD-2026-001';

      navigate(`/checkout/confirmation/${orderRef}`);
    } catch (err) {
      const parsed = parseCheckoutError(err, items);
      const errMsg = parsed.message;
      setSubmissionError(errMsg);
      setSubmissionFailure(parsed);
      toast.error(errMsg);

      // Close review modal so user sees the checkout page with error breakdown (CHK-04, ERR-01)
      setIsReviewModalOpen(false);

      // If changes were detected (e.g. stock reduced or price updated), populate pending changes
      if (parsed.changes && parsed.changes.length > 0) {
        setPendingChanges(parsed.changes);
        setHasAcknowledgedChanges(false);
      }

      // Re-validate cart with server if 409 or 422 occurred
      if (parsed.is409 || parsed.is422) {
        validateCart().catch(() => {});
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Empty Cart Guard (CART-05 & TC-11)
  if (isCartEmpty) {
    return (
      <div
        className="checkout-empty-container"
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2.5rem 1rem',
          textAlign: 'center',
          boxSizing: 'border-box',
          width: '100%',
        }}
        data-testid="checkout-empty-cart-state"
      >
        <EmptyState
          type="cart"
          title={STRINGS.CART.EMPTY_TITLE}
          description="Your cart is empty. You must add vegetables to your cart before proceeding to checkout."
          action={
            <Button
              to="/products"
              variant="primary"
              size="lg"
              data-testid="checkout-empty-browse-button"
            >
              Browse Marketplace Vegetables
            </Button>
          }
          secondaryAction={
            <Button
              to="/cart"
              variant="outline"
              size="lg"
              data-testid="checkout-empty-view-cart-button"
            >
              View Cart
            </Button>
          }
        />
      </div>
    );
  }

  // Active validation changes that need acknowledgement
  const activeChanges =
    pendingChanges.length > 0
      ? pendingChanges
      : !hasAcknowledgedChanges &&
          validationChanges &&
          validationChanges.length > 0
        ? validationChanges
        : [];
  const needsAcknowledgement =
    activeChanges.length > 0 && !hasAcknowledgedChanges;

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
      data-testid="checkout-page"
    >
      {/* 4-Step Visual Stepper (CHK-10, Figma Section 10) */}
      <CheckoutStepper currentStep={2} />

      <h1 style={{ fontSize: '1.75rem', color: '#15803d', margin: 0 }}>
        Checkout & Delivery Details (CHK-01 to CHK-04)
      </h1>

      {/* Validating indicator */}
      {isValidating && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            color: '#166534',
            fontSize: '0.875rem',
          }}
          data-testid="checkout-validating-indicator"
        >
          <Spinner size="sm" color="primary" />
          <span>
            Validating cart items against current catalog price and stock...
          </span>
        </div>
      )}

      {/* Validation Error banner */}
      {validationError && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
          }}
          data-testid="checkout-validation-error"
        >
          {validationError}
        </div>
      )}

      {/* Submission Error Banner & Per-Item Failure Breakdown (FE-074 / CHK-04, ERR-01) */}
      {submissionError && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '1.25rem',
            borderRadius: '12px',
            fontSize: '0.875rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
          }}
          data-testid="checkout-submission-error"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <span
              style={{ fontSize: '1.35rem', lineHeight: 1 }}
              aria-hidden="true"
            >
              ⚠️
            </span>
            <div style={{ flex: 1 }}>
              <strong
                style={{
                  fontSize: '1rem',
                  display: 'block',
                  marginBottom: '0.25rem',
                  color: '#991b1b',
                }}
                data-testid="checkout-error-title"
              >
                {submissionFailure?.title || 'Order Placement Error'}
              </strong>
              <div
                style={{ lineHeight: 1.45, color: '#7f1d1d' }}
                data-testid="checkout-error-message"
              >
                <strong>Order Error:</strong> {submissionError}
              </div>
            </div>
          </div>

          {/* Per-Item Error Messages Breakdown (FE-074, CHK-04, ERR-01) */}
          {submissionFailure?.itemErrors?.length > 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #fee2e2',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
              }}
              data-testid="checkout-failure-item-list"
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: '#7f1d1d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Affected Items & Specific Issues:
              </div>
              {submissionFailure.itemErrors.map((itemErr, idx) => {
                const itemId = itemErr.productId || idx;
                const isPrice = itemErr.type === 'price_changed';
                return (
                  <div
                    key={`fail-item-${itemId}`}
                    data-testid={`checkout-failure-item-${itemId}`}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#991b1b',
                      padding: '0.35rem 0',
                      borderBottom:
                        idx < submissionFailure.itemErrors.length - 1
                          ? '1px dashed #fecaca'
                          : 'none',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: isPrice ? '#fef3c7' : '#fee2e2',
                        color: isPrice ? '#92400e' : '#b91c1c',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                      }}
                      data-testid={`checkout-failure-badge-${itemId}`}
                    >
                      {itemErr.badgeText ||
                        (isPrice ? 'Price Changed' : 'Insufficient Stock')}
                    </span>
                    <strong
                      style={{ color: '#1e293b' }}
                      data-testid={`checkout-failure-item-name-${itemId}`}
                    >
                      {itemErr.name}:
                    </strong>
                    <span
                      style={{ flex: 1, color: '#7f1d1d' }}
                      data-testid={`checkout-failure-item-detail-${itemId}`}
                    >
                      {itemErr.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action CTAs to resolve order conflicts */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginTop: '0.25rem',
            }}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReviewInCart}
              data-testid="checkout-failure-review-cart-btn"
            >
              ← Review & Edit Cart
            </Button>
            {submissionFailure?.changes?.length > 0 && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAcceptChanges}
                data-testid="checkout-failure-accept-changes-btn"
              >
                Accept Updated Items & Proceed
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Cart Re-validation Notices (CART-08, TC-18) */}
      {needsAcknowledgement && (
        <div data-testid="checkout-validation-notices">
          <CartValidationNotices
            changes={activeChanges}
            notice={
              validationNotice ||
              'Some items in your cart had price or stock changes from sellers. Please review and acknowledge before proceeding.'
            }
            onAccept={handleAcceptChanges}
            onReviewCart={handleReviewInCart}
            showActions={true}
          />
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Delivery Details Form (CHK-02) & Payment Method Display (CHK-09, FE-073) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
            }}
            data-testid="checkout-delivery-section"
          >
            <DeliveryDetailsForm
              key={user?.id || 'guest'}
              initialValues={deliveryInitialValues}
              onChange={setDeliveryDetails}
              onSubmit={handleDeliverySubmit}
              disabled={needsAcknowledgement || isValidating}
              title={STRINGS.CHECKOUT.DELIVERY_INFO_HEADING}
              hint={STRINGS.CHECKOUT.DELIVERY_INFO_HINT}
            />
          </div>

          {/* Payment Method Display (CHK-09, FE-073, OI-01, A-07) */}
          <PaymentMethodDisplay variant="card" />
        </div>

        {/* Order Summary & Review CTA (CHK-03, CHK-05, CHK-09, BR-02) */}
        <OrderSummary
          items={items}
          subtotal={subtotal}
          total={total}
          itemCount={itemCount}
          disabled={needsAcknowledgement || isValidating}
          isSubmitting={isSubmitting}
          onProceedToReview={handleProceedToReview}
          onPlaceOrder={handleConfirmOrder}
          hasConfirmed={hasConfirmed}
          onToggleConfirm={setHasConfirmed}
          showExplicitConfirm={true}
        />
      </div>

      {/* Explicit Order Review & Confirmation Modal (CHK-03, CHK-10, Figma Section 10) */}
      <OrderReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirmOrder={handleConfirmOrder}
        items={items}
        deliveryDetails={deliveryInitialValues}
        subtotal={subtotal}
        total={total}
        isSubmitting={isSubmitting}
        hasConfirmed={hasConfirmed}
        onToggleConfirm={setHasConfirmed}
      />
    </div>
  );
}

export default Checkout;
