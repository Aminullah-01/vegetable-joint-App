#!/usr/bin/env node
/**
 * scripts/verify-deployment.js
 *
 * Automated Production Build and Static/CDN Deployment Verification Script (FE-124).
 * Conforms to:
 * - SRS Source §43: Separate frontend and backend deployments.
 * - SRS NFR-SEC-03: HttpOnly cookie token strategy in production.
 * - SRS NFR-SEC-06: CSRF token endpoint configuration.
 * - SRS NFR-SEC-10: Configured front-end origin whitelist.
 * - SRS NFR-SEC-09: No secrets or debug switches in production bundle.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  validateProductionConfig,
  validateStaticCdnRules,
  validateBundleStructure,
  auditDeploymentReadiness,
} from '../src/utils/deploymentAudit.js';
import { scanForSecrets } from '../src/utils/securityAudit.js';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const ASSETS_DIR = path.resolve(DIST_DIR, 'assets');
const ENV_PROD_PATH = path.resolve(ROOT_DIR, '.env.production');

console.log(
  '🚀 Starting Vegetable Joint Production Deployment Verification (FE-124 / Source §43)...\n'
);

let hasErrors = false;

// Helper: Parse .env file
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

// 1. Verify Production Environment Settings
console.log(
  '1️⃣ Validating production environment settings (.env.production)...'
);
const prodEnv = parseEnvFile(ENV_PROD_PATH);
const envAudit = validateProductionConfig(prodEnv);

if (envAudit.isValid) {
  console.log('   ✅ Production environment configuration is compliant:');
  console.log(`      • VITE_APP_ENV: "${prodEnv.VITE_APP_ENV}"`);
  console.log(`      • VITE_USE_MOCK_DATA: "${prodEnv.VITE_USE_MOCK_DATA}"`);
  console.log(`      • VITE_API_BASE_URL: "${prodEnv.VITE_API_BASE_URL}"`);
  console.log(
    `      • VITE_SANCTUM_CSRF_URL: "${prodEnv.VITE_SANCTUM_CSRF_URL}"`
  );
  console.log(`      • VITE_APP_ORIGIN: "${prodEnv.VITE_APP_ORIGIN}"\n`);
} else {
  console.error('   ❌ Production environment configuration failed:');
  envAudit.errors.forEach((e) => console.error(`      • ${e}`));
  hasErrors = true;
}

// 2. Ensure dist/ exists or run production build
console.log('2️⃣ Verifying production build artifacts in dist/...');
if (!fs.existsSync(DIST_DIR) || !fs.existsSync(ASSETS_DIR)) {
  console.log('   ⚠️ dist/ not found. Running npm run build:prod...');
  execSync('npm run build:prod', { stdio: 'inherit' });
}

// Read dist file tree
function getFilesRecursively(dir, base = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const relPath = base ? `${base}/${file}` : file;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, relPath));
    } else {
      results.push(relPath);
    }
  }
  return results;
}

const distFiles = getFilesRecursively(DIST_DIR);
const bundleAudit = validateBundleStructure(distFiles);

if (bundleAudit.isValid) {
  console.log('   ✅ Production bundle structure is valid:');
  console.log(`      • dist/index.html entrypoint verified.`);
  console.log(
    `      • ${bundleAudit.jsBundleCount} JavaScript bundles generated.`
  );
  console.log(
    `      • ${bundleAudit.cssBundleCount} CSS stylesheets generated.`
  );
  console.log(`      • Vendor manual chunk generated successfully.\n`);
} else {
  console.error('   ❌ Bundle structure validation failed:');
  bundleAudit.errors.forEach((e) => console.error(`      • ${e}`));
  hasErrors = true;
}

// 3. Verify Static/CDN Hosting Rules (_redirects, _headers, robots.txt)
console.log(
  '3️⃣ Verifying static/CDN hosting rules (_redirects, _headers, robots.txt)...'
);
const redirectsPath = path.join(DIST_DIR, '_redirects');
const headersPath = path.join(DIST_DIR, '_headers');
const robotsPath = path.join(DIST_DIR, 'robots.txt');

const redirectsContent = fs.existsSync(redirectsPath)
  ? fs.readFileSync(redirectsPath, 'utf-8')
  : '';
const headersContent = fs.existsSync(headersPath)
  ? fs.readFileSync(headersPath, 'utf-8')
  : '';
const robotsContent = fs.existsSync(robotsPath)
  ? fs.readFileSync(robotsPath, 'utf-8')
  : '';

const cdnAudit = validateStaticCdnRules({
  redirectsContent,
  headersContent,
  robotsContent,
});

if (cdnAudit.compliant) {
  console.log('   ✅ Static/CDN hosting configuration is compliant:');
  console.log(
    '      • SPA catch-all rewrite rule present (/* -> /index.html 200).'
  );
  console.log(
    '      • Security headers enforced (CSP, HSTS, X-Frame-Options, etc.).'
  );
  console.log(
    '      • Content-hashed assets configured for immutable 1-year caching.'
  );
  console.log(
    '      • HTML entrypoint configured for no-cache immediate revalidation.'
  );
  console.log(
    '      • Robots.txt blocks crawlers from admin, seller, account, and checkout.\n'
  );
} else {
  console.error('   ❌ Static/CDN hosting validation failed:');
  cdnAudit.errors.forEach((e) => console.error(`      • ${e}`));
  hasErrors = true;
}

// 4. Scan Bundle for Secrets or Mock Leaks (NFR-SEC-09)
console.log(
  '4️⃣ Scanning production bundles for secrets and leaks (NFR-SEC-09)...'
);
const jsFiles = distFiles.filter(
  (f) => f.startsWith('assets/') && f.endsWith('.js')
);
let secretLeaks = [];

for (const file of jsFiles) {
  const filePath = path.join(DIST_DIR, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const scan = scanForSecrets(content);
  if (scan.hasSecrets) {
    secretLeaks.push({ file, findings: scan.findings });
  }
}

if (secretLeaks.length === 0) {
  console.log(
    `   ✅ Passed: ${jsFiles.length} JS bundle files scanned. Zero secrets detected.\n`
  );
} else {
  console.error('   ❌ Secrets detected in production bundle files:');
  console.error(JSON.stringify(secretLeaks, null, 2));
  hasErrors = true;
}

// 5. Overall Deployment Readiness
const readinessAudit = auditDeploymentReadiness({
  env: prodEnv,
  redirectsContent,
  headersContent,
  robotsContent,
  distFiles,
});

if (!hasErrors && readinessAudit.ready) {
  console.log('🎉 DEPLOYMENT READINESS AUDIT PASSED!');
  console.log(
    '   Vegetable Joint frontend is ready for static/CDN production deployment.'
  );
  process.exit(0);
} else {
  console.error('💥 DEPLOYMENT READINESS AUDIT FAILED.');
  console.error(
    `   Found ${readinessAudit.errors.length} issue(s) preventing deployment.`
  );
  process.exit(1);
}
