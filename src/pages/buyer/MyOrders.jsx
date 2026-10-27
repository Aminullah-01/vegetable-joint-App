import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  OrderStatusBadge,
  ConfirmDialog,
  Pagination,
  Spinner,
  Button,
} from '../../components/common';
import { formatCurrency, formatDate } from '../../utils';
import { orderService } from '../../services/orderService';
import { ORDER_STATUSES } from '../../utils/orderStatus';

const STATUS_TABS = [
  { id: 'all', label: 'All Orders' },
  { id: ORDER_STATUSES.PENDING, label: 'Pending' },
  { id: ORDER_STATUSES.CONFIRMED, label: 'Confirmed' },
  { id: ORDER_STATUSES.PROCESSING, label: 'Processing' },
  { id: ORDER_STATUSES.READY, label: 'Ready' },
  { id: ORDER_STATUSES.COMPLETED, label: 'Completed' },
  { id: ORDER_STATUSES.CANCELLED, label: 'Cancelled' },
];

const DEFAULT_PAGE_SIZE = 10;

/**
 * MyOrders — Buyer Order History Page
 *
 * Conforms to:
 * - FE-077: Newest first, paginated; order number, date, seller, total, status.
 * - SRS ORD-01: The system shall show a buyer their order history (newest first, paginated)
 *   with order number, date, seller, total and status.
 * - Figma Section 12 (Buyer Account - My Orders):
 *   Display: Order number, Date, Seller, Total, Status (Pending, Confirmed, Processing, Ready,
 *   Completed, Cancelled). Filter/search functionality, order status badges, action to view details.
 * - NFR-USAB-01, NFR-USAB-02, NFR-USAB-03: Accessible touch targets (>=44px), semantic HTML.
 */
export function MyOrders() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Query parameter extraction
  const pageParam = Math.max(1, Number(searchParams.get('page')) || 1);
  const statusParam = searchParams.get('status') || 'all';
  const queryParam = searchParams.get('search') || '';

  // Local state for search input and synchronization without effect cascading
  const [searchInput, setSearchInput] = useState(queryParam);
  const [prevQueryParam, setPrevQueryParam] = useState(queryParam);
  if (queryParam !== prevQueryParam) {
    setPrevQueryParam(queryParam);
    setSearchInput(queryParam);
  }

  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({
    current_page: pageParam,
    last_page: 1,
    per_page: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // FE-079 / ORD-03: Cancellation dialog state for pending orders
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  // Synchronize loading state when query parameters or retryCount changes
  const currentKey = `${pageParam}-${statusParam}-${queryParam}-${retryCount}`;
  const [prevKey, setPrevKey] = useState(currentKey);
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setIsLoading(true);
    setError(null);
  }

  // Load orders from orderService
  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        const params = {
          page: pageParam,
          per_page: DEFAULT_PAGE_SIZE,
        };

        if (statusParam && statusParam !== 'all') {
          params.status = statusParam;
        }
        if (queryParam && queryParam.trim()) {
          params.search = queryParam.trim();
        }

        const response = await orderService.getOrders(params);

        if (!isMounted) return;

        const orderList = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        // Sort newest first by created_at (ORD-01)
        const sorted = [...orderList].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setOrders(sorted);

        if (response?.meta) {
          setMeta({
            current_page: response.meta.current_page || pageParam,
            last_page: response.meta.last_page || 1,
            per_page: response.meta.per_page || DEFAULT_PAGE_SIZE,
            total: response.meta.total ?? sorted.length,
          });
        } else {
          setMeta({
            current_page: pageParam,
            last_page: Math.max(
              1,
              Math.ceil(sorted.length / DEFAULT_PAGE_SIZE)
            ),
            per_page: DEFAULT_PAGE_SIZE,
            total: sorted.length,
          });
        }
        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || 'Failed to load orders. Please try again.');
        setIsLoading(false);
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [pageParam, statusParam, queryParam, retryCount]);

  // Filter actions
  const handleStatusTabClick = (tabId) => {
    const next = new URLSearchParams(searchParams);
    if (tabId && tabId !== 'all') {
      next.set('status', tabId);
    } else {
      next.delete('status');
    }
    next.delete('page'); // Reset to page 1 on filter change
    setSearchParams(next);
  };

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

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    const next = new URLSearchParams(searchParams);
    if (newPage > 1) {
      next.set('page', String(newPage));
    } else {
      next.delete('page');
    }
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRetryCount((c) => c + 1);
  };

  // FE-079 / ORD-03: Cancellation handlers
  const handleOpenCancelDialog = (order) => {
    setCancelError(null);
    setOrderToCancel(order);
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const cancelNote = 'Cancelled by buyer (ORD-03)';
      const updated = await orderService.cancelOrder(
        orderToCancel.id,
        cancelNote
      );
      const nextStatus = updated?.status || 'cancelled';
      const nextReason = updated?.cancel_reason || cancelNote;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderToCancel.id
            ? {
                ...o,
                ...updated,
                status: nextStatus,
                cancel_reason: nextReason,
              }
            : o
        )
      );

      setCancelSuccess(
        `Order #${orderToCancel.order_number || orderToCancel.id} has been cancelled and reserved stock restored.`
      );
      setIsCancelDialogOpen(false);
      setOrderToCancel(null);
    } catch (err) {
      setCancelError(
        err?.message || 'Failed to cancel order. Please try again.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const isFiltered = statusParam !== 'all' || queryParam.trim().length > 0;

  return (
    <div
      data-testid="my-orders-page"
      style={{
        maxWidth: '960px',
        margin: '2rem auto',
        padding: '0 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
      }}
    >
      {/* Header & Subtitle */}
      <div
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
              gap: '0.5rem',
              marginBottom: '0.25rem',
            }}
          >
            <h1
              data-testid="my-orders-heading"
              style={{
                fontSize: '1.875rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.025em',
              }}
            >
              My Orders
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                fontWeight: 600,
              }}
            >
              ORD-01
            </span>
          </div>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.95rem',
              margin: 0,
            }}
          >
            Track and view details of your vegetable orders from local farmers.
          </p>
        </div>

        <Link
          to="/products"
          style={{
            backgroundColor: '#15803d',
            color: '#ffffff',
            padding: '0.625rem 1.25rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            minHeight: '44px',
          }}
        >
          🛒 Buy Fresh Produce
        </Link>
      </div>

      {/* Cancellation Success Feedback Banner (FE-079 / ORD-03) */}
      {cancelSuccess && (
        <div
          role="status"
          data-testid="my-orders-cancel-success"
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
              ✅
            </span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>
                Order Cancelled (ORD-03)
              </strong>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{cancelSuccess}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCancelSuccess(null)}
            aria-label="Dismiss success message"
            data-testid="dismiss-my-orders-success-btn"
            style={{
              background: 'none',
              border: 'none',
              color: '#166534',
              cursor: 'pointer',
              fontSize: '1.15rem',
              padding: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Cancellation Error Alert Banner */}
      {cancelError && (
        <div
          role="alert"
          data-testid="my-orders-cancel-error"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
              ⚠️
            </span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>
                Cancellation Failed
              </strong>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{cancelError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCancelError(null)}
            aria-label="Dismiss error message"
            data-testid="dismiss-my-orders-error-btn"
            style={{
              background: 'none',
              border: 'none',
              color: '#991b1b',
              cursor: 'pointer',
              fontSize: '1.15rem',
              padding: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar (Figma Section 12) */}
      <div
        data-testid="my-orders-toolbar"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Search Input Row */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '0.875rem',
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
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by order number, seller, or produce..."
              data-testid="my-orders-search-input"
              aria-label="Search orders"
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '0.5rem 2.25rem 0.5rem 2.5rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Clear search input"
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '0.25rem',
                }}
              >
                ✕
              </button>
            )}
          </div>

          <Button
            type="submit"
            data-testid="my-orders-search-button"
            variant="primary"
            style={{
              minHeight: '44px',
              padding: '0.5rem 1.25rem',
              fontWeight: 600,
            }}
          >
            Search
          </Button>

          {isFiltered && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              data-testid="my-orders-clear-filters"
              style={{
                minHeight: '44px',
                color: '#64748b',
                borderColor: '#cbd5e1',
              }}
            >
              Reset Filters
            </Button>
          )}
        </form>

        {/* Status Filter Tabs (Figma Section 12) */}
        <div
          role="tablist"
          aria-label="Filter orders by status"
          data-testid="my-orders-status-tabs"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingTop: '0.25rem',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          {STATUS_TABS.map((tab) => {
            const isSelected = statusParam === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                data-testid={`status-tab-${tab.id}`}
                onClick={() => handleStatusTabClick(tab.id)}
                style={{
                  minHeight: '38px',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.825rem',
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected
                    ? '1px solid #15803d'
                    : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                  color: isSelected ? '#15803d' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          data-testid="my-orders-loading"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 1rem',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          <Spinner size="lg" message="Loading your order history..." />
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          role="alert"
          data-testid="my-orders-error"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            color: '#991b1b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '2rem' }} aria-hidden="true">
            ⚠️
          </span>
          <div>
            <strong
              style={{
                display: 'block',
                fontSize: '1rem',
                marginBottom: '0.25rem',
              }}
            >
              Error Loading Orders
            </strong>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#b91c1c' }}>
              {error}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            data-testid="my-orders-retry-button"
            onClick={handleRetry}
            style={{
              backgroundColor: '#ffffff',
              borderColor: '#fca5a5',
              color: '#991b1b',
            }}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State: No Orders Placed Yet */}
      {!isLoading && !error && orders.length === 0 && !isFiltered && (
        <div
          data-testid="my-orders-empty"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '4rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <span
            style={{ fontSize: '3.5rem', display: 'block' }}
            role="img"
            aria-label="No orders"
          >
            📦
          </span>
          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: 0,
            }}
          >
            No Orders Placed Yet
          </h2>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.95rem',
              maxWidth: '460px',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            You haven&apos;t placed any orders yet. Fresh, farm-grown vegetables
            from vetted local farmers are waiting for you in our marketplace.
          </p>
          <Link
            to="/products"
            data-testid="start-shopping-btn"
            style={{
              marginTop: '0.5rem',
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            🌱 Start Shopping Now
          </Link>
        </div>
      )}

      {/* Empty State: No Results Match Active Filters */}
      {!isLoading && !error && orders.length === 0 && isFiltered && (
        <div
          data-testid="my-orders-no-results"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <span
            style={{ fontSize: '3rem', display: 'block' }}
            role="img"
            aria-label="Search"
          >
            🔍
          </span>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: 0,
            }}
          >
            No Orders Match Your Filter
          </h2>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.9rem',
              maxWidth: '420px',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {queryParam
              ? `No orders matching "${queryParam}" were found${
                  statusParam !== 'all' ? ` in status "${statusParam}"` : ''
                }.`
              : `No orders found with status "${statusParam}".`}
          </p>
          <Button
            type="button"
            variant="outline"
            data-testid="clear-filters-btn"
            onClick={handleClearFilters}
            style={{
              minHeight: '44px',
              color: '#15803d',
              borderColor: '#15803d',
              fontWeight: 600,
            }}
          >
            Clear All Filters
          </Button>
        </div>
      )}

      {/* Orders List (ORD-01, Figma Section 12) */}
      {!isLoading && !error && orders.length > 0 && (
        <div
          data-testid="my-orders-list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {orders.map((order) => {
            const sellerName =
              order.seller?.business_name ||
              order.seller_name ||
              `Seller #${order.seller_id || 1}`;
            const sellerLocation =
              order.seller?.location || order.seller_location || null;
            const items = order.items || [];
            const itemCount = items.reduce(
              (acc, it) => acc + (Number(it.quantity) || 1),
              0
            );

            // Item summary description (e.g. "Fresh Roma Tomatoes x 2 baskets")
            const itemsSummary =
              items.length > 0
                ? items
                    .map(
                      (it) =>
                        `${it.product_name || it.name || 'Vegetable'} (${it.quantity} ${
                          it.unit || 'unit'
                        })`
                    )
                    .join(' · ')
                : 'Vegetable Joint Order Items';

            return (
              <div
                key={order.id}
                data-testid={`order-card-${order.id}`}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Order Card Header */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: '1.15rem' }} aria-hidden="true">
                      📦
                    </span>
                    <div>
                      <strong
                        data-testid="order-number"
                        data-order-id={order.id}
                        style={{
                          fontSize: '1rem',
                          color: '#0f172a',
                          fontFamily: 'monospace',
                        }}
                      >
                        #{order.order_number || `ORD-2026-${order.id}`}
                      </strong>
                      <span
                        data-testid="order-date"
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          color: '#64748b',
                          marginTop: '0.15rem',
                        }}
                      >
                        Placed on {formatDate(order.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge (ORD-01, Figma Section 12) */}
                  <div data-testid="order-status">
                    <OrderStatusBadge status={order.status} size="md" />
                  </div>
                </div>

                {/* Order Card Body */}
                <div
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.875rem',
                  }}
                >
                  {/* Seller Details (ORD-01) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: '#64748b', fontWeight: 500 }}>
                      Seller:
                    </span>
                    <strong
                      data-testid="order-seller"
                      style={{ color: '#0f172a' }}
                    >
                      {sellerName}
                    </strong>
                    {sellerLocation && (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        ({sellerLocation})
                      </span>
                    )}
                  </div>

                  {/* Items Preview */}
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: '#475569',
                      lineHeight: 1.45,
                      backgroundColor: '#f8fafc',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '6px',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#334155' }}>
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}:
                    </span>{' '}
                    <span
                      data-testid="order-items-summary"
                      style={{ color: '#475569' }}
                    >
                      {itemsSummary}
                    </span>
                  </div>

                  {/* Payment Method Notice */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      color: '#166534',
                    }}
                  >
                    <span aria-hidden="true">💵</span>
                    <span>
                      Pay on delivery (Cash or Bank Transfer directly to seller)
                    </span>
                  </div>
                </div>

                {/* Order Card Footer */}
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    backgroundColor: '#fafafa',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: '#64748b',
                        display: 'block',
                      }}
                    >
                      Total Amount:
                    </span>
                    <strong
                      data-testid="order-total"
                      style={{
                        fontSize: '1.25rem',
                        color: '#15803d',
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatCurrency(order.total_amount)}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* FE-079 / ORD-03: Cancel button only while Pending */}
                    {order.status?.toLowerCase() === 'pending' && (
                      <Button
                        type="button"
                        variant="outline"
                        data-testid={`order-cancel-btn-${order.id}`}
                        onClick={() => handleOpenCancelDialog(order)}
                        disabled={isCancelling}
                        style={{
                          borderColor: '#fca5a5',
                          color: '#dc2626',
                          backgroundColor: '#fff5f5',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          minHeight: '44px',
                          padding: '0.45rem 0.9rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel Order
                      </Button>
                    )}

                    <Link
                      to={`/account/orders/${order.id}`}
                      data-testid={`order-view-details-${order.id}`}
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#1e293b',
                        padding: '0.55rem 1.1rem',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        minHeight: '44px',
                        border: '1px solid #cbd5e1',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls (ORD-01) */}
      {!isLoading && !error && meta.total > 0 && (
        <div
          data-testid="my-orders-pagination"
          style={{
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <Pagination
            totalItems={meta.total}
            currentPage={meta.current_page}
            itemsPerPage={meta.per_page}
            onPageChange={handlePageChange}
            itemLabel="orders"
            tieToUrl={true}
          />
        </div>
      )}

      {/* Cancel Order Confirmation Dialog (FE-079 / ORD-03, FE-036) */}
      {orderToCancel && (
        <ConfirmDialog
          isOpen={isCancelDialogOpen}
          onClose={() => !isCancelling && setIsCancelDialogOpen(false)}
          onConfirm={handleConfirmCancelOrder}
          title="Cancel Order"
          message={`Are you sure you want to cancel order #${orderToCancel.order_number || orderToCancel.id}? Once cancelled, the reserved produce stock will be restored to inventory (ORD-03). This action cannot be undone.`}
          confirmText="Yes, Cancel Order"
          cancelText="Keep Order"
          type="danger"
          loading={isCancelling}
          loadingText="Cancelling Order..."
          testId="my-orders-cancel-dialog"
          details={
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.35rem',
                }}
              >
                <span style={{ color: '#64748b' }}>Order:</span>
                <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                  #{orderToCancel.order_number || orderToCancel.id}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Total Amount:</span>
                <strong style={{ color: '#15803d' }}>
                  {formatCurrency(orderToCancel.total_amount)}
                </strong>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}

export default MyOrders;
