/**
 * Environment configuration for Vegetable Joint.
 * Conforms to NFR-MAIN-02 (Mock/API Switch) and NFR-SEC-09 (Safe environment configuration).
 */

const metaEnv =
  typeof import.meta !== 'undefined' ? import.meta.env : undefined;

export const env = {
  appName: metaEnv?.VITE_APP_NAME || 'Vegetable Joint',
  appEnv: metaEnv?.VITE_APP_ENV || 'development',
  apiBaseUrl: metaEnv?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  /**
   * Flag indicating whether the frontend operates with mock data or live Laravel REST API.
   * Defaults to true unless explicitly set to 'false'.
   */
  useMockData: metaEnv?.VITE_USE_MOCK_DATA !== 'false',
  isDev: Boolean(metaEnv?.DEV),
  isProd: Boolean(metaEnv?.PROD),
};

export default env;
