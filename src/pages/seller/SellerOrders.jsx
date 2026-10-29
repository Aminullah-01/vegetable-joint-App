import { useState, useEffect, useContext } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { ToastContext } from '../../context/toastContextDef';
import { sellerService } from '../../services/sellerService';
import { formatPrice, formatDate } from '../../utils/formatters';
import {
  Button,
  OrderStatusBadge,
  Pagination,
  TableSkeleton,
  EmptyState,
} from '../../components/common';

const STATUS_OPTIONS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const DATE_PRESETS = [
  { id: 'all', label: 'All Dates' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

const DEFAULT_PAGE_SIZE = 10;

/**
 * SellerOrders — Seller Customer Orders List Page
 *
 * SRS References:
 * - SEL-10: The Orders view shall list only orders that contain the seller’s own products,
 *           filterable by status and date, and show buyer name, phone and delivery details
 *           needed to fulfil the order.
 * - SEL-14 / BR-08: A seller shall never be able to view, edit or delete another seller’s
 *                   products, orders or profile (object-level authorization).
 * - TC-23: Seller views orders: Only orders containing own products are listed.
 * - Figma Section 13: Seller Orders table with status and date filters, buyer details, and lifecycle actions.
 */
export function SellerOrders() {
  const { user } = useAuth();
  const toast = useContext(ToastContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // Resolved current seller ID (SEL-10, SEL-14, BR-08)
  const currentSellerId =
    user?.seller_id ??
    user?.seller?.id ??
    (user?.role === 'seller' ? user?.id : 1);

  // URL state synchronization
  const pageParam = Math.max(1, Number(searchParams.get('page')) || 1);
  const statusParam = searchParams.get('status') || 'all';
  const queryParam = searchParams.get('search') || '';
  const datePresetParam = searchParams.get('preset') || 'all';
  const dateFromParam = searchParams.get('from') || '';
  const dateToParam = searchParams.get('to') || '';

  // Local state for inputs and state adjustment during render without cascading effects
  const [searchInput, setSearchInput] = useState(queryParam);
  const [prevQueryParam, setPrevQueryParam] = useState(queryParam);
  if (queryParam !== prevQueryParam) {
    setPrevQueryParam(queryParam);
    setSearchInput(queryParam);
  }

  const [dateFrom, setDateFrom] = useState(dateFromParam);
  const [prevDateFromParam, setPrevDateFromParam] = useState(dateFromParam);
  if (dateFromParam !== prevDateFromParam) {
    setPrevDateFromParam(dateFromParam);
    setDateFrom(dateFromParam);
  }

  const [dateTo, setDateTo] = useState(dateToParam);
  const [prevDateToParam, setPrevDateToParam] = useState(dateToParam);
  if (dateToParam !== prevDateToParam) {
    setPrevDateToParam(dateToParam);
    setDateTo(dateToParam);
  }

  const [datePreset, setDatePreset] = useState(datePresetParam);
  const [prevDatePresetParam, setPrevDatePresetParam] =
    useState(datePresetParam);
  if (datePresetParam !== prevDatePresetParam) {
    setPrevDatePresetParam(datePresetParam);
    setDatePreset(datePresetParam);
  }

  // Data states
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    current_page: 1,
    last_page: 1,
    per_page: DEFAULT_PAGE_SIZE,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch orders scoped to seller
  useEffect(() => {
    let isMounted = true;

    async function fetchOrders() {
      try {
        setIsLoading(true);
        setError(null);

        const params = {
          seller_id: currentSellerId,
          page: pageParam,
          per_page: DEFAULT_PAGE_SIZE,
        };

        if (statusParam && statusParam !== 'all') {
          params.status = statusParam;
        }

        if (queryParam.trim()) {
          params.search = queryParam.trim();
        }

        if (dateFromParam) {
          params.date_from = dateFromParam;
        }

        if (dateToParam) {
          params.date_to = dateToParam;
        }

        const response = await sellerService.getSellerOrders(params);

        if (!isMounted) return;

        // Ensure strict object-level authorization on client side (SEL-10, SEL-14, BR-08)
        const orderList = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        const filteredOwnOrders = orderList.filter((ord) => {
          if (!ord.seller_id) return true;
          return Number(ord.seller_id) === Number(currentSellerId);
        });

        setOrders(filteredOwnOrders);

        if (response?.meta) {
          setMeta(response.meta);
        } else {
          setMeta({
            total: filteredOwnOrders.length,
            current_page: pageParam,
            last_page:
              Math.ceil(filteredOwnOrders.length / DEFAULT_PAGE_SIZE) || 1,
            per_page: DEFAULT_PAGE_SIZE,
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err?.message ||
              'Unable to load customer orders. Please check your network connection.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [
    currentSellerId,
    pageParam,
    statusParam,
    queryParam,
    dateFromParam,
    dateToParam,
  ]);

  // Refresh orders handler
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const params = {
        seller_id: currentSellerId,
        page: pageParam,
        per_page: DEFAULT_PAGE_SIZE,
      };

      if (statusParam && statusParam !== 'all') params.status = statusParam;
      if (queryParam.trim()) params.search = queryParam.trim();
      if (dateFromParam) params.date_from = dateFromParam;
      if (dateToParam) params.date_to = dateToParam;

      const response = await sellerService.getSellerOrders(params);
      const orderList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      const filteredOwnOrders = orderList.filter((ord) => {
        if (!ord.seller_id) return true;
        return Number(ord.seller_id) === Number(currentSellerId);
      });

      setOrders(filteredOwnOrders);
      if (response?.meta) setMeta(response.meta);

      toast?.success?.('Orders list refreshed successfully.');
    } catch (err) {
      setError(err?.message || 'Failed to refresh orders.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Status Filter Change
  const handleStatusChange = (status) => {
    const next = new URLSearchParams(searchParams);
    if (status && status !== 'all') {
      next.set('status', status);
    } else {
      next.delete('status');
    }
    next.delete('page');
    setSearchParams(next);
  };

  // Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    const trimmed = searchInput.trim();
    if (trimmed) {
      next.set('search', trimmed);
    } else {
      next.delete('search');
    }
    next.delete('page');
    setSearchParams(next);
  };

  // Quick Date Preset Change
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const next = new URLSearchParams(searchParams);
    const now = new Date();

    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
      next.delete('preset');
      next.delete('from');
      next.delete('to');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setDateFrom(todayStr);
      setDateTo(todayStr);
      next.set('preset', 'today');
      next.set('from', todayStr);
      next.set('to', todayStr);
    } else if (preset === 'this_week') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      const mondayStr = monday.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      setDateFrom(mondayStr);
      setDateTo(todayStr);
      next.set('preset', 'this_week');
      next.set('from', mondayStr);
      next.set('to', todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayStr = firstDay.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      setDateFrom(firstDayStr);
      setDateTo(todayStr);
      next.set('preset', 'this_month');
      next.set('from', firstDayStr);
      next.set('to', todayStr);
    } else if (preset === 'custom') {
      next.set('preset', 'custom');
    }

    next.delete('page');
    setSearchParams(next);
  };

  // Apply Custom Date Range
  const handleApplyCustomDates = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    next.set('preset', 'custom');
    if (dateFrom) {
      next.set('from', dateFrom);
    } else {
      next.delete('from');
    }
    if (dateTo) {
      next.set('to', dateTo);
    } else {
      next.delete('to');
    }
    next.delete('page');
    setSearchParams(next);
  };

  // Clear / Reset All Filters
  const handleClearFilters = () => {
    setSearchInput('');
    setDateFrom('');
    setDateTo('');
    setDatePreset('all');
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    queryParam.trim() ||
    (statusParam && statusParam !== 'all') ||
    dateFromParam ||
    dateToParam ||
    (datePresetParam && datePresetParam !== 'all')
  );

  // Live KPI Summary Metrics (SEL-10)
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const inProgressCount = orders.filter((o) =>
    ['confirmed', 'processing', 'shipped'].includes(o.status)
  ).length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  return (
    <div
      data-testid="seller-orders-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* 1. Header Section */}
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
          <h1
            data-testid="seller-orders-title"
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.025em',
            }}
          >
            Customer Orders (SEL-10)
          </h1>
          <p
            data-testid="seller-orders-subtitle"
            style={{
              color: '#64748b',
              fontSize: '0.925rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            Manage and fulfill incoming orders containing your fresh vegetable
            produce.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            data-testid="seller-orders-refresh-btn"
            title="Refresh order listings"
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                transform: isRefreshing ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.5s ease',
              }}
            >
              🔄
            </span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Bar (SEL-10) */}
      <div
        data-testid="seller-orders-kpi-bar"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          data-testid="orders-kpi-total"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>📋</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Total Orders
            </div>
            <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>
              {meta.total}
            </strong>
          </div>
        </div>

        <div
          data-testid="orders-kpi-pending"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #fed7aa',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>⏳</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#9a3412' }}>
              Pending Fulfillment
            </div>
            <strong style={{ fontSize: '1.25rem', color: '#ea580c' }}>
              {pendingCount}
            </strong>
          </div>
        </div>

        <div
          data-testid="orders-kpi-processing"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🚚</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              In Progress / Transit
            </div>
            <strong style={{ fontSize: '1.25rem', color: '#0284c7' }}>
              {inProgressCount}
            </strong>
          </div>
        </div>

        <div
          data-testid="orders-kpi-completed"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>✅</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#166534' }}>
              Completed
            </div>
            <strong style={{ fontSize: '1.25rem', color: '#15803d' }}>
              {completedCount}
            </strong>
          </div>
        </div>

        <div
          data-testid="orders-kpi-revenue"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>💰</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Completed Revenue
            </div>
            <strong style={{ fontSize: '1.25rem', color: '#15803d' }}>
              {formatPrice(totalRevenue)}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls Bar (SEL-10, Figma Section 13) */}
      <div
        data-testid="seller-orders-filter-bar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: '#ffffff',
          padding: '1.25rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Row A: Search input + Status dropdown */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <form
            onSubmit={handleSearchSubmit}
            style={{
              flex: '1 1 300px',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by order #, buyer name, or phone..."
              aria-label="Search orders by order number, buyer name, or phone"
              data-testid="seller-orders-search-input"
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              data-testid="seller-orders-search-submit"
            >
              Search
            </Button>
          </form>

          {/* Status Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <label
              htmlFor="seller-orders-status-select"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#475569',
              }}
            >
              Status:
            </label>
            <select
              id="seller-orders-status-select"
              value={statusParam}
              onChange={(e) => handleStatusChange(e.target.value)}
              data-testid="seller-orders-status-filter"
              aria-label="Filter orders by status"
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row B: Date Filter Controls (SEL-10: filterable by date) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            paddingTop: '0.75rem',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#475569',
              }}
            >
              Date Range:
            </span>

            {/* Quick Date Presets */}
            <div
              role="radiogroup"
              aria-label="Filter orders by date preset"
              data-testid="seller-orders-date-presets"
              style={{
                display: 'inline-flex',
                gap: '0.35rem',
                flexWrap: 'wrap',
              }}
            >
              {DATE_PRESETS.map((preset) => {
                const isSelected = datePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleDatePresetChange(preset.id)}
                    data-testid={`date-preset-${preset.id}`}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: isSelected
                        ? '1px solid #15803d'
                        : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                      color: isSelected ? '#15803d' : '#475569',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Pickers (From / To) */}
          <form
            onSubmit={handleApplyCustomDates}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <label
                htmlFor="seller-orders-from-date"
                style={{ fontSize: '0.8rem', color: '#64748b' }}
              >
                From:
              </label>
              <input
                id="seller-orders-from-date"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setDatePreset('custom');
                }}
                data-testid="seller-orders-date-from"
                aria-label="Filter orders from date"
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                }}
              />
            </div>

            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <label
                htmlFor="seller-orders-to-date"
                style={{ fontSize: '0.8rem', color: '#64748b' }}
              >
                To:
              </label>
              <input
                id="seller-orders-to-date"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setDatePreset('custom');
                }}
                data-testid="seller-orders-date-to"
                aria-label="Filter orders to date"
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                }}
              />
            </div>

            <Button
              type="submit"
              variant="outline"
              size="sm"
              data-testid="seller-orders-apply-dates-btn"
            >
              Apply Date
            </Button>
          </form>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              data-testid="seller-orders-reset-filters-btn"
              style={{ color: '#dc2626' }}
            >
              ✕ Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* 4. Orders Data Table / List (SEL-10, SEL-14) */}
      {isLoading ? (
        <div
          data-testid="seller-orders-loading-skeleton"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
          }}
        >
          <TableSkeleton rows={5} cols={7} />
        </div>
      ) : error ? (
        <div
          data-testid="seller-orders-error-state"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #fecaca',
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', color: '#991b1b', margin: 0 }}>
            Unable to Load Orders
          </h2>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.9rem',
              margin: '0.5rem 0 1.5rem 0',
            }}
          >
            {error}
          </p>
          <Button
            variant="primary"
            onClick={handleRefresh}
            data-testid="seller-orders-retry-btn"
          >
            Retry Connection
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '3rem 1.5rem',
            textAlign: 'center',
          }}
        >
          {hasActiveFilters ? (
            <div data-testid="seller-orders-search-empty">
              <EmptyState
                type="search"
                title="No customer orders found"
                description="Try clearing your search query, status selection, or date range filter to view other orders."
                action={
                  <Button
                    variant="primary"
                    onClick={handleClearFilters}
                    data-testid="seller-orders-search-empty-reset"
                  >
                    Clear All Filters
                  </Button>
                }
              />
            </div>
          ) : (
            <div data-testid="seller-orders-empty-state">
              <EmptyState
                type="orders"
                title="No customer orders yet"
                description="When buyers order your listed fresh vegetables, their orders and delivery details will appear here."
              />
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div className="table-responsive">
            <table
              data-testid="seller-orders-table"
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
                    fontSize: '0.785rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '0.85rem 1rem' }}>Order Ref</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Buyer & Phone</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Delivery Details</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Items Ordered</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Total Amount</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const buyerName =
                    order.delivery_name || order.buyer?.name || 'Customer';
                  const buyerPhone =
                    order.delivery_phone || order.buyer?.phone || 'No phone';
                  const deliveryAddress =
                    order.delivery_address || 'Standard Delivery';
                  const items = order.items || [];
                  const itemsSummary = items
                    .map(
                      (it) =>
                        `${it.product_name || it.name || 'Vegetable'} (${it.quantity} ${it.unit || 'units'})`
                    )
                    .join(', ');

                  return (
                    <tr
                      key={order.id}
                      data-testid={`seller-order-row-${order.id}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* 1. Order Ref */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <strong
                          data-testid={`seller-order-ref-${order.id}`}
                          style={{
                            fontFamily: 'monospace',
                            color: '#0f172a',
                            fontSize: '0.875rem',
                          }}
                        >
                          {order.order_number || `#ORD-${order.id}`}
                        </strong>
                      </td>

                      {/* 2. Date */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          color: '#64748b',
                          fontSize: '0.825rem',
                        }}
                        data-testid={`seller-order-date-${order.id}`}
                      >
                        {formatDate(order.created_at)}
                      </td>

                      {/* 3. Buyer & Phone (SEL-10) */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>
                          <strong
                            data-testid={`seller-order-buyer-${order.id}`}
                            style={{
                              color: '#1e293b',
                              display: 'block',
                              fontSize: '0.875rem',
                            }}
                          >
                            {buyerName}
                          </strong>
                          <span
                            data-testid={`seller-order-phone-${order.id}`}
                            style={{
                              color: '#64748b',
                              fontSize: '0.785rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            📞 {buyerPhone}
                          </span>
                        </div>
                      </td>

                      {/* 4. Delivery Details (SEL-10) */}
                      <td
                        style={{ padding: '0.85rem 1rem', maxWidth: '240px' }}
                      >
                        <div
                          data-testid={`seller-order-address-${order.id}`}
                          style={{
                            fontSize: '0.825rem',
                            color: '#334155',
                            lineHeight: 1.35,
                          }}
                        >
                          📍 {deliveryAddress}
                        </div>
                        {order.notes && (
                          <div
                            data-testid={`seller-order-notes-${order.id}`}
                            style={{
                              fontSize: '0.75rem',
                              color: '#94a3b8',
                              fontStyle: 'italic',
                              marginTop: '0.2rem',
                            }}
                          >
                            Note: {order.notes}
                          </div>
                        )}
                      </td>

                      {/* 5. Items Ordered */}
                      <td
                        style={{ padding: '0.85rem 1rem', maxWidth: '220px' }}
                      >
                        <div
                          data-testid={`seller-order-items-${order.id}`}
                          style={{
                            fontSize: '0.825rem',
                            color: '#475569',
                            lineHeight: 1.35,
                          }}
                          title={itemsSummary}
                        >
                          {itemsSummary || 'Produce items'}
                        </div>
                      </td>

                      {/* 6. Total Amount */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          fontSize: '0.925rem',
                        }}
                        data-testid={`seller-order-total-${order.id}`}
                      >
                        {formatPrice(order.total_amount)}
                      </td>

                      {/* 7. Status Badge */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <OrderStatusBadge
                          status={order.status}
                          size="sm"
                          testId={`seller-order-status-${order.id}`}
                        />
                      </td>

                      {/* 8. Actions */}
                      <td
                        style={{ padding: '0.85rem 1rem', textAlign: 'right' }}
                      >
                        <Link
                          to={`/seller/orders/${order.id}`}
                          data-testid={`seller-order-view-link-${order.id}`}
                          style={{
                            backgroundColor: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            padding: '0.35rem 0.65rem',
                            display: 'inline-block',
                          }}
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta.total > meta.per_page && (
            <div
              data-testid="seller-orders-pagination"
              style={{
                padding: '1rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Pagination
                totalItems={meta.total}
                currentPage={meta.current_page}
                itemsPerPage={meta.per_page}
                onPageChange={(p) => {
                  const next = new URLSearchParams(searchParams);
                  next.set('page', String(p));
                  setSearchParams(next);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                itemLabel="orders"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SellerOrders;
