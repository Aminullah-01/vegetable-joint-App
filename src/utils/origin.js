/**
 * Origin and CORS Configuration & Validation Utilities
 * Conforms to SRS Section 4.5, NFR-SEC-10 (CORS Origins), and NFR-SEC-09.
 */

/**
 * Standard tier configuration for Vegetable Joint deployment environments.
 */
export const CONFIGURED_ORIGINS = {
  development: {
    frontend: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    api: 'http://localhost:8000/api/v1',
    sanctumStatefulDomains: ['localhost:3000', '127.0.0.1:3000'],
  },
  staging: {
    frontend: ['https://staging.vegetablejoint.ng'],
    api: 'https://staging-api.vegetablejoint.ng/api/v1',
    sanctumStatefulDomains: ['staging.vegetablejoint.ng'],
  },
  production: {
    frontend: ['https://vegetablejoint.ng', 'https://www.vegetablejoint.ng'],
    api: 'https://api.vegetablejoint.ng/api/v1',
    sanctumStatefulDomains: ['vegetablejoint.ng', 'www.vegetablejoint.ng'],
  },
};

/**
 * Normalizes a URL or origin to its standard origin format (protocol + hostname + port).
 * Strips path, trailing slashes, and query parameters.
 *
 * @param {string} urlOrOrigin
 * @returns {string|null}
 */
export function getSanitizedOrigin(urlOrOrigin) {
  if (!urlOrOrigin || typeof urlOrOrigin !== 'string') return null;

  const trimmed = urlOrOrigin.trim();
  try {
    const parsed =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? new URL(trimmed)
        : new URL(
            trimmed,
            typeof window !== 'undefined'
              ? window.location.origin
              : 'http://localhost:3000'
          );
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Parses comma-separated origin strings or arrays into a clean array of normalized origins.
 *
 * @param {string|string[]} [origins]
 * @returns {string[]}
 */
export function parseAllowedOrigins(origins) {
  if (!origins) return [];

  const rawList = Array.isArray(origins) ? origins : String(origins).split(',');

  const normalized = [];
  for (const item of rawList) {
    const origin = getSanitizedOrigin(item);
    if (origin && !normalized.includes(origin)) {
      normalized.push(origin);
    }
  }

  return normalized;
}

/**
 * Validates whether a target URL or origin is in the allowed whitelist (NFR-SEC-10).
 * Prevents open redirection attacks and unauthorized cross-origin requests.
 *
 * @param {string} targetUrlOrOrigin
 * @param {string[]} allowedOrigins
 * @returns {boolean}
 */
export function isOriginAllowed(targetUrlOrOrigin, allowedOrigins = []) {
  if (!targetUrlOrOrigin || !Array.isArray(allowedOrigins)) return false;

  const targetOrigin = getSanitizedOrigin(targetUrlOrOrigin);
  if (!targetOrigin) return false;

  const normalizedAllowed = parseAllowedOrigins(allowedOrigins);
  return normalizedAllowed.includes(targetOrigin);
}

/**
 * Validates that an API request or redirect URL belongs to the allowed backend or frontend origins.
 *
 * @param {string} url
 * @param {Object} [options={}]
 * @param {string[]} [options.allowedOrigins]
 * @param {string} [options.apiBaseUrl]
 * @returns {boolean}
 */
export function validateRequestUrl(
  url,
  { allowedOrigins = [], apiBaseUrl = '' } = {}
) {
  if (!url) return false;

  // Relative URLs are always same-origin (safe)
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }

  const targetOrigin = getSanitizedOrigin(url);
  if (!targetOrigin) return false;

  // Check if matches API base origin
  const apiOrigin = getSanitizedOrigin(apiBaseUrl);
  if (apiOrigin && targetOrigin === apiOrigin) {
    return true;
  }

  // Check if matches allowed front-end origins
  return isOriginAllowed(targetOrigin, allowedOrigins);
}

export default {
  CONFIGURED_ORIGINS,
  getSanitizedOrigin,
  parseAllowedOrigins,
  isOriginAllowed,
  validateRequestUrl,
};
