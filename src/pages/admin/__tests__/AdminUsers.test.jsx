import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AdminUsers } from '../AdminUsers';
import { adminService } from '../../../services/adminService';
import { AuthContext } from '../../../context/authContextDef';
import { ToastContext } from '../../../context/toastContextDef';

// Mock logged-in administrator (ID: 1)
const mockCurrentAdmin = {
  id: 1,
  name: 'Platform Administrator',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active',
};

// Mock user list conforming to ADM-02, AUTH-12 & schema
const mockUsersList = [
  {
    id: 1,
    name: 'Platform Administrator',
    email: 'admin@example.com',
    phone: '+2348010000001',
    role: 'admin',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Ibrahim Danladi',
    email: 'seller@arewafarms.ng',
    phone: '+2348031234567',
    role: 'seller',
    status: 'active',
    seller_profile: {
      business_name: 'Arewa Fresh Farms',
      location: 'Gombe',
      approval_status: 'approved',
    },
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 6,
    name: 'Amina Bello',
    email: 'buyer@example.com',
    phone: '+2348078901234',
    role: 'buyer',
    status: 'active',
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 8,
    name: 'Suspended Account User',
    email: 'suspended@example.ng',
    phone: '+2348090123456',
    role: 'buyer',
    status: 'suspended',
    created_at: '2026-01-05T10:00:00Z',
    updated_at: '2026-02-10T16:00:00Z',
  },
];

function TestWrapper({
  children,
  currentUser = mockCurrentAdmin,
  toastMocks = {},
}) {
  const authValue = {
    user: currentUser,
    isAuthenticated: Boolean(currentUser),
    role: currentUser?.role,
    logout: vi.fn(),
  };

  const toastValue = {
    success: toastMocks.success || vi.fn(),
    error: toastMocks.error || vi.fn(),
    info: toastMocks.info || vi.fn(),
  };

  return (
    <AuthContext.Provider value={authValue}>
      <ToastContext.Provider value={toastValue}>
        <MemoryRouter initialEntries={['/admin/users']}>
          <Routes>
            <Route path="/admin/users" element={children} />
          </Routes>
        </MemoryRouter>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

TestWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  currentUser: PropTypes.object,
  toastMocks: PropTypes.object,
};

describe('FE-097 / ADM-02: Admin Users Management Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminService, 'getUsers').mockResolvedValue({
      data: mockUsersList,
      meta: {
        total: mockUsersList.length,
        current_page: 1,
        last_page: 1,
      },
      links: {},
    });
    vi.spyOn(adminService, 'updateUserStatus').mockImplementation(
      async (id, status) => {
        const found = mockUsersList.find((u) => u.id === Number(id));
        return {
          ...found,
          status,
          updated_at: new Date().toISOString(),
        };
      }
    );
  });

  describe('1. Users Listing & Table Display (ADM-02, Figma Section 14)', () => {
    it('renders the searchable users table with user information, roles, and statuses', async () => {
      render(
        <TestWrapper>
          <AdminUsers />
        </TestWrapper>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getByTestId('users-table')).toBeInTheDocument();
      });

      // Total badge
      expect(screen.getByTestId('users-total-badge')).toHaveTextContent(
        '4 accounts'
      );

      // Check rows rendered
      expect(screen.getByTestId('user-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('user-row-2')).toBeInTheDocument();
      expect(screen.getByTestId('user-row-6')).toBeInTheDocument();
      expect(screen.getByTestId('user-row-8')).toBeInTheDocument();

      // Check user details in row 2 (seller)
      expect(screen.getByTestId('user-name-2')).toHaveTextContent(
        'Ibrahim Danladi'
      );
      expect(screen.getByTestId('user-email-2')).toHaveTextContent(
        'seller@arewafarms.ng'
      );
      expect(screen.getByTestId('user-phone-2')).toHaveTextContent(
        '+2348031234567'
      );
      expect(screen.getByTestId('user-role-badge-2')).toHaveTextContent(
        'Seller'
      );
      expect(screen.getByTestId('user-status-badge-2')).toHaveTextContent(
        'Active'
      );

      // Check row 8 (suspended buyer)
      expect(screen.getByTestId('user-role-badge-8')).toHaveTextContent(
        'Buyer'
      );
      expect(screen.getByTestId('user-status-badge-8')).toHaveTextContent(
        'Suspended'
      );
    });
  });

  describe('2. Search & Filter Controls (ADM-02)', () => {
    it('triggers search query filtering when typing in the search bar', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminUsers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('search-users-input')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-users-input');
      await user.type(searchInput, 'Danladi');

      await waitFor(() => {
        expect(adminService.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Danladi' })
        );
      });
    });

    it('filters users by role (buyer, seller, admin)', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminUsers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('filter-role-select')).toBeInTheDocument();
      });

      const roleSelect = screen.getByTestId('filter-role-select');
      await user.selectOptions(roleSelect, 'seller');

      await waitFor(() => {
        expect(adminService.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'seller' })
        );
      });
    });

    it('filters users by status (active vs suspended)', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminUsers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('filter-status-select')).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId('filter-status-select');
      await user.selectOptions(statusSelect, 'suspended');

      await waitFor(() => {
        expect(adminService.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'suspended' })
        );
      });
    });

    it('clears active filters when Reset Filters button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminUsers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('search-users-input')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-users-input');
      await user.type(searchInput, 'Arewa');

      // Clear button appears
      const clearBtn = await screen.findByTestId('clear-filters-btn');
      await user.click(clearBtn);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('3. View User Account Modal (Figma Section 14)', () => {
    it('opens view user modal with comprehensive profile details', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminUsers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('view-user-btn-2')).toBeInTheDocument();
      });

      // Click "View" for seller Ibrahim Danladi
      await user.click(screen.getByTestId('view-user-btn-2'));

      // Modal appears
      await waitFor(() => {
        expect(screen.getByTestId('view-user-modal')).toBeInTheDocument();
      });

      expect(screen.getByTestId('modal-user-name')).toHaveTextContent(
        'Ibrahim Danladi'
      );
      expect(screen.getByTestId('modal-user-id')).toHaveTextContent('#2');
      expect(screen.getByTestId('modal-user-email')).toHaveTextContent(
        'seller@arewafarms.ng'
      );
      expect(screen.getByTestId('modal-user-phone')).toHaveTextContent(
        '+2348031234567'
      );

      // Seller linked profile section
      expect(
        screen.getByTestId('modal-seller-profile-section')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('modal-seller-profile-section')
      ).toHaveTextContent('Arewa Fresh Farms');
      expect(
        screen.getByTestId('modal-seller-profile-section')
      ).toHaveTextContent('Gombe');

      // Close modal
      const closeBtn = screen.getByTestId('modal-close-btn');
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('view-user-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('4. Deactivate User Account (ADM-02, AUTH-12)', () => {
    it('opens confirmation dialog and deactivates active user account', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminUsers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('deactivate-user-btn-6')).toBeInTheDocument();
      });

      // Click Deactivate for user Amina Bello (ID: 6)
      await user.click(screen.getByTestId('deactivate-user-btn-6'));

      // Confirmation dialog appears
      await waitFor(() => {
        expect(
          screen.getByTestId('user-status-confirm-dialog')
        ).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        /deactivate user account/i
      );

      // Confirm deactivation
      const confirmBtn = screen.getByTestId(
        'user-status-confirm-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(adminService.updateUserStatus).toHaveBeenCalledWith(
          6,
          'suspended'
        );
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('deactivated')
      );
    });

    it('prevents current admin from deactivating their own account (self-lockout guard)', async () => {
      render(
        <TestWrapper currentUser={mockCurrentAdmin}>
          <AdminUsers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('deactivate-user-btn-1')).toBeInTheDocument();
      });

      const selfDeactivateBtn = screen.getByTestId('deactivate-user-btn-1');
      expect(selfDeactivateBtn).toBeDisabled();
      expect(selfDeactivateBtn).toHaveAttribute(
        'title',
        'You cannot deactivate your own account'
      );
    });
  });

  describe('5. Reactivate User Account (ADM-02, AUTH-12)', () => {
    it('opens confirmation dialog and reactivates suspended user account', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminUsers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('reactivate-user-btn-8')).toBeInTheDocument();
      });

      // Click Reactivate on suspended user (ID: 8)
      await user.click(screen.getByTestId('reactivate-user-btn-8'));

      // Confirmation dialog appears
      await waitFor(() => {
        expect(
          screen.getByTestId('user-status-confirm-dialog')
        ).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        /reactivate user account/i
      );

      // Confirm reactivation
      const confirmBtn = screen.getByTestId(
        'user-status-confirm-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(adminService.updateUserStatus).toHaveBeenCalledWith(8, 'active');
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('reactivated')
      );
    });
  });

  describe('6. Empty & Error States', () => {
    it('shows EmptyState when no users match search or filter query', async () => {
      vi.spyOn(adminService, 'getUsers').mockResolvedValue({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1 },
        links: {},
      });

      render(
        <TestWrapper>
          <AdminUsers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('users-empty-state')).toBeInTheDocument();
      });
    });

    it('shows ErrorState with retry button when service request fails', async () => {
      vi.spyOn(adminService, 'getUsers').mockRejectedValueOnce(
        new Error('Network error loading users')
      );

      render(
        <TestWrapper>
          <AdminUsers />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('users-error-state')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Network error loading users/i)
      ).toBeInTheDocument();

      // Retry
      vi.spyOn(adminService, 'getUsers').mockResolvedValueOnce({
        data: mockUsersList,
        meta: { total: mockUsersList.length },
      });
      const user = userEvent.setup();
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId('users-table')).toBeInTheDocument();
      });
    });
  });
});
