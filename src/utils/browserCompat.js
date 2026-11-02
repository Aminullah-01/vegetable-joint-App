/**
 * Browser Compatibility & Device Detection Utilities
 *
 * Conforms to SRS Section 6.3 & NFR-COMP-01:
 * "The application shall function correctly on the latest two versions of
 * Chrome, Edge, Firefox, Safari, Chrome for Android and Samsung Internet."
 */

export const TARGET_BROWSERS = {
  CHROME: 'Google Chrome',
  EDGE: 'Microsoft Edge',
  FIREFOX: 'Mozilla Firefox',
  SAFARI: 'Apple Safari',
  CHROME_ANDROID: 'Chrome for Android',
  SAMSUNG_INTERNET: 'Samsung Internet',
};

export const TARGET_BROWSER_KEYS = [
  'chrome',
  'edge',
  'firefox',
  'safari',
  'chrome_android',
  'samsung_internet',
];

/**
 * Detects browser engine, name, and version from a User Agent string.
 *
 * @param {string} [uaString] User Agent string (defaults to window.navigator.userAgent)
 * @returns {{
 *   browser: string,
 *   browserKey: string,
 *   engine: string,
 *   isMobile: boolean,
 *   isSupported: boolean,
 *   userAgent: string
 * }}
 */
export function detectBrowser(uaString) {
  const ua =
    typeof uaString === 'string'
      ? uaString
      : typeof navigator !== 'undefined'
        ? navigator.userAgent || ''
        : '';

  // Detect mobile
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(
      ua
    );

  // Samsung Internet check (must precede Chrome as Samsung UA contains Chrome)
  if (/SamsungBrowser/i.test(ua)) {
    return {
      browser: TARGET_BROWSERS.SAMSUNG_INTERNET,
      browserKey: 'samsung_internet',
      engine: 'Blink',
      isMobile: true,
      isSupported: true,
      userAgent: ua,
    };
  }

  // Microsoft Edge (Edg/ or Edge/)
  if (/Edg(?:e|A|iOS)?\/(\d+)/i.test(ua)) {
    return {
      browser: TARGET_BROWSERS.EDGE,
      browserKey: 'edge',
      engine: 'Blink',
      isMobile,
      isSupported: true,
      userAgent: ua,
    };
  }

  // Firefox (Desktop or Mobile: Firefox/ or FxiOS/)
  if (/Firefox\/|FxiOS\//i.test(ua)) {
    return {
      browser: TARGET_BROWSERS.FIREFOX,
      browserKey: 'firefox',
      engine: 'Gecko',
      isMobile,
      isSupported: true,
      userAgent: ua,
    };
  }

  // Chrome for Android (contains Android and Chrome, not Samsung)
  if (/Android/i.test(ua) && /Chrome\//i.test(ua)) {
    return {
      browser: TARGET_BROWSERS.CHROME_ANDROID,
      browserKey: 'chrome_android',
      engine: 'Blink',
      isMobile: true,
      isSupported: true,
      userAgent: ua,
    };
  }

  // Google Chrome (Desktop / iOS CriOS)
  if (/(?:Chrome|CriOS)\//i.test(ua)) {
    return {
      browser: TARGET_BROWSERS.CHROME,
      browserKey: 'chrome',
      engine: 'Blink',
      isMobile,
      isSupported: true,
      userAgent: ua,
    };
  }

  // Apple Safari (Desktop or Mobile Safari)
  if (
    /Safari/i.test(ua) &&
    /Version\//i.test(ua) &&
    !/Chrome|Android/i.test(ua)
  ) {
    return {
      browser: TARGET_BROWSERS.SAFARI,
      browserKey: 'safari',
      engine: 'WebKit',
      isMobile: isMobile || /iPhone|iPad|iPod/i.test(ua),
      isSupported: true,
      userAgent: ua,
    };
  }

  return {
    browser: 'Unknown Browser',
    browserKey: 'unknown',
    engine: 'Unknown',
    isMobile,
    isSupported: false,
    userAgent: ua,
  };
}

/**
 * Cross-browser safe Date parser.
 * Safari WebKit fails on SQL date strings formatted as "YYYY-MM-DD HH:mm:ss".
 * This parser normalizes space-separated SQL timestamps to ISO-8601 "YYYY-MM-DDTHH:mm:ss".
 *
 * @param {string|number|Date} dateInput
 * @returns {Date|null}
 */
export function safeParseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;
    // Replace space between date and time with 'T' for Safari WebKit ISO compliance
    const normalized =
      trimmed.includes(' ') && !trimmed.includes('T')
        ? trimmed.replace(' ', 'T')
        : trimmed;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Verifies if a given Web API feature is supported in the current runtime environment.
 *
 * @param {'localStorage'|'sessionStorage'|'matchMedia'|'intersectionObserver'|'intl'|'touch'|'cssGrid'|'flexGap'} feature
 * @returns {boolean}
 */
export function isFeatureSupported(feature) {
  if (typeof window === 'undefined') return false;

  switch (feature) {
    case 'localStorage': {
      try {
        const testKey = '__vj_storage_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    }
    case 'sessionStorage': {
      try {
        const testKey = '__vj_session_test__';
        window.sessionStorage.setItem(testKey, testKey);
        window.sessionStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    }
    case 'matchMedia':
      return typeof window.matchMedia === 'function';
    case 'intersectionObserver':
      return typeof window.IntersectionObserver !== 'undefined';
    case 'intl':
      return (
        typeof Intl !== 'undefined' &&
        typeof Intl.NumberFormat === 'function' &&
        typeof Intl.DateTimeFormat === 'function'
      );
    case 'touch':
      return (
        'ontouchstart' in window ||
        Boolean(
          typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
        )
      );
    case 'cssGrid':
      return (
        typeof CSS !== 'undefined' &&
        typeof CSS.supports === 'function' &&
        CSS.supports('display', 'grid')
      );
    case 'flexGap':
      return (
        typeof CSS !== 'undefined' &&
        typeof CSS.supports === 'function' &&
        CSS.supports('gap', '1rem')
      );
    default:
      return false;
  }
}

/**
 * Returns a complete compatibility report of the current environment against NFR-COMP-01.
 *
 * @returns {{
 *   browser: Object,
 *   features: {
 *     localStorage: boolean,
 *     sessionStorage: boolean,
 *     matchMedia: boolean,
 *     intersectionObserver: boolean,
 *     intl: boolean,
 *     touch: boolean,
 *     cssGrid: boolean,
 *     flexGap: boolean
 *   },
 *   isFullyCompatible: boolean
 * }}
 */
export function getBrowserCapabilities() {
  const browser = detectBrowser();
  const features = {
    localStorage: isFeatureSupported('localStorage'),
    sessionStorage: isFeatureSupported('sessionStorage'),
    matchMedia: isFeatureSupported('matchMedia'),
    intersectionObserver: isFeatureSupported('intersectionObserver'),
    intl: isFeatureSupported('intl'),
    touch: isFeatureSupported('touch'),
    cssGrid: isFeatureSupported('cssGrid'),
    flexGap: isFeatureSupported('flexGap'),
  };

  const isFullyCompatible =
    features.localStorage &&
    features.matchMedia &&
    features.intersectionObserver &&
    features.intl;

  return {
    browser,
    features,
    isFullyCompatible,
  };
}
