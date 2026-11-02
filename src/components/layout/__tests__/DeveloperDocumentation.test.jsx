import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('FE-125: README and Developer Documentation (NFR-MAIN-01)', () => {
  const rootDir = process.cwd();
  const readmePath = path.resolve(rootDir, 'README.md');
  const devGuidePath = path.resolve(rootDir, 'docs/DEVELOPER_GUIDE.md');

  describe('Suite 1: README File Existence and Completeness', () => {
    it('verifies README.md exists in the project root and has substantial content', () => {
      expect(fs.existsSync(readmePath)).toBe(true);
      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content.length).toBeGreaterThan(2000);
      expect(content).toContain('# Vegetable Joint — Front-End Application');
    });

    it('verifies setup and quick start instructions are documented', () => {
      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toMatch(/##\s+3\.\s+Quick Start & Setup/i);
      expect(content).toContain('npm ci');
      expect(content).toContain('npm run dev');
      expect(content).toContain('http://localhost:3000');
    });

    it('verifies all environment variables are documented with defaults and descriptions', () => {
      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toMatch(/##\s+4\.\s+Environment Configuration/i);
      expect(content).toContain('VITE_APP_NAME');
      expect(content).toContain('VITE_APP_ENV');
      expect(content).toContain('VITE_APP_ORIGIN');
      expect(content).toContain('VITE_ALLOWED_ORIGINS');
      expect(content).toContain('VITE_API_BASE_URL');
      expect(content).toContain('VITE_SANCTUM_CSRF_URL');
      expect(content).toContain('VITE_AUTH_TOKEN_STRATEGY');
      expect(content).toContain('VITE_API_WITH_CREDENTIALS');
      expect(content).toContain('VITE_USE_MOCK_DATA');
    });

    it('verifies folder structure strictly follows Source §26–§27 and NFR-MAIN-01', () => {
      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toMatch(/##\s+5\.\s+Folder Structure/i);
      expect(content).toContain('assets/');
      expect(content).toContain('components/');
      expect(content).toContain('pages/');
      expect(content).toContain('services/');
      expect(content).toContain('data/');
      expect(content).toContain('hooks/');
      expect(content).toContain('context/');
      expect(content).toContain('routes/');
      expect(content).toContain('utils/');
      expect(content).toContain('constants/');
    });

    it('verifies mock data vs. live Laravel API switch is documented (NFR-MAIN-02, CON-02)', () => {
      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toMatch(
        /##\s+6\.\s+Mock Data vs\. Live Laravel API Switch/i
      );
      expect(content).toContain('VITE_USE_MOCK_DATA');
      expect(content).toContain('mockSwitch');
      expect(content).toContain('mockStore');
      expect(content).toContain('apiClient');
      expect(content).toContain('npm run verify:schema');
    });

    it('verifies demo accounts for all roles (Admin, Seller, Buyer) are clearly documented', () => {
      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toMatch(/##\s+7\.\s+Demo Accounts for Development/i);
      expect(content).toContain('admin@example.com');
      expect(content).toContain('seller@arewafarms.ng');
      expect(content).toContain('buyer@example.com');
      expect(content).toContain('password123');
    });

    it('verifies coding standards, linting, and formatting rules are documented (NFR-MAIN-03)', () => {
      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toMatch(/##\s+9\.\s+Coding Standards & Workflow/i);
      expect(content).toContain('npm run lint');
      expect(content).toContain('--max-warnings=0');
      expect(content).toContain('Prettier');
      expect(content).toContain('Husky');
      expect(content).toContain('Conventional Commits');
    });

    it('verifies testing, code coverage (≥ 70%), and quality release audits are documented (NFR-MAIN-04)', () => {
      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toMatch(/##\s+10\.\s+Testing, Coverage & QA/i);
      expect(content).toContain('npm test');
      expect(content).toContain('npm run test:coverage');
      expect(content).toMatch(/93\.\d+%/);
    });

    it('verifies production build and static/CDN deployment are documented (Source §43, FE-124)', () => {
      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toMatch(/##\s+11\.\s+Production Build & Deployment/i);
      expect(content).toContain('_redirects');
      expect(content).toContain('_headers');
      expect(content).toContain('nginx.conf');
      expect(content).toContain('Dockerfile');
    });
  });

  describe('Suite 2: Supplementary Architecture and Developer Guide', () => {
    it('verifies docs/DEVELOPER_GUIDE.md exists and documents architectural patterns and workflows', () => {
      expect(fs.existsSync(devGuidePath)).toBe(true);
      const content = fs.readFileSync(devGuidePath, 'utf-8');
      expect(content).toContain(
        '# Vegetable Joint — Developer Guide & Architecture Manual'
      );
      expect(content).toContain('Separation of Concerns');
      expect(content).toContain('Step-by-Step Feature Implementation Guide');
      expect(content).toContain('Testing Recipes & Best Practices');
    });
  });
});
