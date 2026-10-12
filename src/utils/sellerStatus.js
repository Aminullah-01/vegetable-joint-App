/**
 * Seller Approval & Publishing Status Utilities
 *
 * Conforms to SRS:
 * - AUTH-03: Newly registered Seller account shall have status "Pending approval"
 *   and shall not publish listings until an Administrator approves it.
 * - ADM-03: Admins can approve, reject, suspend, and reactivate seller accounts.
 * - BR-11: A pending or suspended seller's products are not shown publicly and cannot be ordered.
 */

export const SELLER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

/**
 * Resolves the effective approval status for a seller user.
 *
 * @param {Object|null|undefined} user
 * @returns {'pending' | 'approved' | 'rejected' | 'suspended' | null}
 */
export function getSellerApprovalStatus(user) {
  if (!user) return null;

  // Account-level suspension supersedes seller profile status (AUTH-12, ADM-02)
  if (user.status === 'suspended') {
    return SELLER_STATUS.SUSPENDED;
  }

  // Check seller_profile.approval_status (per vegetable_joint_schema.sql)
  const profileStatus =
    user.seller_profile?.approval_status ||
    user.seller_profile?.approvalStatus ||
    user.approval_status ||
    user.approvalStatus;

  if (profileStatus) {
    return String(profileStatus).toLowerCase();
  }

  // Default for seller role without explicit status: pending per AUTH-03
  if (user.role === 'seller') {
    return SELLER_STATUS.PENDING;
  }

  return null;
}

/**
 * Determines whether a seller has permission to publish vegetable listings.
 *
 * @param {Object|null|undefined} user
 * @returns {boolean}
 */
export function canSellerPublish(user) {
  const status = getSellerApprovalStatus(user);
  return status === SELLER_STATUS.APPROVED;
}

/**
 * Metadata and display attributes for each seller approval state.
 * Adheres to Figma Section 17: "Use clear visual distinctions and accessible text labels, not color alone."
 *
 * @param {string} status
 * @returns {{
 *   status: string,
 *   label: string,
 *   badgeText: string,
 *   color: string,
 *   bg: string,
 *   border: string,
 *   icon: string,
 *   isApproved: boolean
 * }}
 */
export function getSellerStatusMeta(status) {
  const normalized = status ? String(status).toLowerCase() : SELLER_STATUS.PENDING;

  switch (normalized) {
    case SELLER_STATUS.APPROVED:
      return {
        status: SELLER_STATUS.APPROVED,
        label: 'Approved',
        badgeText: 'Verified & Approved',
        color: '#15803d',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        icon: '✓',
        isApproved: true,
      };

    case SELLER_STATUS.REJECTED:
      return {
        status: SELLER_STATUS.REJECTED,
        label: 'Rejected',
        badgeText: 'Application Rejected',
        color: '#991b1b',
        bg: '#fee2e2',
        border: '#fca5a5',
        icon: '✕',
        isApproved: false,
      };

    case SELLER_STATUS.SUSPENDED:
      return {
        status: SELLER_STATUS.SUSPENDED,
        label: 'Suspended',
        badgeText: 'Account Suspended',
        color: '#b91c1c',
        bg: '#fef2f2',
        border: '#f87171',
        icon: '🚫',
        isApproved: false,
      };

    case SELLER_STATUS.PENDING:
    default:
      return {
        status: SELLER_STATUS.PENDING,
        label: 'Pending Approval',
        badgeText: 'Pending Approval',
        color: '#92400e',
        bg: '#fef3c7',
        border: '#fde68a',
        icon: '⏳',
        isApproved: false,
      };
  }
}
