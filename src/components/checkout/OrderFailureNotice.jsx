import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils';

/**
 * OrderFailureNotice — Displays order submission failures and conflicts (FE-074, CHK-04, ERR-01).
 *
 * Handles HTTP 409 (Conflict - insufficient stock, price changed, item unavailable)
 * and HTTP 422 (Validation - missing delivery details, invalid quantities)
 * with clear, actionable, per-item failure messages.
 *
 * SRS References:
 * - CHK-04: The system shall validate all checkout fields and stock server-side,
 *   and reject the order with a specific message if any product is unavailable or under-stocked.
 * - ERR-01: Clear, plain-language messages for expected errors ("This product is currently unavailable.").
 * - Alternative flow 4a: Insufficient stock at commit: no order is created; system names the affected items (HTTP 409).
 * - Alternative flow 1a: Price/stock changed: system informs buyer; buyer accepts changes or edits cart.
 * - Figma Section 10: Clear explanation of price changes, stock reductions, and error states before checkout.
 */
export function OrderFailureNotice({
  error = null,
  status = null,
  itemErrors = [],
  fieldErrors = {},
  onReviewCart,
  onRevalidate,
  onDismiss,
  compact = false,
  showActions = true,
  testId = 'order-failure-notice',
  testIdPrefix = '',
  className = '',
  style = {},
}) {
  const navigate = useNavigate();
  const tid = (suffix) => `${testIdPrefix}${suffix}`;

  const statusCode =
    status ||
    error?.status ||
    error?.response?.status ||
    (error?.code === 'CONFLICT'
      ? 409
      : error?.code === 'VALIDATION_ERROR'
        ? 422
        : 0);

  const isConflict =
    statusCode === 409 || error?.isConflict || error?.code === 'CONFLICT';
  const isValidation =
    statusCode === 422 ||
    error?.isValidationError ||
    error?.code === 'VALIDATION_ERROR';

  const summaryMessage =
    error?.message ||
    error?.data?.message ||
    (typeof error === 'string'
      ? error
      : isConflict
        ? 'Your order could not be completed because some items have stock or price conflicts (HTTP 409).'
        : isValidation
          ? 'Your order could not be processed due to validation errors (HTTP 422).'
          : 'Unable to place order. Please review your cart and try again.');

  const handleGoToCart = () => {
    if (onReviewCart) {
      onReviewCart();
    } else {
      navigate('/cart');
    }
  };

  const hasItems = itemErrors && itemErrors.length > 0;
  const fieldErrorEntries = Object.entries(fieldErrors || {}).filter(
    ([k]) => !k.startsWith('items')
  );
  const hasFieldErrors = fieldErrorEntries.length > 0;

  // Title depending on failure type
  const headingText = isConflict
    ? 'Inventory or Price Conflict (HTTP 409)'
    : isValidation
      ? 'Order Validation Error (HTTP 422)'
      : 'Order Submission Failed';

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid={testId}
      data-status={statusCode || (isConflict ? 409 : isValidation ? 422 : 500)}
      data-error-type={
        isConflict
          ? 'conflict'
          : isValidation
            ? 'validation'
            : 'submission_error'
      }
      className={`order-failure-notice ${className}`.trim()}
      style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: compact ? '8px' : '12px',
        padding: compact ? '1rem' : '1.25rem 1.5rem',
        boxShadow: compact ? 'none' : '0 2px 6px -1px rgba(220, 38, 38, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}
      >
        <span
          style={{
            fontSize: compact ? '1.25rem' : '1.5rem',
            lineHeight: 1,
            color: '#dc2626',
            marginTop: '0.1rem',
          }}
          aria-hidden="true"
        >
          {isConflict ? '⚠️' : '❌'}
        </span>

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: '0.25rem',
            }}
          >
            <h3
              data-testid={tid('order-failure-title')}
              style={{
                margin: 0,
                fontSize: compact ? '0.95rem' : '1.05rem',
                fontWeight: 700,
                color: '#991b1b',
              }}
            >
              {headingText}
            </h3>
            {statusCode > 0 && (
              <span
                data-testid={tid('order-failure-status-code')}
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                }}
              >
                HTTP {statusCode}
              </span>
            )}
          </div>

          <p
            data-testid={tid('order-failure-summary')}
            style={{
              margin: 0,
              fontSize: compact ? '0.825rem' : '0.875rem',
              color: '#7f1d1d',
              lineHeight: 1.45,
            }}
          >
            {summaryMessage}
          </p>

          {isConflict && (
            <p
              style={{
                margin: '0.35rem 0 0 0',
                fontSize: '0.775rem',
                color: '#991b1b',
                fontWeight: 600,
              }}
            >
              No order was created and your account has not been charged
              (CHK-04).
            </p>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            data-testid={tid('order-failure-dismiss-btn')}
            aria-label="Dismiss error notice"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              color: '#991b1b',
              cursor: 'pointer',
              padding: '0.2rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Per-Item Error Cards (FE-074, CHK-04, ERR-01) */}
      {hasItems && (
        <div
          data-testid={tid('order-failure-items-list')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            marginTop: '0.25rem',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#991b1b',
            }}
          >
            {compact
              ? `Conflicts (${itemErrors.length}):`
              : `Affected Items (${itemErrors.length}):`}
          </div>

          {itemErrors.map((item, idx) => {
            const isStockIssue =
              item.type === 'insufficient_stock' ||
              item.type === 'stock_reduced' ||
              item.requestedQuantity !== undefined;
            const isPriceIssue =
              item.type === 'price_changed' ||
              (item.oldPrice !== undefined && item.newPrice !== undefined);
            const isUnavailable =
              item.type === 'unavailable' ||
              item.type === 'seller_suspended' ||
              item.type === 'out_of_stock';

            const badgeLabel = isStockIssue
              ? 'Insufficient Stock'
              : isPriceIssue
                ? 'Price Changed'
                : isUnavailable
                  ? 'Unavailable'
                  : 'Item Issue';

            const badgeStyle =
              isStockIssue || isUnavailable
                ? { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }
                : { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };

            const itemId = item.productId || item.product_id || item.id || idx;

            return (
              <div
                key={`failure-item-${itemId}-${idx}`}
                data-testid={tid(`order-failure-item-${itemId}`)}
                data-item-type={item.type || 'error'}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #fee2e2',
                  borderRadius: '8px',
                  padding: compact ? '0.65rem 0.85rem' : '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <strong
                    style={{
                      fontSize: compact ? '0.85rem' : '0.9rem',
                      color: '#1e293b',
                    }}
                  >
                    {item.name || `Product #${itemId}`}
                  </strong>

                  <span
                    data-testid={tid('order-failure-item-badge')}
                    style={{
                      backgroundColor: badgeStyle.bg,
                      color: badgeStyle.text,
                      border: `1px solid ${badgeStyle.border}`,
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {badgeLabel}
                  </span>
                </div>

                <p
                  data-testid={tid('order-failure-item-message')}
                  style={{
                    margin: 0,
                    fontSize: compact ? '0.8rem' : '0.85rem',
                    color: '#7f1d1d',
                    lineHeight: 1.4,
                  }}
                >
                  {item.message}
                </p>

                {/* Stock difference details */}
                {isStockIssue &&
                  item.requestedQuantity !== undefined &&
                  item.availableStock !== undefined && (
                    <div
                      data-testid={tid('order-failure-stock-diff')}
                      style={{
                        fontSize: '0.775rem',
                        color: '#64748b',
                        display: 'flex',
                        gap: '1rem',
                        marginTop: '0.15rem',
                      }}
                    >
                      <span>
                        Requested quantity:{' '}
                        <strong style={{ color: '#0f172a' }}>
                          {item.requestedQuantity}
                        </strong>
                      </span>
                      <span>
                        Available stock:{' '}
                        <strong
                          style={{
                            color:
                              item.availableStock === 0 ? '#dc2626' : '#d97706',
                          }}
                        >
                          {item.availableStock}
                        </strong>
                      </span>
                    </div>
                  )}

                {/* Price change details */}
                {isPriceIssue &&
                  item.oldPrice !== undefined &&
                  item.newPrice !== undefined && (
                    <div
                      data-testid={tid('order-failure-price-diff')}
                      style={{
                        fontSize: '0.775rem',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '0.15rem',
                      }}
                    >
                      <span>
                        Old price:{' '}
                        <span
                          style={{
                            textDecoration: 'line-through',
                            color: '#94a3b8',
                          }}
                        >
                          {formatCurrency(item.oldPrice)}
                        </span>
                      </span>
                      <span>→</span>
                      <span>
                        New price:{' '}
                        <strong style={{ color: '#15803d' }}>
                          {formatCurrency(item.newPrice)}
                        </strong>
                      </span>
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {/* Field Errors List (HTTP 422) */}
      {hasFieldErrors && (
        <div
          data-testid={tid('order-failure-field-errors')}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #fee2e2',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.825rem',
            color: '#991b1b',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>
            Please correct the following fields:
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.5 }}>
            {fieldErrorEntries.map(([field, msgs]) => {
              const msgList = Array.isArray(msgs) ? msgs : [msgs];
              return (
                <li key={field}>
                  <strong>{field.replace(/_/g, ' ')}:</strong>{' '}
                  {msgList.join(', ')}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Actions (FE-074) */}
      {showActions && (
        <div
          data-testid={tid('order-failure-actions')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginTop: '0.35rem',
          }}
        >
          <Button
            variant="primary"
            size={compact ? 'sm' : 'md'}
            onClick={handleGoToCart}
            data-testid={tid('order-failure-review-cart-btn')}
          >
            🛒 Review & Update Cart
          </Button>

          {onRevalidate && (
            <Button
              variant="outline"
              size={compact ? 'sm' : 'md'}
              onClick={onRevalidate}
              data-testid={tid('order-failure-revalidate-btn')}
            >
              🔄 Re-validate Cart
            </Button>
          )}

          {onDismiss && (
            <Button
              variant="secondary"
              size={compact ? 'sm' : 'md'}
              onClick={onDismiss}
              data-testid={tid('order-failure-dismiss-button')}
            >
              Dismiss
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

OrderFailureNotice.propTypes = {
  error: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  status: PropTypes.number,
  itemErrors: PropTypes.arrayOf(
    PropTypes.shape({
      productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      product_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      type: PropTypes.string,
      requestedQuantity: PropTypes.number,
      availableStock: PropTypes.number,
      oldPrice: PropTypes.number,
      newPrice: PropTypes.number,
      message: PropTypes.string.isRequired,
    })
  ),
  fieldErrors: PropTypes.object,
  onReviewCart: PropTypes.func,
  onRevalidate: PropTypes.func,
  onDismiss: PropTypes.func,
  compact: PropTypes.bool,
  showActions: PropTypes.bool,
  testId: PropTypes.string,
  testIdPrefix: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default OrderFailureNotice;
