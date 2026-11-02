/**
 * Front-End Security Review & OWASP Compliance Utilities
 *
 * Conforms to:
 * - SRS NFR-SEC-06: The system shall be protected against OWASP Top 10 risks
 *   including XSS (output encoding, Content-Security-Policy), CSRF, and broken access control.
 * - SRS NFR-SEC-09: Secrets (database credentials, API keys, application keys) shall never
 *   be committed to Git or leaked into the client bundle.
 * - SRS NFR-SEC-03: Token storage in the browser shall minimise XSS exposure (HttpOnly cookie preferred).
 * - SRS NFR-SEC-11: Personal data exposure shall be minimised; public pages never show sensitive user data.
 * - SRS NFR-SEC-13: Dependencies shall be scanned (npm audit clean in production) before go-live.
 */

export const SECURITY_STANDARDS = {
  // Secret leak prevention patterns (NFR-SEC-09)
  SECRET_PATTERNS: [
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
    {
      name: 'Private Key',
      regex:
        /-----BEGIN (?:RSA|EC|DSA|OPENSSH|PGP|ENCRYPTED)?\s*PRIVATE KEY-----/g,
    },
    {
      name: 'Database Connection String',
      regex:
        /(?:postgres|mysql|mongodb|redis):\/\/[a-zA-Z0-9_.-]+:[^@\s]+@[a-zA-Z0-9_.-]+/g,
    },
    {
      name: 'Stripe Secret Key',
      regex: /sk_(?:live|test)_[0-9a-zA-Z]{24,34}/g,
    },
    { name: 'Paystack Secret Key', regex: /sk_(?:live|test)_[0-9a-fA-F]{40}/g },
    {
      name: 'GitHub Personal Access Token',
      regex: /gh[pous]_[0-9a-zA-Z]{36}/g,
    },
    {
      name: 'Generic Hardcoded Password Assignment',
      regex:
        /(?:db_password|api_secret|app_secret|client_secret)\s*[:=]\s*["'][^"']{6,}["']/gi,
    },
  ],

  // Dangerous URI schemes that can execute script via href or src (NFR-SEC-06)
  UNSAFE_PROTOCOLS: [/^javascript:/i, /^vbscript:/i, /^data:text\/html/i],

  // Allowed external link safety attributes (NFR-SEC-06)
  REQUIRED_EXTERNAL_REL: 'noopener noreferrer',
};

/**
 * Scans a string or bundle source for known secret patterns.
 *
 * @param {string} content - Text or JS code to scan
 * @returns {{ hasSecrets: boolean, findings: Array<{ name: string, count: number }> }}
 */
export function scanForSecrets(content) {
  if (typeof content !== 'string' || !content.trim()) {
    return { hasSecrets: false, findings: [] };
  }

  const findings = [];

  for (const pattern of SECURITY_STANDARDS.SECRET_PATTERNS) {
    // Reset regex state in case of global flag
    pattern.regex.lastIndex = 0;
    const matches = content.match(pattern.regex);
    if (matches && matches.length > 0) {
      findings.push({
        name: pattern.name,
        count: matches.length,
      });
    }
  }

  return {
    hasSecrets: findings.length > 0,
    findings,
  };
}

/**
 * Validates whether a URL or link destination is safe from XSS pseudo-protocols.
 * Blocks javascript:, vbscript:, and data:text/html.
 *
 * @param {string} url - URL string to validate
 * @returns {boolean} True if the URL is safe to use in href or src
 */
export function isSafeUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    return false;
  }

  const trimmed = url.trim();

  // Check for dangerous protocols
  for (const dangerous of SECURITY_STANDARDS.UNSAFE_PROTOCOLS) {
    if (dangerous.test(trimmed)) {
      return false;
    }
  }

  // Accept relative paths, hash links, root-relative, or safe protocols (http, https, mailto, tel)
  const isRelative =
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('#');
  const isSafeProtocol = /^(https?:|mailto:|tel:|blob:|data:image\/)/i.test(
    trimmed
  );

  return isRelative || isSafeProtocol;
}

/**
 * Safe text sanitization helper escaping HTML control characters.
 * React escapes by default, but this is used for safe string handling or manual interpolation.
 *
 * @param {string} text - Raw string
 * @returns {string} Sanitized string safe from direct HTML interpretation
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validates an anchor element or link props for secure external navigation (NFR-SEC-06).
 *
 * @param {{ href: string, target?: string, rel?: string }} linkProps
 * @returns {{ compliant: boolean, issue?: string }}
 */
export function validateLinkSecurity({ href, target, rel }) {
  if (!isSafeUrl(href)) {
    return {
      compliant: false,
      issue: 'URL uses an unsafe pseudo-protocol or invalid scheme',
    };
  }

  if (target === '_blank') {
    const relTokens = (rel || '').toLowerCase().split(/\s+/);
    const hasNoopener = relTokens.includes('noopener');
    const hasNoreferrer = relTokens.includes('noreferrer');

    if (!hasNoopener || !hasNoreferrer) {
      return {
        compliant: false,
        issue:
          'External target="_blank" must include rel="noopener noreferrer"',
      };
    }
  }

  return { compliant: true };
}

/**
 * Evaluates production dependency audit output against NFR-SEC-13.
 * Production dependencies must have 0 vulnerabilities.
 *
 * @param {{ vulnerabilities?: Record<string, any> | number, total?: number }} auditSummary
 * @returns {{ compliant: boolean, vulnerabilityCount: number, status: string }}
 */
export function auditProductionDependencies(auditSummary = {}) {
  let count = 0;

  if (typeof auditSummary.vulnerabilities === 'number') {
    count = auditSummary.vulnerabilities;
  } else if (typeof auditSummary.total === 'number') {
    count = auditSummary.total;
  } else if (
    auditSummary.vulnerabilities &&
    typeof auditSummary.vulnerabilities === 'object'
  ) {
    // npm audit JSON output format: count totals across severity levels
    const severities = ['info', 'low', 'moderate', 'high', 'critical'];
    severities.forEach((sev) => {
      const val = auditSummary.vulnerabilities[sev];
      if (typeof val === 'number') count += val;
    });
  }

  return {
    compliant: count === 0,
    vulnerabilityCount: count,
    status: count === 0 ? 'clean' : 'vulnerabilities-detected',
  };
}

/**
 * Runs an aggregated front-end security review audit.
 *
 * @param {{
 *   bundleContent?: string,
 *   sampleUrls?: string[],
 *   productionAuditSummary?: Object,
 *   tokenStrategy?: string
 * }} options
 * @returns {{
 *   passed: boolean,
 *   checks: {
 *     secrets: { compliant: boolean, findings: any[] },
 *     urlSafety: { compliant: boolean, unsafeCount: number },
 *     dependencies: { compliant: boolean, vulnerabilityCount: number },
 *     tokenStorage: { compliant: boolean, strategy: string }
 *   },
 *   timestamp: string
 * }}
 */
export function runFrontEndSecurityAudit({
  bundleContent = '',
  sampleUrls = [],
  productionAuditSummary = { total: 0 },
  tokenStrategy = 'cookie',
} = {}) {
  // 1. Secrets in bundle check (NFR-SEC-09)
  const secretsCheck = scanForSecrets(bundleContent);

  // 2. XSS URL safety check (NFR-SEC-06)
  let unsafeCount = 0;
  sampleUrls.forEach((u) => {
    if (!isSafeUrl(u)) unsafeCount += 1;
  });

  // 3. Dependency audit check (NFR-SEC-13)
  const depsCheck = auditProductionDependencies(productionAuditSummary);

  // 4. Token storage strategy check (NFR-SEC-03: HttpOnly cookie preferred)
  const tokenStorageCompliant =
    tokenStrategy === 'cookie' || tokenStrategy === 'bearer';

  const allPassed =
    !secretsCheck.hasSecrets &&
    unsafeCount === 0 &&
    depsCheck.compliant &&
    tokenStorageCompliant;

  return {
    passed: allPassed,
    checks: {
      secrets: {
        compliant: !secretsCheck.hasSecrets,
        findings: secretsCheck.findings,
      },
      urlSafety: {
        compliant: unsafeCount === 0,
        unsafeCount,
      },
      dependencies: depsCheck,
      tokenStorage: {
        compliant: tokenStorageCompliant,
        strategy: tokenStrategy,
      },
    },
    timestamp: new Date().toISOString(),
  };
}
