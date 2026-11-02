import { describe, it, expect } from 'vitest';
import {
  PRODUCTION_ENV_REQUIREMENTS,
  REQUIRED_STATIC_CDN_FILES,
  REQUIRED_SECURITY_HEADERS,
  DISALLOWED_ROBOTS_PATHS,
  validateProductionConfig,
  parseRedirectRules,
  hasSpaCatchAllRedirect,
  parseHeaderRules,
  validateStaticCdnRules,
  validateBundleStructure,
  auditDeploymentReadiness,
} from '../deploymentAudit.js';

describe('Production Deployment & Static/CDN Host Audit Utilities (FE-124: Source §43)', () => {
  const sampleValidEnv = { ...PRODUCTION_ENV_REQUIREMENTS };

  const sampleValidRedirects = `
# SPA Client Routing
/*    /index.html   200
  `;

  const sampleValidHeaders = `
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' https://api.vegetablejoint.ng;

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: no-cache, no-store, must-revalidate
  `;

  const sampleValidRobots = `
User-agent: *
Allow: /
Allow: /products
Disallow: /admin/
Disallow: /seller/
Disallow: /account/
Disallow: /checkout/
  `;

  const sampleValidDistFiles = [
    'index.html',
    'favicon.svg',
    '_redirects',
    '_headers',
    'robots.txt',
    'assets/vendor-m2iur3QI.js',
    'assets/index-DzQKi8f9.js',
    'assets/index-CnK3tUWa.css',
  ];

  describe('Suite 1: Production Environment Requirements & Validation', () => {
    it('codifies exact SRS Source §43 & security requirements in PRODUCTION_ENV_REQUIREMENTS', () => {
      expect(PRODUCTION_ENV_REQUIREMENTS.VITE_APP_ENV).toBe('production');
      expect(PRODUCTION_ENV_REQUIREMENTS.VITE_USE_MOCK_DATA).toBe('false');
      expect(PRODUCTION_ENV_REQUIREMENTS.VITE_API_BASE_URL).toBe(
        'https://api.vegetablejoint.ng/api/v1'
      );
      expect(PRODUCTION_ENV_REQUIREMENTS.VITE_SANCTUM_CSRF_URL).toBe(
        'https://api.vegetablejoint.ng/sanctum/csrf-cookie'
      );
      expect(PRODUCTION_ENV_REQUIREMENTS.VITE_AUTH_TOKEN_STRATEGY).toBe(
        'cookie'
      );
      expect(PRODUCTION_ENV_REQUIREMENTS.VITE_API_WITH_CREDENTIALS).toBe(
        'true'
      );
      expect(PRODUCTION_ENV_REQUIREMENTS.VITE_APP_ORIGIN).toBe(
        'https://vegetablejoint.ng'
      );

      // Verify static CDN and security constants
      expect(REQUIRED_STATIC_CDN_FILES).toContain('_redirects');
      expect(REQUIRED_STATIC_CDN_FILES).toContain('_headers');
      expect(REQUIRED_STATIC_CDN_FILES).toContain('robots.txt');
      expect(REQUIRED_SECURITY_HEADERS).toContain('Content-Security-Policy');
      expect(REQUIRED_SECURITY_HEADERS).toContain('Strict-Transport-Security');
      expect(DISALLOWED_ROBOTS_PATHS).toContain('/admin/');
      expect(DISALLOWED_ROBOTS_PATHS).toContain('/seller/');
    });

    it('passes when all environment variables match production requirements', () => {
      const result = validateProductionConfig(sampleValidEnv);
      expect(result.isValid).toBe(true);
      expect(result.missingKeys).toHaveLength(0);
      expect(result.invalidValues).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('flags an error when VITE_USE_MOCK_DATA is "true" in production', () => {
      const result = validateProductionConfig({
        ...sampleValidEnv,
        VITE_USE_MOCK_DATA: 'true',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatch(/VITE_USE_MOCK_DATA/i);
    });

    it('flags an error when VITE_API_BASE_URL points to localhost instead of production', () => {
      const result = validateProductionConfig({
        ...sampleValidEnv,
        VITE_API_BASE_URL: 'http://localhost:8000/api/v1',
      });
      expect(result.isValid).toBe(false);
      expect(result.invalidValues).toContainEqual(
        expect.objectContaining({
          key: 'VITE_API_BASE_URL',
          expected: 'https://api.vegetablejoint.ng/api/v1',
          actual: 'http://localhost:8000/api/v1',
        })
      );
    });

    it('flags missing environment variables when keys are omitted', () => {
      const result = validateProductionConfig({});
      expect(result.isValid).toBe(false);
      expect(result.missingKeys.length).toBe(
        Object.keys(PRODUCTION_ENV_REQUIREMENTS).length
      );
    });
  });

  describe('Suite 2: Static Hosting Redirects & SPA Rewrite Rules', () => {
    it('parses _redirects rules correctly and ignores comments and whitespace', () => {
      const rules = parseRedirectRules(sampleValidRedirects);
      expect(rules).toHaveLength(1);
      expect(rules[0]).toEqual({
        from: '/*',
        to: '/index.html',
        status: 200,
      });
    });

    it('detects SPA catch-all rewrite rule (/* -> /index.html 200)', () => {
      const rules = parseRedirectRules(sampleValidRedirects);
      expect(hasSpaCatchAllRedirect(rules)).toBe(true);
    });

    it('rejects redirects that do not perform a 200 rewrite for SPA routing', () => {
      const redirectRules = [
        { from: '/*', to: '/index.html', status: 301 },
        { from: '/home', to: '/index.html', status: 200 },
      ];
      expect(hasSpaCatchAllRedirect(redirectRules)).toBe(false);
    });

    it('handles empty or invalid redirects gracefully', () => {
      expect(parseRedirectRules(null)).toEqual([]);
      expect(hasSpaCatchAllRedirect([])).toBe(false);
    });
  });

  describe('Suite 3: Static Hosting Headers & Security Directives', () => {
    it('parses path blocks and header keys from _headers content', () => {
      const headerMap = parseHeaderRules(sampleValidHeaders);
      expect(headerMap['/*']).toBeDefined();
      expect(headerMap['/*']['X-Frame-Options']).toBe('SAMEORIGIN');
      expect(headerMap['/*']['X-Content-Type-Options']).toBe('nosniff');
      expect(headerMap['/assets/*']['Cache-Control']).toContain('immutable');
      expect(headerMap['/index.html']['Cache-Control']).toContain('no-cache');
    });

    it('validates compliant static CDN configuration with all required security and cache headers', () => {
      const result = validateStaticCdnRules({
        redirectsContent: sampleValidRedirects,
        headersContent: sampleValidHeaders,
        robotsContent: sampleValidRobots,
      });

      expect(result.compliant).toBe(true);
      expect(result.checks.spaRewrite).toBe(true);
      expect(result.checks.securityHeaders).toBe(true);
      expect(result.checks.immutableAssetCache).toBe(true);
      expect(result.checks.indexNoCache).toBe(true);
      expect(result.checks.robotsProtected).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('flags missing security headers when any required header is omitted', () => {
      const insecureHeaders = `
/*
  X-Frame-Options: SAMEORIGIN
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/index.html
  Cache-Control: no-cache
      `;

      const result = validateStaticCdnRules({
        redirectsContent: sampleValidRedirects,
        headersContent: insecureHeaders,
        robotsContent: sampleValidRobots,
      });

      expect(result.compliant).toBe(false);
      expect(result.checks.securityHeaders).toBe(false);
      expect(
        result.errors.some((e) => e.includes('Content-Security-Policy'))
      ).toBe(true);
    });

    it('flags missing robots.txt protection when private portals are not disallowed', () => {
      const unprotectedRobots = `
User-agent: *
Allow: /
      `;

      const result = validateStaticCdnRules({
        redirectsContent: sampleValidRedirects,
        headersContent: sampleValidHeaders,
        robotsContent: unprotectedRobots,
      });

      expect(result.compliant).toBe(false);
      expect(result.checks.robotsProtected).toBe(false);
      expect(result.errors.some((e) => e.includes('robots.txt'))).toBe(true);
    });
  });

  describe('Suite 4: Production Bundle Structure & Verification', () => {
    it('validates a complete production bundle structure', () => {
      const result = validateBundleStructure(sampleValidDistFiles);
      expect(result.isValid).toBe(true);
      expect(result.hasIndexHtml).toBe(true);
      expect(result.hasVendorChunk).toBe(true);
      expect(result.jsBundleCount).toBeGreaterThanOrEqual(2);
      expect(result.cssBundleCount).toBeGreaterThanOrEqual(1);
      expect(result.errors).toHaveLength(0);
    });

    it('fails validation when dist/index.html is missing', () => {
      const result = validateBundleStructure(['assets/index.js']);
      expect(result.isValid).toBe(false);
      expect(result.hasIndexHtml).toBe(false);
      expect(result.errors).toContain('Missing dist/index.html entrypoint');
    });

    it('fails validation when vendor chunk is missing', () => {
      const result = validateBundleStructure([
        'index.html',
        'assets/index-DzQKi8f9.js',
        'assets/style-CnK3tUWa.css',
      ]);
      expect(result.isValid).toBe(false);
      expect(result.hasVendorChunk).toBe(false);
      expect(result.errors.some((e) => e.includes('vendor'))).toBe(true);
    });
  });

  describe('Suite 5: Comprehensive Deployment Readiness Audit (Source §43)', () => {
    it('returns ready: true when all environment, CDN, and bundle criteria are met', () => {
      const audit = auditDeploymentReadiness({
        env: sampleValidEnv,
        redirectsContent: sampleValidRedirects,
        headersContent: sampleValidHeaders,
        robotsContent: sampleValidRobots,
        distFiles: sampleValidDistFiles,
      });

      expect(audit.ready).toBe(true);
      expect(audit.status).toBe('ready');
      expect(audit.checks.environment).toBe(true);
      expect(audit.checks.cdnRules).toBe(true);
      expect(audit.checks.bundleStructure).toBe(true);
      expect(audit.errors).toHaveLength(0);
    });

    it('returns ready: false with consolidated error messages when any check fails', () => {
      const audit = auditDeploymentReadiness({
        env: { ...sampleValidEnv, VITE_USE_MOCK_DATA: 'true' },
        redirectsContent: '',
        headersContent: '',
        robotsContent: '',
        distFiles: [],
      });

      expect(audit.ready).toBe(false);
      expect(audit.status).toBe('not_ready');
      expect(audit.checks.environment).toBe(false);
      expect(audit.checks.cdnRules).toBe(false);
      expect(audit.checks.bundleStructure).toBe(false);
      expect(audit.errors.length).toBeGreaterThan(0);
    });
  });
});
