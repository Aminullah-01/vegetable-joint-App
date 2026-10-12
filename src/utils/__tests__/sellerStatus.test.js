import { describe, it, expect } from 'vitest';
import {
  SELLER_STATUS,
  getSellerApprovalStatus,
  canSellerPublish,
  getSellerStatusMeta,
} from '../sellerStatus.js';

describe('Seller Status Utilities (AUTH-03, ADM-03, FE-064)', () => {
  describe('getSellerApprovalStatus', () => {
    it('returns null for empty, undefined, or non-seller users', () => {
      expect(getSellerApprovalStatus(null)).toBeNull();
      expect(getSellerApprovalStatus(undefined)).toBeNull();
      expect(getSellerApprovalStatus({ role: 'buyer', status: 'active' })).toBeNull();
      expect(getSellerApprovalStatus({ role: 'admin', status: 'active' })).toBeNull();
    });

    it('returns "suspended" if user account status is suspended (AUTH-12, ADM-02)', () => {
      const user = {
        role: 'seller',
        status: 'suspended',
        seller_profile: { approval_status: 'approved' },
      };
      expect(getSellerApprovalStatus(user)).toBe(SELLER_STATUS.SUSPENDED);
    });

    it('returns approval_status from seller_profile object', () => {
      expect(
        getSellerApprovalStatus({
          role: 'seller',
          status: 'active',
          seller_profile: { approval_status: 'pending' },
        })
      ).toBe('pending');

      expect(
        getSellerApprovalStatus({
          role: 'seller',
          status: 'active',
          seller_profile: { approval_status: 'approved' },
        })
      ).toBe('approved');

      expect(
        getSellerApprovalStatus({
          role: 'seller',
          status: 'active',
          seller_profile: { approval_status: 'rejected' },
        })
      ).toBe('rejected');

      expect(
        getSellerApprovalStatus({
          role: 'seller',
          status: 'active',
          seller_profile: { approval_status: 'suspended' },
        })
      ).toBe('suspended');
    });

    it('defaults to "pending" for seller role without explicit approval_status (AUTH-03)', () => {
      const newSeller = {
        role: 'seller',
        status: 'active',
      };
      expect(getSellerApprovalStatus(newSeller)).toBe(SELLER_STATUS.PENDING);
    });
  });

  describe('canSellerPublish', () => {
    it('returns true only when seller approval status is "approved"', () => {
      expect(
        canSellerPublish({
          role: 'seller',
          status: 'active',
          seller_profile: { approval_status: 'approved' },
        })
      ).toBe(true);
    });

    it('returns false for pending, rejected, or suspended sellers (AUTH-03, ADM-03)', () => {
      expect(
        canSellerPublish({
          role: 'seller',
          status: 'active',
          seller_profile: { approval_status: 'pending' },
        })
      ).toBe(false);

      expect(
        canSellerPublish({
          role: 'seller',
          status: 'active',
          seller_profile: { approval_status: 'rejected' },
        })
      ).toBe(false);

      expect(
        canSellerPublish({
          role: 'seller',
          status: 'active',
          seller_profile: { approval_status: 'suspended' },
        })
      ).toBe(false);

      expect(
        canSellerPublish({
          role: 'seller',
          status: 'suspended',
          seller_profile: { approval_status: 'approved' },
        })
      ).toBe(false);
    });
  });

  describe('getSellerStatusMeta', () => {
    it('provides accessible labels, icons, and styling for all statuses (Figma Section 17)', () => {
      const pending = getSellerStatusMeta(SELLER_STATUS.PENDING);
      expect(pending.label).toBe('Pending Approval');
      expect(pending.icon).toBe('⏳');
      expect(pending.isApproved).toBe(false);

      const approved = getSellerStatusMeta(SELLER_STATUS.APPROVED);
      expect(approved.label).toBe('Approved');
      expect(approved.icon).toBe('✓');
      expect(approved.isApproved).toBe(true);

      const rejected = getSellerStatusMeta(SELLER_STATUS.REJECTED);
      expect(rejected.label).toBe('Rejected');
      expect(rejected.icon).toBe('✕');
      expect(rejected.isApproved).toBe(false);

      const suspended = getSellerStatusMeta(SELLER_STATUS.SUSPENDED);
      expect(suspended.label).toBe('Suspended');
      expect(suspended.icon).toBe('🚫');
      expect(suspended.isApproved).toBe(false);
    });
  });
});
