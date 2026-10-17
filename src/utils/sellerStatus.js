/**
 * Seller Approval Status Utilities
 * SRS References: AUTH-03, ADM-03, BR-11, Figma Section 8 & 13
 */

export const SELLER_APPROVAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

/**
 * Visual styling and metadata configuration for each seller approval status
 */
export const SELLER_STATUS_CONFIG = {
  [SELLER_APPROVAL_STATUSES.PENDING]: {
    label: 'Pending Approval',
    badgeText: 'Pending Approval',
    bg: '#fffbeb',
    text: '#92400e',
    border: '#fde68a',
    badgeBg: '#fef3c7',
    badgeTextCol: '#b45309',
    icon: '⏳',
    canPublish: false,
    heading: 'Your seller account is pending approval.',
    description:
      'Your seller registration is currently under review by platform administrators (AUTH-03). While your account is pending approval, product publishing is disabled and listings will not appear publicly on the marketplace.',
  },
  [SELLER_APPROVAL_STATUSES.APPROVED]: {
    label: 'Approved',
    badgeText: 'Verified Seller',
    bg: '#f0fdf4',
    text: '#166534',
    border: '#bbf7d0',
    badgeBg: '#dcfce7',
    badgeTextCol: '#15803d',
    icon: '✅',
    canPublish: true,
    heading: 'Verified Seller Account',
    description:
      'Your seller account has been approved and verified. You have full access to list and manage vegetables on the marketplace.',
  },
  [SELLER_APPROVAL_STATUSES.REJECTED]: {
    label: 'Application Rejected',
    badgeText: 'Application Rejected',
    bg: '#fef2f2',
    text: '#991b1b',
    border: '#fecaca',
    badgeBg: '#fee2e2',
    badgeTextCol: '#b91c1c',
    icon: '❌',
    canPublish: false,
    heading: 'Seller Account Application Not Approved',
    description:
      'Your seller registration application was reviewed and not approved by platform administrators (ADM-03). Product publishing is disabled.',
  },
  [SELLER_APPROVAL_STATUSES.SUSPENDED]: {
    label: 'Account Suspended',
    badgeText: 'Account Suspended',
    bg: '#fef2f2',
    text: '#7f1d1d',
    border: '#fca5a5',
    badgeBg: '#fee2e2',
    badgeTextCol: '#991b1b',
    icon: '⚠️',
    canPublish: false,
    heading: 'Seller Account Suspended',
    description:
      'This seller account has been suspended by platform administrators (ADM-03, AUTH-12). Your products have been removed from the public marketplace and publishing new listings is disabled.',
  },
};

/**
 * Extracts and normalizes the approval status from a user or seller profile object.
 *
 * @param {Object|null|undefined} user
 * @returns {'pending'|'approved'|'rejected'|'suspended'}
 */
export function getSellerApprovalStatus(user) {
  if (!user) return SELLER_APPROVAL_STATUSES.PENDING;

  const rawStatus =
    user?.seller_profile?.approval_status ||
    user?.approval_status ||
    user?.approvalStatus;

  if (typeof rawStatus === 'string') {
    const clean = rawStatus.trim().toLowerCase();
    if (Object.values(SELLER_APPROVAL_STATUSES).includes(clean)) {
      return clean;
    }
  }

  // If role is seller and no explicit status, default to pending (SRS AUTH-03)
  if (user?.role === 'seller') {
    return SELLER_APPROVAL_STATUSES.PENDING;
  }

  return SELLER_APPROVAL_STATUSES.APPROVED;
}

/**
 * Checks if a seller is permitted to publish or create product listings.
 * Conforms to SRS AUTH-03: only approved sellers can publish.
 *
 * @param {Object|null|undefined} user
 * @returns {boolean}
 */
export function canSellerPublish(user) {
  const status = getSellerApprovalStatus(user);
  return status === SELLER_APPROVAL_STATUSES.APPROVED;
}

/**
 * Retrieves the rejection reason if provided.
 *
 * @param {Object|null|undefined} user
 * @returns {string|null}
 */
export function getSellerRejectionReason(user) {
  return (
    user?.seller_profile?.rejection_reason ||
    user?.rejection_reason ||
    user?.rejectionReason ||
    null
  );
}
