import { useState, useEffect, useMemo } from 'react';
import { adminService } from '../../services/adminService';
import {
  Button,
  Modal,
  Pagination,
  TableSkeleton,
  EmptyState,
  ErrorState,
} from '../../components/common';
import { formatDate } from '../../utils/formatters';

/**
 * Format dot-notated actions into human-readable titles.
 * e.g. "order.status_override" -> "Order Status Override"
 */
function formatActionLabel(action = '') {
  if (!action) return 'Platform Event';
  return action
    .split('.')
    .map((word) =>
      word
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    )
    .join(' · ');
}

/**
 * Return badge styling based on action category.
 */
function getActionBadgeStyle(action = '') {
  const lower = action.toLowerCase();
  if (
    lower.includes('approved') ||
    lower.includes('activated') ||
    lower.includes('published')
  ) {
    return {
      bg: '#f0fdf4',
      color: '#166534',
      border: '#bbf7d0',
      icon: '✅',
    };
  }
  if (
    lower.includes('rejected') ||
    lower.includes('suspended') ||
    lower.includes('removed') ||
    lower.includes('deleted') ||
    lower.includes('failed')
  ) {
    return {
      bg: '#fef2f2',
      color: '#991b1b',
      border: '#fecaca',
      icon: '🚫',
    };
  }
  if (
    lower.includes('override') ||
    lower.includes('deactivated') ||
    lower.includes('warning')
  ) {
    return {
      bg: '#fffbeb',
      color: '#92400e',
      border: '#fde68a',
      icon: '⚠️',
    };
  }
  if (lower.includes('settings') || lower.includes('category')) {
    return {
      bg: '#eff6ff',
      color: '#1d4ed8',
      border: '#bfdbfe',
      icon: '⚙️',
    };
  }
  if (lower.includes('login')) {
    return {
      bg: '#f8fafc',
      color: '#475569',
      border: '#cbd5e1',
      icon: '🔐',
    };
  }
  return {
    bg: '#f1f5f9',
    color: '#334155',
    border: '#cbd5e1',
    icon: '📝',
  };
}

/**
 * Extract human-readable summary of the entity target.
 */
function formatEntitySummary(log) {
  if (!log) return '—';
  const type = log.entity_type || '';
  const id = log.entity_id;
  const meta = log.metadata || {};

  if (type === 'order') {
    return meta.order_number
      ? `Order #${meta.order_number}`
      : `Order #${id || '—'}`;
  }
  if (type === 'seller_profile') {
    return meta.business_name
      ? `${meta.business_name}`
      : `Seller #${id || '—'}`;
  }
  if (type === 'product') {
    return meta.name ? `${meta.name}` : `Product #${id || '—'}`;
  }
  if (type === 'category') {
    return meta.name ? `${meta.name}` : `Category #${id || '—'}`;
  }
  if (type === 'user') {
    return meta.name
      ? `${meta.name}`
      : meta.email
        ? meta.email
        : `User #${id || '—'}`;
  }
  if (type === 'site_settings') {
    return 'Marketplace Settings';
  }
  return type ? `${type} #${id || ''}`.trim() : 'Platform Core';
}

/**
 * Format concise detail string from metadata.
 */
function formatMetadataSummary(log) {
  const meta = log.metadata || {};
  const action = log.action || '';

  if (action === 'order.status_override') {
    const transition =
      meta.from_status && meta.to_status
        ? `${meta.from_status} → ${meta.to_status}`
        : '';
    const reason = meta.reason ? `("${meta.reason}")` : '';
    return [transition, reason].filter(Boolean).join(' ') || 'Admin override';
  }

  if (action === 'settings.updated' && meta.keys_changed) {
    return `Changed keys: ${meta.keys_changed.join(', ')}`;
  }

  if (meta.reason) {
    return `Reason: ${meta.reason}`;
  }

  if (action === 'auth.failed_login') {
    return `Failed login attempt for ${meta.email || 'unknown'}`;
  }

  if (action === 'auth.login') {
    return `Authenticated session (${meta.method || 'password'})`;
  }

  if (meta.reviewed_by) {
    return `Reviewed by ${meta.reviewed_by}`;
  }

  return 'Event logged successfully';
}

/**
 * AdminAuditLog — Security-relevant and Administrative Audit Trail (ADM-09, Figma Section 14)
 *
 * SRS Requirements:
 * - ADM-09: Keep an audit log of security-relevant and administrative events
 *   (logins, failed logins, role/status changes, product removals, order overrides)
 *   viewable by Admins with filters by user, action and date.
 * - NFR-OBS-01: Audit log shall never store passwords, tokens or full personal data.
 * - DAT-06: Display timestamps in Africa/Lagos (West Africa Time, WAT / UTC+1).
 * - Acceptance criteria: Filter by user, action and date; paginated.
 */
export function AdminAuditLog() {
  // Filter states (ADM-09: Filter by user, action and date)
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateMode, setDateMode] = useState('exact'); // 'exact' | 'range'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Data states
  const [logs, setLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Inspection modal state
  const [inspectingLog, setInspectingLog] = useState(null);

  // Load registered users list for User Filter dropdown
  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      try {
        const res = await adminService.getUsers({ per_page: 100 });
        if (isMounted) {
          const list = Array.isArray(res) ? res : res?.data || [];
          setUsersList(list);
        }
      } catch {
        // Non-blocking fallback
      }
    }
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch paginated audit logs with active filters
  useEffect(() => {
    let isMounted = true;

    async function fetchLogs() {
      try {
        setIsLoading(true);
        setError(null);

        const params = {
          page: currentPage,
          per_page: perPage,
        };

        if (selectedUser !== 'all') {
          params.user_id = selectedUser;
        }

        if (selectedAction !== 'all') {
          params.action = selectedAction;
        }

        if (dateMode === 'exact' && dateFilter) {
          params.date = dateFilter;
        } else if (dateMode === 'range') {
          if (dateFrom) params.date_from = dateFrom;
          if (dateTo) params.date_to = dateTo;
        }

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        const response = await adminService.getAuditLogs(params);
        if (!isMounted) return;

        const dataList = Array.isArray(response)
          ? response
          : response?.data || [];
        const metaData = response?.meta || {
          total: dataList.length,
          current_page: currentPage,
          last_page: Math.ceil(dataList.length / perPage) || 1,
        };

        setLogs(dataList);
        setMeta(metaData);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err?.message ||
            'Unable to load system audit logs. Please check your connection and retry.'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [
    currentPage,
    perPage,
    selectedUser,
    selectedAction,
    dateMode,
    dateFilter,
    dateFrom,
    dateTo,
    searchQuery,
    refreshKey,
  ]);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedUser('all');
    setSelectedAction('all');
    setDateFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setDateMode('exact');
    setCurrentPage(1);
  };

  // Export logs as JSON file
  const handleExportJSON = () => {
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(logs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `vegetable_joint_audit_logs_${new Date().toISOString().split('T')[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {
      // Fallback
    }
  };

  // Determine if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      selectedUser !== 'all' ||
      selectedAction !== 'all' ||
      Boolean(dateFilter) ||
      Boolean(dateFrom) ||
      Boolean(dateTo) ||
      Boolean(searchQuery.trim())
    );
  }, [selectedUser, selectedAction, dateFilter, dateFrom, dateTo, searchQuery]);

  // Derived KPI metrics from loaded or total
  const kpiStats = useMemo(() => {
    const total = meta.total || logs.length;
    const authCount = logs.filter((l) => l.action?.startsWith('auth.')).length;
    const overrideCount = logs.filter((l) =>
      l.action?.includes('override')
    ).length;
    const moderationCount = logs.filter(
      (l) =>
        l.action?.startsWith('seller.') ||
        l.action?.startsWith('user.') ||
        l.action?.startsWith('product.')
    ).length;

    return {
      total,
      authCount,
      overrideCount,
      moderationCount,
    };
  }, [meta.total, logs]);

  return (
    <div
      data-testid="admin-audit-log-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        width: '100%',
        maxWidth: '1280px',
      }}
    >
      {/* Page Header */}
      <div
        data-testid="admin-audit-header"
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
              fontSize: '0.85rem',
              color: '#64748b',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>Admin</span>
            <span>/</span>
            <span style={{ color: '#15803d', fontWeight: '600' }}>
              Audit Log
            </span>
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Admin Audit Log
          </h1>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.95rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            Immutable audit trail of security-relevant and administrative events
            (ADM-09, NFR-OBS-01).
          </p>
        </div>

        {/* Top Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportJSON}
            disabled={logs.length === 0}
            data-testid="export-audit-logs-button"
            style={{ minHeight: '38px' }}
          >
            📥 Export JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleRefresh()}
            disabled={isRefreshing || isLoading}
            data-testid="refresh-audit-button"
            style={{ minHeight: '38px' }}
          >
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh'}
          </Button>
        </div>
      </div>

      {/* KPI Metrics Summary Strip */}
      <div
        data-testid="audit-kpi-bar"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          data-testid="kpi-total-events"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '1rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}
          >
            Total Audit Events
          </div>
          <div
            data-testid="kpi-total-count"
            style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#0f172a',
              marginTop: '0.25rem',
            }}
          >
            {kpiStats.total}
          </div>
        </div>

        <div
          data-testid="kpi-auth-events"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '1rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}
          >
            Security & Auth (Page)
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#3b82f6',
              marginTop: '0.25rem',
            }}
          >
            {kpiStats.authCount}
          </div>
        </div>

        <div
          data-testid="kpi-moderation-events"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '1rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}
          >
            Moderation & Governance
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#16a34a',
              marginTop: '0.25rem',
            }}
          >
            {kpiStats.moderationCount}
          </div>
        </div>

        <div
          data-testid="kpi-override-events"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '1rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}
          >
            Order Status Overrides
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#d97706',
              marginTop: '0.25rem',
            }}
          >
            {kpiStats.overrideCount}
          </div>
        </div>
      </div>

      {/* Search & Filters Toolbar (ADM-09: Filter by user, action and date) */}
      <div
        data-testid="audit-filters-toolbar"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.75rem',
          }}
        >
          <span
            style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}
          >
            Filter Audit Logs (ADM-09)
          </span>

          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="xs"
              onClick={handleResetFilters}
              data-testid="reset-filters-button"
            >
              ✕ Reset All Filters
            </Button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            alignItems: 'end',
          }}
        >
          {/* 1. Filter by User (ADM-09) */}
          <div>
            <label
              htmlFor="filter-user-select"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '0.35rem',
              }}
            >
              Filter by User (Actor)
            </label>
            <select
              id="filter-user-select"
              data-testid="filter-user-select"
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                color: '#1e293b',
              }}
            >
              <option value="all">All Users & Actors</option>
              <option value="1">Platform Administrator (ID #1)</option>
              <option value="null">System / Anonymous Events</option>
              {usersList
                .filter((u) => u.id !== 1)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
            </select>
          </div>

          {/* 2. Filter by Action (ADM-09) */}
          <div>
            <label
              htmlFor="filter-action-select"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '0.35rem',
              }}
            >
              Filter by Action Event
            </label>
            <select
              id="filter-action-select"
              data-testid="filter-action-select"
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                color: '#1e293b',
              }}
            >
              <option value="all">All Event Actions</option>
              <optgroup label="Authentication & Security">
                <option value="auth.login">User Login (auth.login)</option>
                <option value="auth.failed_login">
                  Failed Login (auth.failed_login)
                </option>
              </optgroup>
              <optgroup label="Seller Moderation">
                <option value="seller.approved">
                  Seller Approved (seller.approved)
                </option>
                <option value="seller.rejected">
                  Seller Rejected (seller.rejected)
                </option>
                <option value="seller.suspended">
                  Seller Suspended (seller.suspended)
                </option>
              </optgroup>
              <optgroup label="User Accounts">
                <option value="user.activated">
                  User Activated (user.activated)
                </option>
                <option value="user.suspended">
                  User Suspended (user.suspended)
                </option>
              </optgroup>
              <optgroup label="Product Listings">
                <option value="product.published">
                  Product Published (product.published)
                </option>
                <option value="product.unpublished">
                  Product Unpublished (product.unpublished)
                </option>
                <option value="product.removed">
                  Product Removed (product.removed)
                </option>
              </optgroup>
              <optgroup label="Order Governance">
                <option value="order.status_override">
                  Order Status Override (order.status_override)
                </option>
              </optgroup>
              <optgroup label="Categories & Platform">
                <option value="category.created">
                  Category Created (category.created)
                </option>
                <option value="category.deactivated">
                  Category Deactivated (category.deactivated)
                </option>
                <option value="category.deleted">
                  Category Deleted (category.deleted)
                </option>
                <option value="settings.updated">
                  Settings Updated (settings.updated)
                </option>
              </optgroup>
            </select>
          </div>

          {/* 3. Filter by Date (ADM-09) */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.35rem',
              }}
            >
              <label
                htmlFor={
                  dateMode === 'exact'
                    ? 'filter-date-input'
                    : 'filter-date-from-input'
                }
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#475569',
                }}
              >
                Filter by Date
              </label>

              {/* Mode toggle */}
              <div
                style={{ display: 'flex', gap: '0.35rem', fontSize: '0.75rem' }}
              >
                <button
                  type="button"
                  data-testid="date-mode-exact-btn"
                  onClick={() => {
                    setDateMode('exact');
                    setDateFrom('');
                    setDateTo('');
                    setCurrentPage(1);
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: dateMode === 'exact' ? '#15803d' : '#64748b',
                    fontWeight: dateMode === 'exact' ? '700' : '400',
                    textDecoration: dateMode === 'exact' ? 'underline' : 'none',
                  }}
                >
                  Single Date
                </button>
                <span>·</span>
                <button
                  type="button"
                  data-testid="date-mode-range-btn"
                  onClick={() => {
                    setDateMode('range');
                    setDateFilter('');
                    setCurrentPage(1);
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: dateMode === 'range' ? '#15803d' : '#64748b',
                    fontWeight: dateMode === 'range' ? '700' : '400',
                    textDecoration: dateMode === 'range' ? 'underline' : 'none',
                  }}
                >
                  Date Range
                </button>
              </div>
            </div>

            {dateMode === 'exact' ? (
              <input
                id="filter-date-input"
                data-testid="filter-date-input"
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            ) : (
              <div
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
              >
                <input
                  id="filter-date-from-input"
                  data-testid="filter-date-from-input"
                  type="date"
                  placeholder="From"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '50%',
                    padding: '0.55rem 0.5rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ color: '#94a3b8' }}>-</span>
                <input
                  id="filter-date-to-input"
                  data-testid="filter-date-to-input"
                  type="date"
                  placeholder="To"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '50%',
                    padding: '0.55rem 0.5rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>

          {/* 4. Keyword / Metadata Search */}
          <div>
            <label
              htmlFor="filter-search-input"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '0.35rem',
              }}
            >
              Search Keywords & IP
            </label>
            <input
              id="filter-search-input"
              data-testid="filter-search-input"
              type="text"
              placeholder="Search IP, entity, reason..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div data-testid="audit-error-state" style={{ padding: '1rem 0' }}>
          <ErrorState
            title="Audit Logs Unavailable"
            message={error}
            onRetry={handleRetry}
            retryLabel="Retry Loading Logs"
          />
        </div>
      )}

      {/* Main Content Area: Table / Loading / Empty */}
      {!error && (
        <div
          data-testid="audit-table-wrapper"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          {isLoading ? (
            <div
              data-testid="audit-loading-state"
              style={{ padding: '1.5rem' }}
            >
              <TableSkeleton rows={6} cols={6} />
            </div>
          ) : logs.length === 0 ? (
            <div
              data-testid="audit-empty-state"
              style={{ padding: '2rem 1rem' }}
            >
              <EmptyState
                icon="📜"
                title="No Audit Logs Found"
                description={
                  hasActiveFilters
                    ? 'No administrative or security events matched the selected user, action, or date filters.'
                    : 'No audit records have been generated in the system yet.'
                }
                action={
                  hasActiveFilters ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleResetFilters}
                      data-testid="empty-clear-filters-btn"
                    >
                      Clear Active Filters
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <>
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table
                  data-testid="audit-logs-table"
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
                        fontSize: '0.775rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <th style={{ padding: '0.85rem 1rem' }}>
                        Timestamp (WAT)
                      </th>
                      <th style={{ padding: '0.85rem 1rem' }}>Actor / User</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Action</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Target Entity</th>
                      <th style={{ padding: '0.85rem 1rem' }}>
                        Details / Metadata
                      </th>
                      <th style={{ padding: '0.85rem 1rem' }}>IP Address</th>
                      <th
                        style={{
                          padding: '0.85rem 1rem',
                          textAlign: 'right',
                        }}
                      >
                        Inspect
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const badgeStyle = getActionBadgeStyle(log.action);
                      const entitySummary = formatEntitySummary(log);
                      const metaSummary = formatMetadataSummary(log);
                      const actorName = log.user
                        ? log.user.name
                        : log.user_id === 1
                          ? 'Platform Administrator'
                          : log.user_id
                            ? `User #${log.user_id}`
                            : 'System / Anonymous';

                      return (
                        <tr
                          key={log.id}
                          data-testid={`audit-log-row-${log.id}`}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Timestamp (WAT) */}
                          <td
                            style={{
                              padding: '0.85rem 1rem',
                              whiteSpace: 'nowrap',
                              color: '#334155',
                              fontSize: '0.825rem',
                            }}
                          >
                            <span data-testid={`log-timestamp-${log.id}`}>
                              {formatDate(log.created_at, {
                                format: 'dateTime',
                                includeTimezone: true,
                              })}
                            </span>
                          </td>

                          {/* Actor / User (ADM-09) */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.15rem',
                              }}
                            >
                              <span
                                data-testid={`log-user-${log.id}`}
                                style={{
                                  fontWeight: '600',
                                  color: '#0f172a',
                                  fontSize: '0.85rem',
                                }}
                              >
                                {actorName}
                              </span>
                              {log.user?.role && (
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    color: '#64748b',
                                    textTransform: 'capitalize',
                                  }}
                                >
                                  Role: {log.user.role}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action (ADM-09) */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span
                              data-testid={`log-action-badge-${log.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                backgroundColor: badgeStyle.bg,
                                color: badgeStyle.color,
                                border: `1px solid ${badgeStyle.border}`,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span>{badgeStyle.icon}</span>
                              <span>{formatActionLabel(log.action)}</span>
                            </span>
                          </td>

                          {/* Target Entity (Figma Section 14) */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.15rem',
                              }}
                            >
                              <span
                                data-testid={`log-entity-${log.id}`}
                                style={{
                                  fontWeight: '500',
                                  color: '#1e293b',
                                  fontSize: '0.825rem',
                                }}
                              >
                                {entitySummary}
                              </span>
                              {log.entity_type && (
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    color: '#94a3b8',
                                  }}
                                >
                                  {log.entity_type}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Details / Metadata */}
                          <td
                            style={{
                              padding: '0.85rem 1rem',
                              color: '#475569',
                              fontSize: '0.8rem',
                              maxWidth: '280px',
                            }}
                          >
                            <span
                              data-testid={`log-summary-${log.id}`}
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {metaSummary}
                            </span>
                          </td>

                          {/* IP Address */}
                          <td
                            style={{
                              padding: '0.85rem 1rem',
                              color: '#64748b',
                              fontSize: '0.8rem',
                              fontFamily: 'monospace',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span data-testid={`log-ip-${log.id}`}>
                              {log.ip_address || '—'}
                            </span>
                          </td>

                          {/* Inspect action */}
                          <td
                            style={{
                              padding: '0.85rem 1rem',
                              textAlign: 'right',
                            }}
                          >
                            <Button
                              variant="secondary"
                              size="xs"
                              data-testid={`inspect-log-${log.id}`}
                              onClick={() => setInspectingLog(log)}
                            >
                              Inspect
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div
                data-testid="audit-pagination-bar"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  padding: '0.85rem 1.25rem',
                  borderTop: '1px solid #f1f5f9',
                  backgroundColor: '#ffffff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                    Show per page:
                  </span>
                  <select
                    data-testid="audit-per-page-select"
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.825rem',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <Pagination
                  totalItems={meta.total || logs.length}
                  currentPage={currentPage}
                  itemsPerPage={perPage}
                  onPageChange={(page) => setCurrentPage(page)}
                  itemLabel="logs"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Event Inspection Modal */}
      {inspectingLog && (
        <Modal
          isOpen={Boolean(inspectingLog)}
          onClose={() => setInspectingLog(null)}
          title={`Audit Event #${inspectingLog.id}: ${formatActionLabel(
            inspectingLog.action
          )}`}
          testId="audit-inspect-modal"
          data-testid="audit-inspect-modal"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              fontSize: '0.9rem',
              color: '#1e293b',
            }}
          >
            {/* Action Header Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: getActionBadgeStyle(inspectingLog.action).bg,
                border: `1px solid ${getActionBadgeStyle(inspectingLog.action).border}`,
                borderRadius: '8px',
                color: getActionBadgeStyle(inspectingLog.action).color,
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span style={{ fontSize: '1.25rem' }}>
                  {getActionBadgeStyle(inspectingLog.action).icon}
                </span>
                <span style={{ fontWeight: '700' }}>
                  {inspectingLog.action}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                ID: #{inspectingLog.id}
              </span>
            </div>

            {/* Key Attributes Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                backgroundColor: '#f8fafc',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                  }}
                >
                  Actor / User
                </span>
                <strong
                  data-testid="modal-actor-name"
                  style={{ color: '#0f172a' }}
                >
                  {inspectingLog.user
                    ? `${inspectingLog.user.name} (ID #${inspectingLog.user.id})`
                    : inspectingLog.user_id
                      ? `User #${inspectingLog.user_id}`
                      : 'System / Anonymous'}
                </strong>
              </div>

              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                  }}
                >
                  Timestamp (WAT)
                </span>
                <strong data-testid="modal-timestamp">
                  {formatDate(inspectingLog.created_at, {
                    format: 'dateTime',
                    includeTimezone: true,
                  })}
                </strong>
              </div>

              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                  }}
                >
                  Entity Type & ID
                </span>
                <strong data-testid="modal-entity-id">
                  {inspectingLog.entity_type || '—'}{' '}
                  {inspectingLog.entity_id
                    ? `(#${inspectingLog.entity_id})`
                    : ''}
                </strong>
              </div>

              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                  }}
                >
                  Origin IP Address
                </span>
                <strong
                  data-testid="modal-ip-address"
                  style={{ fontFamily: 'monospace' }}
                >
                  {inspectingLog.ip_address || '—'}
                </strong>
              </div>
            </div>

            {/* Metadata Payload (JSON) */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.4rem',
                }}
              >
                <label
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#334155',
                  }}
                >
                  Event Metadata Payload (NFR-OBS-01)
                </label>
                <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                  ✓ Passwords & Credentials Redacted
                </span>
              </div>
              <pre
                data-testid="modal-metadata-json"
                style={{
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  padding: '1rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  lineHeight: '1.4',
                  overflowX: 'auto',
                  fontFamily: 'monospace',
                  margin: 0,
                }}
              >
                {JSON.stringify(inspectingLog.metadata || {}, null, 2)}
              </pre>
            </div>

            {/* Close footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '0.5rem',
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setInspectingLog(null)}
                data-testid="modal-close-button"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminAuditLog;
