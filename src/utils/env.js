/**
 * Environment configuration for Vegetable Joint.
 * Conforms to NFR-MAIN-02 (Mock/API Switch) and NFR-SEC-09 (Safe environment configuration).
 */

export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'Vegetable Joint',
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  /**
   * Flag indicating whether the frontend operates with mock data or live Laravel REST API.
   * Defaults to true unless explicitly set to 'false'.
   */
  useMockData: import.meta.env.VITE_USE_MOCK_DATA !== 'false',
  isDev: Boolean(import.meta.env.DEV),
  isProd: Boolean(import.meta.env.PROD),
};

export default env;
