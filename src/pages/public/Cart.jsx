import { useState, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../hooks';
import { ToastContext } from '../../context/toastContextDef.js';
import {
  CartItem,
  CartSummary,
  CartValidationNotices,
} from '../../components/cart';
import { EmptyState, Button, ConfirmDialog } from '../../components/common';
import { STRINGS } from '../../constants';
import { calculateSellerSubtotals, formatCurrency } from '../../utils';

/**
 * Cart — Shopping Cart Page
 *
 * SRS References:
 * - CART-04: Lines show product, quantity, unit price, and subtotal; cart shows grand total.
 * - CART-05: Offers "Continue shopping" and "Proceed to checkout". Proceeding with an empty
 *   cart is prevented with the message "Your cart is empty."
 * - CART-01 to CART-03: Add, update quantity (bounded by stock), and remove lines.
 * - CART-08: Cart re-validation notices for price/stock changes and unavailable items.
 * - CHK-05 / BR-06: Visually groups lines by seller for fulfillment transparency.
 * - NFR-USAB-01 to 04: Accessible semantic markup, WCAG AA color contrast, touch targets >= 44x44px.
 */
export function Cart() {
  const {
    items,
    itemCount,
    uniqueItemCount,
    subtotal,
    total,
    isEmpty,
    updateQuantity,
    removeItem,
    clearCart,
    validationNotice,
    validationChanges,
    acknowledgeValidation,
  } = useCart();

  const toast = useContext(ToastContext);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  // Group items by seller for multi-vendor checkout visibility (CHK-05, BR-06)
  const sellerGroups = useMemo(() => calculateSellerSubtotals(items), [items]);

  const handleRemoveItem = (productId) => {
    const targetItem = items.find(
      (item) => Number(item.product_id ?? item.id) === Number(productId)
    );
    removeItem(productId);
    if (targetItem && toast?.info) {
      toast.info(`Removed "${targetItem.name}" from your cart.`);
    }
  };

  const handleConfirmClear = () => {
    clearCart();
    setIsClearDialogOpen(false);
    if (toast?.info) {
      toast.info('Your shopping cart has been cleared.');
    }
  };

  return (
    <div
      className="cart-page-container"
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1.5rem 1rem 3rem 1rem',
        boxSizing: 'border-box',
        width: '100%',
      }}
      data-testid="cart-page"
    >
      {/* Breadcrumbs Navigation */}
      <nav
        aria-label="Breadcrumb"
        style={{
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          color: '#64748b',
        }}
      >
        <ol
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            flexWrap: 'wrap',
          }}
        >
          <li>
            <Link
              to="/"
              style={{
                color: '#64748b',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#15803d';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#64748b';
              }}
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true" style={{ color: '#cbd5e1' }}>
            /
          </li>
          <li>
            <Link
              to="/products"
              style={{
                color: '#64748b',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#15803d';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#64748b';
              }}
            >
              Marketplace
            </Link>
          </li>
          <li aria-hidden="true" style={{ color: '#cbd5e1' }}>
            /
          </li>
          <li aria-current="page" style={{ color: '#0f172a', fontWeight: 600 }}>
            Shopping Cart
          </li>
        </ol>
      </nav>

      {/* Cart Validation Notices (CART-08) */}
      {validationChanges && validationChanges.length > 0 ? (
        <CartValidationNotices
          changes={validationChanges}
          notice={validationNotice}
          onAccept={acknowledgeValidation}
        />
      ) : validationNotice ? (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#92400e',
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}
          data-testid="cart-validation-notice"
        >
          <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
            ⚠️
          </span>
          <div style={{ flex: 1 }}>{validationNotice}</div>
        </div>
      ) : null}

      {/* Page Title & Top Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {STRINGS.CART.TITLE}
          </h1>
          {!isEmpty && (
            <span
              style={{
                backgroundColor: '#dcfce7',
                color: '#15803d',
                fontSize: '0.85rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              data-testid="cart-item-count-badge"
            >
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {!isEmpty && (
          <button
            type="button"
            onClick={() => setIsClearDialogOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'transparent',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '0.5rem 0.85rem',
              minHeight: '44px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.backgroundColor = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            data-testid="clear-cart-button"
            aria-label="Clear all items from shopping cart"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Clear Cart</span>
          </button>
        )}
      </div>

      {/* Main Cart Content Area */}
      {isEmpty ? (
        /* Empty Cart State (CART-05 & ERR-01: Blocks Checkout) */
        <div data-testid="empty-cart-state" style={{ padding: '2rem 0' }}>
          <EmptyState
            type="cart"
            title={STRINGS.CART.EMPTY_TITLE}
            description={STRINGS.CART.EMPTY_SUBTITLE}
            action={
              <Button
                to="/products"
                variant="primary"
                size="lg"
                data-testid="cart-empty-start-shopping"
              >
                Browse Marketplace Vegetables
              </Button>
            }
          />
        </div>
      ) : (
        /* Populated Cart: 2-Column Responsive Layout */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
            alignItems: 'start',
          }}
          className="cart-grid"
        >
          {/* Left Column: Cart Items List / Seller Groups */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem',
            }}
            data-testid="cart-items-section"
          >
            {sellerGroups.map((group, groupIdx) => (
              <section
                key={group.sellerId || `seller-${groupIdx}`}
                aria-label={`Items from ${group.sellerName}`}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                }}
                data-testid={`seller-group-${group.sellerId || groupIdx}`}
              >
                {/* Seller Header */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }} aria-hidden="true">
                      🏪
                    </span>
                    <div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontWeight: 600,
                          display: 'block',
                          lineHeight: 1,
                        }}
                      >
                        Seller
                      </span>
                      {group.sellerId ? (
                        <Link
                          to={`/sellers/${group.sellerId}`}
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: '#15803d',
                            textDecoration: 'none',
                          }}
                        >
                          {group.sellerName}
                        </Link>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: '#0f172a',
                          }}
                        >
                          {group.sellerName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {group.sellerLocation && (
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <span aria-hidden="true">📍</span>
                        <span>{group.sellerLocation}</span>
                      </div>
                    )}
                    {group.subtotal > 0 && (
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: '#15803d',
                          backgroundColor: '#dcfce7',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                        }}
                        data-testid={`seller-subtotal-${group.sellerId || groupIdx}`}
                      >
                        Seller Subtotal: {formatCurrency(group.subtotal)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Seller Group Line Items */}
                <div
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  {group.items.map((item) => (
                    <CartItem
                      key={item.product_id ?? item.id}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={handleRemoveItem}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* Bottom Continue Shopping CTA */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                paddingTop: '0.5rem',
              }}
            >
              <Link
                to="/products"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#15803d',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  padding: '0.5rem 0',
                }}
              >
                <span>←</span>
                <span>{STRINGS.CART.CONTINUE_SHOPPING}</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Order Summary Card (CART-04, CART-05) */}
          <div
            style={{
              position: 'sticky',
              top: '1.5rem',
            }}
          >
            <CartSummary
              subtotal={subtotal}
              total={total}
              itemCount={itemCount}
              uniqueItemCount={uniqueItemCount}
              sellersCount={sellerGroups.length}
            />
          </div>
        </div>
      )}

      {/* Clear Cart Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        onConfirm={handleConfirmClear}
        type="danger"
        title="Clear your shopping cart?"
        message="Are you sure you want to remove all items from your cart? This action cannot be undone."
        confirmText="Clear Cart"
        cancelText="Cancel"
        testId="clear-cart-dialog"
      />
    </div>
  );
}

export default Cart;
