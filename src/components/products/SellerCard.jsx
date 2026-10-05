import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { STRINGS } from '../../constants';
import { buildPath } from '../../routes/routeConfig';
import { RatingDisplay } from '../common/RatingDisplay';
import { Button } from '../common/Button';
import { LazyImage } from '../common/LazyImage';

function resolveProductCount(seller) {
  const raw =
    seller.products_count ?? seller.product_count ?? seller.total_products;
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }
  const count = Number(raw);
  return Number.isFinite(count) ? count : null;
}

/**
 * SellerCard — Marketplace seller summary card.
 *
 * SRS References: MKT-01 (homepage "featured sellers"), MKT-07 (public seller
 * profile page), REV-01 (rating display or "No ratings yet"), MKT-04 (only
 * approved sellers are public), NFR-USAB-03 (touch targets ≥ 44px),
 * NFR-USAB-02 (WCAG 2.1 AA labels and contrast).
 *
 * Acceptance Criteria (FE-032):
 * - Business name, location, rating/summary and a link to the seller profile.
 * - Design guide §6 additionally asks for a short description and product
 *   count, both sourced from the `seller_profiles` payload.
 * - Driven entirely by service-layer data (GET /sellers) so no seller detail is
 *   hard-coded; column names follow vegetable_joint_schema.sql.
 */
export function SellerCard({
  seller,
  // Direct props fallback for callers that only have the columns they need.
  id: propId,
  businessName: propBusinessName,
  location: propLocation,
  description: propDescription,
  rating: propRating,
  ratingCount: propRatingCount,
  productCount: propProductCount,
  image: propImage,
  to,
  showDescription = true,
  showRating = true,
  showProductCount = true,
  showUnapproved = false,
  className = '',
  style = {},
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Accept the API/mock seller object or individual columns.
  const data = seller || {};
  const id = data.id ?? propId;
  const businessName =
    data.business_name ?? propBusinessName ?? 'Vegetable Seller';
  const location = data.location ?? propLocation;
  const description = data.description ?? data.summary ?? propDescription;
  const image = data.image_url ?? data.logo_url ?? data.image ?? propImage;
  const rating = data.average_rating ?? data.rating ?? propRating;
  const ratingCount = data.rating_count ?? data.review_count ?? propRatingCount;
  const productCount = resolveProductCount(data) ?? propProductCount ?? null;

  // MKT-04: public marketplace surfaces only expose approved sellers.
  const approvalStatus = data.approval_status;
  const isUnapproved =
    approvalStatus !== undefined &&
    approvalStatus !== null &&
    approvalStatus !== 'approved';
  if (isUnapproved && !showUnapproved) {
    return null;
  }

  // MKT-07: the card's destination is the public seller profile page.
  const profilePath =
    to ||
    (id === undefined || id === null ? null : buildPath.sellerProfile(id));
  const headingId = `seller-card-${id ?? businessName.replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <article
      className={`seller-card card ${className}`.trim()}
      aria-labelledby={headingId}
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
      {/* Avatar / Logo with graceful fallback */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1.25rem 1.25rem 0.75rem',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            flexShrink: 0,
            overflow: 'hidden',
            borderRadius: '50%',
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
          }}
        >
          {image ? (
            <LazyImage
              src={image}
              alt=""
              aspectRatio="1/1"
              width="56px"
              height="56px"
              fit="cover"
              borderRadius="50%"
              fallback={
                <span aria-hidden="true" style={{ lineHeight: 1 }}>
                  👨‍🌾
                </span>
              }
            />
          ) : (
            <span aria-hidden="true" style={{ lineHeight: 1 }}>
              👨‍🌾
            </span>
          )}
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Business Name (MKT-07) */}
          <h3
            id={headingId}
            style={{
              fontSize: '1.0625rem',
              fontWeight: 700,
              lineHeight: 1.35,
              margin: 0,
              color: '#0f172a',
            }}
          >
            {profilePath ? (
              <Link
                to={profilePath}
                style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#15803d')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#0f172a')}
              >
                {businessName}
              </Link>
            ) : (
              businessName
            )}
          </h3>

          {/* Location (MKT-07, SRCH-03) */}
          {location && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.8125rem',
                color: '#64748b',
                fontWeight: 500,
                marginTop: '0.25rem',
              }}
            >
              <span aria-hidden="true">📍</span>
              <span>{location}</span>
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: '0.625rem',
          padding: '0 1.25rem 1.25rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Rating or “No ratings yet” (REV-01) */}
        {showRating && (
          <RatingDisplay rating={rating} ratingCount={ratingCount} size="sm" />
        )}

        {/* Short business description / summary */}
        {showDescription && description && (
          <p
            style={{
              margin: 0,
              color: '#475569',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 3,
              overflow: 'hidden',
            }}
          >
            {description}
          </p>
        )}

        {/* Product count for the seller */}
        {showProductCount && productCount !== null && (
          <span
            style={{
              color: '#15803d',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            {STRINGS.SELLERS.PRODUCTS_LABEL(productCount)}
          </span>
        )}

        {/* Verified badge — mirrors the public “approved seller” guarantee */}
        <span
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            backgroundColor: '#dcfce7',
            color: '#166534',
            padding: '0.1875rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <span aria-hidden="true">✓</span>
          {STRINGS.SELLERS.VERIFIED_SELLER}
        </span>

        {/* Link to the public seller profile (MKT-07, NFR-USAB-03) */}
        {profilePath && (
          <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
            <Button
              to={profilePath}
              variant="outline"
              size="md"
              fullWidth
              aria-label={STRINGS.SELLERS.SELLER_PROFILE_LABEL(businessName)}
            >
              {STRINGS.SELLERS.VIEW_SELLER}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

SellerCard.propTypes = {
  seller: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    business_name: PropTypes.string,
    description: PropTypes.string,
    summary: PropTypes.string,
    location: PropTypes.string,
    approval_status: PropTypes.oneOf([
      'pending',
      'approved',
      'rejected',
      'suspended',
    ]),
    average_rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    rating_count: PropTypes.number,
    review_count: PropTypes.number,
    products_count: PropTypes.number,
    product_count: PropTypes.number,
    total_products: PropTypes.number,
    image_url: PropTypes.string,
    logo_url: PropTypes.string,
    image: PropTypes.string,
  }),
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  businessName: PropTypes.string,
  location: PropTypes.string,
  description: PropTypes.string,
  rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  ratingCount: PropTypes.number,
  productCount: PropTypes.number,
  image: PropTypes.string,
  to: PropTypes.string,
  showDescription: PropTypes.bool,
  showRating: PropTypes.bool,
  showProductCount: PropTypes.bool,
  showUnapproved: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default SellerCard;
