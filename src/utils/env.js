/**
 * Environment configuration for Vegetable Joint.
 * Conforms to:
 * - NFR-MAIN-02 (Mock/API Switch)
 * - NFR-SEC-03 (Expiring tokens, HttpOnly cookie preferred)
 * - NFR-SEC-09 (Safe environment configuration)
 * - NFR-SEC-10 (CORS allowed front-end origins)
 * - Section 4.5 (Communications & Origin interfaces)
 */

import {
  CONFIGURED_ORIGINS,
  parseAllowedOrigins,
  isOriginAllowed,
  getSanitizedOrigin,
} from './origin.js';

const metaEnv =
  typeof import.meta !== 'undefined' ? import.meta.env : undefined;

const appEnv = metaEnv?.VITE_APP_ENV || 'development';

const defaultAllowedOrigins =
  appEnv === 'production'
    ? CONFIGURED_ORIGINS.production.frontend
    : appEnv === 'staging'
      ? CONFIGURED_ORIGINS.staging.frontend
      : CONFIGURED_ORIGINS.development.frontend;

const apiBaseUrl = metaEnv?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const sanctumCsrfUrl =
  metaEnv?.VITE_SANCTUM_CSRF_URL ||
  (apiBaseUrl.includes('/api/v1')
    ? apiBaseUrl.replace(/\/api\/v1\/?$/, '/sanctum/csrf-cookie')
    : `${apiBaseUrl.replace(/\/+$/, '')}/sanctum/csrf-cookie`);

export const env = {
  appName: metaEnv?.VITE_APP_NAME || 'Vegetable Joint',
  appEnv,
  appOrigin:
    metaEnv?.VITE_APP_ORIGIN ||
    (appEnv === 'production'
      ? CONFIGURED_ORIGINS.production.frontend[0]
      : appEnv === 'staging'
        ? CONFIGURED_ORIGINS.staging.frontend[0]
        : CONFIGURED_ORIGINS.development.frontend[0]),
  allowedOrigins: parseAllowedOrigins(
    metaEnv?.VITE_ALLOWED_ORIGINS || defaultAllowedOrigins
  ),
  apiBaseUrl,
  sanctumCsrfUrl,
  /**
   * Token storage strategy agreed with backend (SRS NFR-SEC-03):
   * - 'cookie': HttpOnly cookie (preferred to minimise XSS exposure)
   * - 'bearer': Bearer token stored in browser memory/localStorage
   */
  authStrategy: metaEnv?.VITE_AUTH_TOKEN_STRATEGY || 'cookie',
  /**
   * Whether API requests must include credentials (cookies) across CORS origins.
   * Defaults to true when authStrategy is 'cookie'.
   */
  withCredentials:
    metaEnv?.VITE_API_WITH_CREDENTIALS !== undefined
      ? metaEnv.VITE_API_WITH_CREDENTIALS === 'true'
      : true,
  /**
   * Flag indicating whether the frontend operates with mock data or live Laravel REST API.
   * Defaults to true unless explicitly set to 'false'.
   */
  useMockData: metaEnv?.VITE_USE_MOCK_DATA !== 'false',
  isDev: Boolean(metaEnv?.DEV || appEnv === 'development'),
  isStaging: appEnv === 'staging',
  isProd: Boolean(metaEnv?.PROD || appEnv === 'production'),
};

export {
  CONFIGURED_ORIGINS,
  parseAllowedOrigins,
  isOriginAllowed,
  getSanitizedOrigin,
};

export default env;
