import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { QuantitySelector } from '../common/QuantitySelector';
import { LazyImage, VegetablePlaceholder } from '../common/LazyImage';
import { formatPrice, formatCurrency } from '../../utils';
import { STRINGS } from '../../constants';

/**
 * CartItem — Accessible cart line item component
 *
 * SRS References:
 * - CART-04: Line displays product name, image, unit price, quantity, and line subtotal.
 * - CART-02: Quantity bounded between 1 and available stock.
 * - CART-03: Remove action to delete line from cart.
 * - NFR-USAB-03: Touch targets >= 44x44px.
 * - NFR-USAB-04: Nigerian Naira formatting with standardized units.
 */
export function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  disabled = false,
  className = '',
  style = {},
}) {
  if (!item) return null;

  const productId = item.product_id ?? item.id;
  const name = item.name || 'Produce Item';
  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 1;
  const unit = item.unit || 'basket';
  const availableStock =
    typeof item.available_stock === 'number'
      ? item.available_stock
      : typeof item.quantity_available === 'number'
        ? item.quantity_available
        : 999;
  const subtotal = item.subtotal ?? price * quantity;
  const sellerId = item.seller_id;
  const sellerName = item.seller_name || item.seller?.business_name || '';
  const sellerLocation = item.seller_location || item.seller?.location || '';
  const imageUrl = item.image || item.image_url || '';

  const isAtMaxStock = quantity >= availableStock && availableStock > 0;

  return (
    <article
      data-testid={`cart-item-${productId}`}
      className={`cart-item ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1.25rem',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease-in-out',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'flex-start',
        }}
      >
        {/* Product Thumbnail with accessible fallback */}
        <Link
          to={`/products/${productId}`}
          style={{
            position: 'relative',
            width: '88px',
            height: '88px',
            minWidth: '88px',
            borderRadius: '10px',
            overflow: 'hidden',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            display: 'block',
            textDecoration: 'none',
          }}
          aria-label={`View details for ${name}`}
        >
          {imageUrl ? (
            <LazyImage
              src={imageUrl}
              alt={name}
              aspectRatio="1:1"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <VegetablePlaceholder alt={name} iconSize={36} />
          )}
        </Link>

        {/* Product Details & Seller Attribution */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2
                style={{
                  margin: '0 0 0.35rem 0',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  lineHeight: 1.35,
                }}
              >
                <Link
                  to={`/products/${productId}`}
                  style={{
                    color: '#0f172a',
                    textDecoration: 'none',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#15803d';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#0f172a';
                  }}
                >
                  {name}
                </Link>
              </h2>

              {/* Seller details if available */}
              {sellerName && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8125rem',
                    color: '#64748b',
                    marginBottom: '0.35rem',
                  }}
                >
                  <span style={{ fontSize: '0.9rem' }} aria-hidden="true">
                    👨‍🌾
                  </span>
                  {sellerId ? (
                    <Link
                      to={`/sellers/${sellerId}`}
                      style={{
                        color: '#15803d',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      {sellerName}
                    </Link>
                  ) : (
                    <span>{sellerName}</span>
                  )}
                  {sellerLocation && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>{sellerLocation}</span>
                    </>
                  )}
                </div>
              )}

              {/* Unit Price (CART-04, NFR-USAB-04) */}
              <div
                style={{
                  fontSize: '0.9rem',
                  color: '#334155',
                  fontWeight: 600,
                }}
                data-testid={`cart-item-unit-price-${productId}`}
              >
                <span style={{ color: '#64748b', fontWeight: 400 }}>
                  Unit Price:{' '}
                </span>
                <span style={{ color: '#15803d' }}>
                  {formatPrice(price, unit)}
                </span>
              </div>
            </div>

            {/* Remove item button (CART-03) */}
            <button
              type="button"
              onClick={() => onRemove?.(productId)}
              disabled={disabled}
              aria-label={`Remove ${name} from cart`}
              data-testid={`cart-remove-button-${productId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#dc2626',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                minHeight: '44px',
                minWidth: '44px',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
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
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span>{STRINGS.CART.REMOVE}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Subtotal Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '0.85rem',
          borderTop: '1px solid #f1f5f9',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Quantity Controls (CART-02, BR-04) */}
        <div>
          <QuantitySelector
            value={quantity}
            min={1}
            max={availableStock}
            availableStock={availableStock}
            disabled={disabled}
            onChange={(newQty) => onUpdateQuantity?.(productId, newQty)}
            label="Quantity"
            showStock={availableStock < 999}
          />
          {isAtMaxStock && availableStock < 999 && (
            <div
              style={{
                fontSize: '0.75rem',
                color: '#d97706',
                fontWeight: 500,
                marginTop: '0.25rem',
              }}
            >
              Max available stock reached
            </div>
          )}
        </div>

        {/* Line Subtotal (CART-04, BR-02) */}
        <div
          style={{
            textAlign: 'right',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
          data-testid={`cart-item-subtotal-${productId}`}
        >
          <span
            style={{
              fontSize: '0.785rem',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}
          >
            {STRINGS.CART.SUBTOTAL}
          </span>
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#15803d',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCurrency(subtotal)}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
            }}
          >
            ({quantity} × {formatPrice(price, unit)})
          </span>
        </div>
      </div>
    </article>
  );
}

CartItem.propTypes = {
  item: PropTypes.shape({
    product_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    price: PropTypes.number,
    unit: PropTypes.string,
    quantity: PropTypes.number,
    image: PropTypes.string,
    image_url: PropTypes.string,
    seller_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    seller_name: PropTypes.string,
    seller_location: PropTypes.string,
    seller: PropTypes.shape({
      business_name: PropTypes.string,
      location: PropTypes.string,
    }),
    available_stock: PropTypes.number,
    quantity_available: PropTypes.number,
    subtotal: PropTypes.number,
  }),
  onUpdateQuantity: PropTypes.func,
  onRemove: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default CartItem;
