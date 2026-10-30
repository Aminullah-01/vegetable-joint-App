import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AdminAuditLog } from '../AdminAuditLog';
import { adminService } from '../../../services/adminService';

// Sample audit logs conforming to ADM-09, NFR-OBS-01, and schema
const mockAuditEntries = [
  {
    id: 1,
    user_id: 1,
    action: 'seller.approved',
    entity_type: 'seller_profile',
    entity_id: 1,
    ip_address: '197.210.65.12',
    metadata: {
      business_name: 'Arewa Fresh Farms',
      reviewed_by: 'Platform Administrator',
    },
    created_at: '2026-01-11T10:00:00Z',
    user: {
      id: 1,
      name: 'Platform Administrator',
      email: 'admin@example.com',
      role: 'admin',
    },
  },
  {
    id: 2,
    user_id: 1,
    action: 'user.suspended',
    entity_type: 'user',
    entity_id: 8,
    ip_address: '197.210.65.12',
    metadata: {
      reason: 'Repeated non-payment violation reported by sellers.',
    },
    created_at: '2026-02-10T16:00:00Z',
    user: {
      id: 1,
      name: 'Platform Administrator',
      email: 'admin@example.com',
      role: 'admin',
    },
  },
  {
    id: 3,
    user_id: null,
    action: 'auth.failed_login',
    entity_type: 'user',
    entity_id: null,
    ip_address: '102.89.23.44',
    metadata: {
      email: 'intruder@unknown.com',
      reason: 'Invalid credentials',
    },
    created_at: '2026-02-25T21:40:00Z',
    user: null,
  },
  {
    id: 4,
    user_id: 1,
    action: 'order.status_override',
    entity_type: 'order',
    entity_id: 4,
    ip_address: '197.210.65.12',
    metadata: {
      order_number: 'ORD-2026-004',
      from_status: 'ready',
      to_status: 'cancelled',
      reason:
        'Buyer vehicle broke down; mutual agreement with seller to cancel.',
    },
    created_at: '2026-02-28T17:25:00Z',
    user: {
      id: 1,
      name: 'Platform Administrator',
      email: 'admin@example.com',
      role: 'admin',
    },
  },
  {
    id: 5,
    user_id: 2,
    action: 'auth.login',
    entity_type: 'user',
    entity_id: 2,
    ip_address: '105.112.98.54',
    metadata: {
      method: 'password',
    },
    created_at: '2026-03-05T07:50:00Z',
    user: {
      id: 2,
      name: 'Ibrahim Danladi',
      email: 'seller@arewafarms.ng',
      role: 'seller',
    },
  },
  {
    id: 6,
    user_id: 1,
    action: 'settings.updated',
    entity_type: 'site_settings',
    entity_id: null,
    ip_address: '197.210.65.12',
    metadata: {
      keys_changed: ['support_text', 'contact_phone'],
    },
    created_at: '2026-03-15T09:40:00Z',
    user: {
      id: 1,
      name: 'Platform Administrator',
      email: 'admin@example.com',
      role: 'admin',
    },
  },
];

const mockUsersData = [
  {
    id: 1,
    name: 'Platform Administrator',
    role: 'admin',
    email: 'admin@example.com',
  },
  {
    id: 2,
    name: 'Ibrahim Danladi',
    role: 'seller',
    email: 'seller@arewafarms.ng',
  },
  { id: 6, name: 'Amina Bello', role: 'buyer', email: 'buyer@example.com' },
];

function TestWrapper({ children }) {
  return (
    <MemoryRouter initialEntries={['/admin/audit-log']}>
      <Routes>
        <Route path="/admin/audit-log" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

TestWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

describe('FE-104 / ADM-09: Admin Audit Log Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminService, 'getUsers').mockResolvedValue({
      data: mockUsersData,
    });
    vi.spyOn(adminService, 'getAuditLogs').mockImplementation(
      async (params = {}) => {
        let filtered = [...mockAuditEntries];

        if (params.user_id && params.user_id !== 'all') {
          if (params.user_id === 'null') {
            filtered = filtered.filter((l) => l.user_id === null);
          } else {
            filtered = filtered.filter(
              (l) => Number(l.user_id) === Number(params.user_id)
            );
          }
        }

        if (params.action && params.action !== 'all') {
          filtered = filtered.filter((l) => l.action === params.action);
        }

        if (params.date) {
          filtered = filtered.filter(
            (l) =>
              new Date(l.created_at).toISOString().split('T')[0] === params.date
          );
        }

        if (params.date_from) {
          filtered = filtered.filter(
            (l) =>
              new Date(l.created_at).getTime() >=
              new Date(params.date_from).getTime()
          );
        }

        if (params.date_to) {
          const toTime = new Date(params.date_to).setHours(23, 59, 59, 999);
          filtered = filtered.filter(
            (l) => new Date(l.created_at).getTime() <= toTime
          );
        }

        if (params.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter(
            (l) =>
              l.action.toLowerCase().includes(s) ||
              l.ip_address.toLowerCase().includes(s) ||
              (l.metadata &&
                JSON.stringify(l.metadata).toLowerCase().includes(s))
          );
        }

        return {
          data: filtered,
          meta: {
            total: filtered.length,
            current_page: params.page || 1,
            last_page: 1,
          },
        };
      }
    );
  });

  describe('1. Audit Logs Listing & Rendering (ADM-09, Figma Section 14)', () => {
    it('renders the header, KPI summary counters, and audit log table with required columns', async () => {
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      // Verify Title
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /Admin Audit Log/i,
        })
      ).toBeInTheDocument();

      // Verify KPI Summary Cards
      expect(screen.getByTestId('kpi-total-events')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-total-count')).toHaveTextContent('6');

      // Verify Table Headers
      expect(screen.getByText(/Timestamp \(WAT\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Actor \/ User/i)).toBeInTheDocument();
      expect(screen.getByText(/Target Entity/i)).toBeInTheDocument();
      expect(screen.getByText(/IP Address/i)).toBeInTheDocument();

      // Verify Rows
      expect(screen.getByTestId('audit-log-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('log-action-badge-1')).toHaveTextContent(
        /Seller · Approved/i
      );
      expect(screen.getByTestId('log-entity-1')).toHaveTextContent(
        'Arewa Fresh Farms'
      );
      expect(screen.getByTestId('log-ip-1')).toHaveTextContent('197.210.65.12');

      // Verify Anonymous / System User Row
      expect(screen.getByTestId('audit-log-row-3')).toBeInTheDocument();
      expect(screen.getByTestId('log-user-3')).toHaveTextContent(
        'System / Anonymous'
      );
      expect(screen.getByTestId('log-action-badge-3')).toHaveTextContent(
        /Auth · Failed Login/i
      );
    });
  });

  describe('2. Filtering by User (ADM-09)', () => {
    it('filters audit records by specific user', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });

      const userSelect = screen.getByTestId('filter-user-select');
      await user.selectOptions(userSelect, '2'); // Ibrahim Danladi (seller)

      await waitFor(() => {
        expect(adminService.getAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({ user_id: '2' })
        );
      });

      // Only row 5 should be present
      expect(screen.getByTestId('audit-log-row-5')).toBeInTheDocument();
      expect(screen.queryByTestId('audit-log-row-1')).not.toBeInTheDocument();
    });

    it('filters for anonymous / system security events', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });

      const userSelect = screen.getByTestId('filter-user-select');
      await user.selectOptions(userSelect, 'null'); // System / Anonymous

      await waitFor(() => {
        expect(adminService.getAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({ user_id: 'null' })
        );
      });

      expect(screen.getByTestId('audit-log-row-3')).toBeInTheDocument();
      expect(screen.queryByTestId('audit-log-row-2')).not.toBeInTheDocument();
    });
  });

  describe('3. Filtering by Action (ADM-09)', () => {
    it('filters audit records by specific action', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });

      const actionSelect = screen.getByTestId('filter-action-select');
      await user.selectOptions(actionSelect, 'order.status_override');

      await waitFor(() => {
        expect(adminService.getAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'order.status_override' })
        );
      });

      // Row 4 is order.status_override
      expect(screen.getByTestId('audit-log-row-4')).toBeInTheDocument();
      expect(screen.getByTestId('log-summary-4')).toHaveTextContent(
        /ready → cancelled/i
      );
      expect(screen.queryByTestId('audit-log-row-1')).not.toBeInTheDocument();
    });
  });

  describe('4. Filtering by Date (ADM-09)', () => {
    it('filters logs by exact single date', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });

      const dateInput = screen.getByTestId('filter-date-input');
      await user.type(dateInput, '2026-02-10');

      await waitFor(() => {
        expect(adminService.getAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({ date: '2026-02-10' })
        );
      });

      expect(screen.getByTestId('audit-log-row-2')).toBeInTheDocument();
      expect(screen.queryByTestId('audit-log-row-1')).not.toBeInTheDocument();
    });

    it('toggles to date range mode and filters by date_from and date_to', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });

      // Switch to range mode
      await user.click(screen.getByTestId('date-mode-range-btn'));

      const fromInput = screen.getByTestId('filter-date-from-input');
      const toInput = screen.getByTestId('filter-date-to-input');

      await user.type(fromInput, '2026-02-01');
      await user.type(toInput, '2026-02-28');

      await waitFor(() => {
        expect(adminService.getAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            date_from: '2026-02-01',
            date_to: '2026-02-28',
          })
        );
      });

      // February logs: rows 2, 3, 4
      expect(screen.getByTestId('audit-log-row-2')).toBeInTheDocument();
      expect(screen.getByTestId('audit-log-row-3')).toBeInTheDocument();
      expect(screen.getByTestId('audit-log-row-4')).toBeInTheDocument();
      expect(screen.queryByTestId('audit-log-row-1')).not.toBeInTheDocument();
    });
  });

  describe('5. Keyword Search & Reset Filters', () => {
    it('searches logs by keyword and resets all filters when clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('filter-search-input');
      await user.type(searchInput, 'intruder');

      await waitFor(() => {
        expect(adminService.getAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'intruder' })
        );
      });

      expect(screen.getByTestId('audit-log-row-3')).toBeInTheDocument();
      expect(screen.queryByTestId('audit-log-row-1')).not.toBeInTheDocument();

      // Reset button appears
      const resetBtn = screen.getByTestId('reset-filters-button');
      expect(resetBtn).toBeInTheDocument();

      await user.click(resetBtn);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        expect(screen.getByTestId('audit-log-row-1')).toBeInTheDocument();
      });
    });
  });

  describe('6. Event Inspection Modal (Figma Section 14, NFR-OBS-01)', () => {
    it('opens detail modal to inspect raw event metadata and closes properly', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });

      // Click Inspect on row 4 (order override)
      const inspectBtn = screen.getByTestId('inspect-log-4');
      await user.click(inspectBtn);

      // Verify modal is open
      expect(
        await screen.findByTestId('audit-inspect-modal')
      ).toBeInTheDocument();

      expect(screen.getByTestId('modal-actor-name')).toHaveTextContent(
        'Platform Administrator'
      );
      expect(screen.getByTestId('modal-entity-id')).toHaveTextContent(
        'order (#4)'
      );
      expect(screen.getByTestId('modal-ip-address')).toHaveTextContent(
        '197.210.65.12'
      );

      // JSON payload includes override reason
      expect(screen.getByTestId('modal-metadata-json')).toHaveTextContent(
        'Buyer vehicle broke down'
      );

      // Close modal
      const closeBtn = screen.getByTestId('modal-close-button');
      await user.click(closeBtn);

      await waitFor(() => {
        expect(
          screen.queryByTestId('audit-inspect-modal')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('7. Pagination & Per Page Selection', () => {
    it('allows changing items per page', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });

      const perPageSelect = screen.getByTestId('audit-per-page-select');
      await user.selectOptions(perPageSelect, '20');

      await waitFor(() => {
        expect(adminService.getAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({ per_page: 20 })
        );
      });
    });
  });

  describe('8. Refresh & Export', () => {
    it('re-fetches logs when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });

      const refreshBtn = screen.getByTestId('refresh-audit-button');
      await user.click(refreshBtn);

      await waitFor(() => {
        expect(adminService.getAuditLogs).toHaveBeenCalledTimes(2);
      });
    });

    it('has an enabled Export JSON button when logs are loaded', async () => {
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });

      const exportBtn = screen.getByTestId('export-audit-logs-button');
      expect(exportBtn).toBeEnabled();
    });
  });

  describe('9. Empty & Error States', () => {
    it('displays empty state when no logs match filters and allows clearing filters', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('filter-search-input');
      await user.type(searchInput, 'nonexistent_pattern_12345');

      expect(
        await screen.findByTestId('audit-empty-state')
      ).toBeInTheDocument();
      expect(screen.getByText(/No Audit Logs Found/i)).toBeInTheDocument();

      const clearBtn = screen.getByTestId('empty-clear-filters-btn');
      await user.click(clearBtn);

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });
    });

    it('renders ErrorState with retry when API fails', async () => {
      adminService.getAuditLogs.mockRejectedValueOnce(
        new Error('Failed to connect to audit repository')
      );

      render(
        <TestWrapper>
          <AdminAuditLog />
        </TestWrapper>
      );

      expect(
        await screen.findByTestId('audit-error-state')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Failed to connect to audit repository/i)
      ).toBeInTheDocument();

      // Retry
      adminService.getAuditLogs.mockResolvedValueOnce({
        data: mockAuditEntries,
        meta: { total: mockAuditEntries.length },
      });

      const retryBtn = screen.getByRole('button', {
        name: /Retry Loading Logs/i,
      });
      await userEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-table')).toBeInTheDocument();
      });
    });
  });
});
