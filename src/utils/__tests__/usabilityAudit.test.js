import { describe, it, expect } from 'vitest';
import {
  USABILITY_BENCHMARKS,
  FIRST_TIME_BUYER_COHORT,
  calculateUnassistedCompletionRate,
  evaluateBuyerSession,
  auditUsabilityTestCohort,
} from '../usabilityAudit.js';

describe('Usability Testing Utilities (FE-123: NFR-USAB-01)', () => {
  describe('USABILITY_BENCHMARKS Constants', () => {
    it('codifies exact SRS NFR-USAB-01 requirements', () => {
      expect(USABILITY_BENCHMARKS.MIN_FIRST_TIME_BUYERS).toBe(5);
      expect(USABILITY_BENCHMARKS.MIN_UNASSISTED_COMPLETION_RATE).toBe(0.8);
      expect(USABILITY_BENCHMARKS.TARGET_UNASSISTED_COMPLETION_RATE).toBe(1.0);
      expect(USABILITY_BENCHMARKS.MAX_AVERAGE_TASK_DURATION_SECONDS).toBe(300);
    });
  });

  describe('FIRST_TIME_BUYER_COHORT Specification', () => {
    it('defines at least 5 realistic first-time buyer personas from diverse Nigerian locations', () => {
      expect(FIRST_TIME_BUYER_COHORT.length).toBeGreaterThanOrEqual(5);

      const states = FIRST_TIME_BUYER_COHORT.map(
        (b) => b.deliveryAddress.state
      );
      expect(states).toContain('Kano');
      expect(states).toContain('Lagos');
      expect(states).toContain('Oyo');
      expect(states).toContain('FCT (Abuja)');
      expect(states).toContain('Rivers');

      FIRST_TIME_BUYER_COHORT.forEach((buyer) => {
        expect(buyer.id).toBeDefined();
        expect(buyer.name).toBeDefined();
        expect(buyer.device).toBeDefined();
        expect(buyer.primaryGoal).toBeDefined();
        expect(buyer.targetVegetable).toBeDefined();
        expect(buyer.deliveryAddress.phone).toMatch(
          /^(\+234|0)[789][01]\d{8}$/
        );
        expect(buyer.deliveryAddress.street).toBeDefined();
        expect(buyer.deliveryAddress.town).toBeDefined();
      });
    });
  });

  describe('calculateUnassistedCompletionRate', () => {
    it('calculates 100% completion rate when all buyers finish unassisted', () => {
      const sessions = [
        { completedUnassisted: true },
        { completedUnassisted: true },
        { completedUnassisted: true },
        { completedUnassisted: true },
        { completedUnassisted: true },
      ];

      expect(calculateUnassistedCompletionRate(sessions)).toBe(1.0);
    });

    it('calculates 80% completion rate for 4 out of 5 buyers', () => {
      const sessions = [
        { completedUnassisted: true },
        { completedUnassisted: true },
        { completedUnassisted: true },
        { completedUnassisted: true },
        { completedUnassisted: false },
      ];

      expect(calculateUnassistedCompletionRate(sessions)).toBe(0.8);
    });

    it('calculates 60% completion rate for 3 out of 5 buyers', () => {
      const sessions = [
        { completedUnassisted: true },
        { completedUnassisted: true },
        { completedUnassisted: true },
        { completedUnassisted: false },
        { completedUnassisted: false },
      ];

      expect(calculateUnassistedCompletionRate(sessions)).toBe(0.6);
    });

    it('handles empty or non-array inputs safely', () => {
      expect(calculateUnassistedCompletionRate([])).toBe(0);
      expect(calculateUnassistedCompletionRate(null)).toBe(0);
      expect(calculateUnassistedCompletionRate(undefined)).toBe(0);
    });
  });

  describe('evaluateBuyerSession', () => {
    it('evaluates a complete, unassisted session as successful and unassisted', () => {
      const session = {
        userId: 'buyer-01',
        userName: 'Zainab Aliyu',
        foundVegetable: true,
        addedToCart: true,
        completedCheckout: true,
        receivedAssistance: false,
        durationSeconds: 125,
        errorCount: 0,
        orderId: 'ORD-2026-001',
      };

      const result = evaluateBuyerSession(session);

      expect(result.valid).toBe(true);
      expect(result.completedUnassisted).toBe(true);
      expect(result.taskSuccessful).toBe(true);
      expect(result.durationSeconds).toBe(125);
      expect(result.errorCount).toBe(0);
    });

    it('flags an assisted session as taskSuccessful but NOT completedUnassisted', () => {
      const session = {
        userId: 'buyer-02',
        userName: 'Emeka Okafor',
        foundVegetable: true,
        addedToCart: true,
        completedCheckout: true,
        receivedAssistance: true, // Needed help finding checkout button
        durationSeconds: 240,
        errorCount: 1,
      };

      const result = evaluateBuyerSession(session);

      expect(result.valid).toBe(true);
      expect(result.completedUnassisted).toBe(false);
      expect(result.taskSuccessful).toBe(true);
      expect(result.errorCount).toBe(1);
    });

    it('flags an abandoned session as unsuccessful and NOT completedUnassisted', () => {
      const session = {
        userId: 'buyer-03',
        userName: 'Bolanle Adeleke',
        foundVegetable: true,
        addedToCart: false,
        completedCheckout: false,
        receivedAssistance: false,
      };

      const result = evaluateBuyerSession(session);

      expect(result.valid).toBe(true);
      expect(result.completedUnassisted).toBe(false);
      expect(result.taskSuccessful).toBe(false);
    });

    it('handles missing or negative numerical metrics safely', () => {
      const result = evaluateBuyerSession({
        userId: 'buyer-04',
        durationSeconds: -50,
        errorCount: 'invalid',
      });

      expect(result.durationSeconds).toBe(0);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('auditUsabilityTestCohort (NFR-USAB-01 Acceptance Verification)', () => {
    it('passes when 5 buyers all complete task unassisted (100% rate)', () => {
      const sessions = FIRST_TIME_BUYER_COHORT.map((buyer) => ({
        userId: buyer.id,
        userName: buyer.name,
        foundVegetable: true,
        addedToCart: true,
        completedCheckout: true,
        receivedAssistance: false,
        durationSeconds: 110,
        errorCount: 0,
      }));

      const audit = auditUsabilityTestCohort(sessions);

      expect(audit.compliant).toBe(true);
      expect(audit.status).toBe('passed');
      expect(audit.totalUsers).toBe(5);
      expect(audit.unassistedSuccessCount).toBe(5);
      expect(audit.unassistedRate).toBe(1.0);
      expect(audit.benchmarkRate).toBe(0.8);
      expect(audit.averageDurationSeconds).toBe(110);
      expect(audit.averageErrorCount).toBe(0);
      expect(audit.recommendation).toBeUndefined();
    });

    it('passes when 4 out of 5 buyers complete unassisted (80% rate, NFR-USAB-01 threshold)', () => {
      const sessions = FIRST_TIME_BUYER_COHORT.map((buyer, idx) => ({
        userId: buyer.id,
        userName: buyer.name,
        foundVegetable: true,
        addedToCart: true,
        completedCheckout: true,
        receivedAssistance: idx === 4, // 5th buyer received assistance
        durationSeconds: 120 + idx * 10,
        errorCount: idx === 4 ? 1 : 0,
      }));

      const audit = auditUsabilityTestCohort(sessions);

      expect(audit.compliant).toBe(true);
      expect(audit.status).toBe('passed');
      expect(audit.totalUsers).toBe(5);
      expect(audit.unassistedSuccessCount).toBe(4);
      expect(audit.unassistedRate).toBe(0.8);
    });

    it('fails when unassisted completion rate falls below 80%', () => {
      const sessions = FIRST_TIME_BUYER_COHORT.map((buyer, idx) => ({
        userId: buyer.id,
        userName: buyer.name,
        foundVegetable: true,
        addedToCart: true,
        completedCheckout: true,
        receivedAssistance: idx >= 2, // 3 buyers received assistance (only 2 unassisted)
        durationSeconds: 180,
        errorCount: 1,
      }));

      const audit = auditUsabilityTestCohort(sessions);

      expect(audit.compliant).toBe(false);
      expect(audit.status).toBe('failed');
      expect(audit.unassistedRate).toBe(0.4);
      expect(audit.recommendation).toContain(
        'below the required 80% threshold'
      );
    });

    it('fails when cohort size is less than 5 first-time buyers', () => {
      const smallCohort = FIRST_TIME_BUYER_COHORT.slice(0, 3).map((buyer) => ({
        userId: buyer.id,
        userName: buyer.name,
        foundVegetable: true,
        addedToCart: true,
        completedCheckout: true,
        receivedAssistance: false,
        durationSeconds: 90,
      }));

      const audit = auditUsabilityTestCohort(smallCohort);

      expect(audit.compliant).toBe(false);
      expect(audit.status).toBe('failed');
      expect(audit.totalUsers).toBe(3);
      expect(audit.recommendation).toContain('minimum of 5 first-time buyers');
    });

    it('handles empty session arrays safely', () => {
      const audit = auditUsabilityTestCohort([]);

      expect(audit.compliant).toBe(false);
      expect(audit.totalUsers).toBe(0);
      expect(audit.unassistedRate).toBe(0);
      expect(audit.status).toBe('failed');
    });
  });
});
