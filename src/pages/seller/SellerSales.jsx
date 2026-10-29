import { useState, useEffect, useContext } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { ToastContext } from '../../context/toastContextDef';
import { sellerService } from '../../services/sellerService';
import { SellerApprovalNotice } from '../../components/seller/SellerApprovalNotice';
import { OrderStatusBadge } from '../../components/common/OrderStatusBadge';
import { Button, Spinner } from '../../components/common';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PERIOD_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' },
];

/**
 * SellerSales — Seller Sales Performance & Analytics Page
 *
 * SRS References:
 * - SEL-12: The Sales view shall show, for a selectable period:
 *   total sales value (Completed orders), number of orders, products sold
 *   (quantity per product), and recent orders.
 * - BR-12: Sales figures count only orders with status Completed.
 * - SEL-14 / BR-08: Object-level authorization: seller only views their own sales,
 *   products, and orders.
 * - SEL-15: Advanced charts and trend analytics are deferred from Release 1.0.
 * - Figma Section 13: Summary cards (Total Sales Value, Orders, Products Sold),
 *   period selector, products sold table, and recent orders list.
 */
export function SellerSales() {
  const { user } = useAuth();
  const toast = useContext(ToastContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // Resolved seller ID (SEL-14, BR-08)
  const currentSellerId =
    user?.seller_id ??
    user?.seller?.id ??
    (user?.role === 'seller' ? user?.id : 1);

  // URL state synchronization
  const periodParam = searchParams.get('period') || 'all';
  const dateFromParam = searchParams.get('date_from') || '';
  const dateToParam = searchParams.get('date_to') || '';

  // Local state
  const [salesData, setSalesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Custom date picker state
  const [customFrom, setCustomFrom] = useState(dateFromParam);
  const [customTo, setCustomTo] = useState(dateToParam);
  const [customDateError, setCustomDateError] = useState('');

  // UI state for tables
  const [productSearch, setProductSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all'); // 'all' or 'completed'

  // Fetch sales metrics from sellerService
  useEffect(() => {
    let isMounted = true;

    async function loadSales() {
      setIsLoading(true);
      setError(null);
      try {
        const params = {
          seller_id: currentSellerId,
          period: periodParam,
        };
        if (periodParam === 'custom') {
          if (dateFromParam) params.date_from = dateFromParam;
          if (dateToParam) params.date_to = dateToParam;
        }

        const data = await sellerService.getSellerSales(params);
        if (isMounted) {
          setSalesData(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err?.message ||
              'Unable to load sales analytics. Please check your connection.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSales();

    return () => {
      isMounted = false;
    };
  }, [currentSellerId, periodParam, dateFromParam, dateToParam]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const params = {
        seller_id: currentSellerId,
        period: periodParam,
      };
      if (periodParam === 'custom') {
        if (dateFromParam) params.date_from = dateFromParam;
        if (dateToParam) params.date_to = dateToParam;
      }
      const data = await sellerService.getSellerSales(params);
      setSalesData(data);
      toast?.success?.('Sales performance data refreshed.');
    } catch (err) {
      setError(err?.message || 'Failed to refresh sales data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Period Preset Change
  const handlePeriodChange = (newPeriod) => {
    const next = new URLSearchParams(searchParams);
    next.set('period', newPeriod);
    if (newPeriod !== 'custom') {
      next.delete('date_from');
      next.delete('date_to');
      setCustomDateError('');
      setCustomFrom('');
      setCustomTo('');
    }
    setSearchParams(next);
  };

  // Custom Date Range Submit
  const handleApplyCustomDates = (e) => {
    e.preventDefault();
    setCustomDateError('');

    if (customFrom && customTo && new Date(customFrom) > new Date(customTo)) {
      setCustomDateError('Start date cannot be after end date.');
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set('period', 'custom');
    if (customFrom) {
      next.set('date_from', customFrom);
    } else {
      next.delete('date_from');
    }
    if (customTo) {
      next.set('date_to', customTo);
    } else {
      next.delete('date_to');
    }
    setSearchParams(next);
  };

  const handleResetCustomDates = () => {
    setCustomFrom('');
    setCustomTo('');
    setCustomDateError('');
    handlePeriodChange('all');
  };

  // Human-readable active period description
  const getActivePeriodDescription = () => {
    if (periodParam === 'today') return 'Today';
    if (periodParam === 'this_week') return 'This Week (Last 7 Days)';
    if (periodParam === 'this_month') return 'This Month';
    if (periodParam === 'this_year') return 'This Year';
    if (periodParam === 'custom') {
      if (dateFromParam && dateToParam) {
        return `${dateFromParam} to ${dateToParam}`;
      }
      if (dateFromParam) return `From ${dateFromParam}`;
      if (dateToParam) return `Up to ${dateToParam}`;
      return 'Custom Range';
    }
    return 'All Time';
  };

  // Filtered products sold by search
  const filteredProductsSold = (salesData?.products_sold || []).filter(
    (item) => {
      if (!productSearch.trim()) return true;
      const q = productSearch.toLowerCase().trim();
      return (
        item.product_name?.toLowerCase().includes(q) ||
        item.unit?.toLowerCase().includes(q)
      );
    }
  );

  // Filtered recent orders by status tab
  const filteredRecentOrders = (salesData?.recent_orders || []).filter(
    (order) => {
      if (orderStatusFilter === 'completed') {
        return (order.status || '').toLowerCase() === 'completed';
      }
      return true;
    }
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Seller Approval Notice if not approved (AUTH-03, ADM-03) */}
      <SellerApprovalNotice user={user} />

      {/* Header with Title and Actions */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            data-testid="sales-page-title"
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#0f172a',
              margin: 0,
            }}
          >
            Sales & Analytics
          </h1>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.9rem',
              margin: '0.25rem 0 0 0',
            }}
          >
            Track revenue, completed orders, and produce sales performance
            (SEL-12).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            data-testid="sales-refresh-btn"
          >
            {isRefreshing ? <Spinner size="sm" /> : '↻ Refresh'}
          </Button>
        </div>
      </div>

      {/* Deferred Charts Notice (SEL-15, Figma prompt) */}
      <div
        data-testid="charts-deferred-notice"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.625rem 1rem',
          fontSize: '0.85rem',
          color: '#475569',
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
        <span>
          <strong>Release 1.0 Note:</strong> Graphical analytics and trend
          charts are deferred from Release 1.0 per specification SEL-15. Core
          metrics, products sold, and order lists are fully active.
        </span>
      </div>

      {/* Period Selector (SEL-12) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: periodParam === 'custom' ? '1rem' : 0,
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                display: 'block',
                marginBottom: '0.5rem',
              }}
            >
              Select Time Period
            </span>
            <div
              data-testid="period-selector"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.375rem',
              }}
            >
              {PERIOD_PRESETS.map((preset) => {
                const isActive = periodParam === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`period-btn-${preset.id}`}
                    onClick={() => handlePeriodChange(preset.id)}
                    style={{
                      padding: '0.45rem 0.875rem',
                      fontSize: '0.85rem',
                      fontWeight: isActive ? '600' : '500',
                      borderRadius: '6px',
                      border: isActive
                        ? '1px solid #16a34a'
                        : '1px solid #cbd5e1',
                      backgroundColor: isActive ? '#16a34a' : '#ffffff',
                      color: isActive ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            data-testid="active-period-indicator"
            style={{
              fontSize: '0.85rem',
              color: '#0f172a',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
            }}
          >
            <span style={{ color: '#166534', fontWeight: '600' }}>
              Active Period:{' '}
            </span>
            <span>{getActivePeriodDescription()}</span>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {periodParam === 'custom' && (
          <form
            onSubmit={handleApplyCustomDates}
            data-testid="custom-date-form"
            style={{
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label
                htmlFor="custom-from-input"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: '0.25rem',
                }}
              >
                From Date
              </label>
              <input
                id="custom-from-input"
                type="date"
                data-testid="custom-date-from"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="custom-to-input"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: '0.25rem',
                }}
              >
                To Date
              </label>
              <input
                id="custom-to-input"
                type="date"
                data-testid="custom-date-to"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                data-testid="apply-custom-date"
              >
                Apply Range
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetCustomDates}
                data-testid="reset-custom-date"
              >
                Reset
              </Button>
            </div>

            {customDateError && (
              <div
                data-testid="custom-date-error"
                role="alert"
                style={{
                  width: '100%',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                }}
              >
                ⚠️ {customDateError}
              </div>
            )}
          </form>
        )}
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div
          data-testid="sales-error-state"
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            color: '#991b1b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div>
            <strong>Error loading sales data:</strong> {error}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            data-testid="sales-retry-btn"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div
          data-testid="sales-loading-state"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            padding: '2rem',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          <Spinner size="lg" />
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Loading sales figures and produce records...
          </span>
        </div>
      ) : (
        <>
          {/* Key Metric Summary Cards Grid (SEL-12, BR-12, Figma Section 13) */}
          <div
            data-testid="sales-kpi-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* KPI 1: Total Sales (Completed Orders Only - BR-12) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
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
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Total Sales Value
                </span>
                <span style={{ fontSize: '1.25rem' }}>💰</span>
              </div>
              <span
                data-testid="sales-total-value"
                style={{
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  color: '#15803d',
                  display: 'block',
                  marginTop: '0.5rem',
                }}
              >
                {formatCurrency(salesData?.total_sales ?? 0)}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#16a34a',
                  fontWeight: '500',
                  display: 'block',
                  marginTop: '0.25rem',
                }}
              >
                Completed orders only (BR-12)
              </span>
            </div>

            {/* KPI 2: Completed Orders Count */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
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
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Completed Orders
                </span>
                <span style={{ fontSize: '1.25rem' }}>📦</span>
              </div>
              <span
                data-testid="sales-order-count"
                style={{
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  display: 'block',
                  marginTop: '0.5rem',
                }}
              >
                {salesData?.completed_orders_count ?? 0}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  display: 'block',
                  marginTop: '0.25rem',
                }}
              >
                Out of {salesData?.total_orders_count ?? 0} total order
                {(salesData?.total_orders_count ?? 0) === 1 ? '' : 's'} placed
              </span>
            </div>

            {/* KPI 3: Products Sold */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
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
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Products Sold
                </span>
                <span style={{ fontSize: '1.25rem' }}>🥕</span>
              </div>
              <span
                data-testid="sales-products-sold-count"
                style={{
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  display: 'block',
                  marginTop: '0.5rem',
                }}
              >
                {salesData?.total_products_sold ?? 0}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  display: 'block',
                  marginTop: '0.25rem',
                }}
              >
                Across {salesData?.products_sold?.length ?? 0} produce item
                {(salesData?.products_sold?.length ?? 0) === 1 ? '' : 's'}
              </span>
            </div>

            {/* KPI 4: Average Order Value */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
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
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Average Order Value
                </span>
                <span style={{ fontSize: '1.25rem' }}>📊</span>
              </div>
              <span
                data-testid="sales-average-order-value"
                style={{
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  display: 'block',
                  marginTop: '0.5rem',
                }}
              >
                {formatCurrency(salesData?.average_order_value ?? 0)}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  display: 'block',
                  marginTop: '0.25rem',
                }}
              >
                Per completed order
              </span>
            </div>
          </div>

          {/* Section 1: Products Sold Breakdown (SEL-12) */}
          <div
            data-testid="products-sold-section"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Products Sold Breakdown
                </h2>
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '0.85rem',
                    margin: '0.25rem 0 0 0',
                  }}
                >
                  Units delivered and revenue generated per produce item
                  (SEL-12).
                </p>
              </div>

              {/* Search box for products sold */}
              {(salesData?.products_sold || []).length > 0 && (
                <div>
                  <input
                    type="text"
                    data-testid="products-sold-search"
                    placeholder="Search product..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      width: '200px',
                    }}
                  />
                </div>
              )}
            </div>

            {filteredProductsSold.length === 0 ? (
              <div
                data-testid="no-products-sold"
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <span
                  style={{
                    fontSize: '2rem',
                    display: 'block',
                    marginBottom: '0.5rem',
                  }}
                >
                  🥦
                </span>
                <p
                  style={{
                    fontWeight: '600',
                    color: '#334155',
                    margin: '0 0 0.25rem 0',
                  }}
                >
                  No products sold during this period
                </p>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    margin: 0,
                  }}
                >
                  Items from completed orders will appear here with units and
                  revenue breakdown.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  data-testid="products-sold-table"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '2px solid #e2e8f0',
                        color: '#475569',
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <th style={{ padding: '0.75rem 1rem' }}>Produce Item</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Unit</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Qty Sold</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Orders Count</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Total Revenue</th>
                      <th style={{ padding: '0.75rem 1rem' }}>
                        Share of Sales
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProductsSold.map((product) => {
                      const sharePercent =
                        product.percentage_of_sales != null
                          ? Math.round(product.percentage_of_sales)
                          : salesData?.total_sales > 0
                            ? Math.round(
                                (product.total_revenue /
                                  salesData.total_sales) *
                                  100
                              )
                            : 0;

                      return (
                        <tr
                          key={product.product_id || product.product_name}
                          data-testid={`product-sold-row-${product.product_id}`}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <td
                            style={{
                              padding: '0.875rem 1rem',
                              fontWeight: '600',
                              color: '#0f172a',
                            }}
                          >
                            {product.product_name}
                          </td>
                          <td
                            style={{
                              padding: '0.875rem 1rem',
                              color: '#64748b',
                            }}
                          >
                            {product.unit}
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                fontWeight: '700',
                              }}
                            >
                              {product.quantity_sold} {product.unit}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '0.875rem 1rem',
                              color: '#334155',
                            }}
                          >
                            {product.order_count} order
                            {product.order_count === 1 ? '' : 's'}
                          </td>
                          <td
                            style={{
                              padding: '0.875rem 1rem',
                              fontWeight: '600',
                              color: '#15803d',
                            }}
                          >
                            {formatCurrency(product.total_revenue)}
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                            >
                              <div
                                style={{
                                  width: '60px',
                                  height: '8px',
                                  backgroundColor: '#e2e8f0',
                                  borderRadius: '4px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(100, Math.max(0, sharePercent))}%`,
                                    height: '100%',
                                    backgroundColor: '#16a34a',
                                  }}
                                />
                              </div>
                              <span
                                style={{ fontSize: '0.8rem', color: '#64748b' }}
                              >
                                {sharePercent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Recent Orders (SEL-12) */}
          <div
            data-testid="recent-orders-section"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Recent Orders
                </h2>
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '0.85rem',
                    margin: '0.25rem 0 0 0',
                  }}
                >
                  Customer orders placed with your store during this period
                  (SEL-12).
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button
                  type="button"
                  data-testid="filter-all-orders"
                  onClick={() => setOrderStatusFilter('all')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: orderStatusFilter === 'all' ? '600' : '500',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor:
                      orderStatusFilter === 'all' ? '#0f172a' : '#ffffff',
                    color: orderStatusFilter === 'all' ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  All ({salesData?.recent_orders?.length ?? 0})
                </button>
                <button
                  type="button"
                  data-testid="filter-completed-orders"
                  onClick={() => setOrderStatusFilter('completed')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight:
                      orderStatusFilter === 'completed' ? '600' : '500',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor:
                      orderStatusFilter === 'completed' ? '#16a34a' : '#ffffff',
                    color:
                      orderStatusFilter === 'completed' ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Completed ({salesData?.completed_orders_count ?? 0})
                </button>
              </div>
            </div>

            {filteredRecentOrders.length === 0 ? (
              <div
                data-testid="no-recent-orders"
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <span
                  style={{
                    fontSize: '2rem',
                    display: 'block',
                    marginBottom: '0.5rem',
                  }}
                >
                  📋
                </span>
                <p
                  style={{
                    fontWeight: '600',
                    color: '#334155',
                    margin: '0 0 0.25rem 0',
                  }}
                >
                  No orders found for the selected period
                </p>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    margin: '0 0 1rem 0',
                  }}
                >
                  Try selecting &quot;All Time&quot; or another date range to
                  review historical orders.
                </p>
                <Link
                  to="/seller/orders"
                  style={{
                    fontSize: '0.85rem',
                    color: '#16a34a',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                >
                  Go to Orders Management →
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  data-testid="recent-orders-table"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '2px solid #e2e8f0',
                        color: '#475569',
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <th style={{ padding: '0.75rem 1rem' }}>Order Ref</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Buyer</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Items Summary</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th
                        style={{ padding: '0.75rem 1rem', textAlign: 'right' }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentOrders.map((order) => {
                      const itemsSummary = (order.items || [])
                        .map(
                          (it) =>
                            `${it.quantity || 1} ${it.unit || ''} ${it.product_name || ''}`
                        )
                        .join(', ');

                      return (
                        <tr
                          key={order.id}
                          data-testid={`recent-order-row-${order.id}`}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <td
                            style={{
                              padding: '0.875rem 1rem',
                              fontWeight: '600',
                            }}
                          >
                            <Link
                              to={`/seller/orders/${order.id}`}
                              style={{
                                color: '#16a34a',
                                textDecoration: 'none',
                              }}
                            >
                              {order.order_number || `#${order.id}`}
                            </Link>
                          </td>
                          <td
                            style={{
                              padding: '0.875rem 1rem',
                              color: '#64748b',
                            }}
                          >
                            {formatDate(order.created_at, {
                              format: 'dateTime',
                            })}
                          </td>
                          <td
                            style={{
                              padding: '0.875rem 1rem',
                              color: '#0f172a',
                            }}
                          >
                            <div>
                              {order.delivery_name ||
                                order.buyer?.name ||
                                'Customer'}
                            </div>
                            {order.delivery_phone && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#64748b',
                                }}
                              >
                                {order.delivery_phone}
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: '0.875rem 1rem',
                              color: '#334155',
                              maxWidth: '260px',
                            }}
                          >
                            <span
                              style={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={itemsSummary}
                            >
                              {itemsSummary || '—'}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '0.875rem 1rem',
                              fontWeight: '600',
                              color: '#0f172a',
                            }}
                          >
                            {formatCurrency(order.total_amount)}
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <OrderStatusBadge status={order.status} />
                          </td>
                          <td
                            style={{
                              padding: '0.875rem 1rem',
                              textAlign: 'right',
                            }}
                          >
                            <Link
                              to={`/seller/orders/${order.id}`}
                              style={{
                                fontSize: '0.85rem',
                                color: '#16a34a',
                                fontWeight: '600',
                                textDecoration: 'none',
                              }}
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div
              style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Link
                to="/seller/orders"
                style={{
                  fontSize: '0.85rem',
                  color: '#16a34a',
                  fontWeight: '600',
                  textDecoration: 'none',
                }}
              >
                Go to Full Orders Management →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SellerSales;
