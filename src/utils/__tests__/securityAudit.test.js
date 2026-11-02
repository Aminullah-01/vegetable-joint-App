import { describe, it, expect } from 'vitest';
import {
  SECURITY_STANDARDS,
  scanForSecrets,
  isSafeUrl,
  sanitizeText,
  validateLinkSecurity,
  auditProductionDependencies,
  runFrontEndSecurityAudit,
} from '../securityAudit.js';

describe('Front-End Security Audit Utilities (FE-122: NFR-SEC-06, NFR-SEC-09, NFR-SEC-13)', () => {
  describe('SECURITY_STANDARDS Constants', () => {
    it('defines comprehensive secret patterns matching OWASP guidelines (NFR-SEC-09)', () => {
      expect(Array.isArray(SECURITY_STANDARDS.SECRET_PATTERNS)).toBe(true);
      expect(SECURITY_STANDARDS.SECRET_PATTERNS.length).toBeGreaterThanOrEqual(
        6
      );

      const patternNames = SECURITY_STANDARDS.SECRET_PATTERNS.map(
        (p) => p.name
      );
      expect(patternNames).toContain('AWS Access Key');
      expect(patternNames).toContain('Private Key');
      expect(patternNames).toContain('Database Connection String');
      expect(patternNames).toContain('Stripe Secret Key');
      expect(patternNames).toContain('Paystack Secret Key');
    });

    it('defines unsafe URI schemes for XSS mitigation (NFR-SEC-06)', () => {
      expect(SECURITY_STANDARDS.UNSAFE_PROTOCOLS).toHaveLength(3);
      expect(SECURITY_STANDARDS.REQUIRED_EXTERNAL_REL).toBe(
        'noopener noreferrer'
      );
    });
  });

  describe('scanForSecrets (NFR-SEC-09: No secrets in bundle)', () => {
    it('returns clean report for standard production client code', () => {
      const clientCode = `
        const apiUrl = "https://api.vegetablejoint.ng/api/v1";
        const appName = "Vegetable Joint";
        function renderHeader() { return "<h1>Vegetable Joint</h1>"; }
      `;

      const result = scanForSecrets(clientCode);
      expect(result.hasSecrets).toBe(false);
      expect(result.findings).toHaveLength(0);
    });

    it('detects AWS Access Keys in source text', () => {
      const mockAws = ['AKIA', '1234567890ABCDEF'].join('');
      const codeWithAws = `const awsKey = "${mockAws}";`;
      const result = scanForSecrets(codeWithAws);

      expect(result.hasSecrets).toBe(true);
      expect(result.findings).toContainEqual({
        name: 'AWS Access Key',
        count: 1,
      });
    });

    it('detects Private Key blocks', () => {
      const codeWithKey = `
        const privKey = "-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA0...\\n-----END RSA PRIVATE KEY-----";
      `;
      const result = scanForSecrets(codeWithKey);

      expect(result.hasSecrets).toBe(true);
      expect(result.findings.some((f) => f.name === 'Private Key')).toBe(true);
    });

    it('detects database connection strings with passwords', () => {
      const codeWithDb = `const uri = "postgres://admin:superSecretPass123@db.prod.internal:5432/vegetable_joint";`;
      const result = scanForSecrets(codeWithDb);

      expect(result.hasSecrets).toBe(true);
      expect(
        result.findings.some((f) => f.name === 'Database Connection String')
      ).toBe(true);
    });

    it('detects Stripe and Paystack secret keys', () => {
      const mockStripeKey = ['sk', 'live', '51Abcdefghijklmnopqrstuvwx'].join(
        '_'
      );
      const codeWithStripe = `const stripeKey = "${mockStripeKey}";`;
      const stripeResult = scanForSecrets(codeWithStripe);
      expect(stripeResult.hasSecrets).toBe(true);
      expect(
        stripeResult.findings.some((f) => f.name === 'Stripe Secret Key')
      ).toBe(true);

      const mockPaystackKey = [
        'sk',
        'live',
        '0123456789abcdef0123456789abcdef01234567',
      ].join('_');
      const codeWithPaystack = `const psKey = "${mockPaystackKey}";`;
      const paystackResult = scanForSecrets(codeWithPaystack);
      expect(paystackResult.hasSecrets).toBe(true);
      expect(
        paystackResult.findings.some((f) => f.name === 'Paystack Secret Key')
      ).toBe(true);
    });

    it('detects hardcoded database / API password assignments', () => {
      const codeWithPass = `const config = { db_password: "mySecretPassword99" };`;
      const result = scanForSecrets(codeWithPass);

      expect(result.hasSecrets).toBe(true);
      expect(
        result.findings.some(
          (f) => f.name === 'Generic Hardcoded Password Assignment'
        )
      ).toBe(true);
    });

    it('handles empty, null, and non-string inputs safely without throwing', () => {
      expect(scanForSecrets('').hasSecrets).toBe(false);
      expect(scanForSecrets(null).hasSecrets).toBe(false);
      expect(scanForSecrets(undefined).hasSecrets).toBe(false);
      expect(scanForSecrets(123).hasSecrets).toBe(false);
    });
  });

  describe('isSafeUrl (NFR-SEC-06: XSS-safe URL validation)', () => {
    it('approves legitimate web protocols and relative paths', () => {
      expect(isSafeUrl('https://example.com/images/tomato.jpg')).toBe(true);
      expect(isSafeUrl('http://localhost:8000/api/v1')).toBe(true);
      expect(isSafeUrl('/products/1')).toBe(true);
      expect(isSafeUrl('./assets/logo.svg')).toBe(true);
      expect(isSafeUrl('../categories')).toBe(true);
      expect(isSafeUrl('#main-content')).toBe(true);
      expect(isSafeUrl('mailto:support@vegetablejoint.ng')).toBe(true);
      expect(isSafeUrl('tel:+2348012345678')).toBe(true);
      expect(isSafeUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==')).toBe(
        true
      );
    });

    it('strictly blocks javascript: pseudo-protocol URIs', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(
        isSafeUrl('javascript:/*--></title></style>*/<script>alert(1)</script>')
      ).toBe(false);
      expect(isSafeUrl('  JAVASCRIPT:alert(document.cookie)  ')).toBe(false);
      expect(isSafeUrl('javascript:void(0)')).toBe(false);
    });

    it('strictly blocks vbscript: and data:text/html URIs', () => {
      expect(isSafeUrl('vbscript:msgbox("XSS")')).toBe(false);
      expect(
        isSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')
      ).toBe(false);
    });

    it('handles empty or non-string inputs safely', () => {
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl(null)).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('escapes HTML special characters properly', () => {
      const malicious = '<script>alert("XSS & theft")</script>';
      const sanitized = sanitizeText(malicious);

      expect(sanitized).toBe(
        '&lt;script&gt;alert(&quot;XSS &amp; theft&quot;)&lt;/script&gt;'
      );
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('escapes single quotes correctly', () => {
      expect(sanitizeText("O'Connor")).toBe('O&#x27;Connor');
    });

    it('returns empty string for non-string inputs', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
      expect(sanitizeText(12345)).toBe('');
    });
  });

  describe('validateLinkSecurity (NFR-SEC-06: Tabnabbing prevention)', () => {
    it('validates safe internal navigation', () => {
      const result = validateLinkSecurity({ href: '/products' });
      expect(result.compliant).toBe(true);
    });

    it('validates external target="_blank" links with noopener noreferrer', () => {
      const result = validateLinkSecurity({
        href: 'https://external-farm.example.com',
        target: '_blank',
        rel: 'noopener noreferrer',
      });
      expect(result.compliant).toBe(true);
    });

    it('flags external target="_blank" links missing rel attributes', () => {
      const result = validateLinkSecurity({
        href: 'https://malicious.example.com',
        target: '_blank',
      });
      expect(result.compliant).toBe(false);
      expect(result.issue).toContain('rel="noopener noreferrer"');
    });

    it('flags links containing javascript: URLs', () => {
      const result = validateLinkSecurity({
        href: 'javascript:alert(1)',
      });
      expect(result.compliant).toBe(false);
      expect(result.issue).toContain('unsafe pseudo-protocol');
    });
  });

  describe('auditProductionDependencies (NFR-SEC-13: Dependency audit)', () => {
    it('confirms clean status when 0 vulnerabilities exist', () => {
      const result = auditProductionDependencies({ total: 0 });
      expect(result.compliant).toBe(true);
      expect(result.vulnerabilityCount).toBe(0);
      expect(result.status).toBe('clean');
    });

    it('evaluates npm audit severity counts correctly', () => {
      const cleanSummary = {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 0,
          high: 0,
          critical: 0,
        },
      };
      const cleanAudit = auditProductionDependencies(cleanSummary);
      expect(cleanAudit.compliant).toBe(true);
      expect(cleanAudit.vulnerabilityCount).toBe(0);

      const vulnerableSummary = {
        vulnerabilities: {
          info: 0,
          low: 1,
          moderate: 2,
          high: 0,
          critical: 0,
        },
      };
      const vulnerableAudit = auditProductionDependencies(vulnerableSummary);
      expect(vulnerableAudit.compliant).toBe(false);
      expect(vulnerableAudit.vulnerabilityCount).toBe(3);
    });
  });

  describe('runFrontEndSecurityAudit (Integrated Security Report)', () => {
    it('generates fully compliant report when all checks pass', () => {
      const report = runFrontEndSecurityAudit({
        bundleContent: 'console.log("Safe production bundle");',
        sampleUrls: ['https://vegetablejoint.ng', '/products', '/cart'],
        productionAuditSummary: { total: 0 },
        tokenStrategy: 'cookie',
      });

      expect(report.passed).toBe(true);
      expect(report.checks.secrets.compliant).toBe(true);
      expect(report.checks.urlSafety.compliant).toBe(true);
      expect(report.checks.dependencies.compliant).toBe(true);
      expect(report.checks.tokenStorage.compliant).toBe(true);
      expect(report.timestamp).toBeDefined();
    });

    it('accurately identifies violations when security standards are breached', () => {
      const report = runFrontEndSecurityAudit({
        bundleContent: 'const db_password = "SuperSecretDbPassword!";',
        sampleUrls: ['https://vegetablejoint.ng', 'javascript:alert(1)'],
        productionAuditSummary: { total: 2 },
        tokenStrategy: 'cookie',
      });

      expect(report.passed).toBe(false);
      expect(report.checks.secrets.compliant).toBe(false);
      expect(report.checks.urlSafety.compliant).toBe(false);
      expect(report.checks.urlSafety.unsafeCount).toBe(1);
      expect(report.checks.dependencies.compliant).toBe(false);
    });
  });
});
