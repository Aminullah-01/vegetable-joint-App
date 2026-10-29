import { useState, useEffect, useContext } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks';
import { ToastContext } from '../../context/toastContextDef';
import {
  Button,
  Modal,
  ConfirmDialog,
  Pagination,
  TableSkeleton,
  EmptyState,
  ErrorState,
} from '../../components/common';
import { formatDate } from '../../utils/formatters';

/**
 * Return badge colors and labels for roles
 */
function getRoleBadgeStyle(role) {
  switch (role) {
    case 'admin':
      return {
        bg: '#fef3c7',
        color: '#92400e',
        border: '#fde68a',
        label: 'Admin',
        icon: '🛡️',
      };
    case 'seller':
      return {
        bg: '#ecfdf5',
        color: '#065f46',
        border: '#a7f3d0',
        label: 'Seller',
        icon: '🌾',
      };
    case 'buyer':
    default:
      return {
        bg: '#e0f2fe',
        color: '#0369a1',
        border: '#bae6fd',
        label: 'Buyer',
        icon: '🛒',
      };
  }
}

/**
 * Return badge colors and labels for account statuses
 */
function getStatusBadgeStyle(status) {
  const isSuspended = status === 'suspended' || status === 'deactivated';
  if (isSuspended) {
    return {
      bg: '#fee2e2',
      color: '#991b1b',
      border: '#fecaca',
      label: 'Suspended',
      icon: '⛔',
    };
  }
  return {
    bg: '#dcfce7',
    color: '#166534',
    border: '#bbf7d0',
    label: 'Active',
    icon: '✓',
  };
}

/**
 * AdminUsers — User Management Page (SRS ADM-02, AUTH-12, Figma Section 14)
 *
 * Requirements:
 * - ADM-02: Admins shall be able to list, search, view, deactivate and reactivate user accounts.
 * - AUTH-12: The system shall prevent suspended or deactivated users from logging in.
 * - Figma Section 14: Searchable table (User, Email, Phone, Role, Status, Registration Date, Actions: View, Deactivate, Reactivate).
 */
export function AdminUsers() {
  const { user: currentAdmin } = useAuth();
  const toast = useContext(ToastContext);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Data states
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal & Dialog states
  const [viewingUser, setViewingUser] = useState(null);
  const [confirmStatusAction, setConfirmStatusAction] = useState(null); // { user, targetStatus }
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);

  // Fetch users on filter, search, page or refresh changes
  useEffect(() => {
    let isMounted = true;

    async function fetchUsers() {
      try {
        setIsLoading(true);
        setError(null);

        const params = {
          page: currentPage,
          per_page: itemsPerPage,
        };

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }
        if (roleFilter !== 'all') {
          params.role = roleFilter;
        }
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }

        const response = await adminService.getUsers(params);

        if (!isMounted) return;

        const userList = Array.isArray(response)
          ? response
          : response?.data || [];
        setUsers(userList);
        setMeta(
          response?.meta || {
            total: userList.length,
            current_page: currentPage,
            last_page: Math.ceil(userList.length / itemsPerPage) || 1,
          }
        );
      } catch (err) {
        if (isMounted) {
          setError(
            err?.message || 'Unable to load user accounts. Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, roleFilter, statusFilter, currentPage, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // Open status change confirm dialog
  const promptStatusChange = (targetUser, targetStatus) => {
    setConfirmStatusAction({
      user: targetUser,
      targetStatus,
    });
  };

  // Execute status change (deactivate or reactivate)
  const handleConfirmStatusChange = async () => {
    if (!confirmStatusAction) return;

    const { user: targetUser, targetStatus } = confirmStatusAction;
    setIsUpdatingStatus(true);
    setActionAlert(null);

    try {
      const updatedUser = await adminService.updateUserStatus(
        targetUser.id,
        targetStatus
      );

      // Update in local users state
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, ...updatedUser } : u))
      );

      // If modal is open for this user, update modal data
      if (viewingUser && viewingUser.id === targetUser.id) {
        setViewingUser((prev) => ({ ...prev, ...updatedUser }));
      }

      const successMsg = `User "${targetUser.name}" has been successfully ${
        targetStatus === 'active' ? 'reactivated' : 'deactivated'
      }.`;

      if (toast?.success) {
        toast.success(successMsg);
      } else {
        setActionAlert({ type: 'success', message: successMsg });
      }

      setConfirmStatusAction(null);
    } catch (err) {
      const errMsg =
        err?.message ||
        `Failed to update status for user "${targetUser.name}".`;
      if (toast?.error) {
        toast.error(errMsg);
      } else {
        setActionAlert({ type: 'error', message: errMsg });
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    roleFilter !== 'all' ||
    statusFilter !== 'all';

  return (
    <div
      data-testid="admin-users-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        data-testid="admin-users-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              User Management
            </h1>
            <span
              data-testid="users-total-badge"
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: '600',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                border: '1px solid #e2e8f0',
              }}
            >
              {meta.total} {meta.total === 1 ? 'account' : 'accounts'}
            </span>
          </div>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.95rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            Search, view, deactivate, and reactivate buyer and seller accounts
            (ADM-02, AUTH-12).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="refresh-users-btn"
            aria-label="Refresh user accounts list"
          >
            <span
              style={{ display: 'inline-block', marginRight: '0.35rem' }}
              aria-hidden="true"
            >
              🔄
            </span>
            Refresh
          </Button>
        </div>
      </div>

      {/* Inline Feedback / Alert Banner */}
      {actionAlert && (
        <div
          role="alert"
          data-testid="users-action-alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            backgroundColor:
              actionAlert.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: actionAlert.type === 'error' ? '#991b1b' : '#166534',
            border: `1px solid ${
              actionAlert.type === 'error' ? '#fecaca' : '#bbf7d0'
            }`,
          }}
        >
          <span>{actionAlert.message}</span>
          <button
            type="button"
            onClick={() => setActionAlert(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 'bold',
            }}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search and Filters Toolbar */}
      <div
        data-testid="users-filters-toolbar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: '#ffffff',
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        {/* Search Input */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '1rem',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            type="search"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="search-users-input"
            aria-label="Search users"
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            htmlFor="filter-role"
            style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}
          >
            Role:
          </label>
          <select
            id="filter-role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="filter-role-select"
            aria-label="Filter by role"
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Roles</option>
            <option value="buyer">Buyers</option>
            <option value="seller">Sellers</option>
            <option value="admin">Administrators</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            htmlFor="filter-status"
            style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}
          >
            Status:
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="filter-status-select"
            aria-label="Filter by status"
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended / Deactivated</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            data-testid="clear-filters-btn"
            style={{ color: '#64748b' }}
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Main Table / State View */}
      {isLoading ? (
        <div data-testid="users-loading-state" style={{ padding: '1rem 0' }}>
          <TableSkeleton rows={6} columns={6} />
        </div>
      ) : error ? (
        <div data-testid="users-error-state" style={{ padding: '1rem 0' }}>
          <ErrorState
            title="Failed to Load Users"
            message={error}
            onRetry={handleRefresh}
            retryLabel="Retry"
          />
        </div>
      ) : users.length === 0 ? (
        <div data-testid="users-empty-state">
          <EmptyState
            title={hasActiveFilters ? 'No Matching Users' : 'No Users Found'}
            message={
              hasActiveFilters
                ? 'No user accounts match your search or filter parameters. Try adjusting or clearing your filters.'
                : 'There are currently no registered users on the marketplace.'
            }
            action={
              hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Clear All Filters
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table
              data-testid="users-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#475569',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '0.85rem 1rem' }}>User</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Email</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Phone</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Registered</th>
                  <th
                    style={{
                      padding: '0.85rem 1rem',
                      textAlign: 'right',
                      minWidth: '180px',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => {
                  const roleStyle = getRoleBadgeStyle(item.role);
                  const statusStyle = getStatusBadgeStyle(item.status);
                  const isCurrentAdmin = currentAdmin?.id === item.id;
                  const isSuspended =
                    item.status === 'suspended' ||
                    item.status === 'deactivated';

                  return (
                    <tr
                      key={item.id}
                      data-testid={`user-row-${item.id}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Column 1: User Name & Avatar */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                          }}
                        >
                          <div
                            aria-hidden="true"
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: roleStyle.bg,
                              color: roleStyle.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              border: `1px solid ${roleStyle.border}`,
                              flexShrink: 0,
                            }}
                          >
                            {item.name
                              ? item.name.charAt(0).toUpperCase()
                              : 'U'}
                          </div>
                          <div>
                            <strong
                              data-testid={`user-name-${item.id}`}
                              style={{
                                display: 'block',
                                color: '#0f172a',
                                fontWeight: '600',
                              }}
                            >
                              {item.name}
                            </strong>
                            <span
                              style={{ fontSize: '0.75rem', color: '#94a3b8' }}
                            >
                              ID: #{item.id}
                              {isCurrentAdmin && ' (You)'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Email */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`user-email-${item.id}`}
                          style={{ color: '#334155' }}
                        >
                          {item.email}
                        </span>
                      </td>

                      {/* Column 3: Phone */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`user-phone-${item.id}`}
                          style={{ color: '#475569' }}
                        >
                          {item.phone || '—'}
                        </span>
                      </td>

                      {/* Column 4: Role */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`user-role-badge-${item.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: roleStyle.bg,
                            color: roleStyle.color,
                            border: `1px solid ${roleStyle.border}`,
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            textTransform: 'capitalize',
                          }}
                        >
                          <span aria-hidden="true">{roleStyle.icon}</span>
                          {roleStyle.label}
                        </span>
                      </td>

                      {/* Column 5: Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`user-status-badge-${item.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                          }}
                        >
                          <span aria-hidden="true">{statusStyle.icon}</span>
                          {statusStyle.label}
                        </span>
                      </td>

                      {/* Column 6: Registration Date */}
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                        <time dateTime={item.created_at}>
                          {formatDate(item.created_at, { format: 'date' }) ||
                            '—'}
                        </time>
                      </td>

                      {/* Column 7: Actions */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          textAlign: 'right',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: '0.5rem',
                            alignItems: 'center',
                          }}
                        >
                          {/* View Action */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-testid={`view-user-btn-${item.id}`}
                            onClick={() => setViewingUser(item)}
                            aria-label={`View account details for ${item.name}`}
                          >
                            View
                          </Button>

                          {/* Deactivate / Reactivate Action */}
                          {isSuspended ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid={`reactivate-user-btn-${item.id}`}
                              onClick={() => promptStatusChange(item, 'active')}
                              style={{
                                color: '#16a34a',
                                borderColor: '#86efac',
                                backgroundColor: '#f0fdf4',
                              }}
                              aria-label={`Reactivate account for ${item.name}`}
                            >
                              Reactivate
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid={`deactivate-user-btn-${item.id}`}
                              disabled={isCurrentAdmin}
                              onClick={() =>
                                promptStatusChange(item, 'suspended')
                              }
                              title={
                                isCurrentAdmin
                                  ? 'You cannot deactivate your own account'
                                  : `Deactivate ${item.name}`
                              }
                              style={{
                                color: isCurrentAdmin ? '#94a3b8' : '#dc2626',
                                borderColor: isCurrentAdmin
                                  ? '#e2e8f0'
                                  : '#fca5a5',
                                backgroundColor: isCurrentAdmin
                                  ? '#f8fafc'
                                  : '#fff5f5',
                                cursor: isCurrentAdmin
                                  ? 'not-allowed'
                                  : 'pointer',
                              }}
                              aria-label={`Deactivate account for ${item.name}`}
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.total > itemsPerPage && (
            <div
              data-testid="users-pagination"
              style={{
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              <Pagination
                totalItems={meta.total}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      )}

      {/* View User Details Modal (Figma Section 14) */}
      {viewingUser && (
        <Modal
          isOpen={Boolean(viewingUser)}
          onClose={() => setViewingUser(null)}
          title="User Account Details"
          description={`Full profile and status information for ${viewingUser.name}`}
          size="md"
          testId="view-user-modal"
          footer={
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'center',
              }}
            >
              <div>
                {viewingUser.id !== currentAdmin?.id && (
                  <Button
                    type="button"
                    variant={
                      viewingUser.status === 'active' ? 'danger' : 'outline'
                    }
                    size="sm"
                    data-testid="modal-toggle-status-btn"
                    onClick={() => {
                      const nextStatus =
                        viewingUser.status === 'active'
                          ? 'suspended'
                          : 'active';
                      promptStatusChange(viewingUser, nextStatus);
                    }}
                  >
                    {viewingUser.status === 'active'
                      ? 'Deactivate User'
                      : 'Reactivate User'}
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingUser(null)}
                data-testid="modal-close-btn"
              >
                Close
              </Button>
            </div>
          }
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Top Identity Block */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: getRoleBadgeStyle(viewingUser.role).bg,
                  color: getRoleBadgeStyle(viewingUser.role).color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  fontWeight: '700',
                  border: `1px solid ${getRoleBadgeStyle(viewingUser.role).border}`,
                }}
              >
                {viewingUser.name
                  ? viewingUser.name.charAt(0).toUpperCase()
                  : 'U'}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: 0,
                  }}
                  data-testid="modal-user-name"
                >
                  {viewingUser.name}
                </h3>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.35rem',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: getRoleBadgeStyle(viewingUser.role).bg,
                      color: getRoleBadgeStyle(viewingUser.role).color,
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                    }}
                  >
                    {getRoleBadgeStyle(viewingUser.role).icon}{' '}
                    {getRoleBadgeStyle(viewingUser.role).label}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: getStatusBadgeStyle(viewingUser.status)
                        .bg,
                      color: getStatusBadgeStyle(viewingUser.status).color,
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                    }}
                  >
                    {getStatusBadgeStyle(viewingUser.status).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Detail Fields */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  User ID
                </span>
                <p
                  data-testid="modal-user-id"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  #{viewingUser.id}
                </p>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  Email Address
                </span>
                <p
                  data-testid="modal-user-email"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {viewingUser.email}
                </p>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  Phone Number
                </span>
                <p
                  data-testid="modal-user-phone"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {viewingUser.phone || 'Not provided'}
                </p>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  Registration Date
                </span>
                <p
                  data-testid="modal-user-created"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {formatDate(viewingUser.created_at, { format: 'dateTime' }) ||
                    '—'}
                </p>
              </div>
            </div>

            {/* Linked Seller Information if applicable */}
            {viewingUser.role === 'seller' && viewingUser.seller_profile && (
              <div
                data-testid="modal-seller-profile-section"
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: '#065f46',
                    textTransform: 'uppercase',
                  }}
                >
                  Linked Seller Profile
                </span>
                <div style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                  <strong>Farm / Business:</strong>{' '}
                  {viewingUser.seller_profile.business_name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  <strong>Location:</strong>{' '}
                  {viewingUser.seller_profile.location || 'Not specified'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  <strong>Approval Status:</strong>{' '}
                  <span style={{ textTransform: 'capitalize' }}>
                    {viewingUser.seller_profile.approval_status}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog for Deactivate / Reactivate (AUTH-12) */}
      {confirmStatusAction && (
        <ConfirmDialog
          isOpen={Boolean(confirmStatusAction)}
          onClose={() => setConfirmStatusAction(null)}
          onConfirm={handleConfirmStatusChange}
          title={
            confirmStatusAction.targetStatus === 'active'
              ? 'Reactivate User Account'
              : 'Deactivate User Account'
          }
          message={
            confirmStatusAction.targetStatus === 'active'
              ? `Are you sure you want to reactivate the account for "${confirmStatusAction.user.name}" (${confirmStatusAction.user.email})? This user will regain full access to sign in to the platform.`
              : `Are you sure you want to deactivate the account for "${confirmStatusAction.user.name}" (${confirmStatusAction.user.email})? Deactivated users are blocked from logging in (AUTH-12).`
          }
          type={
            confirmStatusAction.targetStatus === 'active' ? 'primary' : 'danger'
          }
          confirmText={
            confirmStatusAction.targetStatus === 'active'
              ? 'Reactivate Account'
              : 'Deactivate Account'
          }
          cancelText="Cancel"
          loading={isUpdatingStatus}
          testId="user-status-confirm-dialog"
        />
      )}
    </div>
  );
}

export default AdminUsers;
