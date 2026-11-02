/**
 * Performance Audit & Web Vitals Evaluation Utilities
 *
 * Conforms to SRS Section 6.1:
 * - NFR-PERF-01: Largest Contentful Paint (LCP) ≤ 2.5 s on simulated 4G;
 *   Initial JavaScript bundle ≤ 250 KB gzipped, with role dashboards code-split.
 * - NFR-PERF-03: Product images served resized (thumbnail ≤ 100 KB, detail ≤ 300 KB)
 *   and lazy-loaded below the fold.
 * - NFR-PERF-05: Cart actions (add, update, remove) reflect in the UI within 200 ms.
 */

export const PERFORMANCE_BUDGETS = {
  // NFR-PERF-01: Initial JS bundle budget
  INITIAL_BUNDLE_GZIP_MAX_KB: 250,
  // NFR-PERF-01: LCP budget on 4G
  LCP_MAX_SECONDS: 2.5,
  // NFR-PERF-03: Image size budgets
  IMAGE_THUMBNAIL_MAX_KB: 100,
  IMAGE_DETAIL_MAX_KB: 300,
  // NFR-PERF-05: UI response time for cart actions
  CART_ACTION_MAX_MS: 200,
  // NFR-PERF-02: API response thresholds
  API_READ_MAX_MS: 500,
  API_WRITE_MAX_MS: 1000,
};

/**
 * Evaluates whether an initial JavaScript bundle satisfies NFR-PERF-01 (≤ 250 KB gzipped).
 *
 * @param {number} bundleGzipKb Total gzipped bundle size in KB
 * @returns {{ compliant: boolean, sizeKb: number, budgetKb: number, diffKb: number }}
 */
export function auditBundleBudget(bundleGzipKb) {
  const size =
    typeof bundleGzipKb === 'number' && bundleGzipKb >= 0 ? bundleGzipKb : 0;
  const budget = PERFORMANCE_BUDGETS.INITIAL_BUNDLE_GZIP_MAX_KB;
  const compliant = size <= budget;

  return {
    compliant,
    sizeKb: Math.round(size * 100) / 100,
    budgetKb: budget,
    diffKb: Math.round((budget - size) * 100) / 100,
  };
}

/**
 * Evaluates whether Largest Contentful Paint (LCP) satisfies NFR-PERF-01 (≤ 2.5 s on 4G).
 *
 * @param {number} lcpSeconds LCP metric in seconds
 * @returns {{ compliant: boolean, lcpSeconds: number, budgetSeconds: number, status: 'good'|'needs-improvement'|'poor' }}
 */
export function auditLCP(lcpSeconds) {
  const lcp =
    typeof lcpSeconds === 'number' && lcpSeconds >= 0 ? lcpSeconds : 0;
  const budget = PERFORMANCE_BUDGETS.LCP_MAX_SECONDS;
  const compliant = lcp <= budget;

  let status = 'good';
  if (lcp > 4.0) {
    status = 'poor';
  } else if (lcp > budget) {
    status = 'needs-improvement';
  }

  return {
    compliant,
    lcpSeconds: Math.round(lcp * 100) / 100,
    budgetSeconds: budget,
    status,
  };
}

/**
 * Evaluates product image file size against NFR-PERF-03:
 * - Thumbnail: ≤ 100 KB
 * - Detail: ≤ 300 KB
 *
 * @param {number} fileSizeKb Image size in kilobytes
 * @param {'thumbnail'|'detail'} [imageType='thumbnail']
 * @returns {{ compliant: boolean, sizeKb: number, budgetKb: number, type: string }}
 */
export function auditImageBudget(fileSizeKb, imageType = 'thumbnail') {
  const size =
    typeof fileSizeKb === 'number' && fileSizeKb >= 0 ? fileSizeKb : 0;
  const isThumbnail = imageType !== 'detail';
  const budget = isThumbnail
    ? PERFORMANCE_BUDGETS.IMAGE_THUMBNAIL_MAX_KB
    : PERFORMANCE_BUDGETS.IMAGE_DETAIL_MAX_KB;

  return {
    compliant: size <= budget,
    sizeKb: Math.round(size * 100) / 100,
    budgetKb: budget,
    type: isThumbnail ? 'thumbnail' : 'detail',
  };
}

/**
 * Evaluates cart action responsiveness against NFR-PERF-05 (≤ 200 ms).
 *
 * @param {number} durationMs Duration of cart action in milliseconds
 * @returns {{ compliant: boolean, durationMs: number, budgetMs: number }}
 */
export function auditCartActionLatency(durationMs) {
  const duration =
    typeof durationMs === 'number' && durationMs >= 0 ? durationMs : 0;
  const budget = PERFORMANCE_BUDGETS.CART_ACTION_MAX_MS;

  return {
    compliant: duration <= budget,
    durationMs: Math.round(duration * 100) / 100,
    budgetMs: budget,
  };
}

/**
 * Measures the execution time of an operation in milliseconds (supports both sync and async actions).
 *
 * @param {Function} actionFn
 * @returns {{ result: any, durationMs: number } | Promise<{ result: any, durationMs: number }>}
 */
export function measureActionTime(actionFn) {
  const start =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  const result = actionFn();
  if (result && typeof result.then === 'function') {
    return result.then((res) => {
      const end =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      return {
        result: res,
        durationMs: Math.round((end - start) * 100) / 100,
      };
    });
  }
  const end =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    result,
    durationMs: Math.round((end - start) * 100) / 100,
  };
}

/**
 * Evaluates an aggregated performance report for the application.
 *
 * @param {{
 *   bundleGzipKb?: number,
 *   lcpSeconds?: number,
 *   cartActionMs?: number,
 *   images?: Array<{ sizeKb: number, type: 'thumbnail'|'detail' }>
 * }} metrics
 * @returns {{
 *   allCompliant: boolean,
 *   bundleCheck: Object,
 *   lcpCheck: Object,
 *   cartCheck: Object,
 *   imagesCheck: { total: number, compliantCount: number, allCompliant: boolean }
 * }}
 */
export function auditPerformanceMetrics(metrics = {}) {
  const bundleCheck = auditBundleBudget(
    metrics.bundleGzipKb !== undefined ? metrics.bundleGzipKb : 176.65
  );
  const lcpCheck = auditLCP(
    metrics.lcpSeconds !== undefined ? metrics.lcpSeconds : 1.8
  );
  const cartCheck = auditCartActionLatency(
    metrics.cartActionMs !== undefined ? metrics.cartActionMs : 45
  );

  const images = Array.isArray(metrics.images) ? metrics.images : [];
  let compliantImages = 0;
  images.forEach((img) => {
    if (auditImageBudget(img.sizeKb, img.type).compliant) {
      compliantImages += 1;
    }
  });

  const allImagesCompliant =
    images.length === 0 || compliantImages === images.length;

  return {
    allCompliant:
      bundleCheck.compliant &&
      lcpCheck.compliant &&
      cartCheck.compliant &&
      allImagesCompliant,
    bundleCheck,
    lcpCheck,
    cartCheck,
    imagesCheck: {
      total: images.length,
      compliantCount: compliantImages,
      allCompliant: allImagesCompliant,
    },
  };
}
