import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateProductionConfig,
  parseRedirectRules,
  hasSpaCatchAllRedirect,
  parseHeaderRules,
  auditDeploymentReadiness,
} from '../../../utils/deploymentAudit';

describe('FE-124: Production Build and Static/CDN Deployment (Source §43, NFR-SEC-03, NFR-SEC-10)', () => {
  const rootDir = process.cwd();
  const envProdPath = path.resolve(rootDir, '.env.production');
  const envStagingPath = path.resolve(rootDir, '.env.staging');
  const redirectsPath = path.resolve(rootDir, 'public/_redirects');
  const headersPath = path.resolve(rootDir, 'public/_headers');
  const robotsPath = path.resolve(rootDir, 'public/robots.txt');
  const nginxPath = path.resolve(rootDir, 'nginx.conf');
  const dockerfilePath = path.resolve(rootDir, 'Dockerfile');
  const vercelPath = path.resolve(rootDir, 'vercel.json');
  const ciWorkflowPath = path.resolve(rootDir, '.github/workflows/ci.yml');
  const distDir = path.resolve(rootDir, 'dist');

  // Helper to parse .env file
  function parseEnv(filePath) {
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

  describe('Suite 1: Production Environment Configuration (.env.production)', () => {
    it('verifies .env.production exists and passes all validation requirements', () => {
      expect(fs.existsSync(envProdPath)).toBe(true);
      const prodEnv = parseEnv(envProdPath);
      const audit = validateProductionConfig(prodEnv);

      expect(audit.isValid).toBe(true);
      expect(audit.errors).toHaveLength(0);
    });

    it('verifies production mock data switch is strictly disabled (VITE_USE_MOCK_DATA="false")', () => {
      const prodEnv = parseEnv(envProdPath);
      expect(prodEnv.VITE_USE_MOCK_DATA).toBe('false');
      expect(prodEnv.VITE_APP_ENV).toBe('production');
    });

    it('verifies production API endpoint and Sanctum CSRF cookie URLs (NFR-SEC-03, NFR-SEC-06)', () => {
      const prodEnv = parseEnv(envProdPath);
      expect(prodEnv.VITE_API_BASE_URL).toBe(
        'https://api.vegetablejoint.ng/api/v1'
      );
      expect(prodEnv.VITE_SANCTUM_CSRF_URL).toBe(
        'https://api.vegetablejoint.ng/sanctum/csrf-cookie'
      );
      expect(prodEnv.VITE_AUTH_TOKEN_STRATEGY).toBe('cookie');
      expect(prodEnv.VITE_API_WITH_CREDENTIALS).toBe('true');
    });

    it('verifies production front-end origins and CORS whitelist (NFR-SEC-10, Section 4.5)', () => {
      const prodEnv = parseEnv(envProdPath);
      expect(prodEnv.VITE_APP_ORIGIN).toBe('https://vegetablejoint.ng');
      expect(prodEnv.VITE_ALLOWED_ORIGINS).toBe(
        'https://vegetablejoint.ng,https://www.vegetablejoint.ng'
      );
    });

    it('verifies .env.staging is configured for pre-production staging environment', () => {
      expect(fs.existsSync(envStagingPath)).toBe(true);
      const stagingEnv = parseEnv(envStagingPath);
      expect(stagingEnv.VITE_APP_ENV).toBe('staging');
      expect(stagingEnv.VITE_USE_MOCK_DATA).toBe('false');
      expect(stagingEnv.VITE_API_BASE_URL).toBe(
        'https://staging-api.vegetablejoint.ng/api/v1'
      );
    });
  });

  describe('Suite 2: Static/CDN SPA Routing & Catch-All Rewrite Rules (Source §43)', () => {
    it('verifies public/_redirects contains standard SPA catch-all rewrite rule', () => {
      expect(fs.existsSync(redirectsPath)).toBe(true);
      const content = fs.readFileSync(redirectsPath, 'utf-8');
      const rules = parseRedirectRules(content);

      expect(hasSpaCatchAllRedirect(rules)).toBe(true);
      expect(content).toMatch(/\/\*\s+\/index\.html\s+200/);
    });

    it('verifies vercel.json contains single page application rewrites to /index.html', () => {
      expect(fs.existsSync(vercelPath)).toBe(true);
      const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));

      expect(vercelConfig.outputDirectory).toBe('dist');
      expect(vercelConfig.rewrites).toBeDefined();
      expect(vercelConfig.rewrites).toContainEqual({
        source: '/(.*)',
        destination: '/index.html',
      });
    });

    it('verifies nginx.conf contains try_files SPA fallback for containerized static hosting', () => {
      expect(fs.existsSync(nginxPath)).toBe(true);
      const nginxConf = fs.readFileSync(nginxPath, 'utf-8');

      expect(nginxConf).toMatch(/try_files\s+\$uri\s+\$uri\/\s+\/index\.html;/);
      expect(nginxConf).toMatch(
        /server_name\s+vegetablejoint\.ng\s+www\.vegetablejoint\.ng;/
      );
    });
  });

  describe('Suite 3: Production Security Headers & CDN Caching Directives (NFR-SEC-06, Source §43)', () => {
    it('verifies public/_headers specifies all required security headers', () => {
      expect(fs.existsSync(headersPath)).toBe(true);
      const headersContent = fs.readFileSync(headersPath, 'utf-8');
      const headerMap = parseHeaderRules(headersContent);
      const globalHeaders = headerMap['/*'];

      expect(globalHeaders).toBeDefined();
      expect(globalHeaders['X-Frame-Options']).toBe('SAMEORIGIN');
      expect(globalHeaders['X-Content-Type-Options']).toBe('nosniff');
      expect(globalHeaders['Strict-Transport-Security']).toContain(
        'max-age=31536000'
      );
      expect(globalHeaders['Referrer-Policy']).toBe(
        'strict-origin-when-cross-origin'
      );
      expect(globalHeaders['Content-Security-Policy']).toMatch(
        /default-src 'self'/
      );
      expect(globalHeaders['Content-Security-Policy']).toContain(
        'https://api.vegetablejoint.ng'
      );
    });

    it('verifies public/_headers sets 1-year immutable caching for build assets and no-cache for index.html', () => {
      const headersContent = fs.readFileSync(headersPath, 'utf-8');
      const headerMap = parseHeaderRules(headersContent);

      expect(headerMap['/assets/*']['Cache-Control']).toContain(
        'max-age=31536000'
      );
      expect(headerMap['/assets/*']['Cache-Control']).toContain('immutable');
      expect(headerMap['/index.html']['Cache-Control']).toContain('no-cache');
      expect(headerMap['/index.html']['Cache-Control']).toContain(
        'must-revalidate'
      );
    });

    it('verifies public/robots.txt disallows sensitive portals and crawlers', () => {
      expect(fs.existsSync(robotsPath)).toBe(true);
      const robotsContent = fs.readFileSync(robotsPath, 'utf-8');

      expect(robotsContent).toContain('Disallow: /admin/');
      expect(robotsContent).toContain('Disallow: /seller/');
      expect(robotsContent).toContain('Disallow: /account/');
      expect(robotsContent).toContain('Disallow: /checkout/');
    });
  });

  describe('Suite 4: Containerized Static Hosting (Dockerfile & Nginx)', () => {
    it('verifies multi-stage Dockerfile builds with production environment settings and serves via Nginx', () => {
      expect(fs.existsSync(dockerfilePath)).toBe(true);
      const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');

      expect(dockerfile).toContain('FROM node:20-alpine AS builder');
      expect(dockerfile).toContain('ENV VITE_APP_ENV=production');
      expect(dockerfile).toContain('ENV VITE_USE_MOCK_DATA=false');
      expect(dockerfile).toContain(
        'ENV VITE_API_BASE_URL=https://api.vegetablejoint.ng/api/v1'
      );
      expect(dockerfile).toContain('npm run build:prod');
      expect(dockerfile).toContain('FROM nginx:alpine');
      expect(dockerfile).toContain(
        'COPY --from=builder /app/dist /usr/share/nginx/html'
      );
    });
  });

  describe('Suite 5: CI/CD Pipeline Deployment Integration (.github/workflows/ci.yml)', () => {
    it('verifies CI/CD workflow contains production build and static/CDN deployment job', () => {
      expect(fs.existsSync(ciWorkflowPath)).toBe(true);
      const workflowContent = fs.readFileSync(ciWorkflowPath, 'utf-8');

      // QA jobs
      expect(workflowContent).toMatch(/jobs:\s+ci:/);
      expect(workflowContent).toContain('npm run format:check');
      expect(workflowContent).toContain('npm run lint');
      expect(workflowContent).toContain('npm run verify:schema');
      expect(workflowContent).toContain('npm test');
      expect(workflowContent).toContain('npm run test:coverage');
      expect(workflowContent).toContain('npm run audit:security');

      // Deploy job
      expect(workflowContent).toMatch(/deploy:/);
      expect(workflowContent).toContain('needs: [ci]');
      expect(workflowContent).toMatch(/VITE_APP_ENV:\s*['"]production['"]/);
      expect(workflowContent).toMatch(/VITE_USE_MOCK_DATA:\s*['"]false['"]/);
      expect(workflowContent).toMatch(
        /VITE_API_BASE_URL:\s*['"]https:\/\/api\.vegetablejoint\.ng\/api\/v1['"]/
      );
      expect(workflowContent).toContain('npm run build:prod');
      expect(workflowContent).toContain('npm run verify:deployment');
      expect(workflowContent).toContain('actions/upload-pages-artifact@v3');
      expect(workflowContent).toContain('actions/deploy-pages@v4');
    });
  });

  describe('Suite 6: Production Build Artifacts Audit (dist/)', () => {
    it('verifies dist/ contains valid production artifacts when built', () => {
      if (fs.existsSync(distDir)) {
        const files = fs.readdirSync(distDir);
        expect(files).toContain('index.html');
        expect(files).toContain('assets');
        expect(files).toContain('_redirects');
        expect(files).toContain('_headers');
        expect(files).toContain('robots.txt');

        const indexHtml = fs.readFileSync(
          path.join(distDir, 'index.html'),
          'utf-8'
        );
        expect(indexHtml).toContain('<div id="root"></div>');
        expect(indexHtml).toMatch(
          /<script\s+type="module"\s+crossorigin\s+src="\/assets\/index-[^"]+\.js"><\/script>/
        );
      }
    });

    it('confirms overall deployment readiness status is ready', () => {
      const prodEnv = parseEnv(envProdPath);
      const redirectsContent = fs.readFileSync(redirectsPath, 'utf-8');
      const headersContent = fs.readFileSync(headersPath, 'utf-8');
      const robotsContent = fs.readFileSync(robotsPath, 'utf-8');

      const audit = auditDeploymentReadiness({
        env: prodEnv,
        redirectsContent,
        headersContent,
        robotsContent,
        distFiles: [
          'index.html',
          'assets/vendor-m2iur3QI.js',
          'assets/index-DzQKi8f9.js',
          'assets/index-CnK3tUWa.css',
        ],
      });

      expect(audit.ready).toBe(true);
      expect(audit.status).toBe('ready');
      expect(audit.errors).toHaveLength(0);
    });
  });
});
