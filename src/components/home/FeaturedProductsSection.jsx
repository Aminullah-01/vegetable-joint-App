import { useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { productService } from '../../services/productService.js';
import { ProductCard } from '../products/ProductCard.jsx';
import { ProductGridSkeleton } from '../common/Skeleton.jsx';
import { ErrorState } from '../common/ErrorState.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { STRINGS } from '../../constants/strings.js';
import { ROUTES } from '../../routes/routeConfig.js';
import { CartContext } from '../../context/cartContextDef.js';
import { ToastContext } from '../../context/toastContextDef.js';

/**
 * FeaturedProductsSection — Homepage Featured / Latest Vegetables Grid
 *
 * SRS References:
 * - MKT-01: Featured products section showing top-rated or recent vegetable listings with photo,
 *   name, price, seller name, location, and rating.
 * - MKT-02: Product card display with price, unit, seller, availability, and rating.
 * - MKT-10: Loading skeleton and error fallback with retry.
 * - NFR-USAB-01: Responsive grid layout across mobile (1 col), tablet (2 col), desktop (3-4 col).
 * - NFR-USAB-03: Minimum touch target size ≥ 44×44px for action links and buttons.
 * - Figma Section 4: Public Homepage — Featured Products:
 *   "Create product cards displaying: Product image, Product name, Price, Unit, Seller, Location,
 *    Availability, Rating, View Product action, Add to Cart action where appropriate."
 */
export function FeaturedProductsSection({
  limit = 8,
  sort = 'rating',
  badge = STRINGS.HOME?.FEATURED_PRODUCTS_BADGE || 'Fresh From the Farm',
  title = STRINGS.HOME?.FEATURED_PRODUCTS_TITLE || 'Featured Fresh Produce',
  subtitle = STRINGS.HOME?.FEATURED_PRODUCTS_SUBTITLE ||
    'Top quality vegetables freshly harvested from our verified farmers and sellers.',
  showViewAll = true,
  viewAllText = STRINGS.HOME?.VIEW_ALL_PRODUCTS || 'View All Vegetables',
  viewAllTo = ROUTES.PRODUCTS || '/products',
  onAddToCart,
  className = '',
  style = {},
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const cartContext = useContext(CartContext);
  const toastContext = useContext(ToastContext);

  useEffect(() => {
    let isMounted = true;

    async function loadFeatured() {
      try {
        const res = await productService.getProducts({ per_page: limit, sort });
        if (!isMounted) return;
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        setProducts(items.slice(0, limit));
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err?.message ||
            STRINGS.HOME?.FEATURED_ERROR_MESSAGE ||
            'Unable to load featured produce. Please try again.'
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadFeatured();

    return () => {
      isMounted = false;
    };
  }, [limit, sort, retryCount]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryCount((c) => c + 1);
  }, []);

  const handleAddToCart = useCallback(
    (product) => {
      if (onAddToCart) {
        onAddToCart(product);
        return;
      }

      if (cartContext?.addItem) {
        const added = cartContext.addItem(product, 1);
        if (added !== false && toastContext?.success) {
          toastContext.success(
            `Added ${product?.name || 'vegetable'} to cart!`
          );
        }
      }
    },
    [onAddToCart, cartContext, toastContext]
  );

  return (
    <section
      className={`featured-products-section ${className}`.trim()}
      aria-labelledby="featured-products-heading"
      data-testid="featured-products-section"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* Section Header with Title Group and View All Action (Figma Section 4) */}
      <div
        className="featured-products-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          className="featured-products-title-group"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}
        >
          {badge && (
            <div
              className="featured-products-badge"
              data-testid="featured-badge"
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
                🌱
              </span>
              <span>{badge}</span>
            </div>
          )}

          <h2
            id="featured-products-heading"
            data-testid="featured-heading"
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
              data-testid="featured-subtitle"
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
            className="featured-view-all-link"
            data-testid="featured-view-all-link"
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
            aria-label={`${viewAllText} - Browse complete catalog`}
          >
            <span>{viewAllText}</span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      {/* Main Content Area: Loading, Error, Empty, or Product Grid */}
      {loading ? (
        <ProductGridSkeleton count={limit} data-testid="featured-skeleton" />
      ) : error ? (
        <div data-testid="featured-error-state">
          <ErrorState
            title="Unable to load produce"
            message={error}
            onRetry={handleRetry}
            retryLabel={STRINGS.BUTTONS?.RETRY || 'Retry'}
          />
        </div>
      ) : products.length === 0 ? (
        <div data-testid="featured-empty-state">
          <EmptyState
            type="products"
            title="No Featured Produce Available"
            description="Check back soon for freshly harvested vegetables from our farmers."
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
          className="featured-products-grid"
          data-testid="featured-products-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1.5rem',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </section>
  );
}

FeaturedProductsSection.propTypes = {
  limit: PropTypes.number,
  sort: PropTypes.string,
  badge: PropTypes.string,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  showViewAll: PropTypes.bool,
  viewAllText: PropTypes.string,
  viewAllTo: PropTypes.string,
  onAddToCart: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default FeaturedProductsSection;
