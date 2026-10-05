import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { parseAspectRatio, isValidImageUrl } from '../../utils/image.js';

/**
 * VegetablePlaceholder — Default accessible SVG fallback representing fresh produce.
 * Conforms to SEL-05 and NFR-COMP-03 (alt text and visual layout preserved).
 */
export function VegetablePlaceholder({
  alt = 'Vegetable placeholder',
  label,
  showLabel = false,
  className = '',
  style = {},
  iconSize = 48,
}) {
  const accessibleLabel = label || alt || 'Vegetable placeholder';

  return (
    <div
      role="img"
      aria-label={accessibleLabel}
      className={`lazy-image-placeholder ${className}`.trim()}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0fdf4',
        color: '#15803d',
        padding: '0.5rem',
        boxSizing: 'border-box',
        zIndex: 1,
        ...style,
      }}
      data-testid="lazy-image-placeholder"
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0, maxWidth: '80%', maxHeight: '80%' }}
      >
        <circle cx="32" cy="32" r="30" fill="#dcfce7" />
        <path
          d="M32 14C24 14 18 22 18 30C18 39 24 48 32 50C40 48 46 39 46 30C46 22 40 14 32 14Z"
          fill="#86efac"
          stroke="#16a34a"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M32 20V46"
          stroke="#15803d"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M32 28C28 26 24 28 22 31"
          stroke="#15803d"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M32 34C36 32 40 34 42 37"
          stroke="#15803d"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M32 40C28 38 25 40 24 42"
          stroke="#15803d"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M27 15C25 11 28 8 32 8C36 8 39 11 37 15"
          stroke="#16a34a"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <span
          style={{
            marginTop: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#166534',
            textAlign: 'center',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {accessibleLabel}
        </span>
      )}
    </div>
  );
}

VegetablePlaceholder.propTypes = {
  alt: PropTypes.string,
  label: PropTypes.string,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  iconSize: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

/**
 * LazyImage — Lazy-loading image component with placeholder shimmer and graceful fallback.
 *
 * SRS References:
 * - NFR-PERF-03: Product images served resized and lazy-loaded below the fold.
 * - NFR-COMP-03: Core browsing and cart functions remain usable if images fail to load (alt text and layout preserved).
 * - SEL-05: Default placeholder used when no image is supplied or load fails.
 * - NFR-PERF-01: Zero Cumulative Layout Shift (CLS) via explicit aspect-ratio and dimensions.
 */
export function LazyImage({
  src,
  alt = 'Vegetable',
  aspectRatio = '4/3',
  width = '100%',
  height = 'auto',
  fit = 'cover',
  position = 'center',
  priority = false,
  placeholder,
  fallback,
  fallbackSrc,
  fallbackLabel,
  showAltOnFallback = false,
  borderRadius,
  threshold = 0.01,
  rootMargin = '200px',
  className = '',
  style = {},
  imgClassName = '',
  imgStyle = {},
  onLoad,
  onError,
  onClick,
  srcSet,
  sizes,
  crossOrigin,
  title,
  testId = 'lazy-image',
  ...rest
}) {
  const containerRef = useRef(null);

  // Initialize visibility: priority or unsupported observer eagerly shows image
  const [isInView, setIsInView] = useState(() => {
    if (priority) return true;
    if (typeof window === 'undefined') return true;
    return !('IntersectionObserver' in window);
  });

  // Derived state pattern: adjust state during render when prop changes
  const [prevSrc, setPrevSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [attemptedFallback, setAttemptedFallback] = useState(false);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setHasError(false);
    setIsLoaded(false);
    setAttemptedFallback(false);
  }

  const hasValidInitialSrc = isValidImageUrl(src);
  const activeSrc =
    attemptedFallback && isValidImageUrl(fallbackSrc) ? fallbackSrc : src;
  const hasValidActiveSrc = isValidImageUrl(activeSrc);

  // Observer effect for below-the-fold lazy loading (NFR-PERF-03)
  useEffect(() => {
    if (priority || isInView) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    const el = containerRef.current;
    if (el) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority, isInView, rootMargin, threshold]);

  const handleImgLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(e);
    }
  };

  const handleImgError = (e) => {
    if (
      fallbackSrc &&
      !attemptedFallback &&
      isValidImageUrl(fallbackSrc) &&
      fallbackSrc !== src
    ) {
      setAttemptedFallback(true);
      setIsLoaded(false);
      return;
    }

    setHasError(true);
    if (onError) {
      onError(e);
    }
  };

  const handleImgRef = (node) => {
    if (node && node.complete && node.naturalWidth > 0 && !isLoaded) {
      setIsLoaded(true);
    }
  };

  // Dimensions & layout preservation (NFR-COMP-03, NFR-PERF-01)
  const parsedRatio = parseAspectRatio(aspectRatio);
  const containerStyle = {
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    aspectRatio: parsedRatio,
    borderRadius:
      typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
    backgroundColor: '#f8fafc',
    boxSizing: 'border-box',
    ...style,
  };

  const showFallback = !hasValidInitialSrc || hasError;
  const shouldRenderImg = isInView && hasValidActiveSrc && !hasError;
  const showSkeleton = !showFallback && !isLoaded;

  return (
    <div
      ref={containerRef}
      className={`lazy-image-container ${className}`.trim()}
      style={containerStyle}
      onClick={onClick}
      data-testid={testId}
      {...rest}
    >
      {/* 1. Shimmer skeleton placeholder while loading or waiting for view */}
      {showSkeleton &&
        (placeholder || (
          <div
            className="lazy-image-skeleton skeleton-shimmer"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 1,
            }}
            data-testid={`${testId}-skeleton`}
            aria-hidden="true"
          />
        ))}

      {/* 2. Actual Image Element */}
      {shouldRenderImg && (
        <img
          ref={handleImgRef}
          src={activeSrc}
          alt={alt}
          srcSet={srcSet}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          crossOrigin={crossOrigin}
          title={title}
          onLoad={handleImgLoad}
          onError={handleImgError}
          className={`lazy-image-img ${
            isLoaded ? 'lazy-image-img-loaded' : 'lazy-image-img-loading'
          } ${imgClassName}`.trim()}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: fit,
            objectPosition: position,
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            zIndex: 2,
            ...imgStyle,
          }}
          data-testid={`${testId}-img`}
        />
      )}

      {/* 3. Fallback Placeholder on error or missing src (SEL-05, NFR-COMP-03) */}
      {showFallback &&
        (fallback ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
            data-testid={`${testId}-custom-fallback`}
          >
            {fallback}
          </div>
        ) : (
          <VegetablePlaceholder
            alt={alt}
            label={fallbackLabel}
            showLabel={showAltOnFallback}
          />
        ))}
    </div>
  );
}

LazyImage.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  aspectRatio: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  fit: PropTypes.oneOf(['cover', 'contain', 'fill', 'none', 'scale-down']),
  position: PropTypes.string,
  priority: PropTypes.bool,
  placeholder: PropTypes.node,
  fallback: PropTypes.node,
  fallbackSrc: PropTypes.string,
  fallbackLabel: PropTypes.string,
  showAltOnFallback: PropTypes.bool,
  borderRadius: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  threshold: PropTypes.number,
  rootMargin: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  imgClassName: PropTypes.string,
  imgStyle: PropTypes.object,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
  onClick: PropTypes.func,
  srcSet: PropTypes.string,
  sizes: PropTypes.string,
  crossOrigin: PropTypes.string,
  title: PropTypes.string,
  testId: PropTypes.string,
};

/**
 * ImageWithPlaceholder — Alias for LazyImage for explicit naming consistency.
 */
export function ImageWithPlaceholder(props) {
  return <LazyImage {...props} />;
}

export default LazyImage;
