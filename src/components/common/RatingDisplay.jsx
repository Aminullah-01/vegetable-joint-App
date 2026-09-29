import PropTypes from 'prop-types';

/**
 * Star icon helper component supporting full, half, and empty states.
 */
function StarIcon({ fill = 'full', size = '14px' }) {
  if (fill === 'full') {
    return (
      <span
        aria-hidden="true"
        data-testid="star-full"
        style={{
          color: '#f59e0b', // Amber-500
          fontSize: size,
          lineHeight: 1,
          display: 'inline-block',
        }}
      >
        ★
      </span>
    );
  }

  if (fill === 'half') {
    return (
      <span
        aria-hidden="true"
        data-testid="star-half"
        style={{
          position: 'relative',
          display: 'inline-block',
          fontSize: size,
          lineHeight: 1,
          color: '#cbd5e1', // Slate-300 background star
          width: '1em',
          height: '1em',
          verticalAlign: 'middle',
        }}
      >
        <span style={{ position: 'absolute', top: 0, left: 0 }}>★</span>
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            overflow: 'hidden',
            color: '#f59e0b',
          }}
        >
          ★
        </span>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      data-testid="star-empty"
      style={{
        color: '#cbd5e1', // Slate-300
        fontSize: size,
        lineHeight: 1,
        display: 'inline-block',
      }}
    >
      ★
    </span>
  );
}

StarIcon.propTypes = {
  fill: PropTypes.oneOf(['full', 'half', 'empty']),
  size: PropTypes.string,
};

/**
 * RatingDisplay — Displays rating value (0–5, one decimal) or "No ratings yet"
 * SRS References: REV-01, MKT-02, MKT-05
 *
 * Acceptance Criteria (FE-028):
 * - Shows 0–5 value with one decimal or “No ratings yet”.
 * - Displayed on product cards, product details, and seller profiles.
 * - Supports compact badge mode (default) and full 5-star display mode.
 * - Screen reader accessible with informative aria-labels.
 */
export function RatingDisplay({
  rating,
  ratingCount,
  reviewCount,
  size = 'md',
  showCount = true,
  variant = 'compact',
  className = '',
  style = {},
}) {
  const numericRating = Number(rating);
  const count = ratingCount ?? reviewCount;
  const hasRating =
    rating !== null &&
    rating !== undefined &&
    rating !== '' &&
    !isNaN(numericRating) &&
    numericRating > 0;

  const sizeStyles = {
    sm: {
      fontSize: '0.75rem',
      starSize: '12px',
      gap: '0.25rem',
    },
    md: {
      fontSize: '0.8125rem',
      starSize: '14px',
      gap: '0.375rem',
    },
    lg: {
      fontSize: '0.9375rem',
      starSize: '18px',
      gap: '0.5rem',
    },
  }[size] || {
    fontSize: '0.8125rem',
    starSize: '14px',
    gap: '0.375rem',
  };

  const isFullStars = variant === 'stars' || variant === 'full';

  // Empty state: "No ratings yet" (REV-01)
  if (!hasRating) {
    return (
      <div
        className={`rating-display rating-empty ${className}`.trim()}
        role="status"
        aria-label="No ratings yet"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: sizeStyles.gap,
          fontSize: sizeStyles.fontSize,
          color: '#94a3b8',
          userSelect: 'none',
          ...style,
        }}
      >
        {isFullStars ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon key={star} fill="empty" size={sizeStyles.starSize} />
            ))}
          </div>
        ) : (
          <StarIcon fill="empty" size={sizeStyles.starSize} />
        )}
        <span style={{ fontStyle: 'normal' }}>No ratings yet</span>
      </div>
    );
  }

  // Clamped valid rating (0.0 to 5.0)
  const clampedRating = Math.min(5, Math.max(0, numericRating));
  const formattedRating = clampedRating.toFixed(1);

  const reviewText =
    count !== undefined && count !== null
      ? ` based on ${count} ${count === 1 ? 'review' : 'reviews'}`
      : '';
  const ariaLabel = `Rating: ${formattedRating} out of 5 stars${reviewText}`;

  // 5-Star Visual Display Mode
  if (isFullStars) {
    return (
      <div
        className={`rating-display rating-stars ${className}`.trim()}
        role="status"
        aria-label={ariaLabel}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: sizeStyles.gap,
          fontSize: sizeStyles.fontSize,
          lineHeight: 1.2,
          userSelect: 'none',
          ...style,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          {[1, 2, 3, 4, 5].map((starIdx) => {
            let fill = 'empty';
            if (clampedRating >= starIdx) {
              fill = 'full';
            } else if (clampedRating >= starIdx - 0.5) {
              fill = 'half';
            }
            return (
              <StarIcon key={starIdx} fill={fill} size={sizeStyles.starSize} />
            );
          })}
        </div>
        <span
          style={{
            fontWeight: 700,
            color: '#1e293b',
          }}
        >
          {formattedRating}
        </span>
        <span style={{ color: '#64748b' }}>/ 5.0</span>
        {showCount && count !== undefined && count !== null && (
          <span
            className="rating-count"
            style={{
              color: '#64748b',
              fontSize: '0.9em',
            }}
          >
            ({count} {count === 1 ? 'review' : 'reviews'})
          </span>
        )}
      </div>
    );
  }

  // Compact Badge Mode (Default, single star)
  return (
    <div
      className={`rating-display ${className}`.trim()}
      role="status"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyles.gap,
        fontSize: sizeStyles.fontSize,
        lineHeight: 1.2,
        userSelect: 'none',
        ...style,
      }}
    >
      <StarIcon fill="full" size={sizeStyles.starSize} />
      <span
        style={{
          fontWeight: 700,
          color: '#1e293b',
        }}
      >
        {formattedRating}
      </span>
      {showCount && count !== undefined && count !== null && (
        <span
          className="rating-count"
          style={{
            color: '#64748b',
            fontSize: '0.9em',
          }}
        >
          ({count})
        </span>
      )}
    </div>
  );
}

RatingDisplay.propTypes = {
  rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  ratingCount: PropTypes.number,
  reviewCount: PropTypes.number,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showCount: PropTypes.bool,
  variant: PropTypes.oneOf(['compact', 'badge', 'stars', 'full']),
  className: PropTypes.string,
  style: PropTypes.object,
};

export default RatingDisplay;
