/**
 * Production Build and Static/CDN Deployment Audit Utilities
 *
 * SRS References:
 * - Source §43: Separate frontend and backend deployments: static/CDN host for
 *   React build; PHP host for Laravel.
 * - SRS §2.5 CON-01, CON-05: React frontend architecture; secrets shall never be committed.
 * - SRS NFR-SEC-03: HttpOnly cookie token strategy; expiring tokens.
 * - SRS NFR-SEC-06: CSRF protection with Sanctum CSRF cookie handshake.
 * - SRS NFR-SEC-10: CORS whitelist restricted to configured frontend origins.
 * - SRS Section 8.3: Release Acceptance Criteria (successful deployment from CI with HTTPS).
 */

export const PRODUCTION_ENV_REQUIREMENTS = {
  VITE_APP_NAME: 'Vegetable Joint',
  VITE_APP_ENV: 'production',
  VITE_APP_ORIGIN: 'https://vegetablejoint.ng',
  VITE_ALLOWED_ORIGINS:
    'https://vegetablejoint.ng,https://www.vegetablejoint.ng',
  VITE_API_BASE_URL: 'https://api.vegetablejoint.ng/api/v1',
  VITE_SANCTUM_CSRF_URL: 'https://api.vegetablejoint.ng/sanctum/csrf-cookie',
  VITE_AUTH_TOKEN_STRATEGY: 'cookie',
  VITE_API_WITH_CREDENTIALS: 'true',
  VITE_USE_MOCK_DATA: 'false',
};

export const REQUIRED_STATIC_CDN_FILES = [
  '_redirects',
  '_headers',
  'robots.txt',
  'index.html',
];

export const REQUIRED_SECURITY_HEADERS = [
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Strict-Transport-Security',
  'Referrer-Policy',
  'Content-Security-Policy',
];

export const DISALLOWED_ROBOTS_PATHS = [
  '/admin/',
  '/seller/',
  '/account/',
  '/checkout/',
];

/**
 * Validates production environment settings against SRS requirements.
 *
 * @param {Record<string, string>} env
 * @returns {{
 *   isValid: boolean,
 *   missingKeys: string[],
 *   invalidValues: Array<{ key: string, expected: string, actual: string }>,
 *   errors: string[]
 * }}
 */
export function validateProductionConfig(env = {}) {
  const missingKeys = [];
  const invalidValues = [];
  const errors = [];

  for (const [key, expected] of Object.entries(PRODUCTION_ENV_REQUIREMENTS)) {
    const actual = env[key];
    if (actual === undefined || actual === null || actual === '') {
      missingKeys.push(key);
      errors.push(`Missing required production environment variable: ${key}`);
    } else if (String(actual).trim() !== expected) {
      invalidValues.push({ key, expected, actual: String(actual).trim() });
      errors.push(
        `Invalid production value for ${key}. Expected "${expected}", received "${actual}"`
      );
    }
  }

  return {
    isValid: missingKeys.length === 0 && invalidValues.length === 0,
    missingKeys,
    invalidValues,
    errors,
  };
}

/**
 * Parses static hosting `_redirects` file into structured rules.
 *
 * @param {string} content
 * @returns {Array<{ from: string, to: string, status: number }>}
 */
export function parseRedirectRules(content = '') {
  if (typeof content !== 'string') return [];

  const lines = content.split('\n');
  const rules = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const from = parts[0];
      const to = parts[1];
      const status = parts[2] ? parseInt(parts[2], 10) : 301;
      rules.push({ from, to, status: Number.isNaN(status) ? 301 : status });
    }
  }

  return rules;
}

/**
 * Checks whether redirect rules contain a valid SPA catch-all rewrite to `/index.html`.
 *
 * @param {Array<{ from: string, to: string, status: number }>} rules
 * @returns {boolean}
 */
export function hasSpaCatchAllRedirect(rules = []) {
  if (!Array.isArray(rules)) return false;

  return rules.some((rule) => {
    const isCatchAll = rule.from === '/*' || rule.from === '*';
    const targetsIndex =
      rule.to === '/index.html' || rule.to === 'index.html' || rule.to === '/';
    const isRewrite = rule.status === 200;
    return isCatchAll && targetsIndex && isRewrite;
  });
}

/**
 * Parses static hosting `_headers` file into structured path-to-headers mapping.
 *
 * @param {string} content
 * @returns {Record<string, Record<string, string>>}
 */
export function parseHeaderRules(content = '') {
  if (typeof content !== 'string') return {};

  const lines = content.split('\n');
  const result = {};
  let currentPath = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check if this line defines a new path block (does not contain a colon or starts at col 0 without colon)
    if (!trimmed.includes(':') || rawLine.startsWith('/')) {
      currentPath = trimmed;
      if (!result[currentPath]) {
        result[currentPath] = {};
      }
      continue;
    }

    if (currentPath && trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const headerName = trimmed.slice(0, colonIdx).trim();
      const headerValue = trimmed.slice(colonIdx + 1).trim();
      result[currentPath][headerName] = headerValue;
    }
  }

  return result;
}

/**
 * Validates static CDN routing, security headers, and robots crawler directives.
 *
 * @param {{
 *   redirectsContent?: string,
 *   headersContent?: string,
 *   robotsContent?: string
 * }} options
 * @returns {{
 *   compliant: boolean,
 *   checks: {
 *     spaRewrite: boolean,
 *     securityHeaders: boolean,
 *     immutableAssetCache: boolean,
 *     indexNoCache: boolean,
 *     robotsProtected: boolean
 *   },
 *   errors: string[]
 * }}
 */
export function validateStaticCdnRules({
  redirectsContent = '',
  headersContent = '',
  robotsContent = '',
} = {}) {
  const errors = [];

  // 1. SPA Catch-All Rewrite in _redirects
  const redirectRules = parseRedirectRules(redirectsContent);
  const spaRewrite = hasSpaCatchAllRedirect(redirectRules);
  if (!spaRewrite) {
    errors.push(
      'Missing or invalid SPA rewrite rule in _redirects (expected "/* /index.html 200")'
    );
  }

  // 2. Security Headers & Caching in _headers
  const headerMap = parseHeaderRules(headersContent);
  const globalHeaders = headerMap['/*'] || {};
  const assetHeaders = headerMap['/assets/*'] || {};
  const indexHeaders = headerMap['/index.html'] || {};

  const missingSecurityHeaders = REQUIRED_SECURITY_HEADERS.filter(
    (h) => !globalHeaders[h]
  );
  const securityHeaders = missingSecurityHeaders.length === 0;
  if (!securityHeaders) {
    errors.push(
      `Missing required security headers in _headers: ${missingSecurityHeaders.join(', ')}`
    );
  }

  const immutableAssetCache = Boolean(
    assetHeaders['Cache-Control'] &&
    assetHeaders['Cache-Control'].includes('immutable') &&
    assetHeaders['Cache-Control'].includes('max-age=')
  );
  if (!immutableAssetCache) {
    errors.push(
      'Missing immutable Cache-Control header for /assets/* in _headers'
    );
  }

  const indexNoCache = Boolean(
    indexHeaders['Cache-Control'] &&
    (indexHeaders['Cache-Control'].includes('no-cache') ||
      indexHeaders['Cache-Control'].includes('must-revalidate'))
  );
  if (!indexNoCache) {
    errors.push(
      'Missing no-cache Cache-Control header for /index.html in _headers'
    );
  }

  // 3. Robots.txt Protection
  const robotsText = typeof robotsContent === 'string' ? robotsContent : '';
  const missingRobotsPaths = DISALLOWED_ROBOTS_PATHS.filter(
    (p) => !robotsText.includes(`Disallow: ${p}`)
  );
  const robotsProtected = missingRobotsPaths.length === 0;
  if (!robotsProtected) {
    errors.push(
      `Missing Disallow directives in robots.txt for: ${missingRobotsPaths.join(', ')}`
    );
  }

  const compliant =
    spaRewrite &&
    securityHeaders &&
    immutableAssetCache &&
    indexNoCache &&
    robotsProtected;

  return {
    compliant,
    checks: {
      spaRewrite,
      securityHeaders,
      immutableAssetCache,
      indexNoCache,
      robotsProtected,
    },
    errors,
  };
}

/**
 * Validates production build artifacts structure.
 *
 * @param {string[]} fileList Array of relative paths in dist/
 * @returns {{
 *   isValid: boolean,
 *   hasIndexHtml: boolean,
 *   hasVendorChunk: boolean,
 *   jsBundleCount: number,
 *   cssBundleCount: number,
 *   errors: string[]
 * }}
 */
export function validateBundleStructure(fileList = []) {
  const files = Array.isArray(fileList) ? fileList : [];
  const errors = [];

  const hasIndexHtml = files.includes('index.html');
  if (!hasIndexHtml) {
    errors.push('Missing dist/index.html entrypoint');
  }

  const jsBundles = files.filter(
    (f) => f.startsWith('assets/') && f.endsWith('.js')
  );
  const cssBundles = files.filter(
    (f) => f.startsWith('assets/') && f.endsWith('.css')
  );

  const jsBundleCount = jsBundles.length;
  const cssBundleCount = cssBundles.length;

  if (jsBundleCount === 0) {
    errors.push('No JavaScript bundles found in dist/assets/');
  }

  if (cssBundleCount === 0) {
    errors.push('No CSS stylesheets found in dist/assets/');
  }

  const hasVendorChunk = jsBundles.some((f) => f.includes('vendor-'));
  if (!hasVendorChunk) {
    errors.push(
      'No vendor manual chunk found in dist/assets/ (expected vendor-[hash].js)'
    );
  }

  const isValid =
    hasIndexHtml && jsBundleCount > 0 && cssBundleCount > 0 && hasVendorChunk;

  return {
    isValid,
    hasIndexHtml,
    hasVendorChunk,
    jsBundleCount,
    cssBundleCount,
    errors,
  };
}

/**
 * Performs a complete deployment readiness audit.
 *
 * @param {{
 *   env: Record<string, string>,
 *   redirectsContent?: string,
 *   headersContent?: string,
 *   robotsContent?: string,
 *   distFiles?: string[]
 * }} options
 * @returns {{
 *   ready: boolean,
 *   status: 'ready' | 'not_ready',
 *   checks: {
 *     environment: boolean,
 *     cdnRules: boolean,
 *     bundleStructure: boolean
 *   },
 *   errors: string[]
 * }}
 */
export function auditDeploymentReadiness({
  env = {},
  redirectsContent = '',
  headersContent = '',
  robotsContent = '',
  distFiles = [],
} = {}) {
  const envResult = validateProductionConfig(env);
  const cdnResult = validateStaticCdnRules({
    redirectsContent,
    headersContent,
    robotsContent,
  });
  const bundleResult = validateBundleStructure(distFiles);

  const allErrors = [
    ...envResult.errors,
    ...cdnResult.errors,
    ...bundleResult.errors,
  ];

  const ready =
    envResult.isValid && cdnResult.compliant && bundleResult.isValid;

  return {
    ready,
    status: ready ? 'ready' : 'not_ready',
    checks: {
      environment: envResult.isValid,
      cdnRules: cdnResult.compliant,
      bundleStructure: bundleResult.isValid,
    },
    errors: allErrors,
  };
}
