import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUSES,
  ORDER_LIFECYCLE_STEPS,
  STATUS_CONFIG,
  SELLER_LIFECYCLE_CONFIG,
  normalizeOrderStatus,
  getOrderStatusConfig,
  isTerminalStatus,
  isCancelledStatus,
  getOrderStepIndex,
  isStepCompleted,
  getSellerLifecycleConfig,
  getSellerNextStatus,
  canSellerCancel,
  isValidSellerTransition,
} from '../orderStatus.js';

describe('Order Status & Lifecycle Utilities (ORD-02, ORD-05, ORD-06, ORD-07, BR-07)', () => {
  describe('Constants & Enums', () => {
    it('defines all required enum statuses matching database schema and SRS', () => {
      expect(ORDER_STATUSES).toEqual({
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        PROCESSING: 'processing',
        READY: 'ready',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
      });
    });

    it('defines standard progression lifecycle in sequential order', () => {
      expect(ORDER_LIFECYCLE_STEPS).toEqual([
        'pending',
        'confirmed',
        'processing',
        'ready',
        'completed',
      ]);
    });

    it('defines visual configuration tokens for every order status', () => {
      expect(SELLER_LIFECYCLE_CONFIG).toBeDefined();
      expect(Object.keys(SELLER_LIFECYCLE_CONFIG).length).toBeGreaterThan(0);
      Object.values(ORDER_STATUSES).forEach((status) => {
        const config = STATUS_CONFIG[status];
        expect(config).toBeDefined();
        expect(typeof config.label).toBe('string');
        expect(typeof config.description).toBe('string');
        expect(typeof config.bg).toBe('string');
        expect(typeof config.text).toBe('string');
        expect(typeof config.border).toBe('string');
        expect(typeof config.dotColor).toBe('string');
      });
    });
  });

  describe('normalizeOrderStatus', () => {
    it('normalizes valid uppercase, mixed case, and whitespace status strings', () => {
      expect(normalizeOrderStatus('PENDING')).toBe('pending');
      expect(normalizeOrderStatus(' Confirmed ')).toBe('confirmed');
      expect(normalizeOrderStatus('Processing')).toBe('processing');
      expect(normalizeOrderStatus('READY')).toBe('ready');
      expect(normalizeOrderStatus('Completed')).toBe('completed');
      expect(normalizeOrderStatus('CANCELLED')).toBe('cancelled');
    });

    it('falls back to pending for null, undefined, empty, or invalid statuses', () => {
      expect(normalizeOrderStatus(null)).toBe('pending');
      expect(normalizeOrderStatus(undefined)).toBe('pending');
      expect(normalizeOrderStatus('')).toBe('pending');
      expect(normalizeOrderStatus('   ')).toBe('pending');
      expect(normalizeOrderStatus('unknown_status')).toBe('pending');
      expect(normalizeOrderStatus(12345)).toBe('pending');
    });
  });

  describe('getOrderStatusConfig', () => {
    it('retrieves config for each valid status', () => {
      const pendingCfg = getOrderStatusConfig('pending');
      expect(pendingCfg.stepNumber).toBe(1);
      expect(pendingCfg.label).toMatch(/pending/i);

      const confirmedCfg = getOrderStatusConfig('confirmed');
      expect(confirmedCfg.stepNumber).toBe(2);

      const completedCfg = getOrderStatusConfig('completed');
      expect(completedCfg.stepNumber).toBe(5);

      const cancelledCfg = getOrderStatusConfig('cancelled');
      expect(cancelledCfg.stepNumber).toBeNull();
      expect(cancelledCfg.text).toBe('#dc2626');
    });

    it('falls back to pending configuration when status is unknown or invalid', () => {
      const fallback = getOrderStatusConfig('non_existent');
      expect(fallback.stepNumber).toBe(1);
      expect(fallback.label).toMatch(/pending/i);
    });
  });

  describe('isTerminalStatus (BR-07)', () => {
    it('returns true for completed and cancelled terminal states', () => {
      expect(isTerminalStatus('completed')).toBe(true);
      expect(isTerminalStatus('COMPLETED')).toBe(true);
      expect(isTerminalStatus('cancelled')).toBe(true);
      expect(isTerminalStatus('CANCELLED')).toBe(true);
    });

    it('returns false for active in-flight order statuses', () => {
      expect(isTerminalStatus('pending')).toBe(false);
      expect(isTerminalStatus('confirmed')).toBe(false);
      expect(isTerminalStatus('processing')).toBe(false);
      expect(isTerminalStatus('ready')).toBe(false);
      expect(isTerminalStatus(null)).toBe(false);
    });
  });

  describe('isCancelledStatus (ORD-03, ORD-07)', () => {
    it('returns true only for cancelled status', () => {
      expect(isCancelledStatus('cancelled')).toBe(true);
      expect(isCancelledStatus(' CANCELLED ')).toBe(true);
      expect(isCancelledStatus('pending')).toBe(false);
      expect(isCancelledStatus('completed')).toBe(false);
      expect(isCancelledStatus(null)).toBe(false);
    });
  });

  describe('getOrderStepIndex', () => {
    it('returns 0-indexed position along standard progression lifecycle', () => {
      expect(getOrderStepIndex('pending')).toBe(0);
      expect(getOrderStepIndex('confirmed')).toBe(1);
      expect(getOrderStepIndex('processing')).toBe(2);
      expect(getOrderStepIndex('ready')).toBe(3);
      expect(getOrderStepIndex('completed')).toBe(4);
    });

    it('returns -1 for cancelled or unrecognized statuses', () => {
      expect(getOrderStepIndex('cancelled')).toBe(-1);
      expect(getOrderStepIndex('unknown')).toBe(-1);
    });
  });

  describe('isStepCompleted', () => {
    it('correctly assesses whether earlier or current steps have completed', () => {
      // When current order is in processing:
      expect(isStepCompleted('pending', 'processing')).toBe(true);
      expect(isStepCompleted('confirmed', 'processing')).toBe(true);
      expect(isStepCompleted('processing', 'processing')).toBe(true);
      expect(isStepCompleted('ready', 'processing')).toBe(false);
      expect(isStepCompleted('completed', 'processing')).toBe(false);
    });

    it('returns false if stepStatus or currentStatus is cancelled or invalid', () => {
      expect(isStepCompleted('cancelled', 'completed')).toBe(false);
      expect(isStepCompleted('pending', 'cancelled')).toBe(false);
      expect(isStepCompleted('invalid', 'ready')).toBe(false);
    });
  });

  describe('Seller Lifecycle Rules (SRS 3.6.2, Figure 2, SEL-11, ORD-05, ORD-07, BR-07)', () => {
    it('retrieves correct seller configuration for pending state', () => {
      const cfg = getSellerLifecycleConfig('pending');
      expect(cfg.nextStatus).toBe('confirmed');
      expect(cfg.nextActionLabel).toBe('Confirm Order');
      expect(cfg.canAdvance).toBe(true);
      expect(cfg.canCancel).toBe(true);
    });

    it('retrieves correct seller configuration for confirmed state', () => {
      const cfg = getSellerLifecycleConfig('confirmed');
      expect(cfg.nextStatus).toBe('processing');
      expect(cfg.nextActionLabel).toBe('Start Processing');
      expect(cfg.canAdvance).toBe(true);
      expect(cfg.canCancel).toBe(true);
    });

    it('retrieves correct seller configuration for processing state', () => {
      const cfg = getSellerLifecycleConfig('processing');
      expect(cfg.nextStatus).toBe('ready');
      expect(cfg.nextActionLabel).toBe('Mark Ready for Delivery');
      expect(cfg.canAdvance).toBe(true);
      expect(cfg.canCancel).toBe(true);
    });

    it('retrieves correct seller configuration for ready state (cancelling restricted to Admin)', () => {
      const cfg = getSellerLifecycleConfig('ready');
      expect(cfg.nextStatus).toBe('completed');
      expect(cfg.nextActionLabel).toBe('Complete Order');
      expect(cfg.canAdvance).toBe(true);
      // Figure 2 of SRS 3.6.2: Once ready for delivery, sellers cannot cancel; only Admins can override
      expect(cfg.canCancel).toBe(false);
    });

    it('marks completed and cancelled as non-advanceable and non-cancellable', () => {
      const completedCfg = getSellerLifecycleConfig('completed');
      expect(completedCfg.nextStatus).toBeNull();
      expect(completedCfg.canAdvance).toBe(false);
      expect(completedCfg.canCancel).toBe(false);

      const cancelledCfg = getSellerLifecycleConfig('cancelled');
      expect(cancelledCfg.nextStatus).toBeNull();
      expect(cancelledCfg.canAdvance).toBe(false);
      expect(cancelledCfg.canCancel).toBe(false);
    });

    it('provides getSellerNextStatus helper', () => {
      expect(getSellerNextStatus('pending')).toBe('confirmed');
      expect(getSellerNextStatus('confirmed')).toBe('processing');
      expect(getSellerNextStatus('processing')).toBe('ready');
      expect(getSellerNextStatus('ready')).toBe('completed');
      expect(getSellerNextStatus('completed')).toBeNull();
      expect(getSellerNextStatus('cancelled')).toBeNull();
    });

    it('provides canSellerCancel helper', () => {
      expect(canSellerCancel('pending')).toBe(true);
      expect(canSellerCancel('confirmed')).toBe(true);
      expect(canSellerCancel('processing')).toBe(true);
      expect(canSellerCancel('ready')).toBe(false);
      expect(canSellerCancel('completed')).toBe(false);
      expect(canSellerCancel('cancelled')).toBe(false);
    });

    it('validates seller transitions with isValidSellerTransition', () => {
      // Step advancement validations
      expect(isValidSellerTransition('pending', 'confirmed')).toBe(true);
      expect(isValidSellerTransition('confirmed', 'processing')).toBe(true);
      expect(isValidSellerTransition('processing', 'ready')).toBe(true);
      expect(isValidSellerTransition('ready', 'completed')).toBe(true);

      // Skipping steps is blocked
      expect(isValidSellerTransition('pending', 'ready')).toBe(false);
      expect(isValidSellerTransition('confirmed', 'completed')).toBe(false);
      expect(isValidSellerTransition('completed', 'pending')).toBe(false);

      // Cancellation transitions
      expect(isValidSellerTransition('pending', 'cancelled')).toBe(true);
      expect(isValidSellerTransition('confirmed', 'cancelled')).toBe(true);
      expect(isValidSellerTransition('processing', 'cancelled')).toBe(true);
      expect(isValidSellerTransition('ready', 'cancelled')).toBe(false);
      expect(isValidSellerTransition('completed', 'cancelled')).toBe(false);
    });
  });
});
