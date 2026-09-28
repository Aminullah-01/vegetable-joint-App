import { env } from '../utils/index.js';

let runtimeMockOverride = null;

/**
 * Mock/API Switch Controller
 * Conforms to NFR-MAIN-02, CON-02, and IF-06.
 *
 * Rules:
 * - One environment setting (VITE_USE_MOCK_DATA) flips all services between
 *   mock data and the Laravel REST API.
 * - Zero component changes required.
 * - Supports runtime overriding for testing / debugging.
 */
export const mockSwitch = {
  /**
   * Determine whether mock data mode is active.
   * Priority: runtime override (if set) -> env.useMockData (from VITE_USE_MOCK_DATA).
   *
   * @returns {boolean}
   */
  isEnabled() {
    if (typeof runtimeMockOverride === 'boolean') {
      return runtimeMockOverride;
    }
    return Boolean(env.useMockData);
  },

  /**
   * Override mock mode at runtime (e.g. in test suites or devtools).
   *
   * @param {boolean|null} value - true to force mock, false to force live API, null to reset.
   */
  setMockMode(value) {
    runtimeMockOverride = typeof value === 'boolean' ? value : null;
  },

  /**
   * Reset mock override to environment configuration.
   */
  reset() {
    runtimeMockOverride = null;
  },
};

/**
 * Convenience helper to check mock status.
 * @returns {boolean}
 */
export const isMockMode = () => mockSwitch.isEnabled();

export default mockSwitch;
