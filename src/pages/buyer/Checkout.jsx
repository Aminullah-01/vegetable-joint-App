import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useCart, useToast } from '../../hooks';
import { EmptyState, Button, Spinner } from '../../components/common';
import { CartValidationNotices } from '../../components/cart';
import { DeliveryDetailsForm } from '../../components/checkout';
import { STRINGS, DELIVERY_DETAILS_STORAGE_KEY } from '../../constants';
import { formatCurrency } from '../../utils';

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
 * Checkout — Checkout & Delivery Details Page
 *
 * SRS References:
 * - CHK-01: Checkout requires an authenticated buyer (enforced by route guard).
 * - CHK-02: Collect recipient name, phone, delivery address (street/landmark,
 *   town/area, state) and optional notes; pre-fill from the buyer's profile.
 * - CART-08: Before checkout completes, system re-validates cart lines against current
 *   price, stock, availability and seller status; tells buyer about any change before proceeding.
 * - CART-05, TC-11: Empty cart state prevents checkout.
 * - TC-18: Price changed by seller after item in cart: Buyer is notified at checkout;
 *   new price applied only after acknowledgement.
 * - UC-02 Alternative flow 1a: Price/stock changed: system informs buyer; buyer accepts changes or edits cart.
 * - BR-02: Subtotal = sum of line subtotals. No delivery fee/tax/discount in 1.0.
 */
export function Checkout() {
  const {
    items,
    isEmpty,
    itemCount,
    subtotal,
    total,
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
        maxWidth: '800px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
      data-testid="checkout-page"
    >
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
        }}
      >
        {/* Delivery Details Form (CHK-02) */}
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

        {/* Order Summary & Place Order */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1.15rem', color: '#1e293b', margin: 0 }}>
            Order Summary
          </h2>

          {/* Selected Products List (CHK-03) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
              maxHeight: '240px',
              overflowY: 'auto',
              paddingRight: '0.25rem',
            }}
            data-testid="checkout-order-items"
          >
            {items.map((item) => (
              <div
                key={item.product_id ?? item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <span
                    style={{
                      fontWeight: 600,
                      color: '#1e293b',
                      display: 'block',
                    }}
                  >
                    {item.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {item.quantity} × {formatCurrency(item.price)} per{' '}
                    {item.unit || 'unit'}
                  </span>
                </div>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {formatCurrency(item.subtotal ?? item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.9rem',
            }}
          >
            <span>Items ({itemCount}):</span>
            <span data-testid="checkout-subtotal">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.9rem',
            }}
          >
            <span>Estimated Delivery:</span>
            <span>Calculated on delivery (BR-02)</span>
          </div>
          <div
            style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: '700',
              fontSize: '1.1rem',
              color: '#15803d',
            }}
          >
            <span>Total:</span>
            <span data-testid="checkout-total">{formatCurrency(total)}</span>
          </div>

          <div
            style={{
              backgroundColor: '#f0fdf4',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: '#166534',
            }}
          >
            Payment Method: Cash or Bank Transfer on Delivery (OI-01)
          </div>

          {needsAcknowledgement && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '0.65rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#92400e',
              }}
            >
              Please accept the cart changes above before completing your order.
            </div>
          )}

          <Button
            to={
              needsAcknowledgement || isValidating
                ? undefined
                : '/checkout/confirmation/ORD-2026-001'
            }
            disabled={needsAcknowledgement || isValidating}
            variant="primary"
            size="lg"
            fullWidth
            data-testid="checkout-place-order-button"
            style={{
              textAlign: 'center',
              textDecoration: 'none',
              marginTop: 'auto',
              minHeight: '44px',
            }}
          >
            Place Order Now →
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
