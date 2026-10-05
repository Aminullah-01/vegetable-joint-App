import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { categoryService } from '../../services/categoryService.js';
import { CategoryCard } from '../products/CategoryCard.jsx';
import { CategoryGridSkeleton } from '../common/Skeleton.jsx';
import { ErrorState } from '../common/ErrorState.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { STRINGS } from '../../constants/strings.js';
import { ROUTES } from '../../routes/routeConfig.js';

const CATEGORY_ICONS = {
  tomato: '🍅',
  pepper: '🌶️',
  onion: '🧅',
  carrot: '🥕',
  cabbage: '🥬',
  spinach: '🥗',
  lettuce: '🥬',
  cucumber: '🥒',
  potato: '🥔',
  'other-vegetables': '🥦',
  'other vegetables': '🥦',
};

function resolveCategoryIcon(cat) {
  if (cat?.icon) return cat.icon;
  const slugKey = (cat?.slug || '').toLowerCase();
  const nameKey = (cat?.name || '').toLowerCase();
  return CATEGORY_ICONS[slugKey] || CATEGORY_ICONS[nameKey] || '🥬';
}

/**
 * CategoriesSection — Homepage Vegetable Categories Section
 *
 * SRS References:
 * - MKT-01: Homepage categories section linking directly to filtered views of the marketplace.
 * - MKT-08: Browse products by category, listed on the homepage and filter panel.
 * - MKT-09: Data-driven category management from GET /categories service.
 * - MKT-10: Loading skeleton and error fallback with retry.
 * - NFR-USAB-01: Responsive grid layout across mobile, tablet, and desktop viewports.
 * - NFR-USAB-03: Minimum touch target size ≥ 44×44px for action links and category cards.
 * - Figma Section 4: Public Homepage — Category Section:
 *   "Create a visually appealing category grid: Tomato, Pepper, Onion, Carrot, Cabbage,
 *    Spinach, Lettuce, Cucumber, Potato, Other Vegetables. Use vegetable imagery or simple illustrations."
 */
export function CategoriesSection({
  limit,
  variant = 'card',
  badge = STRINGS.HOME?.CATEGORIES_BADGE || 'Vegetable Varieties',
  title = STRINGS.HOME?.CATEGORIES_TITLE || 'Browse by Vegetable Category',
  subtitle = STRINGS.HOME?.CATEGORIES_SUBTITLE ||
    'Find exactly what you need by exploring our farm-fresh vegetable varieties.',
  showViewAll = true,
  viewAllText = STRINGS.HOME?.VIEW_ALL_CATEGORIES || 'View All Vegetables',
  viewAllTo = ROUTES.PRODUCTS || '/products',
  showInactive = false,
  onSelectCategory,
  className = '',
  style = {},
}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const res = await categoryService.getCategories();
        if (!isMounted) return;
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        setCategories(items);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err?.message ||
            STRINGS.HOME?.CATEGORIES_ERROR_MESSAGE ||
            'Unable to load vegetable categories. Please try again.'
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryCount((c) => c + 1);
  }, []);

  // Filter active categories unless explicitly requested otherwise
  const filteredCategories = categories.filter(
    (cat) => showInactive || cat.is_active !== false
  );

  const displayedCategories = limit
    ? filteredCategories.slice(0, limit)
    : filteredCategories;

  return (
    <section
      className={`categories-section ${className}`.trim()}
      aria-labelledby="categories-section-heading"
      data-testid="categories-section"
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
        className="categories-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          className="categories-title-group"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}
        >
          {badge && (
            <div
              className="categories-badge"
              data-testid="categories-badge"
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
                🥦
              </span>
              <span>{badge}</span>
            </div>
          )}

          <h2
            id="categories-section-heading"
            data-testid="categories-heading"
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
              data-testid="categories-subtitle"
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
            className="categories-view-all-link"
            data-testid="categories-view-all-link"
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
            aria-label={`${viewAllText} - Browse complete product catalog`}
          >
            <span>{viewAllText}</span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      {/* Main Content Area: Loading, Error, Empty, or Categories Grid */}
      {loading ? (
        <CategoryGridSkeleton
          count={limit || 8}
          variant={variant}
          data-testid="categories-skeleton"
        />
      ) : error ? (
        <div data-testid="categories-error-state">
          <ErrorState
            title="Unable to load categories"
            message={error}
            onRetry={handleRetry}
            retryLabel={STRINGS.BUTTONS?.RETRY || 'Retry'}
          />
        </div>
      ) : displayedCategories.length === 0 ? (
        <div data-testid="categories-empty-state">
          <EmptyState
            type="default"
            title="No Categories Available"
            description="Vegetable categories will appear here once available."
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
          className="categories-grid"
          data-testid="categories-grid"
          style={{
            display: 'grid',
            gridTemplateColumns:
              variant === 'chip'
                ? 'repeat(auto-fill, minmax(130px, 1fr))'
                : 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: variant === 'chip' ? '0.75rem' : '1rem',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {displayedCategories.map((cat) => (
            <CategoryCard
              key={cat.id || cat.slug}
              category={{
                ...cat,
                icon: resolveCategoryIcon(cat),
              }}
              variant={variant}
              showInactive={showInactive}
              onSelect={onSelectCategory}
            />
          ))}
        </div>
      )}
    </section>
  );
}

CategoriesSection.propTypes = {
  limit: PropTypes.number,
  variant: PropTypes.oneOf(['card', 'chip']),
  badge: PropTypes.string,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  showViewAll: PropTypes.bool,
  viewAllText: PropTypes.string,
  viewAllTo: PropTypes.string,
  showInactive: PropTypes.bool,
  onSelectCategory: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default CategoriesSection;
