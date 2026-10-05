/**
 * Order Status & Lifecycle Utilities
 * SRS References: ORD-02, ORD-05, ORD-06, ORD-07, BR-07
 *
 * Defines the order status lifecycle, color tokens, and timeline step helpers
 * matching the SRS specification and database schema enum.
 */
import { STRINGS } from '../constants';

export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/**
 * Standard progression sequence of order lifecycle (SRS 3.6.2)
 */
export const ORDER_LIFECYCLE_STEPS = [
  'pending',
  'confirmed',
  'processing',
  'ready',
  'completed',
];

/**
 * Normalizes an order status string to lowercase safe enum key
 *
 * @param {string} status
 * @returns {string} Normalized status
 */
export function normalizeOrderStatus(status) {
  if (!status || typeof status !== 'string') {
    return ORDER_STATUSES.PENDING;
  }
  const clean = status.trim().toLowerCase();
  const valid = Object.values(ORDER_STATUSES);
  return valid.includes(clean) ? clean : ORDER_STATUSES.PENDING;
}

/**
 * Visual styling and metadata for each order status
 */
export const STATUS_CONFIG = {
  [ORDER_STATUSES.PENDING]: {
    label: STRINGS.ORDER_STATUS?.PENDING || 'Pending',
    description:
      STRINGS.ORDER_STATUS?.DESCRIPTIONS?.PENDING ||
      'Order placed by customer; awaiting seller confirmation.',
    bg: '#fef3c7',
    text: '#b45309',
    border: '#fde68a',
    dotColor: '#d97706',
    stepNumber: 1,
  },
  [ORDER_STATUSES.CONFIRMED]: {
    label: STRINGS.ORDER_STATUS?.CONFIRMED || 'Confirmed',
    description:
      STRINGS.ORDER_STATUS?.DESCRIPTIONS?.CONFIRMED ||
      'Order confirmed by seller.',
    bg: '#e0f2fe',
    text: '#0369a1',
    border: '#bae6fd',
    dotColor: '#0284c7',
    stepNumber: 2,
  },
  [ORDER_STATUSES.PROCESSING]: {
    label: STRINGS.ORDER_STATUS?.PROCESSING || 'Processing',
    description:
      STRINGS.ORDER_STATUS?.DESCRIPTIONS?.PROCESSING ||
      'Produce is being prepared and packed.',
    bg: '#f3e8ff',
    text: '#6b21a8',
    border: '#e9d5ff',
    dotColor: '#9333ea',
    stepNumber: 3,
  },
  [ORDER_STATUSES.READY]: {
    label: STRINGS.ORDER_STATUS?.READY || 'Ready for Delivery',
    description:
      STRINGS.ORDER_STATUS?.DESCRIPTIONS?.READY ||
      'Package is ready for courier delivery or customer pickup.',
    bg: '#ccfbf1',
    text: '#0f766e',
    border: '#99f6e4',
    dotColor: '#14b8a6',
    stepNumber: 4,
  },
  [ORDER_STATUSES.COMPLETED]: {
    label: STRINGS.ORDER_STATUS?.COMPLETED || 'Completed',
    description:
      STRINGS.ORDER_STATUS?.DESCRIPTIONS?.COMPLETED ||
      'Order successfully delivered and completed.',
    bg: '#dcfce7',
    text: '#15803d',
    border: '#bbf7d0',
    dotColor: '#16a34a',
    stepNumber: 5,
  },
  [ORDER_STATUSES.CANCELLED]: {
    label: STRINGS.ORDER_STATUS?.CANCELLED || 'Cancelled',
    description:
      STRINGS.ORDER_STATUS?.DESCRIPTIONS?.CANCELLED || 'Order cancelled.',
    bg: '#fee2e2',
    text: '#dc2626',
    border: '#fecaca',
    dotColor: '#ef4444',
    stepNumber: null,
  },
};

/**
 * Returns configuration metadata for an order status
 *
 * @param {string} status
 * @returns {object}
 */
export function getOrderStatusConfig(status) {
  const norm = normalizeOrderStatus(status);
  return STATUS_CONFIG[norm] || STATUS_CONFIG[ORDER_STATUSES.PENDING];
}

/**
 * Checks if status is terminal (Completed or Cancelled per BR-07)
 *
 * @param {string} status
 * @returns {boolean}
 */
export function isTerminalStatus(status) {
  const norm = normalizeOrderStatus(status);
  return norm === ORDER_STATUSES.COMPLETED || norm === ORDER_STATUSES.CANCELLED;
}

/**
 * Checks if status is Cancelled
 *
 * @param {string} status
 * @returns {boolean}
 */
export function isCancelledStatus(status) {
  return normalizeOrderStatus(status) === ORDER_STATUSES.CANCELLED;
}

/**
 * Retrieves the index of the status in the standard lifecycle progression (0 to 4)
 * Returns -1 if cancelled or unrecognized.
 *
 * @param {string} status
 * @returns {number}
 */
export function getOrderStepIndex(status) {
  const norm = normalizeOrderStatus(status);
  return ORDER_LIFECYCLE_STEPS.indexOf(norm);
}

/**
 * Checks if a pipeline step has been completed given the current order status
 *
 * @param {string} stepStatus - Step being evaluated
 * @param {string} currentStatus - Current order status
 * @returns {boolean}
 */
export function isStepCompleted(stepStatus, currentStatus) {
  const stepIdx = getOrderStepIndex(stepStatus);
  const currentIdx = getOrderStepIndex(currentStatus);

  if (stepIdx === -1 || currentIdx === -1) {
    return false;
  }

  return stepIdx <= currentIdx;
}
