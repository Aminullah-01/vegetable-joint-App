import { describe, it, expect } from 'vitest';
import {
  CONFIGURED_ORIGINS,
  getSanitizedOrigin,
  parseAllowedOrigins,
  isOriginAllowed,
  validateRequestUrl,
} from '../origin.js';

describe('Origin & CORS Configuration Utilities (NFR-SEC-10, Section 4.5)', () => {
  describe('CONFIGURED_ORIGINS', () => {
    it('defines distinct front-end origins for development, staging, and production', () => {
      expect(CONFIGURED_ORIGINS.development.frontend).toContain(
        'http://localhost:3000'
      );
      expect(CONFIGURED_ORIGINS.development.frontend).toContain(
        'http://127.0.0.1:3000'
      );
      expect(CONFIGURED_ORIGINS.staging.frontend).toEqual([
        'https://staging.vegetablejoint.ng',
      ]);
      expect(CONFIGURED_ORIGINS.production.frontend).toEqual([
        'https://vegetablejoint.ng',
        'https://www.vegetablejoint.ng',
      ]);
    });

    it('defines matching API base URLs and stateful domains for Sanctum', () => {
      expect(CONFIGURED_ORIGINS.staging.api).toBe(
        'https://staging-api.vegetablejoint.ng/api/v1'
      );
      expect(CONFIGURED_ORIGINS.staging.sanctumStatefulDomains).toEqual([
        'staging.vegetablejoint.ng',
      ]);

      expect(CONFIGURED_ORIGINS.production.api).toBe(
        'https://api.vegetablejoint.ng/api/v1'
      );
      expect(CONFIGURED_ORIGINS.production.sanctumStatefulDomains).toEqual([
        'vegetablejoint.ng',
        'www.vegetablejoint.ng',
      ]);
    });
  });

  describe('getSanitizedOrigin', () => {
    it('normalizes full URLs to protocol + hostname + port', () => {
      expect(
        getSanitizedOrigin('https://staging.vegetablejoint.ng/api/v1/products')
      ).toBe('https://staging.vegetablejoint.ng');
      expect(
        getSanitizedOrigin('http://localhost:3000/marketplace?page=2')
      ).toBe('http://localhost:3000');
      expect(getSanitizedOrigin('https://vegetablejoint.ng:443/')).toBe(
        'https://vegetablejoint.ng'
      );
    });

    it('returns null for empty or invalid input', () => {
      expect(getSanitizedOrigin('')).toBeNull();
      expect(getSanitizedOrigin(null)).toBeNull();
      expect(getSanitizedOrigin(undefined)).toBeNull();
    });
  });

  describe('parseAllowedOrigins', () => {
    it('parses comma-separated origin strings into unique normalized origins', () => {
      const input =
        'https://vegetablejoint.ng, https://www.vegetablejoint.ng/, https://vegetablejoint.ng';
      const parsed = parseAllowedOrigins(input);

      expect(parsed).toEqual([
        'https://vegetablejoint.ng',
        'https://www.vegetablejoint.ng',
      ]);
    });

    it('handles arrays of origins safely', () => {
      const input = [
        'http://localhost:3000',
        'http://localhost:3000/',
        'http://127.0.0.1:3000',
      ];
      const parsed = parseAllowedOrigins(input);

      expect(parsed).toEqual([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ]);
    });

    it('returns empty array when input is empty or null', () => {
      expect(parseAllowedOrigins(null)).toEqual([]);
      expect(parseAllowedOrigins('')).toEqual([]);
    });
  });

  describe('isOriginAllowed (NFR-SEC-10)', () => {
    const allowedOrigins = [
      'https://vegetablejoint.ng',
      'https://www.vegetablejoint.ng',
      'https://staging.vegetablejoint.ng',
    ];

    it('permits whitelisted origins and subdomains', () => {
      expect(isOriginAllowed('https://vegetablejoint.ng', allowedOrigins)).toBe(
        true
      );
      expect(
        isOriginAllowed('https://www.vegetablejoint.ng/account', allowedOrigins)
      ).toBe(true);
      expect(
        isOriginAllowed(
          'https://staging.vegetablejoint.ng/products',
          allowedOrigins
        )
      ).toBe(true);
    });

    it('strictly rejects non-whitelisted or spoofed origins', () => {
      expect(
        isOriginAllowed('https://malicious-vegetablejoint.ng', allowedOrigins)
      ).toBe(false);
      expect(isOriginAllowed('http://vegetablejoint.ng', allowedOrigins)).toBe(
        false
      ); // HTTP rejected when HTTPS configured
      expect(
        isOriginAllowed(
          'https://attacker.com?origin=vegetablejoint.ng',
          allowedOrigins
        )
      ).toBe(false);
    });

    it('returns false for invalid inputs', () => {
      expect(isOriginAllowed('', allowedOrigins)).toBe(false);
      expect(isOriginAllowed(null, allowedOrigins)).toBe(false);
      expect(isOriginAllowed('https://vegetablejoint.ng', null)).toBe(false);
    });
  });

  describe('validateRequestUrl', () => {
    const options = {
      allowedOrigins: ['https://vegetablejoint.ng'],
      apiBaseUrl: 'https://api.vegetablejoint.ng/api/v1',
    };

    it('accepts relative URLs as same-origin safe', () => {
      expect(validateRequestUrl('/api/v1/auth/login', options)).toBe(true);
      expect(validateRequestUrl('/sanctum/csrf-cookie', options)).toBe(true);
    });

    it('rejects protocol-relative URLs that could bypass validation', () => {
      expect(validateRequestUrl('//evil.com/phishing', options)).toBe(false);
    });

    it('accepts valid API base URL and allowed front-end URLs', () => {
      expect(
        validateRequestUrl(
          'https://api.vegetablejoint.ng/api/v1/products',
          options
        )
      ).toBe(true);
      expect(
        validateRequestUrl('https://vegetablejoint.ng/cart', options)
      ).toBe(true);
    });

    it('rejects foreign or unapproved target URLs', () => {
      expect(validateRequestUrl('https://untrusted-api.com/v1', options)).toBe(
        false
      );
    });
  });
});
