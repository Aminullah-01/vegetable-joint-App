import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { sellerService } from '../../services/sellerService.js';
import { SellerCard } from '../products/SellerCard.jsx';
import { SellerGridSkeleton } from '../common/Skeleton.jsx';
import { ErrorState } from '../common/ErrorState.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { STRINGS } from '../../constants/strings.js';
import { ROUTES } from '../../routes/routeConfig.js';

/**
 * FeaturedSellersSection — Homepage Featured Sellers Showcase
 *
 * SRS References:
 * - MKT-01: Homepage featured sellers section showing verified local sellers with photo/avatar,
 *   business name, location, rating, product count, and link to seller profile.
 * - MKT-04: Only approved sellers are publicly displayed.
 * - MKT-07: Public seller profile link (/sellers/:id).
 * - MKT-10: Loading skeleton and error fallback with retry.
 * - NFR-USAB-01: Responsive grid layout across mobile, tablet, and desktop viewports.
 * - NFR-USAB-03: Minimum touch target size ≥ 44×44px for action links and buttons.
 * - Figma Section 4: Public Homepage — Featured Sellers:
 *   "Create seller cards showing: Business name, Seller location, Short description,
 *    Product count, Rating if available, View Seller button."
 */
export function FeaturedSellersSection({
  limit = 4,
  badge = STRINGS.HOME?.FEATURED_SELLERS_BADGE || 'Verified Farmers & Vendors',
  title = STRINGS.HOME?.FEATURED_SELLERS_TITLE ||
    STRINGS.SELLERS?.FEATURED_TITLE ||
    'Featured Sellers',
  subtitle = STRINGS.HOME?.FEATURED_SELLERS_SUBTITLE ||
    STRINGS.SELLERS?.FEATURED_SUBTITLE ||
    'Connect directly with trusted local farmers and vegetable vendors across Nigeria.',
  showViewAll = true,
  viewAllText = STRINGS.HOME?.VIEW_ALL_SELLERS || 'View All Sellers',
  viewAllTo = ROUTES.PRODUCTS || '/products',
  className = '',
  style = {},
}) {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadSellers() {
      try {
        const res = await sellerService.getPublicSellers({
          per_page: limit,
        });
        if (!isMounted) return;
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        setSellers(items.slice(0, limit));
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err?.message ||
            STRINGS.HOME?.FEATURED_SELLERS_ERROR_MESSAGE ||
            'Unable to load featured sellers. Please try again.'
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSellers();

    return () => {
      isMounted = false;
    };
  }, [limit, retryCount]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryCount((c) => c + 1);
  }, []);

  // Filter approved sellers per MKT-04
  const approvedSellers = sellers.filter(
    (s) => s.approval_status === undefined || s.approval_status === 'approved'
  );

  return (
    <section
      className={`featured-sellers-section ${className}`.trim()}
      aria-labelledby="featured-sellers-heading"
      data-testid="featured-sellers-section"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* Section Header with Eyebrow Badge and Title Group (Figma Section 4) */}
      <div
        className="featured-sellers-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          className="featured-sellers-title-group"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}
        >
          {badge && (
            <div
              className="featured-sellers-badge"
              data-testid="featured-sellers-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#15803d',
                backgroundColor: '#dcfce7',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                width: 'fit-content',
              }}
            >
              <span role="img" aria-hidden="true">
                🧑‍🌾
              </span>
              <span>{badge}</span>
            </div>
          )}

          <h2
            id="featured-sellers-heading"
            data-testid="featured-sellers-heading"
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.025em',
            }}
          >
            {title}
          </h2>

          {subtitle && (
            <p
              data-testid="featured-sellers-subtitle"
              style={{
                fontSize: '0.975rem',
                color: '#64748b',
                margin: 0,
                maxWidth: '680px',
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {showViewAll && (
          <Link
            to={viewAllTo}
            className="featured-sellers-view-all-link"
            data-testid="featured-sellers-view-all-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: '#15803d',
              textDecoration: 'none',
              minHeight: '44px',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              backgroundColor: '#f0fdf4',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
            aria-label={`${viewAllText} - Browse marketplace produce`}
          >
            <span>{viewAllText}</span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      {/* Main Content Area: Loading, Error, Empty, or Sellers Grid */}
      {loading ? (
        <SellerGridSkeleton count={limit} data-testid="sellers-skeleton" />
      ) : error ? (
        <div data-testid="sellers-error-state">
          <ErrorState
            title="Unable to load sellers"
            message={error}
            onRetry={handleRetry}
            retryLabel={STRINGS.BUTTONS?.RETRY || 'Retry'}
          />
        </div>
      ) : approvedSellers.length === 0 ? (
        <div data-testid="sellers-empty-state">
          <EmptyState
            type="sellers"
            title="No Verified Sellers Found"
            description="New farmers and vegetable sellers will be featured here soon."
            action={
              showViewAll ? (
                <Link
                  to={viewAllTo}
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    minHeight: '44px',
                    lineHeight: '30px',
                    boxSizing: 'border-box',
                  }}
                >
                  {viewAllText}
                </Link>
              ) : null
            }
          />
        </div>
      ) : (
        <div
          className="featured-sellers-grid"
          data-testid="featured-sellers-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {approvedSellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </section>
  );
}

FeaturedSellersSection.propTypes = {
  limit: PropTypes.number,
  badge: PropTypes.string,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  showViewAll: PropTypes.bool,
  viewAllText: PropTypes.string,
  viewAllTo: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default FeaturedSellersSection;
