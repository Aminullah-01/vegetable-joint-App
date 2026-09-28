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
 * Skeleton placeholder for Product Cards (MKT-10, Figma Section 16)
 */
export function ProductCardSkeleton({ count = 1 }) {
  const cards = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {cards.map((idx) => (
        <div
          key={idx}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
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
};

/**
 * Skeleton placeholder for Data Tables (Figma Section 16)
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
  const rowList = Array.from({ length: rows }, (_, i) => i);
  const colList = Array.from({ length: columns }, (_, i) => i);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        width: '100%',
      }}
      data-testid="table-skeleton"
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
};

/**
 * Skeleton placeholder for text paragraphs
 */
export function TextSkeleton({ lines = 3, gap = '0.5rem' }) {
  const lineArray = Array.from({ length: lines }, (_, i) => i);

  const getLineWidth = (index, total) => {
    if (index === total - 1 && total > 1) return '60%';
    if (index % 2 === 1) return '88%';
    return '100%';
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap, width: '100%' }}
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
};

export default Skeleton;
