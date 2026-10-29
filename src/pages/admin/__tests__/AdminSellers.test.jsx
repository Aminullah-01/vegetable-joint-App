import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AdminSellers } from '../AdminSellers';
import { adminService } from '../../../services/adminService';
import { ToastContext } from '../../../context/toastContextDef';

// Mock sample sellers conforming to ADM-03, AUTH-03, and schema
const mockSellersList = [
  {
    id: 1,
    user_id: 2,
    business_name: 'Arewa Fresh Farms',
    description: 'Fresh Roma tomatoes and bell peppers from Gombe.',
    location: 'Gombe',
    phone: '+2348031234567',
    approval_status: 'approved',
    rejection_reason: null,
    total_products: 6,
    owner: {
      name: 'Ibrahim Danladi',
      email: 'seller@arewafarms.ng',
      status: 'active',
    },
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-11T10:00:00Z',
  },
  {
    id: 4,
    user_id: 5,
    business_name: 'Danbatta Agro Ventures',
    description: 'Hot peppers and scotch bonnets awaiting onboarding review.',
    location: 'Kano',
    phone: '+2348067890123',
    approval_status: 'pending',
    rejection_reason: null,
    total_products: 0,
    owner: {
      name: 'Musa Abdullahi',
      email: 'pending@newfarm.ng',
      status: 'active',
    },
    created_at: '2026-02-18T14:20:00Z',
    updated_at: '2026-02-18T14:20:00Z',
  },
  {
    id: 5,
    user_id: 9,
    business_name: 'Kaduna Agro Export Ltd',
    description: 'Wholesale farm supplier attempting platform registration.',
    location: 'Kaduna',
    phone: '+2348091122334',
    approval_status: 'rejected',
    rejection_reason:
      'Incomplete business registration documentation and invalid stall address.',
    total_products: 0,
    owner: {
      name: 'Yakubu Danjuma',
      email: 'rejected@farm.ng',
      status: 'active',
    },
    created_at: '2026-02-20T10:00:00Z',
    updated_at: '2026-02-21T11:00:00Z',
  },
  {
    id: 6,
    user_id: 10,
    business_name: 'Niger River Veggies',
    description:
      'Riverbank vegetable seller suspended due to policy violations.',
    location: 'Niger',
    phone: '+2348095566778',
    approval_status: 'suspended',
    rejection_reason: 'Multiple unfulfilled orders reported by buyers.',
    total_products: 2,
    owner: {
      name: 'Suleiman Garba',
      email: 'suspended@seller.ng',
      status: 'suspended',
    },
    created_at: '2026-02-22T10:00:00Z',
    updated_at: '2026-02-23T09:00:00Z',
  },
];

function TestWrapper({
  children,
  initialRoute = '/admin/sellers',
  toastMocks = {},
}) {
  const toastValue = {
    success: toastMocks.success || vi.fn(),
    error: toastMocks.error || vi.fn(),
    info: toastMocks.info || vi.fn(),
  };

  return (
    <ToastContext.Provider value={toastValue}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/admin/sellers" element={children} />
        </Routes>
      </MemoryRouter>
    </ToastContext.Provider>
  );
}

TestWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  initialRoute: PropTypes.string,
  toastMocks: PropTypes.object,
};

describe('FE-098 / ADM-03: Admin Sellers Moderation Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminService, 'getSellers').mockResolvedValue({
      data: mockSellersList,
      meta: {
        total: mockSellersList.length,
        current_page: 1,
        last_page: 1,
      },
      links: {},
    });
    vi.spyOn(adminService, 'updateSellerStatus').mockImplementation(
      async (id, approvalStatus, rejectionReason = '') => {
        const found = mockSellersList.find((s) => s.id === Number(id));
        return {
          ...found,
          approval_status: approvalStatus,
          rejection_reason: rejectionReason || null,
          updated_at: new Date().toISOString(),
        };
      }
    );
  });

  describe('1. Sellers Listing & Table Display (ADM-03, Figma Section 14)', () => {
    it('renders the sellers table with business name, owner, location, approval status, and product count', async () => {
      render(
        <TestWrapper>
          <AdminSellers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('sellers-table')).toBeInTheDocument();
      });

      // Total count badge
      expect(screen.getByTestId('sellers-total-badge')).toHaveTextContent(
        '4 sellers'
      );

      // Check seller 1 (approved)
      expect(screen.getByTestId('seller-name-1')).toHaveTextContent(
        'Arewa Fresh Farms'
      );
      expect(screen.getByTestId('seller-owner-1')).toHaveTextContent(
        'Ibrahim Danladi'
      );
      expect(screen.getByTestId('seller-location-1')).toHaveTextContent(
        'Gombe'
      );
      expect(screen.getByTestId('seller-status-badge-1')).toHaveTextContent(
        'Approved'
      );
      expect(screen.getByTestId('seller-products-count-1')).toHaveTextContent(
        '6'
      );

      // Check seller 4 (pending)
      expect(screen.getByTestId('seller-name-4')).toHaveTextContent(
        'Danbatta Agro Ventures'
      );
      expect(screen.getByTestId('seller-status-badge-4')).toHaveTextContent(
        'Pending Review'
      );

      // Check seller 5 (rejected)
      expect(screen.getByTestId('seller-status-badge-5')).toHaveTextContent(
        'Rejected'
      );

      // Check seller 6 (suspended)
      expect(screen.getByTestId('seller-status-badge-6')).toHaveTextContent(
        'Suspended'
      );
    });
  });

  describe('2. Filter by Pending & Status Filtering (Acceptance Criteria)', () => {
    it('filters by pending status when Pending Review tab is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSellers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tab-filter-pending')).toBeInTheDocument();
      });

      // Click "Pending Review" tab
      await user.click(screen.getByTestId('tab-filter-pending'));

      await waitFor(() => {
        expect(adminService.getSellers).toHaveBeenCalledWith(
          expect.objectContaining({ approval_status: 'pending' })
        );
      });
    });

    it('initializes filter to pending when loaded with ?status=pending URL param', async () => {
      render(
        <TestWrapper initialRoute="/admin/sellers?status=pending">
          <AdminSellers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(adminService.getSellers).toHaveBeenCalledWith(
          expect.objectContaining({ approval_status: 'pending' })
        );
      });

      expect(screen.getByTestId('filter-status-select')).toHaveValue('pending');
    });

    it('filters sellers via status dropdown and search input', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSellers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('filter-status-select')).toBeInTheDocument();
      });

      // Select Suspended from dropdown
      const statusSelect = screen.getByTestId('filter-status-select');
      await user.selectOptions(statusSelect, 'suspended');

      await waitFor(() => {
        expect(adminService.getSellers).toHaveBeenCalledWith(
          expect.objectContaining({ approval_status: 'suspended' })
        );
      });

      // Type search term
      const searchInput = screen.getByTestId('search-sellers-input');
      await user.type(searchInput, 'Niger');

      await waitFor(() => {
        expect(adminService.getSellers).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Niger',
            approval_status: 'suspended',
          })
        );
      });
    });
  });

  describe('3. Approve Seller Application (ADM-03, AUTH-03)', () => {
    it('approves a pending seller application and updates status to approved', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminSellers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('approve-seller-btn-4')).toBeInTheDocument();
      });

      // Click Approve on seller 4 (Danbatta Agro Ventures)
      await user.click(screen.getByTestId('approve-seller-btn-4'));

      // Confirm dialog appears
      await waitFor(() => {
        expect(
          screen.getByTestId('seller-action-confirm-dialog')
        ).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        /approve seller application/i
      );

      // Confirm approval
      const confirmBtn = screen.getByTestId(
        'seller-action-confirm-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(adminService.updateSellerStatus).toHaveBeenCalledWith(
          4,
          'approved',
          ''
        );
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('approved')
      );
    });
  });

  describe('4. Reject Seller Application with Required Reason (Acceptance Criteria & ADM-03)', () => {
    it('enforces mandatory rejection reason when rejecting a seller application', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminSellers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('reject-seller-btn-4')).toBeInTheDocument();
      });

      // Click Reject on pending seller 4
      await user.click(screen.getByTestId('reject-seller-btn-4'));

      // Confirm dialog with reason textarea appears
      await waitFor(() => {
        expect(
          screen.getByTestId('seller-action-confirm-dialog')
        ).toBeInTheDocument();
      });

      const confirmBtn = screen.getByTestId(
        'seller-action-confirm-dialog-confirm-button'
      );
      const reasonInput = screen.getByTestId(
        'seller-action-confirm-dialog-reason-input'
      );

      // Attempt submit without reason -> blocked by validation
      await user.click(confirmBtn);
      expect(adminService.updateSellerStatus).not.toHaveBeenCalled();

      // Enter valid rejection reason
      await user.type(
        reasonInput,
        'Invalid stall address and expired business permit.'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(adminService.updateSellerStatus).toHaveBeenCalledWith(
          4,
          'rejected',
          'Invalid stall address and expired business permit.'
        );
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('rejected')
      );
    });
  });

  describe('5. Suspend Seller Account (ADM-03, TC-30)', () => {
    it('suspends an approved seller and hides their products from marketplace', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminSellers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('suspend-seller-btn-1')).toBeInTheDocument();
      });

      // Click Suspend on approved seller 1 (Arewa Fresh Farms)
      await user.click(screen.getByTestId('suspend-seller-btn-1'));

      await waitFor(() => {
        expect(
          screen.getByTestId('seller-action-confirm-dialog')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/hide all of their products from the marketplace/i)
      ).toBeInTheDocument();

      const confirmBtn = screen.getByTestId(
        'seller-action-confirm-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(adminService.updateSellerStatus).toHaveBeenCalledWith(
          1,
          'suspended',
          ''
        );
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('suspended')
      );
    });
  });

  describe('6. Reactivate Suspended Seller (ADM-03)', () => {
    it('reactivates a suspended seller account back to approved', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminSellers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('reactivate-seller-btn-6')
        ).toBeInTheDocument();
      });

      // Click Reactivate on suspended seller 6
      await user.click(screen.getByTestId('reactivate-seller-btn-6'));

      await waitFor(() => {
        expect(
          screen.getByTestId('seller-action-confirm-dialog')
        ).toBeInTheDocument();
      });

      const confirmBtn = screen.getByTestId(
        'seller-action-confirm-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(adminService.updateSellerStatus).toHaveBeenCalledWith(
          6,
          'approved',
          ''
        );
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('reactivated')
      );
    });
  });

  describe('7. View Seller Profile Modal (Figma Section 14)', () => {
    it('opens view seller modal displaying full profile, location, and rejection notes', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminSellers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('view-seller-btn-5')).toBeInTheDocument();
      });

      // Click View on rejected seller 5 (Kaduna Agro Export Ltd)
      await user.click(screen.getByTestId('view-seller-btn-5'));

      await waitFor(() => {
        expect(screen.getByTestId('view-seller-modal')).toBeInTheDocument();
      });

      expect(screen.getByTestId('modal-business-name')).toHaveTextContent(
        'Kaduna Agro Export Ltd'
      );
      expect(screen.getByTestId('modal-seller-location')).toHaveTextContent(
        'Kaduna'
      );
      expect(screen.getByTestId('modal-seller-owner')).toHaveTextContent(
        'Yakubu Danjuma'
      );
      expect(
        screen.getByTestId('modal-rejection-reason-block')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('modal-rejection-reason-block')
      ).toHaveTextContent(/Incomplete business registration documentation/i);

      // Close modal
      const closeBtn = screen.getByTestId('modal-close-btn');
      await user.click(closeBtn);

      await waitFor(() => {
        expect(
          screen.queryByTestId('view-seller-modal')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('8. Empty & Error States', () => {
    it('shows EmptyState when no sellers match the filter', async () => {
      vi.spyOn(adminService, 'getSellers').mockResolvedValue({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1 },
        links: {},
      });

      render(
        <TestWrapper>
          <AdminSellers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('sellers-empty-state')).toBeInTheDocument();
      });
    });

    it('shows ErrorState with retry button when getSellers fails', async () => {
      vi.spyOn(adminService, 'getSellers').mockRejectedValueOnce(
        new Error('Failed to load sellers')
      );

      render(
        <TestWrapper>
          <AdminSellers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('sellers-error-state')).toBeInTheDocument();
      });

      // Retry
      vi.spyOn(adminService, 'getSellers').mockResolvedValueOnce({
        data: mockSellersList,
        meta: { total: mockSellersList.length },
      });
      const user = userEvent.setup();
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId('sellers-table')).toBeInTheDocument();
      });
    });
  });
});
