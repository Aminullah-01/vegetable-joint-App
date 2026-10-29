import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { ToastContext } from '../../context/toastContextDef';
import { sellerService } from '../../services/sellerService';
import { formatPrice, formatDate } from '../../utils/formatters';
import {
  Button,
  OrderStatusBadge,
  OrderStatusTimeline,
  OrderDetailSkeleton,
} from '../../components/common';
import { PaymentMethodDisplay } from '../../components/checkout';

/**
 * SellerOrderDetail — Dedicated Seller Order Fulfillment & Detail View
 *
 * SRS References:
 * - SEL-10: The Orders view shall list only orders that contain the seller’s own products,
 *           filterable by status and date, and show buyer name, phone and delivery details
 *           needed to fulfil the order.
 * - SEL-14 / BR-08: A seller shall never be able to view, edit or delete another seller’s
 *                   products, orders or profile (object-level authorization).
 * - TC-23 / TC-24: Seller views order details and status lifecycle.
 * - ORD-02 / ORD-07: Items, quantities, prices, delivery details, status history with timestamps
 *                    and cancellation reason if cancelled.
 * - CHK-09: Payment method disclosure ("Pay on delivery / pay seller directly").
 * - Figma Section 13: Order number, buyer name/phone, delivery details, items, totals, status timeline.
 */
export function SellerOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useContext(ToastContext);

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Authenticated seller identity for object-level authorization (SEL-14, BR-08)
  const currentSellerId =
    user?.seller_id ??
    user?.seller?.id ??
    (user?.role === 'seller' ? user?.id : 1);

  // Synchronize loading and error state during render when id, seller, or retry changes
  const currentFetchKey = `${id}-${currentSellerId}-${retryCount}`;
  const [prevFetchKey, setPrevFetchKey] = useState(currentFetchKey);
  if (currentFetchKey !== prevFetchKey) {
    setPrevFetchKey(currentFetchKey);
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      if (!id) return;

      try {
        const data = await sellerService.getSellerOrderById(id, {
          seller_id: currentSellerId,
        });

        if (!isMounted) return;

        if (!data) {
          throw new Error('Order not found.');
        }

        // Defense-in-depth object-level authorization check (SEL-10, SEL-14, BR-08)
        if (
          data.seller_id != null &&
          currentSellerId != null &&
          Number(data.seller_id) !== Number(currentSellerId)
        ) {
          setIsUnauthorized(true);
          setOrder(null);
          return;
        }

        setOrder(data);
      } catch (err) {
        if (!isMounted) return;
        if (err?.status === 403 || err?.code === 'FORBIDDEN') {
          setIsUnauthorized(true);
          setOrder(null);
        } else {
          setError(
            err?.message || 'Unable to load order details. Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [id, currentSellerId, retryCount]);

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    } else if (toast?.info) {
      toast.info('Printing is not supported in this browser environment.');
    }
  };

  // Safe field extractions
  const orderNumber =
    order?.order_number || `ORD-${String(id).padStart(4, '0')}`;
  const orderDate = order?.created_at
    ? formatDate(order.created_at, { format: 'dateTime' })
    : 'N/A';

  const buyerName =
    order?.delivery_name ||
    order?.delivery_details?.name ||
    order?.buyer?.name ||
    'Customer';

  const buyerPhone =
    order?.delivery_phone ||
    order?.delivery_details?.phone ||
    order?.buyer?.phone ||
    '';

  const buyerEmail = order?.buyer?.email || '';

  const deliveryAddress =
    order?.delivery_address ||
    (order?.delivery_details
      ? [
          order.delivery_details.street,
          order.delivery_details.town,
          order.delivery_details.state,
        ]
          .filter(Boolean)
          .join(', ')
      : null) ||
    'Standard delivery address provided at checkout';

  const deliveryNotes = order?.notes || order?.delivery_details?.notes || '';

  const items = order?.items || [];
  const statusHistory = order?.status_history || [];
  const isCancelled = order?.status === 'cancelled';
  const cancelReason =
    order?.cancel_reason ||
    statusHistory.find((h) => h.to_status === 'cancelled')?.note ||
    null;

  // Calculate items subtotal
  const itemsSubtotal = items.reduce(
    (sum, item) =>
      sum +
      (Number(item.subtotal) ||
        Number(item.price) * Number(item.quantity) ||
        0),
    0
  );
  const totalAmount =
    order?.total_amount != null ? Number(order.total_amount) : itemsSubtotal;

  return (
    <div
      data-testid="seller-order-detail"
      className="seller-order-detail-page"
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '0 0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* Print-specific CSS styles */}
      <style>{`
        @media print {
          nav, header, footer, .seller-sidebar, .no-print {
            display: none !important;
          }
          .seller-order-detail-page {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .seller-order-card {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <Link
          to="/seller/orders"
          data-testid="back-to-orders-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#15803d',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            padding: '0.35rem 0.5rem',
            borderRadius: '6px',
            minHeight: '44px',
          }}
        >
          <span aria-hidden="true">←</span>
          <span>Back to Orders</span>
        </Link>

        {order && !isUnauthorized && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Button
              variant="outline"
              data-testid="refresh-order-btn"
              onClick={handleRetry}
              disabled={isLoading}
              style={{
                fontSize: '0.875rem',
                padding: '0.4rem 0.85rem',
                minHeight: '40px',
              }}
            >
              ↻ Refresh
            </Button>
            <Button
              variant="secondary"
              data-testid="print-dispatch-slip-btn"
              onClick={handlePrint}
              style={{
                fontSize: '0.875rem',
                padding: '0.4rem 0.85rem',
                minHeight: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span aria-hidden="true">🖨️</span>
              <span>Print Dispatch Slip</span>
            </Button>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div data-testid="seller-order-detail-loading">
          <OrderDetailSkeleton />
        </div>
      )}

      {/* Object-Level Authorization Failure (SEL-10, SEL-14, BR-08) */}
      {!isLoading && isUnauthorized && (
        <div
          role="alert"
          data-testid="seller-order-unauthorized"
          className="seller-order-card"
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '12px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#ffe4e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              color: '#e11d48',
            }}
          >
            🔒
          </div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#9f1239',
              margin: 0,
            }}
          >
            Access Denied (SEL-14)
          </h2>
          <p
            style={{
              fontSize: '0.925rem',
              color: '#4c0519',
              maxWidth: '540px',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            You are not authorized to view this order. Under Vegetable Joint
            security policies (SEL-14, BR-08), sellers may only access orders
            containing their own produce.
          </p>
          <Link
            to="/seller/orders"
            style={{
              marginTop: '0.5rem',
              display: 'inline-block',
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
              minHeight: '44px',
              lineHeight: '28px',
            }}
          >
            Return to My Orders
          </Link>
        </div>
      )}

      {/* Error State */}
      {!isLoading && !isUnauthorized && error && (
        <div
          role="alert"
          data-testid="seller-order-error"
          className="seller-order-card"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              color: '#dc2626',
            }}
          >
            ⚠️
          </div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#991b1b',
              margin: 0,
            }}
          >
            Unable to Load Order
          </h2>
          <p
            style={{
              fontSize: '0.925rem',
              color: '#7f1d1d',
              maxWidth: '480px',
              margin: 0,
            }}
          >
            {error}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              variant="primary"
              data-testid="retry-btn"
              onClick={handleRetry}
              style={{ minHeight: '44px' }}
            >
              Retry Loading
            </Button>
            <Link
              to="/seller/orders"
              style={{
                display: 'inline-block',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
                minHeight: '44px',
                lineHeight: '28px',
              }}
            >
              Back to Orders
            </Link>
          </div>
        </div>
      )}

      {/* Main Order Detail Presentation */}
      {!isLoading && !isUnauthorized && !error && order && (
        <>
          {/* Header Summary Card */}
          <div
            className="seller-order-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
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
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <h1
                    data-testid="order-number"
                    style={{
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: 0,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    #{orderNumber}
                  </h1>
                  <OrderStatusBadge
                    status={order.status}
                    size="lg"
                    testId="order-header-status-badge"
                  />
                </div>
                <p
                  data-testid="order-date"
                  style={{
                    margin: '0.35rem 0 0 0',
                    color: '#64748b',
                    fontSize: '0.875rem',
                  }}
                >
                  Order placed on{' '}
                  <strong style={{ color: '#334155' }}>{orderDate}</strong>
                </p>
              </div>

              {/* High-Level Order Highlights */}
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      display: 'block',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    Order Total
                  </span>
                  <strong
                    data-testid="order-total-amount"
                    style={{
                      fontSize: '1.25rem',
                      color: '#15803d',
                      fontWeight: 800,
                    }}
                  >
                    {formatPrice(totalAmount)}
                  </strong>
                </div>
                <div
                  style={{
                    width: '1px',
                    height: '32px',
                    backgroundColor: '#e2e8f0',
                  }}
                />
                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      display: 'block',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    Produce Items
                  </span>
                  <strong
                    data-testid="order-items-count"
                    style={{
                      fontSize: '1.15rem',
                      color: '#0f172a',
                      fontWeight: 700,
                    }}
                  >
                    {items.length}{' '}
                    {items.length === 1 ? 'line item' : 'line items'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Cancellation Notice Alert if Order is Cancelled (ORD-07) */}
            {isCancelled && (
              <div
                role="alert"
                data-testid="order-cancellation-banner"
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  color: '#991b1b',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>
                  ⚠️
                </span>
                <div>
                  <strong style={{ display: 'block', fontWeight: 700 }}>
                    This order was cancelled (ORD-07)
                  </strong>
                  <span data-testid="cancellation-reason">
                    Reason:{' '}
                    {cancelReason ||
                      'No specific cancellation reason provided.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2-Column Responsive Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {/* Left Column: Items Table & Status Timeline */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              {/* Ordered Items Card (SEL-10: "Items") */}
              <div
                className="seller-order-card"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    Produce Items to Fulfil ({items.length})
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    SEL-10 Produce Spec
                  </span>
                </div>

                {items.length === 0 ? (
                  <p
                    style={{
                      color: '#64748b',
                      fontSize: '0.9rem',
                      margin: '1rem 0',
                    }}
                  >
                    No items recorded for this order.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      data-testid="order-items-table"
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.875rem',
                        textAlign: 'left',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: '2px solid #f1f5f9',
                            color: '#64748b',
                          }}
                        >
                          <th
                            style={{
                              padding: '0.6rem 0.5rem',
                              fontWeight: 600,
                            }}
                          >
                            Produce Item
                          </th>
                          <th
                            style={{
                              padding: '0.6rem 0.5rem',
                              fontWeight: 600,
                            }}
                          >
                            Unit
                          </th>
                          <th
                            style={{
                              padding: '0.6rem 0.5rem',
                              fontWeight: 600,
                              textAlign: 'right',
                            }}
                          >
                            Price
                          </th>
                          <th
                            style={{
                              padding: '0.6rem 0.5rem',
                              fontWeight: 600,
                              textAlign: 'center',
                            }}
                          >
                            Qty
                          </th>
                          <th
                            style={{
                              padding: '0.6rem 0.5rem',
                              fontWeight: 600,
                              textAlign: 'right',
                            }}
                          >
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => {
                          const itemName =
                            item.product_name ||
                            item.name ||
                            `Produce #${item.product_id || idx + 1}`;
                          const itemUnit = item.unit || 'unit';
                          const itemPrice = Number(item.price) || 0;
                          const itemQty = Number(item.quantity) || 1;
                          const itemSubtotal =
                            Number(item.subtotal) || itemPrice * itemQty;

                          return (
                            <tr
                              key={item.id || idx}
                              data-testid={`order-item-${item.id || idx}`}
                              style={{
                                borderBottom: '1px solid #f8fafc',
                                verticalAlign: 'middle',
                              }}
                            >
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <strong
                                  data-testid={`item-name-${item.id || idx}`}
                                  style={{
                                    color: '#0f172a',
                                    display: 'block',
                                    fontSize: '0.9rem',
                                  }}
                                >
                                  {itemName}
                                </strong>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <span
                                  data-testid={`item-unit-${item.id || idx}`}
                                  style={{
                                    display: 'inline-block',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'lowercase',
                                  }}
                                >
                                  {itemUnit}
                                </span>
                              </td>
                              <td
                                data-testid={`item-price-${item.id || idx}`}
                                style={{
                                  padding: '0.75rem 0.5rem',
                                  textAlign: 'right',
                                  color: '#475569',
                                }}
                              >
                                {formatPrice(itemPrice)}
                              </td>
                              <td
                                data-testid={`item-qty-${item.id || idx}`}
                                style={{
                                  padding: '0.75rem 0.5rem',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  color: '#0f172a',
                                }}
                              >
                                × {itemQty}
                              </td>
                              <td
                                data-testid={`item-subtotal-${item.id || idx}`}
                                style={{
                                  padding: '0.75rem 0.5rem',
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  color: '#15803d',
                                }}
                              >
                                {formatPrice(itemSubtotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                          <td
                            colSpan={4}
                            style={{
                              padding: '0.75rem 0.5rem',
                              textAlign: 'right',
                              fontWeight: 600,
                              color: '#475569',
                            }}
                          >
                            Items Subtotal:
                          </td>
                          <td
                            data-testid="order-subtotal"
                            style={{
                              padding: '0.75rem 0.5rem',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          >
                            {formatPrice(itemsSubtotal)}
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              padding: '0.4rem 0.5rem',
                              textAlign: 'right',
                              color: '#64748b',
                            }}
                          >
                            Delivery Fee:
                          </td>
                          <td
                            style={{
                              padding: '0.4rem 0.5rem',
                              textAlign: 'right',
                              color: '#64748b',
                            }}
                          >
                            Included
                          </td>
                        </tr>
                        <tr
                          style={{
                            borderTop: '1px solid #e2e8f0',
                            fontSize: '1rem',
                          }}
                        >
                          <td
                            colSpan={4}
                            style={{
                              padding: '0.75rem 0.5rem',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          >
                            Total Due:
                          </td>
                          <td
                            data-testid="order-total-due"
                            style={{
                              padding: '0.75rem 0.5rem',
                              textAlign: 'right',
                              fontWeight: 800,
                              color: '#15803d',
                            }}
                          >
                            {formatPrice(totalAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Order Status History & Timeline (ORD-02, ORD-06, ORD-07) */}
              <div
                className="seller-order-card"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    Order Status & History
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    SEL-11 / ORD-02
                  </span>
                </div>

                <div data-testid="order-timeline-section">
                  <OrderStatusTimeline
                    statusHistory={statusHistory}
                    currentStatus={order.status}
                    cancelReason={cancelReason}
                    showPipeline={true}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Buyer Details & Delivery Information */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              {/* Buyer Contact Details Card (SEL-10: "buyer name/phone") */}
              <div
                className="seller-order-card"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '0.75rem',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    Buyer Information (SEL-10)
                  </h2>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        display: 'block',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      Buyer Name
                    </span>
                    <strong
                      data-testid="order-buyer-name"
                      style={{ fontSize: '1rem', color: '#0f172a' }}
                    >
                      {buyerName}
                    </strong>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        display: 'block',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      Phone Number
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginTop: '0.2rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong
                        data-testid="order-buyer-phone"
                        style={{ fontSize: '1rem', color: '#0f172a' }}
                      >
                        {buyerPhone || 'Not provided'}
                      </strong>
                      {buyerPhone && (
                        <a
                          href={`tel:${buyerPhone}`}
                          data-testid="call-buyer-link"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#15803d',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            minHeight: '36px',
                          }}
                        >
                          <span aria-hidden="true">📞</span>
                          <span>Call Buyer</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {buyerEmail && (
                    <div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          display: 'block',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                        }}
                      >
                        Email Address
                      </span>
                      <a
                        href={`mailto:${buyerEmail}`}
                        data-testid="order-buyer-email"
                        style={{
                          fontSize: '0.9rem',
                          color: '#2563eb',
                          textDecoration: 'none',
                          wordBreak: 'break-all',
                        }}
                      >
                        {buyerEmail}
                      </a>
                    </div>
                  )}

                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      fontSize: '0.8rem',
                      color: '#475569',
                      lineHeight: 1.4,
                      marginTop: '0.25rem',
                    }}
                  >
                    💡 <strong>Tip for Sellers:</strong> Call the buyer to
                    confirm dispatch timing and coordinate fresh produce
                    delivery.
                  </div>
                </div>
              </div>

              {/* Delivery Details Card (SEL-10: "delivery details") */}
              <div
                className="seller-order-card"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '0.75rem',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    Delivery Destination (SEL-10)
                  </h2>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        display: 'block',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      Delivery Address
                    </span>
                    <p
                      data-testid="order-delivery-address"
                      style={{
                        margin: '0.35rem 0 0 0',
                        fontSize: '0.95rem',
                        color: '#0f172a',
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      📍 {deliveryAddress}
                    </p>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        display: 'block',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      Special Delivery Instructions / Notes
                    </span>
                    {deliveryNotes ? (
                      <div
                        data-testid="order-delivery-notes"
                        style={{
                          marginTop: '0.35rem',
                          backgroundColor: '#fefce8',
                          border: '1px solid #fef08a',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                          color: '#854d0e',
                          fontStyle: 'italic',
                          lineHeight: 1.4,
                        }}
                      >
                        &ldquo;{deliveryNotes}&rdquo;
                      </div>
                    ) : (
                      <p
                        data-testid="order-delivery-notes-empty"
                        style={{
                          margin: '0.35rem 0 0 0',
                          fontSize: '0.85rem',
                          color: '#94a3b8',
                          fontStyle: 'italic',
                        }}
                      >
                        No special delivery notes provided.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Method Notice (CHK-09, Figma Section 11 & 19) */}
              <div
                className="seller-order-card"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '0.75rem',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    Payment Terms (CHK-09)
                  </h2>
                </div>

                <div data-testid="order-payment-method">
                  <PaymentMethodDisplay
                    variant="inline"
                    style={{ textAlign: 'left' }}
                  />
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: '#64748b',
                    lineHeight: 1.4,
                  }}
                >
                  Buyers pay directly upon receiving produce. Please collect the
                  exact total amount upon delivery handover.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SellerOrderDetail;
