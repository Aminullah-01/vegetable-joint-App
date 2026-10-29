import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { ROUTES } from '../../routes/routeConfig';
import { Spinner, Button, ErrorState } from '../../components/common';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Helper to convert dot-notated audit actions into readable titles.
 * e.g. "seller.approved" -> "Seller Approved"
 */
function formatActionLabel(action) {
  if (!action) return 'Platform Event';
  return action
    .split('.')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Return badge style based on the action category.
 */
function getActionBadgeStyle(action) {
  if (!action) {
    return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  }
  if (action.includes('approved') || action.includes('activated')) {
    return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
  }
  if (action.includes('rejected') || action.includes('suspended')) {
    return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' };
  }
  if (action.includes('override') || action.includes('warning')) {
    return { bg: '#fffbeb', color: '#92400e', border: '#fde68a' };
  }
  return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
}

/**
 * AdminOverview Component
 *
 * SRS References:
 * - ADM-10: The Overview shall show counts of users, sellers, products, and orders, and total sales value.
 * - ADM-01: Admin dashboard sections: Overview, Users, Sellers, Products, Categories, Orders, Settings (+ Audit log).
 * - BR-13 / Line 1577: Sales figures count only orders with status Completed.
 * - Figma Section 14:
 *   Summary cards: Total Users, Total Sellers, Total Products, Total Orders, Total Sales Value.
 *   Also show recent activity and important pending actions.
 */
export function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchOverview() {
      try {
        // Fetch stats and recent audit logs in parallel
        const [statsResult, auditResult] = await Promise.allSettled([
          adminService.getStats(),
          adminService.getAuditLogs({ per_page: 5 }),
        ]);

        if (!isMounted) return;

        if (statsResult.status === 'fulfilled') {
          setStats(statsResult.value || {});
          setError(null);
        } else {
          throw (
            statsResult.reason ||
            new Error('Failed to load administrator statistics.')
          );
        }

        if (auditResult.status === 'fulfilled') {
          const auditPayload = auditResult.value;
          const list = Array.isArray(auditPayload)
            ? auditPayload
            : auditPayload?.data || [];
          setRecentActivity(list.slice(0, 5));
        } else {
          setRecentActivity([]);
        }

        setLastUpdated(new Date());
      } catch (err) {
        if (isMounted) {
          setError(
            err?.message ||
              'Unable to load administrator overview metrics. Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    fetchOverview();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  };

  const pendingSellersCount = stats?.pending_seller_approvals ?? 0;
  const usersCount = stats?.total_users ?? 0;
  const sellersCount = stats?.total_sellers ?? 0;
  const productsCount = stats?.total_products ?? stats?.active_products ?? 0;
  const ordersCount = stats?.total_orders ?? 0;
  const salesValue = stats?.total_sales_value ?? stats?.platform_gmv ?? 0;

  if (isLoading) {
    return (
      <div
        data-testid="overview-loading-state"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '360px',
          gap: '1rem',
          padding: '2rem',
        }}
      >
        <Spinner size="lg" center />
        <span style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Loading marketplace overview metrics...
        </span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div data-testid="overview-error-state" style={{ padding: '1rem 0' }}>
        <ErrorState
          title="Overview Unavailable"
          message={error}
          onRetry={handleRetry}
          retryLabel="Retry Loading"
        />
      </div>
    );
  }

  return (
    <div
      data-testid="admin-overview-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        width: '100%',
      }}
    >
      {/* Page Header */}
      <div
        data-testid="admin-overview-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Admin Overview
          </h1>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.95rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            High-level marketplace metrics, moderation queues, and governance
            activity.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastUpdated && (
            <span
              style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                display: 'none',
              }}
              className="lg:inline"
            >
              Updated: {formatDate(lastUpdated, { format: 'time' })}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="admin-overview-refresh-btn"
            aria-label="Refresh overview data"
          >
            <span
              style={{
                display: 'inline-block',
                marginRight: '0.35rem',
                transform: isRefreshing ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.5s ease',
              }}
              aria-hidden="true"
            >
              🔄
            </span>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Non-blocking refresh error banner */}
      {error && (
        <div
          role="alert"
          data-testid="overview-refresh-error"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      )}

      {/* Important Pending Actions Section (Figma Section 14) */}
      <section aria-labelledby="pending-actions-title">
        <h2 id="pending-actions-title" style={{ display: 'none' }}>
          Pending Actions
        </h2>

        {pendingSellersCount > 0 ? (
          <div
            data-testid="pending-sellers-alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <span
                style={{
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-hidden="true"
              >
                ⚠️
              </span>
              <div>
                <strong
                  style={{
                    color: '#92400e',
                    fontSize: '0.95rem',
                    display: 'block',
                  }}
                >
                  Pending Seller Approvals Required
                </strong>
                <span style={{ color: '#b45309', fontSize: '0.85rem' }}>
                  There {pendingSellersCount === 1 ? 'is' : 'are'}{' '}
                  <strong>{pendingSellersCount}</strong> seller application
                  {pendingSellersCount === 1 ? '' : 's'} awaiting administrative
                  verification and approval (ADM-03).
                </span>
              </div>
            </div>

            <Link
              to={ROUTES.ADMIN_SELLERS}
              data-testid="review-pending-sellers-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#d97706',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '0.875rem',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Review Applications →
            </Link>
          </div>
        ) : (
          <div
            data-testid="pending-sellers-clear"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#475569',
              fontSize: '0.875rem',
            }}
          >
            <span style={{ color: '#16a34a' }} aria-hidden="true">
              ✓
            </span>
            <span>
              All seller verification applications are up to date. No pending
              moderation queues.
            </span>
          </div>
        )}
      </section>

      {/* 5 Core Metric Cards (SRS ADM-10, Figma Section 14) */}
      <section aria-label="Key Performance Metrics">
        <div
          data-testid="overview-stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Card 1: Total Users */}
          <div
            data-testid="stat-card-users"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Users
              </span>
              <span
                style={{
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '0.35rem 0.5rem',
                  fontSize: '1.1rem',
                }}
                aria-hidden="true"
              >
                👥
              </span>
            </div>

            <div>
              <span
                data-testid="stat-users-count"
                style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  lineHeight: '1.1',
                  display: 'block',
                }}
              >
                {usersCount.toLocaleString('en-NG')}
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem',
                  display: 'block',
                }}
              >
                Buyers, sellers & admins
              </span>
            </div>

            <Link
              to={ROUTES.ADMIN_USERS}
              data-testid="link-users-card"
              style={{
                fontSize: '0.825rem',
                fontWeight: '600',
                color: '#15803d',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginTop: '0.25rem',
              }}
            >
              Manage Users →
            </Link>
          </div>

          {/* Card 2: Total Sellers */}
          <div
            data-testid="stat-card-sellers"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Sellers
              </span>
              <span
                style={{
                  backgroundColor: '#ecfdf5',
                  borderRadius: '8px',
                  padding: '0.35rem 0.5rem',
                  fontSize: '1.1rem',
                }}
                aria-hidden="true"
              >
                🌾
              </span>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.5rem',
                }}
              >
                <span
                  data-testid="stat-sellers-count"
                  style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    lineHeight: '1.1',
                  }}
                >
                  {sellersCount.toLocaleString('en-NG')}
                </span>
                {pendingSellersCount > 0 && (
                  <span
                    data-testid="stat-sellers-pending"
                    style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      fontSize: '0.725rem',
                      fontWeight: '700',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '9999px',
                      border: '1px solid #fde68a',
                    }}
                  >
                    {pendingSellersCount} pending
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem',
                  display: 'block',
                }}
              >
                Approved vegetable vendors
              </span>
            </div>

            <Link
              to={ROUTES.ADMIN_SELLERS}
              data-testid="link-sellers-card"
              style={{
                fontSize: '0.825rem',
                fontWeight: '600',
                color: '#15803d',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginTop: '0.25rem',
              }}
            >
              Review Sellers →
            </Link>
          </div>

          {/* Card 3: Total Products */}
          <div
            data-testid="stat-card-products"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Products
              </span>
              <span
                style={{
                  backgroundColor: '#fef3c7',
                  borderRadius: '8px',
                  padding: '0.35rem 0.5rem',
                  fontSize: '1.1rem',
                }}
                aria-hidden="true"
              >
                🥕
              </span>
            </div>

            <div>
              <span
                data-testid="stat-products-count"
                style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  lineHeight: '1.1',
                  display: 'block',
                }}
              >
                {productsCount.toLocaleString('en-NG')}
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem',
                  display: 'block',
                }}
              >
                Active catalog listings
              </span>
            </div>

            <Link
              to={ROUTES.ADMIN_PRODUCTS}
              data-testid="link-products-card"
              style={{
                fontSize: '0.825rem',
                fontWeight: '600',
                color: '#15803d',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginTop: '0.25rem',
              }}
            >
              Moderate Catalog →
            </Link>
          </div>

          {/* Card 4: Total Orders */}
          <div
            data-testid="stat-card-orders"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Orders
              </span>
              <span
                style={{
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  padding: '0.35rem 0.5rem',
                  fontSize: '1.1rem',
                }}
                aria-hidden="true"
              >
                📦
              </span>
            </div>

            <div>
              <span
                data-testid="stat-orders-count"
                style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  lineHeight: '1.1',
                  display: 'block',
                }}
              >
                {ordersCount.toLocaleString('en-NG')}
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem',
                  display: 'block',
                }}
              >
                Across all buyer purchases
              </span>
            </div>

            <Link
              to={ROUTES.ADMIN_ORDERS}
              data-testid="link-orders-card"
              style={{
                fontSize: '0.825rem',
                fontWeight: '600',
                color: '#15803d',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginTop: '0.25rem',
              }}
            >
              Monitor Orders →
            </Link>
          </div>

          {/* Card 5: Total Sales Value (Completed orders GMV per BR-13 / ADM-10) */}
          <div
            data-testid="stat-card-sales"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Total Sales Value
              </span>
              <span
                style={{
                  backgroundColor: '#f0fdf4',
                  borderRadius: '8px',
                  padding: '0.35rem 0.5rem',
                  fontSize: '1.1rem',
                }}
                aria-hidden="true"
              >
                💰
              </span>
            </div>

            <div>
              <span
                data-testid="stat-sales-value"
                style={{
                  fontSize: '1.85rem',
                  fontWeight: '700',
                  color: '#15803d',
                  lineHeight: '1.1',
                  display: 'block',
                }}
              >
                {formatCurrency(salesValue)}
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem',
                  display: 'block',
                }}
              >
                Completed orders revenue (ADM-10)
              </span>
            </div>

            <Link
              to={ROUTES.ADMIN_ORDERS}
              data-testid="link-sales-card"
              style={{
                fontSize: '0.825rem',
                fontWeight: '600',
                color: '#15803d',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginTop: '0.25rem',
              }}
            >
              View Completed Orders →
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Layout: Recent Activity & Quick Navigation */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Section: Recent Activity (Figma Section 14) */}
        <section
          aria-labelledby="recent-activity-title"
          data-testid="recent-activity-section"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2
                id="recent-activity-title"
                style={{
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: 0,
                }}
              >
                Recent Platform Activity
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Latest governance events and administrative actions
              </span>
            </div>

            <Link
              to={ROUTES.ADMIN_AUDIT_LOG}
              data-testid="view-all-audit-logs-link"
              style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#15803d',
                textDecoration: 'none',
              }}
            >
              Full Log →
            </Link>
          </div>

          <div style={{ flex: 1, padding: '0.5rem 1.5rem 1.25rem' }}>
            {recentActivity.length > 0 ? (
              <ul
                data-testid="recent-activity-list"
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                {recentActivity.map((log) => {
                  const badgeStyle = getActionBadgeStyle(log.action);
                  const detail =
                    log.metadata?.business_name ||
                    log.metadata?.reason ||
                    log.metadata?.name ||
                    (log.entity_type
                      ? `${log.entity_type} #${log.entity_id}`
                      : 'System action');

                  return (
                    <li
                      key={log.id}
                      data-testid={`activity-item-${log.id}`}
                      style={{
                        padding: '0.75rem 0',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                          }}
                        >
                          {formatActionLabel(log.action)}
                        </span>

                        <time
                          dateTime={log.created_at}
                          style={{ fontSize: '0.75rem', color: '#94a3b8' }}
                        >
                          {formatDate(log.created_at, { format: 'dateTime' })}
                        </time>
                      </div>

                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: '#334155',
                          fontWeight: '500',
                        }}
                      >
                        {detail}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Admin:{' '}
                        {log.metadata?.reviewed_by || `User #${log.user_id}`}
                        {log.ip_address && ` • IP: ${log.ip_address}`}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div
                data-testid="no-activity-message"
                style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.9rem',
                }}
              >
                <p style={{ margin: 0 }}>
                  No administrative activity recorded yet.
                </p>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Actions like approving sellers or editing settings will appear
                  here.
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Section: Quick Administration Directory (ADM-01) */}
        <section
          aria-labelledby="admin-directory-title"
          data-testid="admin-quick-actions"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <h2
              id="admin-directory-title"
              style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#0f172a',
                margin: 0,
              }}
            >
              Management Modules
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Direct access to all administrative control panels (ADM-01)
            </span>
          </div>

          <div
            style={{
              padding: '1rem 1.5rem 1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <Link
              to={ROUTES.ADMIN_USERS}
              data-testid="quick-link-users"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#0f172a',
                transition: 'background-color 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
                👥
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>
                  Users
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Accounts & roles
                </span>
              </div>
            </Link>

            <Link
              to={ROUTES.ADMIN_SELLERS}
              data-testid="quick-link-sellers"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
                🌾
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>
                  Sellers
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Approvals & status
                </span>
              </div>
            </Link>

            <Link
              to={ROUTES.ADMIN_PRODUCTS}
              data-testid="quick-link-products"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
                🥕
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>
                  Products
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Catalog moderation
                </span>
              </div>
            </Link>

            <Link
              to={ROUTES.ADMIN_CATEGORIES}
              data-testid="quick-link-categories"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
                📁
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>
                  Categories
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Taxonomy & crops
                </span>
              </div>
            </Link>

            <Link
              to={ROUTES.ADMIN_ORDERS}
              data-testid="quick-link-orders"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
                🛍️
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>
                  Orders Monitor
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Status & transactions
                </span>
              </div>
            </Link>

            <Link
              to={ROUTES.ADMIN_SETTINGS}
              data-testid="quick-link-settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
                ⚙️
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>
                  Settings
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Marketplace config
                </span>
              </div>
            </Link>

            <Link
              to={ROUTES.ADMIN_AUDIT_LOG}
              data-testid="quick-link-audit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
                📜
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>
                  Audit Log
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  System governance
                </span>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminOverview;
