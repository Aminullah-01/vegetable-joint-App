import { useState, useEffect, useContext } from 'react';
import { adminService } from '../../services/adminService';
import { ToastContext } from '../../context/toastContextDef';
import {
  Button,
  Modal,
  Pagination,
  TableSkeleton,
  EmptyState,
  ErrorState,
  OrderStatusBadge,
} from '../../components/common';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * AdminOrders — Orders Monitoring & Status Override Page (ADM-06, ADM-07, Figma Section 14)
 *
 * Requirements:
 * - ADM-06: Admins shall be able to view and search all orders (by number, buyer, seller, status, date) and view order details.
 * - ADM-07: Admins shall be able to override an order’s status, with a mandatory reason recorded in the status history.
 * - Figma Section 14: Searchable orders table, complete order details view, and status override with mandatory reason.
 */
export function AdminOrders() {
  const toast = useContext(ToastContext);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Data states
  const [orders, setOrders] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Detail Modal state (ADM-06)
  const [viewingOrder, setViewingOrder] = useState(null);

  // Status Override Modal state (ADM-07)
  const [overrideTarget, setOverrideTarget] = useState(null); // { order, targetStatus, reason }
  const [overrideFormError, setOverrideFormError] = useState({});
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Load sellers list for dropdown filter
  useEffect(() => {
    let isMounted = true;
    async function loadSellers() {
      try {
        const response = await adminService.getSellers({ per_page: 50 });
        if (isMounted) {
          const list = Array.isArray(response)
            ? response
            : response?.data || [];
          setSellers(list);
        }
      } catch {
        // Non-blocking fallback
      }
    }
    loadSellers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch orders based on search, filters, pagination, or refresh
  useEffect(() => {
    let isMounted = true;

    async function fetchOrders() {
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
          params.status = statusFilter;
        }
        if (sellerFilter !== 'all') {
          params.seller = sellerFilter;
        }
        if (dateFilter) {
          params.date = dateFilter;
        }

        const response = await adminService.getOrders(params);

        if (!isMounted) return;

        const orderList = Array.isArray(response)
          ? response
          : response?.data || [];
        setOrders(orderList);
        setMeta(
          response?.meta || {
            total: orderList.length,
            current_page: currentPage,
            last_page: Math.ceil(orderList.length / itemsPerPage) || 1,
          }
        );
      } catch (err) {
        if (!isMounted) return;
        setError(
          err?.message ||
            'Unable to load marketplace orders. Please check your connection and try again.'
        );
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
    searchQuery,
    statusFilter,
    sellerFilter,
    dateFilter,
    currentPage,
    refreshKey,
  ]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSellerFilter('all');
    setDateFilter('');
    setCurrentPage(1);
  };

  const openOverrideModal = (order) => {
    setOverrideTarget({
      order,
      targetStatus: '',
      reason: '',
    });
    setOverrideFormError({});
  };

  const closeOverrideModal = () => {
    setOverrideTarget(null);
    setOverrideFormError({});
  };

  // Submit Administrative Order Status Override (ADM-07)
  const handleConfirmOverride = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!overrideTarget) return;

    const errors = {};
    if (!overrideTarget.targetStatus) {
      errors.status = 'Please select a target status.';
    }
    if (!overrideTarget.reason || !overrideTarget.reason.trim()) {
      errors.reason =
        'A reason is mandatory for administrative order status overrides (ADM-07).';
    }

    if (Object.keys(errors).length > 0) {
      setOverrideFormError(errors);
      return;
    }

    try {
      setIsSubmittingOverride(true);
      setOverrideFormError({});

      const updated = await adminService.overrideOrderStatus(
        overrideTarget.order.id,
        overrideTarget.targetStatus,
        overrideTarget.reason.trim()
      );

      // Update in local orders state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === overrideTarget.order.id ? { ...o, ...updated } : o
        )
      );

      // If viewing modal is currently open for this order, update it in place
      if (viewingOrder && viewingOrder.id === overrideTarget.order.id) {
        setViewingOrder((prev) => ({ ...prev, ...updated }));
      }

      const successMsg = `Order ${overrideTarget.order.order_number} status overridden to ${overrideTarget.targetStatus}.`;
      toast?.success?.(successMsg);

      closeOverrideModal();
    } catch (err) {
      const errMsg =
        err?.message ||
        'Failed to override order status. Please check inputs and try again.';
      setOverrideFormError({ reason: errMsg });
      toast?.error?.(errMsg);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== 'all' ||
    sellerFilter !== 'all' ||
    Boolean(dateFilter);

  return (
    <div
      data-testid="admin-orders-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        data-testid="admin-orders-header"
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
              Order Monitoring
            </h1>
            <span
              data-testid="orders-total-badge"
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
              {meta.total} {meta.total === 1 ? 'order' : 'orders'}
            </span>
          </div>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.95rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            Global monitoring of all buyer purchases and seller fulfillments
            across the marketplace (ADM-06, ADM-07).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="refresh-orders-btn"
            aria-label="Refresh orders list"
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

      {/* Search and Filters Toolbar (ADM-06: Search by number, buyer, seller, status, date) */}
      <div
        data-testid="orders-filters-toolbar"
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
        {/* Keyword Search (Number, Buyer, Seller, Item) */}
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
            placeholder="Search by order #, buyer name, seller, or recipient..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="search-orders-input"
            aria-label="Search orders"
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

        {/* Status Dropdown Filter */}
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
            aria-label="Filter by order status"
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
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Seller Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            htmlFor="filter-seller"
            style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}
          >
            Seller:
          </label>
          <select
            id="filter-seller"
            value={sellerFilter}
            onChange={(e) => {
              setSellerFilter(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="filter-seller-select"
            aria-label="Filter by seller"
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              cursor: 'pointer',
              maxWidth: '180px',
            }}
          >
            <option value="all">All Sellers</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.business_name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            htmlFor="filter-date"
            style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}
          >
            Date:
          </label>
          <input
            id="filter-date"
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="filter-date-input"
            aria-label="Filter by order date"
            style={{
              padding: '0.5rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
            }}
          />
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

      {/* Main Table / State Views */}
      {isLoading ? (
        <div data-testid="orders-loading-state" style={{ padding: '1rem 0' }}>
          <TableSkeleton rows={6} columns={7} />
        </div>
      ) : error ? (
        <div data-testid="orders-error-state" style={{ padding: '1rem 0' }}>
          <ErrorState
            title="Failed to Load Orders"
            message={error}
            onRetry={handleRefresh}
            retryLabel="Retry"
          />
        </div>
      ) : orders.length === 0 ? (
        <div data-testid="orders-empty-state">
          <EmptyState
            title={hasActiveFilters ? 'No Matching Orders' : 'No Orders Found'}
            message={
              hasActiveFilters
                ? 'No marketplace orders match your search and filter criteria. Try adjusting or clearing your filters.'
                : 'There are currently no orders placed across the marketplace.'
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
              data-testid="orders-table"
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
                  <th style={{ padding: '0.85rem 1rem' }}>Order #</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Buyer</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Seller</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Items</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Amount</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
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
                {orders.map((order) => {
                  const buyerName =
                    order.buyer?.name ||
                    order.delivery_name ||
                    `Buyer #${order.buyer_id}`;
                  const sellerName =
                    order.seller?.business_name || `Seller #${order.seller_id}`;
                  const itemsCount = Array.isArray(order.items)
                    ? order.items.reduce(
                        (sum, it) => sum + (it.quantity || 1),
                        0
                      )
                    : 1;

                  return (
                    <tr
                      key={order.id}
                      data-testid={`order-row-${order.id}`}
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
                      {/* Order Number */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>
                          <strong
                            data-testid={`order-number-${order.id}`}
                            style={{
                              color: '#0f172a',
                              fontWeight: '600',
                              fontFamily: 'monospace',
                            }}
                          >
                            {order.order_number || `#${order.id}`}
                          </strong>
                          {order.checkout_ref && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                color: '#94a3b8',
                              }}
                            >
                              Ref: {order.checkout_ref.slice(0, 16)}...
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`order-date-${order.id}`}
                          style={{ color: '#334155', fontSize: '0.825rem' }}
                        >
                          {formatDate(order.created_at, {
                            format: 'dateTime',
                          }) || '—'}
                        </span>
                      </td>

                      {/* Buyer */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>
                          <span
                            data-testid={`order-buyer-${order.id}`}
                            style={{
                              display: 'block',
                              fontWeight: '500',
                              color: '#1e293b',
                            }}
                          >
                            {buyerName}
                          </span>
                          {order.delivery_phone && (
                            <span
                              style={{ fontSize: '0.75rem', color: '#64748b' }}
                            >
                              {order.delivery_phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Seller */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>
                          <span
                            data-testid={`order-seller-${order.id}`}
                            style={{
                              display: 'block',
                              fontWeight: '500',
                              color: '#1e293b',
                            }}
                          >
                            {sellerName}
                          </span>
                          {order.seller?.location && (
                            <span
                              style={{ fontSize: '0.75rem', color: '#64748b' }}
                            >
                              {order.seller.location}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Items */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`order-items-count-${order.id}`}
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.775rem',
                            fontWeight: '500',
                          }}
                        >
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`order-amount-${order.id}`}
                          style={{
                            fontWeight: '700',
                            color: '#0f172a',
                          }}
                        >
                          {formatCurrency(order.total_amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <OrderStatusBadge
                          status={order.status}
                          size="sm"
                          testId={`order-status-badge-${order.id}`}
                        />
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-testid={`view-order-btn-${order.id}`}
                            onClick={() => setViewingOrder(order)}
                            aria-label={`View details for order ${order.order_number}`}
                          >
                            View
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-testid={`override-status-btn-${order.id}`}
                            onClick={() => openOverrideModal(order)}
                            style={{
                              color: '#b45309',
                              borderColor: '#fde68a',
                              backgroundColor: '#fffbeb',
                            }}
                            aria-label={`Override status for order ${order.order_number}`}
                          >
                            Override
                          </Button>
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
              data-testid="orders-pagination"
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

      {/* Order Detail Modal (ADM-06, Figma Section 14) */}
      {viewingOrder && (
        <Modal
          isOpen={Boolean(viewingOrder)}
          onClose={() => setViewingOrder(null)}
          title={`Order Details: ${viewingOrder.order_number}`}
          description={`Comprehensive marketplace order record and fulfillment timeline (ADM-06).`}
          size="lg"
          testId="view-order-modal"
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="modal-override-status-btn"
                onClick={() => openOverrideModal(viewingOrder)}
                style={{
                  color: '#b45309',
                  borderColor: '#fde68a',
                  backgroundColor: '#fffbeb',
                }}
              >
                Override Status
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingOrder(null)}
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
            {/* Top Summary Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                flexWrap: 'wrap',
                gap: '0.75rem',
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
                  Order Number
                </span>
                <h3
                  data-testid="modal-order-number"
                  style={{
                    margin: '0.15rem 0 0',
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    fontFamily: 'monospace',
                  }}
                >
                  {viewingOrder.order_number}
                </h3>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '0.2rem',
                  }}
                >
                  Current Status
                </span>
                <OrderStatusBadge
                  status={viewingOrder.status}
                  size="md"
                  testId="modal-order-status"
                />
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
                  Total Value
                </span>
                <p
                  data-testid="modal-order-total"
                  style={{
                    margin: '0.15rem 0 0',
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    color: '#15803d',
                  }}
                >
                  {formatCurrency(viewingOrder.total_amount)}
                </p>
              </div>
            </div>

            {/* Cancellation Notice if applicable */}
            {viewingOrder.status === 'cancelled' &&
              viewingOrder.cancel_reason && (
                <div
                  data-testid="modal-cancel-reason-block"
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
                    Cancellation Reason:
                  </strong>
                  <p style={{ margin: 0 }}>{viewingOrder.cancel_reason}</p>
                </div>
              )}

            {/* 2-Column Grid: Buyer & Seller Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1rem',
              }}
            >
              {/* Buyer Info Card */}
              <div
                style={{
                  padding: '1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                }}
              >
                <h4
                  style={{
                    margin: '0 0 0.75rem',
                    fontSize: '0.9rem',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  👤 Buyer Information
                </h4>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b' }}>Name: </span>
                    <strong
                      data-testid="modal-buyer-name"
                      style={{ color: '#0f172a' }}
                    >
                      {viewingOrder.buyer?.name ||
                        viewingOrder.delivery_name ||
                        '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Email: </span>
                    <span
                      data-testid="modal-buyer-email"
                      style={{ color: '#0f172a' }}
                    >
                      {viewingOrder.buyer?.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Account Phone: </span>
                    <span
                      data-testid="modal-buyer-phone"
                      style={{ color: '#0f172a' }}
                    >
                      {viewingOrder.buyer?.phone ||
                        viewingOrder.delivery_phone ||
                        '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seller Info Card */}
              <div
                style={{
                  padding: '1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                }}
              >
                <h4
                  style={{
                    margin: '0 0 0.75rem',
                    fontSize: '0.9rem',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  🏪 Seller Information
                </h4>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b' }}>Farm / Business: </span>
                    <strong
                      data-testid="modal-seller-name"
                      style={{ color: '#0f172a' }}
                    >
                      {viewingOrder.seller?.business_name ||
                        `Seller #${viewingOrder.seller_id}`}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Location: </span>
                    <span
                      data-testid="modal-seller-location"
                      style={{ color: '#0f172a' }}
                    >
                      {viewingOrder.seller?.location || '—'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Seller ID: </span>
                    <span style={{ color: '#0f172a' }}>
                      #{viewingOrder.seller_id}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Destination Card */}
            <div
              style={{
                padding: '1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
              }}
            >
              <h4
                style={{
                  margin: '0 0 0.75rem',
                  fontSize: '0.9rem',
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                📍 Delivery Destination & Notes
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem',
                  fontSize: '0.875rem',
                }}
              >
                <div>
                  <span
                    style={{
                      color: '#64748b',
                      display: 'block',
                      fontSize: '0.75rem',
                    }}
                  >
                    Recipient
                  </span>
                  <strong
                    data-testid="modal-delivery-name"
                    style={{ color: '#0f172a' }}
                  >
                    {viewingOrder.delivery_name || '—'}
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      color: '#64748b',
                      display: 'block',
                      fontSize: '0.75rem',
                    }}
                  >
                    Contact Phone
                  </span>
                  <span
                    data-testid="modal-delivery-phone"
                    style={{ color: '#0f172a' }}
                  >
                    {viewingOrder.delivery_phone || '—'}
                  </span>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span
                    style={{
                      color: '#64748b',
                      display: 'block',
                      fontSize: '0.75rem',
                    }}
                  >
                    Delivery Address
                  </span>
                  <p
                    data-testid="modal-delivery-address"
                    style={{ margin: '0.15rem 0 0', color: '#1e293b' }}
                  >
                    {viewingOrder.delivery_address || '—'}
                  </p>
                </div>
                {viewingOrder.notes && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span
                      style={{
                        color: '#64748b',
                        display: 'block',
                        fontSize: '0.75rem',
                      }}
                    >
                      Delivery Instructions / Notes
                    </span>
                    <p
                      data-testid="modal-order-notes"
                      style={{
                        margin: '0.15rem 0 0',
                        color: '#475569',
                        fontStyle: 'italic',
                      }}
                    >
                      &ldquo;{viewingOrder.notes}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4
                style={{
                  margin: '0 0 0.5rem',
                  fontSize: '0.9rem',
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                📦 Purchased Produce Items
              </h4>
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <table
                  data-testid="modal-order-items-table"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        color: '#475569',
                      }}
                    >
                      <th style={{ padding: '0.65rem 0.85rem' }}>
                        Produce Item
                      </th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Qty & Unit</th>
                      <th
                        style={{
                          padding: '0.65rem 0.85rem',
                          textAlign: 'right',
                        }}
                      >
                        Unit Price
                      </th>
                      <th
                        style={{
                          padding: '0.65rem 0.85rem',
                          textAlign: 'right',
                        }}
                      >
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingOrder.items || []).map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        style={{ borderBottom: '1px solid #f1f5f9' }}
                        data-testid={`modal-item-row-${item.id || idx}`}
                      >
                        <td
                          style={{
                            padding: '0.65rem 0.85rem',
                            fontWeight: '600',
                            color: '#0f172a',
                          }}
                        >
                          {item.product_name || item.name}
                        </td>
                        <td
                          style={{
                            padding: '0.65rem 0.85rem',
                            color: '#475569',
                          }}
                        >
                          {item.quantity} {item.unit || 'unit'}
                          {item.quantity === 1 ? '' : 's'}
                        </td>
                        <td
                          style={{
                            padding: '0.65rem 0.85rem',
                            textAlign: 'right',
                            color: '#475569',
                          }}
                        >
                          {formatCurrency(item.price)}
                        </td>
                        <td
                          style={{
                            padding: '0.65rem 0.85rem',
                            textAlign: 'right',
                            fontWeight: '600',
                            color: '#0f172a',
                          }}
                        >
                          {formatCurrency(
                            item.subtotal || item.price * item.quantity
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderTop: '2px solid #e2e8f0',
                      }}
                    >
                      <td
                        colSpan="3"
                        style={{
                          padding: '0.75rem 0.85rem',
                          fontWeight: '700',
                          textAlign: 'right',
                        }}
                      >
                        Total Amount:
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 0.85rem',
                          fontWeight: '700',
                          textAlign: 'right',
                          color: '#15803d',
                          fontSize: '0.95rem',
                        }}
                      >
                        {formatCurrency(viewingOrder.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Status History Audit Trail (ADM-06, BR-07) */}
            {Array.isArray(viewingOrder.status_history) &&
              viewingOrder.status_history.length > 0 && (
                <div>
                  <h4
                    style={{
                      margin: '0 0 0.5rem',
                      fontSize: '0.9rem',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    📜 Status Transition History
                  </h4>
                  <div
                    data-testid="modal-status-history"
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      backgroundColor: '#fafafa',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                    }}
                  >
                    {viewingOrder.status_history.map((hist, idx) => (
                      <div
                        key={hist.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          borderBottom:
                            idx < viewingOrder.status_history.length - 1
                              ? '1px solid #e2e8f0'
                              : 'none',
                          paddingBottom:
                            idx < viewingOrder.status_history.length - 1
                              ? '0.5rem'
                              : 0,
                          fontSize: '0.85rem',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>
                            {hist.from_status
                              ? `${hist.from_status} → ${hist.to_status}`
                              : `Initial Status: ${hist.to_status}`}
                          </span>
                          {hist.note && (
                            <p
                              style={{
                                margin: '0.15rem 0 0',
                                color: '#64748b',
                                fontSize: '0.8rem',
                              }}
                            >
                              {hist.note}
                            </p>
                          )}
                        </div>
                        <span
                          style={{
                            color: '#94a3b8',
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDate(hist.created_at, { format: 'dateTime' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </Modal>
      )}

      {/* Administrative Status Override Modal (ADM-07) */}
      {overrideTarget && (
        <Modal
          isOpen={Boolean(overrideTarget)}
          onClose={closeOverrideModal}
          title={`Override Status: ${overrideTarget.order.order_number}`}
          description="Administrative override bypasses normal order lifecycle progression. A mandatory justification reason is permanently recorded in the status audit trail (ADM-07)."
          size="md"
          testId="override-status-modal"
          footer={
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                width: '100%',
              }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeOverrideModal}
                disabled={isSubmittingOverride}
                data-testid="override-modal-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirmOverride}
                disabled={isSubmittingOverride}
                data-testid="override-modal-submit-btn"
              >
                {isSubmittingOverride
                  ? 'Saving Override...'
                  : 'Confirm Override'}
              </Button>
            </div>
          }
        >
          <form
            onSubmit={handleConfirmOverride}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Current Status Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              <span
                style={{
                  fontSize: '0.85rem',
                  color: '#64748b',
                  fontWeight: '500',
                }}
              >
                Current Status:
              </span>
              <OrderStatusBadge
                status={overrideTarget.order.status}
                size="sm"
                testId="override-current-status-badge"
              />
            </div>

            {/* Target Status Select */}
            <div>
              <label
                htmlFor="override-status-select"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '0.35rem',
                }}
              >
                Target Status <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                id="override-status-select"
                value={overrideTarget.targetStatus}
                onChange={(e) =>
                  setOverrideTarget((prev) => ({
                    ...prev,
                    targetStatus: e.target.value,
                  }))
                }
                data-testid="override-status-select"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: `1px solid ${
                    overrideFormError.status ? '#ef4444' : '#cbd5e1'
                  }`,
                  fontSize: '0.9rem',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  cursor: 'pointer',
                }}
              >
                <option value="">-- Select Target Status --</option>
                {[
                  'pending',
                  'confirmed',
                  'processing',
                  'ready',
                  'completed',
                  'cancelled',
                ]
                  .filter((st) => st !== overrideTarget.order.status)
                  .map((st) => (
                    <option key={st} value={st}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </option>
                  ))}
              </select>
              {overrideFormError.status && (
                <p
                  data-testid="override-status-error"
                  style={{
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    margin: '0.25rem 0 0',
                  }}
                >
                  {overrideFormError.status}
                </p>
              )}
            </div>

            {/* Mandatory Reason */}
            <div>
              <label
                htmlFor="override-reason-input"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '0.35rem',
                }}
              >
                Override Reason (Mandatory){' '}
                <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                id="override-reason-input"
                value={overrideTarget.reason}
                onChange={(e) => {
                  const val = e.target.value;
                  setOverrideTarget((prev) => ({ ...prev, reason: val }));
                  if (overrideFormError.reason) {
                    setOverrideFormError((err) => ({ ...err, reason: null }));
                  }
                }}
                rows={3}
                placeholder="e.g. Manual payment verification, customer service dispute resolution, verbal cancellation by customer"
                data-testid="override-reason-input"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: `1px solid ${
                    overrideFormError.reason ? '#ef4444' : '#cbd5e1'
                  }`,
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
                required
              />
              {overrideFormError.reason ? (
                <p
                  data-testid="override-reason-error"
                  style={{
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    margin: '0.25rem 0 0',
                  }}
                >
                  {overrideFormError.reason}
                </p>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  A detailed justification reason is required by marketplace
                  compliance rules (ADM-07).
                </span>
              )}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default AdminOrders;
