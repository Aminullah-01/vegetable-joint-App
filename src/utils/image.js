/**
 * Image Utilities and NFR Constraints
 *
 * SRS References:
 * - NFR-PERF-03: Product images served resized (thumbnail ≤ 100 KB, detail ≤ 300 KB) and lazy-loaded below the fold.
 * - NFR-COMP-03: Core browsing and cart functions remain usable if images fail to load (alt text and layout preserved).
 * - SEL-05 / A-08: Supported formats JPEG, PNG, WebP with max upload size of 2 MB. Default placeholder when missing or failed.
 */

export const IMAGE_BUDGETS = {
  THUMBNAIL_MAX_KB: 100, // NFR-PERF-03
  DETAIL_MAX_KB: 300, // NFR-PERF-03
  UPLOAD_MAX_MB: 2, // SEL-05, A-08
  UPLOAD_MAX_BYTES: 2 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

/**
 * Validates whether a provided URL or path is a valid non-empty image source string.
 *
 * @param {unknown} src
 * @returns {boolean}
 */
export function isValidImageUrl(src) {
  if (!src || typeof src !== 'string') {
    return false;
  }
  const trimmed = src.trim();
  if (trimmed.length === 0) {
    return false;
  }
  // Reject simple javascript: or data: URIs that are malformed
  if (/^javascript:/i.test(trimmed)) {
    return false;
  }
  return true;
}

/**
 * Parses an aspect ratio string or number into a valid CSS aspect-ratio value.
 *
 * @param {string|number|undefined} ratio
 * @returns {string|undefined}
 */
export function parseAspectRatio(ratio) {
  if (!ratio || ratio === 'auto') {
    return undefined;
  }
  if (typeof ratio === 'number') {
    return ratio > 0 ? String(ratio) : undefined;
  }
  if (typeof ratio === 'string') {
    const trimmed = ratio.trim();
    if (trimmed === 'auto' || trimmed === '') return undefined;
    // Format like '4/3' or '16/9' or '1.33'
    if (/^\d+(\.\d+)?(\s*\/\s*\d+(\.\d+)?)?$/.test(trimmed)) {
      return trimmed.replace(/\s+/g, '');
    }
  }
  return undefined;
}

/**
 * Helper to construct an optimized image URL with optional width/quality constraints (NFR-PERF-03).
 *
 * @param {string} url - Base image URL
 * @param {object} options - Options such as width, height, quality
 * @returns {string} Optimized URL
 */
export function getOptimizedImageUrl(url, options = {}) {
  if (!isValidImageUrl(url)) {
    return '';
  }

  const { width, height, quality } = options;
  if (!width && !height && !quality) {
    return url;
  }

  try {
    // If it's a full URL with protocol
    if (/^https?:\/\//i.test(url)) {
      const parsed = new URL(url);
      if (width) parsed.searchParams.set('w', String(width));
      if (height) parsed.searchParams.set('h', String(height));
      if (quality) parsed.searchParams.set('q', String(quality));
      return parsed.toString();
    }
  } catch {
    // Return original url if URL parsing fails
    return url;
  }

  return url;
}
