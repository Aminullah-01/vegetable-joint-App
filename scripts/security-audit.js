#!/usr/bin/env node
/**
 * scripts/security-audit.js
 *
 * Automated front-end security audit script (FE-122).
 * Verifies:
 * 1. No secrets in production build bundle (NFR-SEC-09)
 * 2. Dependency audit clean in production (NFR-SEC-13)
 * 3. XSS-safe rendering and zero dangerous DOM sinks (NFR-SEC-06)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { scanForSecrets } from '../src/utils/securityAudit.js';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ASSETS_DIR = path.resolve(DIST_DIR, 'assets');

console.log(
  '🔒 Starting Vegetable Joint Front-End Security Review (FE-122)...\n'
);

let hasErrors = false;

// 1. Bundle Secret Scan (NFR-SEC-09)
console.log('1️⃣ Scanning production bundle for secrets (NFR-SEC-09)...');
if (!fs.existsSync(ASSETS_DIR)) {
  console.log('⚠️ dist/assets not found. Running vite build first...');
  execSync('npm run build', { stdio: 'inherit' });
}

const jsFiles = fs.readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js'));
let totalFilesScanned = 0;
let secretFindings = [];

for (const file of jsFiles) {
  const filePath = path.join(ASSETS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  totalFilesScanned += 1;
  const scan = scanForSecrets(content);
  if (scan.hasSecrets) {
    secretFindings.push({ file, findings: scan.findings });
  }
}

if (secretFindings.length === 0) {
  console.log(
    `✅ Passed: Scanned ${totalFilesScanned} JS bundle files. Zero secrets found.\n`
  );
} else {
  console.error(`❌ Failed: Secrets detected in bundle files:`);
  console.error(JSON.stringify(secretFindings, null, 2));
  hasErrors = true;
}

// 2. Production Dependency Audit (NFR-SEC-13)
console.log('2️⃣ Auditing production dependencies (NFR-SEC-13)...');
try {
  const auditOutput = execSync('npm audit --omit=dev --json', {
    encoding: 'utf-8',
  });
  const auditData = JSON.parse(auditOutput);
  const vulnCount = auditData.metadata?.vulnerabilities?.total ?? 0;

  if (vulnCount === 0) {
    console.log(
      `✅ Passed: npm audit --omit=dev reported 0 vulnerabilities.\n`
    );
  } else {
    console.error(
      `❌ Failed: Production dependencies have ${vulnCount} vulnerabilities.`
    );
    hasErrors = true;
  }
} catch (err) {
  // npm audit exits with non-zero when vulnerabilities are found
  if (err.stdout) {
    try {
      const auditData = JSON.parse(err.stdout);
      const total = auditData.metadata?.vulnerabilities?.total ?? 0;
      if (total > 0) {
        console.error(
          `❌ Failed: Production dependencies have ${total} vulnerabilities.`
        );
        hasErrors = true;
      } else {
        console.log(
          `✅ Passed: npm audit reported 0 production vulnerabilities.\n`
        );
      }
    } catch {
      console.error('❌ Failed to parse npm audit output:', err.message);
      hasErrors = true;
    }
  } else {
    console.error('❌ Error executing npm audit:', err.message);
    hasErrors = true;
  }
}

// 3. XSS Sinks & Dangerous APIs Scan (NFR-SEC-06)
console.log('3️⃣ Auditing codebase for dangerous DOM sinks (NFR-SEC-06)...');
const SRC_DIR = path.resolve(process.cwd(), 'src');

function scanDirForSinks(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const dangerousFindings = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') {
        dangerousFindings.push(...scanDirForSinks(fullPath));
      }
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      const code = fs.readFileSync(fullPath, 'utf-8');
      if (code.includes('dangerouslySetInnerHTML')) {
        dangerousFindings.push({
          file: fullPath,
          issue: 'dangerouslySetInnerHTML',
        });
      }
      if (/document\.write\(/i.test(code)) {
        dangerousFindings.push({ file: fullPath, issue: 'document.write' });
      }
      if (/\beval\(/i.test(code)) {
        dangerousFindings.push({ file: fullPath, issue: 'eval()' });
      }
    }
  }
  return dangerousFindings;
}

const sinks = scanDirForSinks(SRC_DIR);
if (sinks.length === 0) {
  console.log(
    `✅ Passed: Zero dangerous DOM sinks (dangerouslySetInnerHTML, eval, document.write) in production source.\n`
  );
} else {
  console.error(`❌ Failed: Dangerous DOM sinks detected:`);
  console.error(JSON.stringify(sinks, null, 2));
  hasErrors = true;
}

if (hasErrors) {
  console.error('❌ Front-End Security Review FAILED.');
  process.exit(1);
} else {
  console.log(
    '🎉 Front-End Security Review PASSED: All NFR-SEC requirements verified!'
  );
  process.exit(0);
}
