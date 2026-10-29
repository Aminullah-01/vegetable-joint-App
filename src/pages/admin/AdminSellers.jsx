import { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
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
 * Return badge style based on seller approval status
 */
function getApprovalBadgeStyle(status) {
  switch (status) {
    case 'approved':
      return {
        bg: '#dcfce7',
        color: '#166534',
        border: '#bbf7d0',
        label: 'Approved',
        icon: '✓',
      };
    case 'pending':
      return {
        bg: '#fef3c7',
        color: '#92400e',
        border: '#fde68a',
        label: 'Pending Review',
        icon: '⏳',
      };
    case 'rejected':
      return {
        bg: '#f3f4f6',
        color: '#4b5563',
        border: '#e5e7eb',
        label: 'Rejected',
        icon: '✕',
      };
    case 'suspended':
      return {
        bg: '#fee2e2',
        color: '#991b1b',
        border: '#fecaca',
        label: 'Suspended',
        icon: '⛔',
      };
    default:
      return {
        bg: '#f1f5f9',
        color: '#475569',
        border: '#cbd5e1',
        label: status || 'Unknown',
        icon: '•',
      };
  }
}

/**
 * AdminSellers — Seller Verification & Moderation Page (SRS ADM-03, AUTH-03, Figma Section 14)
 *
 * Requirements:
 * - ADM-03: Admins shall be able to view, approve, reject, suspend and reactivate seller accounts.
 * - Acceptance Criteria: Filter by Pending; approve, reject (with reason), suspend, reactivate.
 * - TC-30: Suspending a seller hides products from marketplace; open orders remain visible.
 * - Figma Section 14: Searchable table (Business name, Owner, Location, Approval status, Account status, Products, Actions).
 */
export function AdminSellers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useContext(ToastContext);

  // Read status filter directly from URL query params (default 'all')
  const statusFilter = searchParams.get('status') || 'all';

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Data states
  const [sellers, setSellers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal & Dialog states
  const [viewingSeller, setViewingSeller] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { seller, action: 'approved'|'rejected'|'suspended'|'reactivated' }
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);

  // Fetch sellers on filter, search, page or refresh changes
  useEffect(() => {
    let isMounted = true;

    async function fetchSellers() {
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
        if (statusFilter !== 'all') {
          params.approval_status = statusFilter;
        }

        const response = await adminService.getSellers(params);

        if (!isMounted) return;

        const sellerList = Array.isArray(response)
          ? response
          : response?.data || [];
        setSellers(sellerList);
        setMeta(
          response?.meta || {
            total: sellerList.length,
            current_page: currentPage,
            last_page: Math.ceil(sellerList.length / itemsPerPage) || 1,
          }
        );
      } catch (err) {
        if (!isMounted) return;
        setError(
          err?.message ||
            'Unable to load seller accounts for moderation. Please try again.'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSellers();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, statusFilter, currentPage, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleStatusFilterChange = (newStatus) => {
    setCurrentPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (newStatus === 'all') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', newStatus);
    }
    setSearchParams(nextParams);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    handleStatusFilterChange('all');
  };

  // Open confirmation prompt
  const promptAction = (targetSeller, actionType) => {
    setConfirmAction({
      seller: targetSeller,
      action: actionType, // 'approved' | 'rejected' | 'suspended'
    });
  };

  // Execute moderation action (Approve, Reject with reason, Suspend, Reactivate)
  const handleConfirmAction = async (rejectionReason = '') => {
    if (!confirmAction) return;

    const { seller: targetSeller, action } = confirmAction;
    setIsUpdatingStatus(true);
    setActionAlert(null);

    // Reactivate maps to 'approved'
    const targetApprovalStatus = action === 'reactivated' ? 'approved' : action;

    try {
      const updated = await adminService.updateSellerStatus(
        targetSeller.id,
        targetApprovalStatus,
        rejectionReason
      );

      // Update in local state
      setSellers((prev) =>
        prev.map((s) => (s.id === targetSeller.id ? { ...s, ...updated } : s))
      );

      // If viewing modal is open, update viewed item
      if (viewingSeller && viewingSeller.id === targetSeller.id) {
        setViewingSeller((prev) => ({ ...prev, ...updated }));
      }

      const actionLabels = {
        approved: 'approved',
        rejected: 'rejected',
        suspended: 'suspended',
        reactivated: 'reactivated',
      };

      const successMsg = `Seller "${targetSeller.business_name}" has been successfully ${
        actionLabels[action] || action
      }.`;

      if (toast?.success) {
        toast.success(successMsg);
      } else {
        setActionAlert({ type: 'success', message: successMsg });
      }

      setConfirmAction(null);
    } catch (err) {
      const errMsg =
        err?.message ||
        `Failed to update status for seller "${targetSeller.business_name}".`;
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
    Boolean(searchQuery.trim()) || statusFilter !== 'all';

  return (
    <div
      data-testid="admin-sellers-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        data-testid="admin-sellers-header"
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
              Seller Verification & Moderation
            </h1>
            <span
              data-testid="sellers-total-badge"
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
              {meta.total} {meta.total === 1 ? 'seller' : 'sellers'}
            </span>
          </div>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.95rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            Review applications, approve new vendors, reject invalid profiles
            with reason, and manage account suspensions (ADM-03, AUTH-03).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="refresh-sellers-btn"
            aria-label="Refresh seller moderation list"
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

      {/* Action Alert Banner */}
      {actionAlert && (
        <div
          role="alert"
          data-testid="sellers-action-alert"
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

      {/* Quick Status Filter Tabs (Filter by Pending prominently per ADM-03) */}
      <div
        data-testid="status-tabs"
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {[
          { id: 'all', label: 'All Sellers' },
          { id: 'pending', label: 'Pending Review', highlight: true },
          { id: 'approved', label: 'Approved' },
          { id: 'suspended', label: 'Suspended' },
          { id: 'rejected', label: 'Rejected' },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`tab-filter-${tab.id}`}
              onClick={() => handleStatusFilterChange(tab.id)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? '600' : '500',
                border: '1px solid',
                borderColor: isActive
                  ? '#15803d'
                  : tab.highlight
                    ? '#fde68a'
                    : '#e2e8f0',
                backgroundColor: isActive
                  ? '#15803d'
                  : tab.highlight
                    ? '#fffbeb'
                    : '#ffffff',
                color: isActive
                  ? '#ffffff'
                  : tab.highlight
                    ? '#92400e'
                    : '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.highlight && !isActive && <span aria-hidden="true">⚠️</span>}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search and Filters Toolbar */}
      <div
        data-testid="sellers-filters-toolbar"
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
            placeholder="Search by business name, location, or owner..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="search-sellers-input"
            aria-label="Search sellers"
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

        {/* Approval Status Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            htmlFor="filter-status"
            style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}
          >
            Approval:
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            data-testid="filter-status-select"
            aria-label="Filter by approval status"
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
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
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
        <div data-testid="sellers-loading-state" style={{ padding: '1rem 0' }}>
          <TableSkeleton rows={6} columns={6} />
        </div>
      ) : error ? (
        <div data-testid="sellers-error-state" style={{ padding: '1rem 0' }}>
          <ErrorState
            title="Failed to Load Sellers"
            message={error}
            onRetry={handleRefresh}
            retryLabel="Retry"
          />
        </div>
      ) : sellers.length === 0 ? (
        <div data-testid="sellers-empty-state">
          <EmptyState
            title={
              statusFilter === 'pending'
                ? 'No Pending Applications'
                : hasActiveFilters
                  ? 'No Matching Sellers'
                  : 'No Sellers Found'
            }
            message={
              statusFilter === 'pending'
                ? 'There are currently no seller applications awaiting moderation. All seller verification is up to date.'
                : hasActiveFilters
                  ? 'No seller profiles match your search criteria. Try adjusting or clearing your filters.'
                  : 'There are currently no registered sellers on the marketplace.'
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
              data-testid="sellers-table"
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
                  <th style={{ padding: '0.85rem 1rem' }}>Business / Farm</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Owner</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Location</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Approval Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Account Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Products</th>
                  <th
                    style={{
                      padding: '0.85rem 1rem',
                      textAlign: 'right',
                      minWidth: '220px',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => {
                  const badgeStyle = getApprovalBadgeStyle(
                    seller.approval_status
                  );
                  const ownerName =
                    seller.owner?.name ||
                    seller.user?.name ||
                    `User #${seller.user_id}`;
                  const ownerEmail =
                    seller.owner?.email || seller.user?.email || '—';
                  const accountStatus =
                    seller.owner?.status || seller.user?.status || 'active';
                  const isAccountSuspended = accountStatus === 'suspended';

                  return (
                    <tr
                      key={seller.id}
                      data-testid={`seller-row-${seller.id}`}
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
                      {/* Business / Farm Name */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>
                          <strong
                            data-testid={`seller-name-${seller.id}`}
                            style={{
                              display: 'block',
                              color: '#0f172a',
                              fontWeight: '600',
                            }}
                          >
                            {seller.business_name}
                          </strong>
                          <span
                            style={{ fontSize: '0.75rem', color: '#94a3b8' }}
                          >
                            ID: #{seller.id} • {seller.phone || 'No phone'}
                          </span>
                        </div>
                      </td>

                      {/* Owner */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>
                          <span
                            data-testid={`seller-owner-${seller.id}`}
                            style={{
                              display: 'block',
                              color: '#1e293b',
                              fontWeight: '500',
                            }}
                          >
                            {ownerName}
                          </span>
                          <span
                            data-testid={`seller-email-${seller.id}`}
                            style={{ fontSize: '0.75rem', color: '#64748b' }}
                          >
                            {ownerEmail}
                          </span>
                        </div>
                      </td>

                      {/* Location */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`seller-location-${seller.id}`}
                          style={{ color: '#475569' }}
                        >
                          {seller.location || '—'}
                        </span>
                      </td>

                      {/* Approval Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`seller-status-badge-${seller.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                          }}
                        >
                          <span aria-hidden="true">{badgeStyle.icon}</span>
                          {badgeStyle.label}
                        </span>
                      </td>

                      {/* Account Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`seller-account-status-${seller.id}`}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: isAccountSuspended ? '#b91c1c' : '#15803d',
                            textTransform: 'capitalize',
                          }}
                        >
                          {accountStatus}
                        </span>
                      </td>

                      {/* Products Count */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`seller-products-count-${seller.id}`}
                          style={{ color: '#334155', fontWeight: '500' }}
                        >
                          {seller.total_products ?? 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          textAlign: 'right',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: '0.4rem',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            flexWrap: 'wrap',
                          }}
                        >
                          {/* View Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-testid={`view-seller-btn-${seller.id}`}
                            onClick={() => setViewingSeller(seller)}
                            aria-label={`View profile for ${seller.business_name}`}
                          >
                            View
                          </Button>

                          {/* Action 1: Approve (for Pending or Rejected) */}
                          {(seller.approval_status === 'pending' ||
                            seller.approval_status === 'rejected') && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid={`approve-seller-btn-${seller.id}`}
                              onClick={() => promptAction(seller, 'approved')}
                              style={{
                                color: '#16a34a',
                                borderColor: '#86efac',
                                backgroundColor: '#f0fdf4',
                              }}
                              aria-label={`Approve ${seller.business_name}`}
                            >
                              Approve
                            </Button>
                          )}

                          {/* Action 2: Reject (for Pending) */}
                          {seller.approval_status === 'pending' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid={`reject-seller-btn-${seller.id}`}
                              onClick={() => promptAction(seller, 'rejected')}
                              style={{
                                color: '#dc2626',
                                borderColor: '#fca5a5',
                                backgroundColor: '#fff5f5',
                              }}
                              aria-label={`Reject ${seller.business_name}`}
                            >
                              Reject
                            </Button>
                          )}

                          {/* Action 3: Suspend (for Approved) */}
                          {seller.approval_status === 'approved' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid={`suspend-seller-btn-${seller.id}`}
                              onClick={() => promptAction(seller, 'suspended')}
                              style={{
                                color: '#dc2626',
                                borderColor: '#fca5a5',
                                backgroundColor: '#fff5f5',
                              }}
                              aria-label={`Suspend ${seller.business_name}`}
                            >
                              Suspend
                            </Button>
                          )}

                          {/* Action 4: Reactivate (for Suspended) */}
                          {seller.approval_status === 'suspended' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid={`reactivate-seller-btn-${seller.id}`}
                              onClick={() =>
                                promptAction(seller, 'reactivated')
                              }
                              style={{
                                color: '#16a34a',
                                borderColor: '#86efac',
                                backgroundColor: '#f0fdf4',
                              }}
                              aria-label={`Reactivate ${seller.business_name}`}
                            >
                              Reactivate
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
              data-testid="sellers-pagination"
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

      {/* View Seller Details Modal (Figma Section 14) */}
      {viewingSeller && (
        <Modal
          isOpen={Boolean(viewingSeller)}
          onClose={() => setViewingSeller(null)}
          title="Seller Profile & Verification Details"
          description={`Comprehensive onboarding and verification record for ${viewingSeller.business_name}`}
          size="md"
          testId="view-seller-modal"
          footer={
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(viewingSeller.approval_status === 'pending' ||
                  viewingSeller.approval_status === 'rejected') && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    data-testid="modal-approve-btn"
                    onClick={() => promptAction(viewingSeller, 'approved')}
                  >
                    Approve Seller
                  </Button>
                )}

                {viewingSeller.approval_status === 'pending' && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    data-testid="modal-reject-btn"
                    onClick={() => promptAction(viewingSeller, 'rejected')}
                  >
                    Reject Application
                  </Button>
                )}

                {viewingSeller.approval_status === 'approved' && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    data-testid="modal-suspend-btn"
                    onClick={() => promptAction(viewingSeller, 'suspended')}
                  >
                    Suspend Seller
                  </Button>
                )}

                {viewingSeller.approval_status === 'suspended' && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    data-testid="modal-reactivate-btn"
                    onClick={() => promptAction(viewingSeller, 'reactivated')}
                  >
                    Reactivate Seller
                  </Button>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingSeller(null)}
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
                  borderRadius: '10px',
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  border: '1px solid #a7f3d0',
                }}
              >
                🌾
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: 0,
                  }}
                  data-testid="modal-business-name"
                >
                  {viewingSeller.business_name}
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
                      backgroundColor: getApprovalBadgeStyle(
                        viewingSeller.approval_status
                      ).bg,
                      color: getApprovalBadgeStyle(
                        viewingSeller.approval_status
                      ).color,
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                    }}
                  >
                    {getApprovalBadgeStyle(viewingSeller.approval_status).icon}{' '}
                    {getApprovalBadgeStyle(viewingSeller.approval_status).label}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Seller ID: #{viewingSeller.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Rejection / Suspension Notice Box if applicable */}
            {viewingSeller.rejection_reason && (
              <div
                data-testid="modal-rejection-reason-block"
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  color: '#991b1b',
                  fontSize: '0.875rem',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>
                  {viewingSeller.approval_status === 'suspended'
                    ? 'Suspension Reason:'
                    : 'Rejection Reason:'}
                </strong>
                <p style={{ margin: 0 }}>{viewingSeller.rejection_reason}</p>
              </div>
            )}

            {/* Profile Detail Fields Grid */}
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
                  Farm / Stall Location
                </span>
                <p
                  data-testid="modal-seller-location"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {viewingSeller.location || 'Not provided'}
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
                  Business Phone
                </span>
                <p
                  data-testid="modal-seller-phone"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {viewingSeller.phone || 'Not provided'}
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
                  Account Owner
                </span>
                <p
                  data-testid="modal-seller-owner"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {viewingSeller.owner?.name ||
                    viewingSeller.user?.name ||
                    `User #${viewingSeller.user_id}`}
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
                  Owner Email
                </span>
                <p
                  data-testid="modal-seller-email"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {viewingSeller.owner?.email ||
                    viewingSeller.user?.email ||
                    '—'}
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
                  Catalog Products
                </span>
                <p
                  data-testid="modal-seller-products"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {viewingSeller.total_products ?? 0} listings
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
                  Application Date
                </span>
                <p
                  data-testid="modal-seller-created"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {formatDate(viewingSeller.created_at, {
                    format: 'dateTime',
                  }) || '—'}
                </p>
              </div>
            </div>

            {/* Description */}
            {viewingSeller.description && (
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  Business Description
                </span>
                <p
                  data-testid="modal-seller-description"
                  style={{
                    margin: '0.35rem 0 0',
                    color: '#334155',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                  }}
                >
                  {viewingSeller.description}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirmation Dialogs for Status Transitions (ADM-03) */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={Boolean(confirmAction)}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title={
            confirmAction.action === 'approved'
              ? 'Approve Seller Application'
              : confirmAction.action === 'rejected'
                ? 'Reject Seller Application'
                : confirmAction.action === 'suspended'
                  ? 'Suspend Seller Account'
                  : 'Reactivate Seller Account'
          }
          message={
            confirmAction.action === 'approved'
              ? `Are you sure you want to approve "${confirmAction.seller.business_name}"? The seller will receive permission to publish products to the marketplace (AUTH-03).`
              : confirmAction.action === 'rejected'
                ? `Please provide the reason for rejecting "${confirmAction.seller.business_name}". This reason will be recorded and provided to the vendor.`
                : confirmAction.action === 'suspended'
                  ? `Suspending "${confirmAction.seller.business_name}" will immediately hide all of their products from the marketplace and prevent publishing new items (ADM-03, TC-30). Open orders remain visible.`
                  : `Are you sure you want to reactivate "${confirmAction.seller.business_name}"? The seller's products and publishing permissions will be restored.`
          }
          type={
            confirmAction.action === 'approved' ||
            confirmAction.action === 'reactivated'
              ? 'primary'
              : 'danger'
          }
          confirmText={
            confirmAction.action === 'approved'
              ? 'Approve Seller'
              : confirmAction.action === 'rejected'
                ? 'Reject Application'
                : confirmAction.action === 'suspended'
                  ? 'Suspend Seller'
                  : 'Reactivate Seller'
          }
          cancelText="Cancel"
          requireReason={confirmAction.action === 'rejected'}
          reasonLabel="Rejection Reason (Required)"
          reasonPlaceholder="e.g. Incomplete business documentation or invalid stall address"
          reasonRequiredError="A rejection reason is mandatory (ADM-03)."
          loading={isUpdatingStatus}
          testId="seller-action-confirm-dialog"
        />
      )}
    </div>
  );
}

export default AdminSellers;
