import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { STRINGS } from '../../constants';
import { LazyImage } from '../common/LazyImage';

function getCategoryPath(category) {
  const categoryFilter = category.id ?? category.slug;
  return categoryFilter === undefined || categoryFilter === null
    ? '/products'
    : `/products?category=${encodeURIComponent(categoryFilter)}`;
}

/**
 * CategoryCard — data-driven browse and filter control for marketplace categories.
 *
 * Receives a category returned by GET /categories rather than a hard-coded
 * taxonomy, so a category added by an administrator can be rendered without a
 * front-end release (MKT-08, MKT-09).
 */
export function CategoryCard({
  category,
  variant = 'card',
  selected = false,
  onSelect,
  to,
  showDescription = true,
  showProductCount = true,
  showInactive = false,
  className = '',
  style = {},
}) {
  const data = category || {};
  const name = data.name || 'Category';
  const description = data.description;
  const productCount = data.products_count ?? data.product_count;
  const hasProductCount =
    productCount !== undefined &&
    productCount !== null &&
    Number.isFinite(Number(productCount));
  const image = data.image_url || data.image;
  const icon = data.icon || '🥬';
  const isInactive = data.is_active === false;
  const isChip = variant === 'chip';

  if (isInactive && !showInactive) {
    return null;
  }

  const categoryPath = to || getCategoryPath(data);
  const label = STRINGS.PRODUCTS.BROWSE_CATEGORY(name);
  const sharedStyle = {
    minHeight: '44px',
    border: isChip ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
    borderRadius: isChip ? '9999px' : '12px',
    backgroundColor: selected ? '#dcfce7' : '#ffffff',
    color: '#14532d',
    textDecoration: 'none',
    transition: 'all 0.15s ease-in-out',
    boxSizing: 'border-box',
    cursor: 'pointer',
    opacity: isInactive ? 0.55 : 1,
    ...style,
  };

  const content = isChip ? (
    <>
      <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }}>
        {icon}
      </span>
      <span>{name}</span>
      {showProductCount && hasProductCount && (
        <span
          aria-label={STRINGS.PRODUCTS.CATEGORY_PRODUCTS(productCount)}
          style={{
            minWidth: '1.25rem',
            padding: '0.0625rem 0.375rem',
            borderRadius: '9999px',
            backgroundColor: selected ? '#bbf7d0' : '#f0fdf4',
            color: '#166534',
            fontSize: '0.75rem',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {productCount}
        </span>
      )}
    </>
  ) : (
    <>
      <div
        style={{
          width: '52px',
          height: '52px',
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: '10px',
          backgroundColor: '#f0fdf4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
        }}
      >
        {image ? (
          <LazyImage
            src={image}
            alt={name}
            aspectRatio="auto"
            width="100%"
            height="100%"
            fit="cover"
            fallback={<span aria-hidden="true">{icon}</span>}
          />
        ) : (
          <span aria-hidden="true">{icon}</span>
        )}
      </div>
      <span
        style={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        <span style={{ color: '#14532d', fontSize: '1rem', fontWeight: 700 }}>
          {name}
        </span>
        {showDescription && description && (
          <span
            style={{
              color: '#64748b',
              fontSize: '0.8125rem',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
            }}
          >
            {description}
          </span>
        )}
        {showProductCount && hasProductCount && (
          <span
            style={{ color: '#15803d', fontSize: '0.75rem', fontWeight: 600 }}
          >
            {STRINGS.PRODUCTS.CATEGORY_PRODUCTS(productCount)}
          </span>
        )}
      </span>
    </>
  );

  const elementStyle = {
    ...sharedStyle,
    display: 'inline-flex',
    alignItems: 'center',
    gap: isChip ? '0.5rem' : '0.75rem',
    width: isChip ? 'auto' : '100%',
    padding: isChip ? '0.5rem 0.75rem' : '0.875rem',
    textAlign: 'left',
  };

  if (onSelect) {
    return (
      <button
        type="button"
        className={`category-card category-${variant} ${className}`.trim()}
        aria-label={label}
        aria-pressed={selected}
        disabled={isInactive}
        onClick={() => onSelect(data)}
        style={elementStyle}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={categoryPath}
      className={`category-card category-${variant} ${className}`.trim()}
      aria-label={label}
      aria-current={selected ? 'page' : undefined}
      style={elementStyle}
    >
      {content}
    </Link>
  );
}

CategoryCard.propTypes = {
  category: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    slug: PropTypes.string,
    description: PropTypes.string,
    is_active: PropTypes.bool,
    products_count: PropTypes.number,
    product_count: PropTypes.number,
    image_url: PropTypes.string,
    image: PropTypes.string,
    icon: PropTypes.node,
  }).isRequired,
  variant: PropTypes.oneOf(['card', 'chip']),
  selected: PropTypes.bool,
  onSelect: PropTypes.func,
  to: PropTypes.string,
  showDescription: PropTypes.bool,
  showProductCount: PropTypes.bool,
  showInactive: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default CategoryCard;
