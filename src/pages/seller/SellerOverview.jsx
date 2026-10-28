import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks';
import {
  canSellerPublish,
  getSellerApprovalStatus,
} from '../../utils/sellerStatus';
import { SellerStatusBadge } from '../../components/seller/SellerStatusBadge';
import { OrderStatusBadge } from '../../components/common/OrderStatusBadge';
import { Button, Spinner } from '../../components/common';
import {
  formatCurrency,
  formatPrice,
  formatDate,
} from '../../utils/formatters';
import { sellerService } from '../../services/sellerService';

/**
 * SellerOverview — Seller Dashboard Landing & Performance Overview
 *
 * SRS References:
 * - SEL-01: Seller dashboard sections: Overview, Products, Add Product, Orders, Inventory, Sales, Profile.
 * - SEL-13: The Overview shall summarise new (Pending) orders, low-stock items and the latest sales figures.
 * - SEL-14: Object-level authorization: seller only views their own products, orders, and sales metrics.
 * - SEL-15: Advanced charts and trend analytics are deferred from Release 1.0.
 * - Figma Section 13: Summary cards (Pending Orders, Total Products, Low Stock Items, Recent Sales),
 *   recent orders table, low-stock alert items (threshold <= 5 units), and latest sales figures.
 */
export function SellerOverview() {
  const { user } = useAuth();
  const canPublish = canSellerPublish(user);
  const approvalStatus = getSellerApprovalStatus(user);

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const sellerId =
          user?.seller_id ??
          user?.seller?.id ??
          (user?.role === 'seller' ? user?.id : null);
        const data = await sellerService.getSellerDashboard({
          seller_id: sellerId,
        });
        if (isMounted) {
          setDashboardData(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err?.message ||
              'Unable to load seller overview metrics. Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const sellerId =
        user?.seller_id ??
        user?.seller?.id ??
        (user?.role === 'seller' ? user?.id : null);
      const data = await sellerService.getSellerDashboard({
        seller_id: sellerId,
      });
      setDashboardData(data);
    } catch (err) {
      setError(
        err?.message ||
          'Unable to load seller overview metrics. Please try again.'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetry = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sellerId =
        user?.seller_id ??
        user?.seller?.id ??
        (user?.role === 'seller' ? user?.id : null);
      const data = await sellerService.getSellerDashboard({
        seller_id: sellerId,
      });
      setDashboardData(data);
    } catch (err) {
      setError(
        err?.message ||
          'Unable to load seller overview metrics. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback defaults if data is not yet loaded or empty
  const pendingOrders = dashboardData?.pending_orders || [];
  const lowStockProducts = dashboardData?.low_stock_products || [];
  const latestSales = dashboardData?.latest_sales || [];

  const pendingCount =
    dashboardData?.pending_orders_count ?? pendingOrders.length;
  const productsCount =
    dashboardData?.total_products_count ??
    dashboardData?.active_listings_count ??
    0;
  const lowStockCount =
    dashboardData?.low_stock_count ?? lowStockProducts.length;
  const totalRevenue = dashboardData?.total_revenue ?? 0;
  const completedOrdersCount = dashboardData?.completed_orders_count ?? 0;
  const totalProductsSold = dashboardData?.total_products_sold ?? 0;
  const lowStockThreshold = dashboardData?.low_stock_threshold ?? 5;

  const sellerName =
    dashboardData?.seller_name ||
    user?.business_name ||
    user?.name ||
    'Vegetable Farmer';

  return (
    <div
      data-testid="seller-overview-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* 1. Header with Title, Welcome Greeting, Refresh & Approval Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid #f1f5f9',
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
              data-testid="overview-title"
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.025em',
              }}
            >
              Seller Overview (SEL-13)
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#15803d',
                backgroundColor: '#dcfce7',
                border: '1px solid #bbf7d0',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              SEL-13
            </span>
          </div>
          <p
            data-testid="overview-subtitle"
            style={{
              color: '#64748b',
              fontSize: '0.925rem',
              margin: '0.35rem 0 0 0',
              lineHeight: 1.4,
            }}
          >
            Welcome back, <strong>{sellerName}</strong>. Monitor pending orders,
            track low-stock vegetables, and view latest sales performance.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {canPublish && <SellerStatusBadge status={approvalStatus} />}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            data-testid="overview-refresh-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="Refresh dashboard metrics"
          >
            <span
              style={{
                display: 'inline-block',
                transform: isRefreshing ? 'rotate(360deg)' : 'none',
                transition: 'transform 0.5s ease',
              }}
              aria-hidden="true"
            >
              🔄
            </span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Quick Actions Bar (Preserving AUTH-03 locked button specs) */}
      <div
        data-testid="overview-quick-actions"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.825rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#475569',
            }}
          >
            Quick Actions
          </span>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Direct shortcuts to key portal sections
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.85rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {canPublish ? (
            <Link
              to="/seller/products/new"
              data-testid="add-vegetable-link"
              style={{
                backgroundColor: '#15803d',
                color: '#ffffff',
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 1px 2px rgba(21, 128, 61, 0.2)',
                transition: 'background-color 0.15s ease',
              }}
            >
              + Add New Vegetable
            </Link>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <button
                type="button"
                disabled
                aria-disabled="true"
                data-testid="add-vegetable-disabled-btn"
                title="Product publishing is disabled until your seller account is approved by an administrator."
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#94a3b8',
                  border: '1px solid #cbd5e1',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span aria-hidden="true">🔒</span>
                <span>+ Add New Vegetable (Publishing Disabled)</span>
              </button>
              <span
                data-testid="overview-publishing-disabled-notice"
                style={{ fontSize: '0.75rem', color: '#b45309' }}
              >
                ⚠️ Publishing disabled: account is{' '}
                <strong>{approvalStatus}</strong> (AUTH-03)
              </span>
            </div>
          )}

          <Link
            to="/seller/orders"
            data-testid="overview-view-orders-link"
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span aria-hidden="true">📦</span>
            <span>View Incoming Orders</span>
          </Link>

          <Link
            to="/seller/inventory"
            data-testid="overview-manage-inventory-link"
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span aria-hidden="true">📊</span>
            <span>Manage Stock Levels</span>
          </Link>

          <Link
            to="/seller/sales"
            data-testid="overview-view-sales-link"
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span aria-hidden="true">📈</span>
            <span>View Sales Report</span>
          </Link>
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div
          role="alert"
          data-testid="overview-error-state"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>⚠️</span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>
                Failed to load overview data
              </strong>
              <span style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
                {error}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            data-testid="overview-retry-btn"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 4. Loading Skeleton */}
      {isLoading && (
        <div
          data-testid="overview-loading-state"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3.5rem 1rem',
            gap: '1rem',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          <Spinner size="lg" />
          <p
            style={{
              margin: 0,
              color: '#64748b',
              fontSize: '0.925rem',
              fontWeight: 500,
            }}
          >
            Loading seller metrics and orders...
          </p>
        </div>
      )}

      {/* 5. Main Dashboard Content */}
      {!isLoading && (
        <>
          {/* KPI Summary Cards Grid (Figma Section 13: Pending Orders, Total Products, Low Stock Items, Recent Sales) */}
          <div
            data-testid="overview-kpi-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* KPI 1: Pending Orders */}
            <Link
              to="/seller/orders"
              data-testid="overview-kpi-pending-orders"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #fed7aa',
                borderRadius: '12px',
                padding: '1.35rem 1.5rem',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#9a3412',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Pending Orders
                </span>
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    backgroundColor: '#ffedd5',
                    color: '#c2410c',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                  }}
                >
                  Requires Action
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                }}
              >
                <span
                  data-testid="overview-pending-orders-count"
                  style={{
                    fontSize: '2.25rem',
                    fontWeight: 800,
                    color: '#ea580c',
                    lineHeight: 1,
                  }}
                >
                  {pendingCount}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  new order{pendingCount === 1 ? '' : 's'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem',
                }}
              >
                Click to confirm and fulfill orders →
              </span>
            </Link>

            {/* KPI 2: Total Products / Active Listings */}
            <Link
              to="/seller/products"
              data-testid="overview-kpi-products"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '1.35rem 1.5rem',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#166534',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Total Products
                </span>
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                  }}
                >
                  Active
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                }}
              >
                <span
                  data-testid="overview-products-count"
                  style={{
                    fontSize: '2.25rem',
                    fontWeight: 800,
                    color: '#15803d',
                    lineHeight: 1,
                  }}
                >
                  {productsCount}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  vegetable listing{productsCount === 1 ? '' : 's'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem',
                }}
              >
                View and edit catalog products →
              </span>
            </Link>

            {/* KPI 3: Low Stock Items */}
            <Link
              to="/seller/inventory"
              data-testid="overview-kpi-low-stock"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '1.35rem 1.5rem',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#991b1b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Low Stock Items
                </span>
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                  }}
                >
                  ≤ {lowStockThreshold} Units
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                }}
              >
                <span
                  data-testid="overview-low-stock-count"
                  style={{
                    fontSize: '2.25rem',
                    fontWeight: 800,
                    color: lowStockCount > 0 ? '#dc2626' : '#15803d',
                    lineHeight: 1,
                  }}
                >
                  {lowStockCount}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  item{lowStockCount === 1 ? '' : 's'} under threshold
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem',
                }}
              >
                Restock before items sell out →
              </span>
            </Link>

            {/* KPI 4: Recent Sales / Total Revenue */}
            <Link
              to="/seller/sales"
              data-testid="overview-kpi-sales"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.35rem 1.5rem',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#334155',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Total Revenue
                </span>
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                  }}
                >
                  Completed
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                }}
              >
                <span
                  data-testid="overview-total-revenue"
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1,
                  }}
                >
                  {formatCurrency(totalRevenue)}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  marginTop: '0.25rem',
                }}
              >
                From {completedOrdersCount} completed order
                {completedOrdersCount === 1 ? '' : 's'} ({totalProductsSold}{' '}
                unit
                {totalProductsSold === 1 ? '' : 's'} sold) →
              </span>
            </Link>
          </div>

          {/* 6. Two-Column Layout: New (Pending) Orders & Low-Stock Alerts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Section A: New / Pending Orders (SEL-13) */}
            <div
              data-testid="overview-pending-orders-section"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #f1f5f9',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    New & Pending Orders
                  </h2>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: '#fff7ed',
                      color: '#c2410c',
                      border: '1px solid #ffedd5',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '9999px',
                    }}
                  >
                    {pendingCount}
                  </span>
                </div>

                <Link
                  to="/seller/orders"
                  data-testid="overview-all-orders-link"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#15803d',
                    textDecoration: 'none',
                  }}
                >
                  View All Orders →
                </Link>
              </div>

              {pendingOrders.length === 0 ? (
                <div
                  data-testid="overview-no-pending-orders"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '2rem' }} aria-hidden="true">
                    📦
                  </span>
                  <strong style={{ color: '#334155', fontSize: '0.95rem' }}>
                    No pending orders to fulfill right now
                  </strong>
                  <span
                    style={{
                      color: '#94a3b8',
                      fontSize: '0.85rem',
                      maxWidth: '320px',
                    }}
                  >
                    New buyer orders will appear here automatically for
                    confirmation and packing.
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {pendingOrders.map((order) => {
                    const buyerName =
                      order.delivery_name || order.buyer?.name || 'Buyer';
                    const itemsSummary = (order.items || [])
                      .map(
                        (it) =>
                          `${it.product_name || it.name || 'Vegetable'} (x${it.quantity})`
                      )
                      .join(', ');

                    return (
                      <div
                        key={`pending-${order.id}`}
                        data-testid={`overview-pending-order-${order.id}`}
                        style={{
                          border: '1px solid #f1f5f9',
                          borderRadius: '8px',
                          padding: '1rem',
                          backgroundColor: '#fafaf9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <strong
                              style={{
                                color: '#0f172a',
                                fontSize: '0.9rem',
                                fontFamily: 'monospace',
                              }}
                            >
                              {order.order_number || `ORD-${order.id}`}
                            </strong>
                            <OrderStatusBadge status="pending" size="sm" />
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#15803d',
                              fontSize: '0.95rem',
                            }}
                          >
                            {formatCurrency(order.total_amount)}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.825rem',
                            color: '#64748b',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <span>
                            Buyer: <strong>{buyerName}</strong>
                            {order.delivery_phone
                              ? ` (${order.delivery_phone})`
                              : ''}
                          </span>
                          <span>{formatDate(order.created_at)}</span>
                        </div>

                        {itemsSummary && (
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: '#475569',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={itemsSummary}
                          >
                            Items: {itemsSummary}
                          </div>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            marginTop: '0.25rem',
                          }}
                        >
                          <Link
                            to={`/seller/orders/${order.id}`}
                            data-testid={`overview-view-order-${order.id}`}
                            style={{
                              fontSize: '0.825rem',
                              fontWeight: 600,
                              color: '#15803d',
                              textDecoration: 'none',
                            }}
                          >
                            View & Process Order →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section B: Low-Stock Inventory Alerts (SEL-13, Figma Section 13) */}
            <div
              data-testid="overview-low-stock-section"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #f1f5f9',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    Low-Stock Items
                  </h2>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor:
                        lowStockCount > 0 ? '#fee2e2' : '#dcfce7',
                      color: lowStockCount > 0 ? '#b91c1c' : '#15803d',
                      border: `1px solid ${lowStockCount > 0 ? '#fecaca' : '#bbf7d0'}`,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '9999px',
                    }}
                  >
                    {lowStockCount}
                  </span>
                </div>

                <Link
                  to="/seller/inventory"
                  data-testid="overview-manage-stock-link"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#15803d',
                    textDecoration: 'none',
                  }}
                >
                  Manage Inventory →
                </Link>
              </div>

              {lowStockProducts.length === 0 ? (
                <div
                  data-testid="overview-no-low-stock"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '2rem' }} aria-hidden="true">
                    ✅
                  </span>
                  <strong style={{ color: '#15803d', fontSize: '0.95rem' }}>
                    All products are adequately stocked!
                  </strong>
                  <span
                    style={{
                      color: '#64748b',
                      fontSize: '0.85rem',
                      maxWidth: '320px',
                    }}
                  >
                    None of your vegetable listings are currently at or below
                    the low-stock threshold ({lowStockThreshold} units).
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {lowStockProducts.map((product) => {
                    const isOutOfStock =
                      product.quantity === 0 ||
                      product.availability === 'out_of_stock';
                    const categoryName =
                      product.category?.name ||
                      product.category_name ||
                      'Produce';

                    return (
                      <div
                        key={`low-stock-${product.id}`}
                        data-testid={`overview-low-stock-item-${product.id}`}
                        style={{
                          border: '1px solid #fee2e2',
                          borderRadius: '8px',
                          padding: '1rem',
                          backgroundColor: '#fffdfd',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <strong
                            style={{
                              color: '#0f172a',
                              fontSize: '0.925rem',
                            }}
                          >
                            {product.name}
                          </strong>

                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              backgroundColor: isOutOfStock
                                ? '#fee2e2'
                                : '#fef3c7',
                              color: isOutOfStock ? '#991b1b' : '#92400e',
                              border: `1px solid ${isOutOfStock ? '#fca5a5' : '#fde68a'}`,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.825rem',
                            color: '#64748b',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <span>Category: {categoryName}</span>
                          <span>
                            Price:{' '}
                            <strong style={{ color: '#1e293b' }}>
                              {formatPrice(product.price, product.unit)}
                            </strong>
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '0.2rem',
                          }}
                        >
                          <span
                            data-testid={`overview-low-stock-qty-${product.id}`}
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              color: isOutOfStock ? '#b91c1c' : '#c2410c',
                            }}
                          >
                            {isOutOfStock
                              ? '0 in stock (Sold Out)'
                              : `${product.quantity} ${product.unit || 'unit'}${product.quantity === 1 ? '' : 's'} remaining`}
                          </span>

                          <Link
                            to="/seller/inventory"
                            data-testid={`overview-update-stock-${product.id}`}
                            style={{
                              fontSize: '0.825rem',
                              fontWeight: 600,
                              color: '#15803d',
                              textDecoration: 'none',
                            }}
                          >
                            Update Stock →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 7. Section: Latest Sales Figures (SEL-13, SEL-12, Figma Section 13) */}
          <div
            data-testid="overview-sales-section"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #f1f5f9',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Latest Sales Figures
                </h2>
                <p
                  style={{
                    fontSize: '0.825rem',
                    color: '#64748b',
                    margin: '0.2rem 0 0 0',
                  }}
                >
                  Completed buyer orders and settled revenue figures (SEL-12,
                  SEL-13)
                </p>
              </div>

              <Link
                to="/seller/sales"
                data-testid="overview-full-sales-link"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#15803d',
                  textDecoration: 'none',
                }}
              >
                View Detailed Sales Report →
              </Link>
            </div>

            {/* Sales Figures Highlight Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    display: 'block',
                  }}
                >
                  Total Revenue
                </span>
                <span
                  data-testid="overview-sales-total"
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#0f172a',
                  }}
                >
                  {formatCurrency(totalRevenue)}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    display: 'block',
                  }}
                >
                  Completed Orders
                </span>
                <span
                  data-testid="overview-sales-orders-count"
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#15803d',
                  }}
                >
                  {completedOrdersCount}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    display: 'block',
                  }}
                >
                  Total Units Sold
                </span>
                <span
                  data-testid="overview-sales-units-sold"
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#0369a1',
                  }}
                >
                  {totalProductsSold} unit{totalProductsSold === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Recent Completed Sales Table / Cards */}
            {latestSales.length === 0 ? (
              <div
                data-testid="overview-no-sales"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '2rem' }} aria-hidden="true">
                  📈
                </span>
                <strong style={{ color: '#334155', fontSize: '0.95rem' }}>
                  No completed sales recorded yet
                </strong>
                <span
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    maxWidth: '320px',
                  }}
                >
                  Orders delivered and marked completed will appear here and
                  update your revenue totals.
                </span>
              </div>
            ) : (
              <div
                data-testid="overview-latest-sales-list"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                }}
              >
                {latestSales.map((sale) => {
                  const buyerName =
                    sale.delivery_name || sale.buyer?.name || 'Buyer';
                  const saleItemsCount = (sale.items || []).reduce(
                    (sum, it) => sum + (it.quantity || 1),
                    0
                  );

                  return (
                    <div
                      key={`sale-${sale.id}`}
                      data-testid={`overview-sale-item-${sale.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        border: '1px solid #f1f5f9',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            color: '#0f172a',
                            fontSize: '0.875rem',
                          }}
                        >
                          {sale.order_number || `ORD-${sale.id}`}
                        </span>
                        <OrderStatusBadge status="completed" size="sm" />
                      </div>

                      <div
                        style={{
                          fontSize: '0.825rem',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>
                          Buyer: <strong>{buyerName}</strong>
                        </span>
                        <span>
                          {saleItemsCount} item{saleItemsCount === 1 ? '' : 's'}
                        </span>
                        <span>
                          {formatDate(sale.completed_at || sale.updated_at)}
                        </span>
                      </div>

                      <strong
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: '#15803d',
                        }}
                      >
                        {formatCurrency(sale.total_amount)}
                      </strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SellerOverview;
