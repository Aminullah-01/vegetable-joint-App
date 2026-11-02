import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TARGET_BROWSERS,
  TARGET_BROWSER_KEYS,
  detectBrowser,
  safeParseDate,
  isFeatureSupported,
  getBrowserCapabilities,
} from '../browserCompat.js';

describe('browserCompat utilities (NFR-COMP-01)', () => {
  const originalNavigator = window.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('TARGET_BROWSERS constants', () => {
    it('defines all 6 target browsers specified in SRS NFR-COMP-01', () => {
      expect(TARGET_BROWSERS.CHROME).toBe('Google Chrome');
      expect(TARGET_BROWSERS.EDGE).toBe('Microsoft Edge');
      expect(TARGET_BROWSERS.FIREFOX).toBe('Mozilla Firefox');
      expect(TARGET_BROWSERS.SAFARI).toBe('Apple Safari');
      expect(TARGET_BROWSERS.CHROME_ANDROID).toBe('Chrome for Android');
      expect(TARGET_BROWSERS.SAMSUNG_INTERNET).toBe('Samsung Internet');
    });

    it('contains all 6 browser keys in TARGET_BROWSER_KEYS', () => {
      expect(TARGET_BROWSER_KEYS).toHaveLength(6);
      expect(TARGET_BROWSER_KEYS).toEqual([
        'chrome',
        'edge',
        'firefox',
        'safari',
        'chrome_android',
        'samsung_internet',
      ]);
    });
  });

  describe('detectBrowser', () => {
    it('identifies desktop Google Chrome correctly', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
      const result = detectBrowser(ua);
      expect(result.browser).toBe(TARGET_BROWSERS.CHROME);
      expect(result.browserKey).toBe('chrome');
      expect(result.engine).toBe('Blink');
      expect(result.isMobile).toBe(false);
      expect(result.isSupported).toBe(true);
    });

    it('identifies desktop Microsoft Edge correctly', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.2739.67';
      const result = detectBrowser(ua);
      expect(result.browser).toBe(TARGET_BROWSERS.EDGE);
      expect(result.browserKey).toBe('edge');
      expect(result.engine).toBe('Blink');
      expect(result.isMobile).toBe(false);
      expect(result.isSupported).toBe(true);
    });

    it('identifies desktop Mozilla Firefox correctly', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0';
      const result = detectBrowser(ua);
      expect(result.browser).toBe(TARGET_BROWSERS.FIREFOX);
      expect(result.browserKey).toBe('firefox');
      expect(result.engine).toBe('Gecko');
      expect(result.isMobile).toBe(false);
      expect(result.isSupported).toBe(true);
    });

    it('identifies desktop Apple Safari correctly', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15';
      const result = detectBrowser(ua);
      expect(result.browser).toBe(TARGET_BROWSERS.SAFARI);
      expect(result.browserKey).toBe('safari');
      expect(result.engine).toBe('WebKit');
      expect(result.isMobile).toBe(false);
      expect(result.isSupported).toBe(true);
    });

    it('identifies mobile iOS Safari correctly', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1';
      const result = detectBrowser(ua);
      expect(result.browser).toBe(TARGET_BROWSERS.SAFARI);
      expect(result.browserKey).toBe('safari');
      expect(result.engine).toBe('WebKit');
      expect(result.isMobile).toBe(true);
      expect(result.isSupported).toBe(true);
    });

    it('identifies Google Chrome for Android correctly', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36';
      const result = detectBrowser(ua);
      expect(result.browser).toBe(TARGET_BROWSERS.CHROME_ANDROID);
      expect(result.browserKey).toBe('chrome_android');
      expect(result.engine).toBe('Blink');
      expect(result.isMobile).toBe(true);
      expect(result.isSupported).toBe(true);
    });

    it('identifies Samsung Internet correctly', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36';
      const result = detectBrowser(ua);
      expect(result.browser).toBe(TARGET_BROWSERS.SAMSUNG_INTERNET);
      expect(result.browserKey).toBe('samsung_internet');
      expect(result.engine).toBe('Blink');
      expect(result.isMobile).toBe(true);
      expect(result.isSupported).toBe(true);
    });

    it('identifies unsupported/unknown browsers gracefully', () => {
      const ua = 'CustomBot/1.0 (Compatibility Crawler)';
      const result = detectBrowser(ua);
      expect(result.browser).toBe('Unknown Browser');
      expect(result.browserKey).toBe('unknown');
      expect(result.isSupported).toBe(false);
    });

    it('handles empty or non-string input safely using environment navigator', () => {
      const result = detectBrowser();
      expect(result).toHaveProperty('browser');
      expect(result).toHaveProperty('engine');
      expect(typeof result.isMobile).toBe('boolean');
    });
  });

  describe('safeParseDate (Cross-browser Date parsing)', () => {
    it('parses standard ISO 8601 strings', () => {
      const parsed = safeParseDate('2026-11-02T10:30:00Z');
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.toISOString()).toBe('2026-11-02T10:30:00.000Z');
    });

    it('normalizes SQL space-separated timestamps for Safari WebKit compatibility', () => {
      // In WebKit/Safari, new Date("2026-11-02 10:30:00") historically produces Invalid Date
      const parsed = safeParseDate('2026-11-02 10:30:00');
      expect(parsed).toBeInstanceOf(Date);
      expect(isNaN(parsed.getTime())).toBe(false);
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(10); // 0-indexed November
      expect(parsed.getDate()).toBe(2);
    });

    it('handles Date instances and numeric timestamps', () => {
      const now = new Date();
      expect(safeParseDate(now)).toBe(now);

      const timestamp = 1730545200000;
      const fromTimestamp = safeParseDate(timestamp);
      expect(fromTimestamp).toBeInstanceOf(Date);
      expect(fromTimestamp.getTime()).toBe(timestamp);
    });

    it('returns null for falsy, empty or invalid date inputs', () => {
      expect(safeParseDate(null)).toBeNull();
      expect(safeParseDate(undefined)).toBeNull();
      expect(safeParseDate('')).toBeNull();
      expect(safeParseDate('   ')).toBeNull();
      expect(safeParseDate({})).toBeNull();
      expect(safeParseDate([])).toBeNull();
      expect(safeParseDate('invalid-date-string')).toBeNull();
      expect(safeParseDate(new Date('invalid'))).toBeNull();
    });
  });

  describe('isFeatureSupported', () => {
    it('verifies localStorage availability and detects quota errors', () => {
      expect(isFeatureSupported('localStorage')).toBe(true);

      // Simulate restricted private browsing where setItem throws
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error(
            'QuotaExceededError: storage disabled in private mode'
          );
        });

      expect(isFeatureSupported('localStorage')).toBe(false);
      setItemSpy.mockRestore();
    });

    it('verifies sessionStorage availability and handles errors', () => {
      expect(isFeatureSupported('sessionStorage')).toBe(true);

      const sessionSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('SecurityError: access to sessionStorage is denied');
        });

      expect(isFeatureSupported('sessionStorage')).toBe(false);
      sessionSpy.mockRestore();
    });

    it('checks matchMedia, intersectionObserver, intl, and touch support', () => {
      expect(isFeatureSupported('matchMedia')).toBe(true);
      expect(isFeatureSupported('intersectionObserver')).toBe(true);
      expect(isFeatureSupported('intl')).toBe(true);
      expect(typeof isFeatureSupported('touch')).toBe('boolean');

      // Simulate touch-enabled device with maxTouchPoints
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      });
      expect(isFeatureSupported('touch')).toBe(true);
    });

    it('evaluates CSS.supports feature queries safely', () => {
      // Mock window.CSS.supports
      window.CSS = {
        supports: vi.fn((prop, val) => {
          if (prop === 'display' && val === 'grid') return true;
          if (prop === 'gap' && val === '1rem') return true;
          return false;
        }),
      };

      expect(isFeatureSupported('cssGrid')).toBe(true);
      expect(isFeatureSupported('flexGap')).toBe(true);
      expect(isFeatureSupported('unknownFeature')).toBe(false);
    });
  });

  describe('getBrowserCapabilities', () => {
    it('generates a comprehensive compatibility report for the current client', () => {
      const report = getBrowserCapabilities();
      expect(report).toHaveProperty('browser');
      expect(report).toHaveProperty('features');
      expect(report).toHaveProperty('isFullyCompatible');
      expect(report.features.localStorage).toBe(true);
      expect(report.features.matchMedia).toBe(true);
      expect(report.features.intersectionObserver).toBe(true);
      expect(report.features.intl).toBe(true);
    });
  });
});
