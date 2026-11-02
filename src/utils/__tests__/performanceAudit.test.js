import { describe, it, expect } from 'vitest';
import {
  PERFORMANCE_BUDGETS,
  auditBundleBudget,
  auditLCP,
  auditImageBudget,
  auditCartActionLatency,
  measureActionTime,
  auditPerformanceMetrics,
} from '../performanceAudit.js';

describe('performanceAudit utilities (NFR-PERF-01, NFR-PERF-03, NFR-PERF-05)', () => {
  describe('PERFORMANCE_BUDGETS constants', () => {
    it('codifies exact SRS performance requirements', () => {
      expect(PERFORMANCE_BUDGETS.INITIAL_BUNDLE_GZIP_MAX_KB).toBe(250);
      expect(PERFORMANCE_BUDGETS.LCP_MAX_SECONDS).toBe(2.5);
      expect(PERFORMANCE_BUDGETS.IMAGE_THUMBNAIL_MAX_KB).toBe(100);
      expect(PERFORMANCE_BUDGETS.IMAGE_DETAIL_MAX_KB).toBe(300);
      expect(PERFORMANCE_BUDGETS.CART_ACTION_MAX_MS).toBe(200);
      expect(PERFORMANCE_BUDGETS.API_READ_MAX_MS).toBe(500);
      expect(PERFORMANCE_BUDGETS.API_WRITE_MAX_MS).toBe(1000);
    });
  });

  describe('auditBundleBudget (NFR-PERF-01: ≤ 250 KB gzipped)', () => {
    it('verifies bundles within 250 KB budget pass compliance', () => {
      const result = auditBundleBudget(176.65);
      expect(result.compliant).toBe(true);
      expect(result.sizeKb).toBe(176.65);
      expect(result.budgetKb).toBe(250);
      expect(result.diffKb).toBe(73.35);
    });

    it('verifies exact 250 KB boundary passes', () => {
      expect(auditBundleBudget(250).compliant).toBe(true);
    });

    it('flags bundles exceeding 250 KB as non-compliant', () => {
      const result = auditBundleBudget(250.5);
      expect(result.compliant).toBe(false);
      expect(result.diffKb).toBe(-0.5);
    });

    it('handles negative or invalid non-numeric inputs safely', () => {
      expect(auditBundleBudget(-10).sizeKb).toBe(0);
      expect(auditBundleBudget(null).sizeKb).toBe(0);
      expect(auditBundleBudget(undefined).sizeKb).toBe(0);
    });
  });

  describe('auditLCP (NFR-PERF-01: ≤ 2.5 s on simulated 4G)', () => {
    it('evaluates fast LCP (<= 2.5s) as compliant and good', () => {
      const result = auditLCP(1.8);
      expect(result.compliant).toBe(true);
      expect(result.lcpSeconds).toBe(1.8);
      expect(result.status).toBe('good');
    });

    it('evaluates boundary 2.5s as compliant', () => {
      const result = auditLCP(2.5);
      expect(result.compliant).toBe(true);
      expect(result.status).toBe('good');
    });

    it('evaluates 2.5s < LCP <= 4.0s as needs-improvement', () => {
      const result = auditLCP(3.1);
      expect(result.compliant).toBe(false);
      expect(result.status).toBe('needs-improvement');
    });

    it('evaluates LCP > 4.0s as poor', () => {
      const result = auditLCP(4.6);
      expect(result.compliant).toBe(false);
      expect(result.status).toBe('poor');
    });

    it('handles negative or invalid inputs safely', () => {
      expect(auditLCP(-1).lcpSeconds).toBe(0);
      expect(auditLCP('invalid').lcpSeconds).toBe(0);
    });
  });

  describe('auditImageBudget (NFR-PERF-03: thumbnail ≤ 100 KB, detail ≤ 300 KB)', () => {
    it('evaluates thumbnail images (budget: 100 KB)', () => {
      const pass = auditImageBudget(85, 'thumbnail');
      expect(pass.compliant).toBe(true);
      expect(pass.budgetKb).toBe(100);
      expect(pass.type).toBe('thumbnail');

      const fail = auditImageBudget(120, 'thumbnail');
      expect(fail.compliant).toBe(false);
    });

    it('evaluates detail images (budget: 300 KB)', () => {
      const pass = auditImageBudget(240, 'detail');
      expect(pass.compliant).toBe(true);
      expect(pass.budgetKb).toBe(300);
      expect(pass.type).toBe('detail');

      const fail = auditImageBudget(320, 'detail');
      expect(fail.compliant).toBe(false);
    });

    it('defaults to thumbnail when type is omitted or invalid', () => {
      const result = auditImageBudget(50);
      expect(result.type).toBe('thumbnail');
      expect(result.budgetKb).toBe(100);
    });

    it('handles negative or invalid sizes safely', () => {
      expect(auditImageBudget(-5).sizeKb).toBe(0);
      expect(auditImageBudget('abc').sizeKb).toBe(0);
    });
  });

  describe('auditCartActionLatency (NFR-PERF-05: ≤ 200 ms)', () => {
    it('evaluates snappy UI updates within 200 ms as compliant', () => {
      const pass = auditCartActionLatency(45);
      expect(pass.compliant).toBe(true);
      expect(pass.durationMs).toBe(45);
      expect(pass.budgetMs).toBe(200);
    });

    it('flags cart operations exceeding 200 ms as non-compliant', () => {
      const fail = auditCartActionLatency(250);
      expect(fail.compliant).toBe(false);
    });

    it('handles negative or non-numeric inputs safely', () => {
      expect(auditCartActionLatency(-10).durationMs).toBe(0);
      expect(auditCartActionLatency(null).durationMs).toBe(0);
    });
  });

  describe('measureActionTime', () => {
    it('executes action and returns both result and duration', () => {
      const { result, durationMs } = measureActionTime(() => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        return sum;
      });

      expect(result).toBe(499500);
      expect(durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('auditPerformanceMetrics', () => {
    it('generates a full compliant performance report with realistic data', () => {
      const report = auditPerformanceMetrics({
        bundleGzipKb: 176.65,
        lcpSeconds: 1.8,
        cartActionMs: 40,
        images: [
          { sizeKb: 65, type: 'thumbnail' },
          { sizeKb: 180, type: 'detail' },
        ],
      });

      expect(report.allCompliant).toBe(true);
      expect(report.bundleCheck.compliant).toBe(true);
      expect(report.lcpCheck.compliant).toBe(true);
      expect(report.cartCheck.compliant).toBe(true);
      expect(report.imagesCheck.allCompliant).toBe(true);
      expect(report.imagesCheck.compliantCount).toBe(2);
    });

    it('detects and reports failing metrics', () => {
      const report = auditPerformanceMetrics({
        bundleGzipKb: 310, // Fails
        lcpSeconds: 3.5, // Fails
        cartActionMs: 250, // Fails
        images: [{ sizeKb: 150, type: 'thumbnail' }], // Fails
      });

      expect(report.allCompliant).toBe(false);
      expect(report.bundleCheck.compliant).toBe(false);
      expect(report.lcpCheck.compliant).toBe(false);
      expect(report.cartCheck.compliant).toBe(false);
      expect(report.imagesCheck.allCompliant).toBe(false);
    });

    it('provides sensible defaults when called without arguments', () => {
      const report = auditPerformanceMetrics();
      expect(report.allCompliant).toBe(true);
      expect(report.bundleCheck.compliant).toBe(true);
      expect(report.lcpCheck.compliant).toBe(true);
      expect(report.cartCheck.compliant).toBe(true);
    });
  });
});
