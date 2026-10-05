import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils';
import { AvailabilityBadge } from '../common/AvailabilityBadge';
import { RatingDisplay } from '../common/RatingDisplay';
import { Button } from '../common/Button';
import { LazyImage } from '../common/LazyImage';

/**
 * ProductCard — Marketplace Vegetable Listing Card
 * SRS References: MKT-02 (Product card display), REV-01 (Rating display), NFR-USAB-04 (Price with unit), NFR-USAB-03 (Touch targets ≥ 44px)
 *
 * Displays:
 * 1. Vegetable Image with fallback placeholder
 * 2. Product Name
 * 3. Price formatted with unit (e.g. ₦2,500 / basket)
 * 4. Seller business name
 * 5. Location
 * 6. Availability badge (In Stock / Low Stock / Out of Stock)
 * 7. Rating display (0–5 one decimal or "No ratings yet")
 * 8. “View Product” action
 */
export function ProductCard({
  product,
  // Direct props fallback
  id: propId,
  name: propName,
  price: propPrice,
  unit: propUnit,
  image: propImage,
  seller: propSeller,
  sellerName: propSellerName,
  location: propLocation,
  availability: propAvailability,
  quantity: propQuantity,
  rating: propRating,
  ratingCount: propRatingCount,
  onAddToCart,
  className = '',
  style = {},
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Normalize product properties whether passed as an object or individual props
  const p = product || {};
  const id = p.id ?? propId;
  const name = p.name ?? propName ?? 'Vegetable Product';
  const price = p.price ?? propPrice ?? 0;
  const unit = p.unit ?? propUnit ?? 'unit';
  const image = p.image ?? propImage;
  const quantity = p.quantity ?? propQuantity;
  const availability = p.availability ?? propAvailability;

  // Extract seller information
  const sellerObj =
    p.seller || (typeof propSeller === 'object' ? propSeller : null);
  const sellerName =
    sellerObj?.business_name ||
    propSellerName ||
    (typeof propSeller === 'string' ? propSeller : 'Verified Seller');
  const sellerId = sellerObj?.id || p.seller_id;
  const location =
    sellerObj?.location || propLocation || p.location || 'Nigeria';

  // Extract rating information (REV-01)
  const ratingValue = p.average_rating ?? p.rating ?? propRating;
  const ratingCount = p.rating_count ?? p.review_count ?? propRatingCount;

  const isOutOfStock =
    availability === 'out_of_stock' ||
    availability === 'unavailable' ||
    quantity === 0;

  const productUrl = id ? `/products/${id}` : '/products';
  const sellerUrl = sellerId ? `/sellers/${sellerId}` : null;

  return (
    <article
      className={`product-card card ${className}`.trim()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: isHovered
          ? '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)'
          : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        boxSizing: 'border-box',
        height: '100%',
        ...style,
      }}
    >
      {/* 1. Image Container with Availability Badge Overlay */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '65%', // 16:10 aspect ratio
          backgroundColor: '#f8fafc',
          overflow: 'hidden',
        }}
      >
        <Link
          to={productUrl}
          aria-label={`View details for ${name}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          <LazyImage
            src={image}
            alt={name}
            aspectRatio="auto"
            width="100%"
            height="100%"
            fit="cover"
            fallbackLabel="Vegetable"
            fallback={
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                }}
              >
                <span
                  style={{ fontSize: '3rem', lineHeight: 1 }}
                  role="img"
                  aria-label="Vegetable"
                >
                  🥦
                </span>
              </div>
            }
            imgStyle={{
              transform: isHovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.3s ease',
            }}
          />
        </Link>

        {/* Availability Badge Overlay (MKT-02, SEL-07) */}
        <div
          style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            zIndex: 2,
          }}
        >
          <AvailabilityBadge
            status={availability}
            quantity={quantity}
            size="sm"
          />
        </div>
      </div>

      {/* 2. Product Details Body */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '1.25rem',
          gap: '0.625rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Rating and Location Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Rating Display (REV-01) */}
          <RatingDisplay
            rating={ratingValue}
            ratingCount={ratingCount}
            size="sm"
          />

          {/* Location Badge (MKT-02) */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              color: '#64748b',
              fontWeight: 500,
            }}
          >
            <span aria-hidden="true">📍</span>
            <span>{location}</span>
          </div>
        </div>

        {/* Product Name Title */}
        <h3
          style={{
            fontSize: '1.0625rem',
            fontWeight: 700,
            lineHeight: 1.35,
            margin: '0.125rem 0',
            color: '#0f172a',
          }}
        >
          <Link
            to={productUrl}
            style={{
              color: 'inherit',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#15803d')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#0f172a')}
          >
            {name}
          </Link>
        </h3>

        {/* Seller Business Name (MKT-02) */}
        <div
          style={{
            fontSize: '0.8125rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <span aria-hidden="true">🌾</span>
          <span>Seller:</span>
          {sellerUrl ? (
            <Link
              to={sellerUrl}
              style={{
                color: '#334155',
                fontWeight: 600,
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              {sellerName}
            </Link>
          ) : (
            <strong style={{ color: '#334155', fontWeight: 600 }}>
              {sellerName}
            </strong>
          )}
        </div>

        {/* Price with Unit (NFR-USAB-04, MKT-02) */}
        <div
          style={{
            marginTop: '0.25rem',
            marginBottom: '0.25rem',
          }}
        >
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#15803d',
              letterSpacing: '-0.02em',
            }}
          >
            {formatPrice(price, unit)}
          </span>
        </div>

        {/* Card Footer Actions (MKT-02, UI-03) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: 'auto',
            paddingTop: '0.5rem',
          }}
        >
          {/* Prominent "View Product" Action (MKT-02, NFR-USAB-03) */}
          <Button
            to={productUrl}
            variant="outline"
            size="md"
            fullWidth={!onAddToCart}
            style={{ flex: onAddToCart ? 1 : undefined }}
          >
            View Product
          </Button>

          {/* Quick "Add to Cart" CTA if callback provided */}
          {onAddToCart && (
            <Button
              variant="primary"
              size="md"
              disabled={isOutOfStock}
              onClick={() => onAddToCart(product || { id, name, price, unit })}
              style={{ flex: 1 }}
            >
              Add to Cart 🛒
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    unit: PropTypes.string,
    image: PropTypes.string,
    quantity: PropTypes.number,
    availability: PropTypes.string,
    average_rating: PropTypes.number,
    rating: PropTypes.number,
    rating_count: PropTypes.number,
    review_count: PropTypes.number,
    location: PropTypes.string,
    seller_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    seller: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      business_name: PropTypes.string,
      location: PropTypes.string,
    }),
  }),
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  name: PropTypes.string,
  price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  unit: PropTypes.string,
  image: PropTypes.string,
  seller: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  sellerName: PropTypes.string,
  location: PropTypes.string,
  availability: PropTypes.string,
  quantity: PropTypes.number,
  rating: PropTypes.number,
  ratingCount: PropTypes.number,
  onAddToCart: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default ProductCard;
