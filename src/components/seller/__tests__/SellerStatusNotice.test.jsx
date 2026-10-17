import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SellerStatusNotice } from '../SellerStatusNotice';
import { AuthProvider } from '../../../context';
import {
  SELLER_APPROVAL_STATUSES,
  getSellerApprovalStatus,
  canSellerPublish,
  getSellerRejectionReason,
} from '../../../utils/sellerStatus';

function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

const pendingUser = {
  id: 5,
  name: 'Musa Abdullahi',
  email: 'pending@newfarm.ng',
  role: 'seller',
  status: 'active',
  seller_profile: {
    id: 4,
    user_id: 5,
    business_name: 'Danbatta Agro Ventures',
    approval_status: 'pending',
    rejection_reason: null,
  },
};

const rejectedUser = {
  id: 9,
  name: 'Yakubu Danjuma',
  email: 'rejected@farm.ng',
  role: 'seller',
  status: 'active',
  seller_profile: {
    id: 5,
    user_id: 9,
    business_name: 'Kaduna Agro Export Ltd',
    approval_status: 'rejected',
    rejection_reason:
      'Incomplete business registration documentation and invalid stall address.',
  },
};

const suspendedUser = {
  id: 10,
  name: 'Suleiman Garba',
  email: 'suspended@seller.ng',
  role: 'seller',
  status: 'active',
  seller_profile: {
    id: 6,
    user_id: 10,
    business_name: 'Niger River Veggies',
    approval_status: 'suspended',
    rejection_reason: 'Account suspended due to policy violations.',
  },
};

const approvedUser = {
  id: 2,
  name: 'Ibrahim Danladi',
  email: 'seller@arewafarms.ng',
  role: 'seller',
  status: 'active',
  seller_profile: {
    id: 1,
    user_id: 2,
    business_name: 'Arewa Fresh Farms',
    approval_status: 'approved',
    rejection_reason: null,
  },
};

describe('SellerStatusNotice (FE-064 / AUTH-03 / ADM-03)', () => {
  describe('Pending approval status (AUTH-03)', () => {
    it('renders the pending approval banner with publishing restriction details', () => {
      renderWithProviders(<SellerStatusNotice user={pendingUser} />);

      const notice = screen.getByTestId('seller-status-notice');
      expect(notice).toHaveAttribute('data-status', 'pending');
      expect(notice).toHaveAttribute('role', 'alert');
      expect(
        screen.getByText(/Your seller account is pending approval/i)
      ).toBeInTheDocument();
      expect(screen.getByTestId('seller-status-badge')).toHaveTextContent(
        /Pending Approval/i
      );

      const pendingDetails = screen.getByTestId('seller-status-pending');
      expect(pendingDetails).toHaveTextContent(/Publishing Disabled/i);
      expect(pendingDetails).toHaveTextContent(/cannot create or publish/i);
      expect(pendingDetails).toHaveTextContent(/not visible to buyers/i);
    });

    it('defaults a seller without explicit status to pending (SRS AUTH-03 default)', () => {
      const sellerWithoutStatus = {
        id: 99,
        name: 'New Seller',
        role: 'seller',
        seller_profile: { id: 99, business_name: 'Fresh Greens' },
      };

      renderWithProviders(<SellerStatusNotice user={sellerWithoutStatus} />);

      expect(screen.getByTestId('seller-status-notice')).toHaveAttribute(
        'data-status',
        'pending'
      );
    });
  });

  describe('Rejected status (ADM-03)', () => {
    it('renders the rejected notice with the administrator reason', () => {
      renderWithProviders(<SellerStatusNotice user={rejectedUser} />);

      const notice = screen.getByTestId('seller-status-notice');
      expect(notice).toHaveAttribute('data-status', 'rejected');
      expect(screen.getByText(/Application Not Approved/i)).toBeInTheDocument();
      expect(screen.getByTestId('seller-status-rejected')).toBeInTheDocument();
      expect(screen.getByTestId('seller-rejection-reason')).toHaveTextContent(
        /Incomplete business registration documentation/i
      );
    });
  });

  describe('Suspended status (ADM-03 / AUTH-12)', () => {
    it('renders the suspended notice explaining hidden products and locked publishing', () => {
      renderWithProviders(<SellerStatusNotice user={suspendedUser} />);

      const notice = screen.getByTestId('seller-status-notice');
      expect(notice).toHaveAttribute('data-status', 'suspended');
      expect(screen.getByText(/Seller Account Suspended/i)).toBeInTheDocument();

      const suspendedDetails = screen.getByTestId('seller-status-suspended');
      expect(suspendedDetails).toHaveTextContent(/hidden from buyers/i);
      expect(suspendedDetails).toHaveTextContent(/locked/i);
      expect(suspendedDetails).toHaveTextContent(
        /Existing orders remain accessible/i
      );
      expect(screen.getByTestId('seller-suspension-reason')).toHaveTextContent(
        /policy violations/i
      );
    });
  });

  describe('Approved status', () => {
    it('renders nothing for approved sellers by default', () => {
      const { container } = renderWithProviders(
        <SellerStatusNotice user={approvedUser} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders a positive confirmation when showWhenApproved is set', () => {
      renderWithProviders(
        <SellerStatusNotice user={approvedUser} showWhenApproved />
      );

      const notice = screen.getByTestId('seller-status-notice');
      expect(notice).toHaveAttribute('data-status', 'approved');
      expect(notice).toHaveAttribute('role', 'status');
      expect(screen.getByText(/Verified Seller Account/i)).toBeInTheDocument();
    });
  });

  describe('Compact badge mode', () => {
    it.each([
      [pendingUser, 'pending', /Pending Approval/i],
      [rejectedUser, 'rejected', /Application Rejected/i],
      [suspendedUser, 'suspended', /Account Suspended/i],
    ])('renders a compact status pill for %s', (user, status, label) => {
      renderWithProviders(<SellerStatusNotice user={user} compact />);

      expect(screen.getByTestId('seller-status-notice')).toHaveTextContent(
        label
      );
      expect(screen.getByTestId('seller-status-badge')).toBeInTheDocument();
      // Compact mode should not render the long-form detail panels
      expect(
        screen.queryByTestId('seller-status-pending')
      ).not.toBeInTheDocument();
    });
  });

  describe('sellerStatus utilities (AUTH-03)', () => {
    it('getSellerApprovalStatus normalizes statuses and defaults', () => {
      expect(getSellerApprovalStatus(pendingUser)).toBe(
        SELLER_APPROVAL_STATUSES.PENDING
      );
      expect(getSellerApprovalStatus(rejectedUser)).toBe(
        SELLER_APPROVAL_STATUSES.REJECTED
      );
      expect(getSellerApprovalStatus(suspendedUser)).toBe(
        SELLER_APPROVAL_STATUSES.SUSPENDED
      );
      expect(getSellerApprovalStatus(approvedUser)).toBe(
        SELLER_APPROVAL_STATUSES.APPROVED
      );
      expect(getSellerApprovalStatus({ role: 'seller' })).toBe(
        SELLER_APPROVAL_STATUSES.PENDING
      );
      expect(getSellerApprovalStatus(null)).toBe(
        SELLER_APPROVAL_STATUSES.PENDING
      );
    });

    it('canSellerPublish only allows approved sellers to publish', () => {
      expect(canSellerPublish(approvedUser)).toBe(true);
      expect(canSellerPublish(pendingUser)).toBe(false);
      expect(canSellerPublish(rejectedUser)).toBe(false);
      expect(canSellerPublish(suspendedUser)).toBe(false);
      expect(canSellerPublish(null)).toBe(false);
    });

    it('getSellerRejectionReason extracts the review reason', () => {
      expect(getSellerRejectionReason(rejectedUser)).toMatch(
        /Incomplete business registration/i
      );
      expect(getSellerRejectionReason(pendingUser)).toBeNull();
    });
  });
});
