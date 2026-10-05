import PropTypes from 'prop-types';

/**
 * Reusable Base Skeleton Component
 * Conforms to SRS MKT-10 and Figma UI Section 16 (Skeleton states):
 * - Shimmer and pulse animation variants
 * - Text, rectangular, rounded, and circular geometry
 */
export function Skeleton({
  variant = 'rounded',
  width = '100%',
  height = '1rem',
  borderRadius,
  animation = 'shimmer',
  className = '',
  style = {},
}) {
  const getRadius = () => {
    if (borderRadius) return borderRadius;
    switch (variant) {
      case 'circular':
        return '50%';
      case 'rounded':
        return '8px';
      case 'text':
        return '4px';
      case 'rectangular':
      default:
        return '0px';
    }
  };

  const animClass =
    animation === 'shimmer'
      ? 'skeleton-shimmer'
      : animation === 'pulse'
        ? 'animate-pulse'
        : '';

  return (
    <div
      className={`${animClass} ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius: getRadius(),
        backgroundColor: animation === 'none' ? '#e2e8f0' : undefined,
        display: 'block',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

Skeleton.propTypes = {
  variant: PropTypes.oneOf(['text', 'rectangular', 'circular', 'rounded']),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  borderRadius: PropTypes.string,
  animation: PropTypes.oneOf(['shimmer', 'pulse', 'none']),
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Skeleton placeholder for individual Product Cards (MKT-10, Figma Section 16)
 */
export function ProductCardSkeleton({ count = 1, className = '', style = {} }) {
  const cards = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {cards.map((idx) => (
        <div
          key={idx}
          className={className}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            boxSizing: 'border-box',
            height: '100%',
            ...style,
          }}
          data-testid="product-card-skeleton"
        >
          {/* Product Image Placeholder */}
          <Skeleton
            variant="rectangular"
            height="180px"
            width="100%"
            animation="shimmer"
          />

          <div
            style={{
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              flex: 1,
            }}
          >
            {/* Category / Location Tag */}
            <Skeleton width="45%" height="0.8rem" variant="text" />

            {/* Product Title */}
            <Skeleton width="80%" height="1.2rem" variant="text" />

            {/* Seller Line */}
            <Skeleton width="60%" height="0.85rem" variant="text" />

            {/* Price & Unit Line */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'auto',
                paddingTop: '0.5rem',
              }}
            >
              <Skeleton width="50%" height="1.4rem" variant="text" />
              <Skeleton
                width="65px"
                height="22px"
                borderRadius="9999px"
                variant="rounded"
              />
            </div>

            {/* Add to Cart Button Placeholder */}
            <Skeleton
              width="100%"
              height="38px"
              borderRadius="6px"
              variant="rounded"
              style={{ marginTop: '0.5rem' }}
            />
          </div>
        </div>
      ))}
    </>
  );
}

ProductCardSkeleton.propTypes = {
  count: PropTypes.number,
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Skeleton placeholder for entire Product Grids (FE-040, MKT-10, Figma Section 16)
 */
export function ProductGridSkeleton({
  count = 8,
  columns,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`product-grid-skeleton ${className}`.trim()}
      style={{
        display: 'grid',
        gridTemplateColumns: columns || 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1.5rem',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
      data-testid="product-grid-skeleton"
      aria-label="Loading products..."
      role="status"
    >
      <ProductCardSkeleton count={count} />
    </div>
  );
}

ProductGridSkeleton.propTypes = {
  count: PropTypes.number,
  columns: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Skeleton placeholder for Data Tables (FE-040, Figma Section 16)
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className = '',
  style = {},
}) {
  const rowList = Array.from({ length: rows }, (_, i) => i);
  const colList = Array.from({ length: columns }, (_, i) => i);

  return (
    <div
      className={`table-skeleton ${className}`.trim()}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
      data-testid="table-skeleton"
      aria-label="Loading table data..."
      role="status"
    >
      {/* Table Header Placeholder */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          padding: '0.85rem 1rem',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          gap: '1rem',
        }}
      >
        {colList.map((c) => (
          <Skeleton key={c} width="60%" height="0.9rem" variant="text" />
        ))}
      </div>

      {/* Table Rows Placeholder */}
      {rowList.map((r) => (
        <div
          key={r}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            padding: '1rem',
            borderBottom: r === rows - 1 ? 'none' : '1px solid #f1f5f9',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          {colList.map((c) => (
            <Skeleton
              key={c}
              width={c === 0 ? '75%' : c === columns - 1 ? '40%' : '60%'}
              height="0.9rem"
              variant="text"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

TableSkeleton.propTypes = {
  rows: PropTypes.number,
  columns: PropTypes.number,
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Skeleton placeholder for text paragraphs
 */
export function TextSkeleton({
  lines = 3,
  gap = '0.5rem',
  className = '',
  style = {},
}) {
  const lineArray = Array.from({ length: lines }, (_, i) => i);

  const getLineWidth = (index, total) => {
    if (index === total - 1 && total > 1) return '60%';
    if (index % 2 === 1) return '88%';
    return '100%';
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        width: '100%',
        ...style,
      }}
    >
      {lineArray.map((i) => (
        <Skeleton
          key={i}
          width={getLineWidth(i, lines)}
          height="1rem"
          variant="text"
        />
      ))}
    </div>
  );
}

TextSkeleton.propTypes = {
  lines: PropTypes.number,
  gap: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Skeleton placeholder for Product Detail pages (FE-040, MKT-05, Figma Section 6 & 16)
 */
export function ProductDetailSkeleton({ className = '', style = {} }) {
  return (
    <div
      className={`product-detail-skeleton ${className}`.trim()}
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        boxSizing: 'border-box',
        ...style,
      }}
      data-testid="product-detail-skeleton"
      aria-label="Loading product details..."
      role="status"
    >
      {/* Breadcrumb / Back Navigation */}
      <Skeleton width="140px" height="1.25rem" variant="text" />

      {/* Main 2-column Detail Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Left Column: Image Gallery Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Main Large Image */}
          <Skeleton
            variant="rounded"
            borderRadius="12px"
            height="360px"
            width="100%"
            animation="shimmer"
          />

          {/* Thumbnail Gallery Row */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                borderRadius="8px"
                width="72px"
                height="72px"
                animation="shimmer"
              />
            ))}
          </div>
        </div>

        {/* Right Column: Details & Actions Skeleton */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Category Tag */}
          <Skeleton
            width="100px"
            height="26px"
            borderRadius="9999px"
            variant="rounded"
          />

          {/* Product Title */}
          <Skeleton width="85%" height="2.25rem" variant="text" />

          {/* Rating & Reviews Line */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <Skeleton width="120px" height="1.25rem" variant="text" />
            <Skeleton width="80px" height="1.25rem" variant="text" />
          </div>

          {/* Seller Line */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <Skeleton width="32px" height="32px" variant="circular" />
            <Skeleton width="160px" height="1.1rem" variant="text" />
          </div>

          {/* Price & Unit Line */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.5rem',
            }}
          >
            <Skeleton width="140px" height="2rem" variant="text" />
            <Skeleton width="70px" height="1.2rem" variant="text" />
          </div>

          {/* Availability Badge */}
          <Skeleton
            width="110px"
            height="24px"
            borderRadius="9999px"
            variant="rounded"
          />

          {/* Quantity Selector & Add to Cart Controls */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginTop: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Skeleton width="80px" height="1rem" variant="text" />
              <Skeleton
                width="120px"
                height="44px"
                borderRadius="8px"
                variant="rounded"
              />
            </div>

            <Skeleton
              width="100%"
              height="48px"
              borderRadius="8px"
              variant="rounded"
            />
          </div>
        </div>
      </div>

      {/* Description Section Skeleton */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <Skeleton width="180px" height="1.5rem" variant="text" />
        <TextSkeleton lines={4} gap="0.75rem" />
      </div>
    </div>
  );
}

ProductDetailSkeleton.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Skeleton placeholder for Order Detail pages (FE-040, ORD-02, Figma Section 8 & 16)
 */
export function OrderDetailSkeleton({ className = '', style = {} }) {
  return (
    <div
      className={`order-detail-skeleton ${className}`.trim()}
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        boxSizing: 'border-box',
        ...style,
      }}
      data-testid="order-detail-skeleton"
      aria-label="Loading order details..."
      role="status"
    >
      {/* Header bar: Order ID & Status Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <Skeleton width="220px" height="1.75rem" variant="text" />
          <Skeleton width="140px" height="1rem" variant="text" />
        </div>
        <Skeleton
          width="110px"
          height="32px"
          borderRadius="9999px"
          variant="rounded"
        />
      </div>

      {/* Order Status Timeline Stepper */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}
      >
        <Skeleton width="100%" height="40px" variant="rounded" />
      </div>

      {/* 2-column Content: Items and Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Items List Skeleton */}
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
          <Skeleton width="140px" height="1.25rem" variant="text" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 0',
                borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none',
              }}
            >
              <Skeleton
                width="56px"
                height="56px"
                borderRadius="8px"
                variant="rounded"
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  flex: 1,
                }}
              >
                <Skeleton width="70%" height="1rem" variant="text" />
                <Skeleton width="40%" height="0.85rem" variant="text" />
              </div>
              <Skeleton width="60px" height="1.1rem" variant="text" />
            </div>
          ))}
        </div>

        {/* Address and Price Summary */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <Skeleton width="130px" height="1.25rem" variant="text" />
            <TextSkeleton lines={3} gap="0.5rem" />
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <Skeleton width="130px" height="1.25rem" variant="text" />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Skeleton width="80px" height="1rem" variant="text" />
              <Skeleton width="60px" height="1rem" variant="text" />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Skeleton width="100px" height="1.25rem" variant="text" />
              <Skeleton width="80px" height="1.25rem" variant="text" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

OrderDetailSkeleton.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Skeleton placeholder for Category listings / chips (FE-040, MKT-08, Figma Section 16)
 */
export function CategoryGridSkeleton({
  count = 6,
  variant = 'card',
  className = '',
  style = {},
}) {
  const isChip = variant === 'chip';

  return (
    <div
      className={`category-grid-skeleton ${className}`.trim()}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: isChip ? '0.5rem' : '1rem',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
      data-testid="category-grid-skeleton"
      aria-label="Loading categories..."
      role="status"
    >
      {Array.from({ length: count }).map((_, i) =>
        isChip ? (
          <Skeleton
            key={i}
            width="110px"
            height="44px"
            borderRadius="9999px"
            variant="rounded"
          />
        ) : (
          <div
            key={i}
            style={{
              width: '240px',
              height: '80px',
              padding: '0.875rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxSizing: 'border-box',
            }}
          >
            <Skeleton
              width="52px"
              height="52px"
              borderRadius="10px"
              variant="rounded"
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                flex: 1,
              }}
            >
              <Skeleton width="80%" height="1rem" variant="text" />
              <Skeleton width="50%" height="0.75rem" variant="text" />
            </div>
          </div>
        )
      )}
    </div>
  );
}

CategoryGridSkeleton.propTypes = {
  count: PropTypes.number,
  variant: PropTypes.oneOf(['card', 'chip']),
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Skeleton placeholder for individual Seller Cards (FE-040, FE-044, Figma Section 16)
 */
export function SellerCardSkeleton({ count = 1, className = '', style = {} }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`seller-card-skeleton ${className}`.trim()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxSizing: 'border-box',
            height: '100%',
            ...style,
          }}
          data-testid="seller-card-skeleton"
        >
          {/* Header with avatar & name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1.25rem 1.25rem 0.75rem',
            }}
          >
            <Skeleton
              width="56px"
              height="56px"
              borderRadius="50%"
              variant="circular"
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                flex: 1,
              }}
            >
              <Skeleton width="75%" height="1.1rem" variant="text" />
              <Skeleton width="45%" height="0.8rem" variant="text" />
            </div>
          </div>

          {/* Details body */}
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
            <Skeleton width="110px" height="0.9rem" variant="text" />
            <Skeleton width="100%" height="0.85rem" variant="text" />
            <Skeleton width="85%" height="0.85rem" variant="text" />
            <Skeleton width="90px" height="0.85rem" variant="text" />
            <Skeleton
              width="75px"
              height="20px"
              borderRadius="9999px"
              variant="rounded"
            />
            <Skeleton
              width="100%"
              height="40px"
              borderRadius="6px"
              variant="rounded"
              style={{ marginTop: 'auto', paddingTop: '0.5rem' }}
            />
          </div>
        </div>
      ))}
    </>
  );
}

SellerCardSkeleton.propTypes = {
  count: PropTypes.number,
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Skeleton placeholder for entire Seller Grid (FE-040, FE-044, Figma Section 16)
 */
export function SellerGridSkeleton({
  count = 4,
  columns,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`seller-grid-skeleton ${className}`.trim()}
      style={{
        display: 'grid',
        gridTemplateColumns: columns || 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
      data-testid="seller-grid-skeleton"
      aria-label="Loading sellers..."
      role="status"
    >
      <SellerCardSkeleton count={count} />
    </div>
  );
}

SellerGridSkeleton.propTypes = {
  count: PropTypes.number,
  columns: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Skeleton;
