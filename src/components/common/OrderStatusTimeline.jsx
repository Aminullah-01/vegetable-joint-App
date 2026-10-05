import PropTypes from 'prop-types';
import { OrderStatusBadge } from './OrderStatusBadge';
import {
  ORDER_LIFECYCLE_STEPS,
  normalizeOrderStatus,
  getOrderStatusConfig,
  isCancelledStatus,
  getOrderStepIndex,
} from '../../utils/orderStatus';
import { formatDate } from '../../utils/formatters';
import { STRINGS } from '../../constants';

/**
 * Returns human-readable transition summary
 */
function getStatusEventTitle(toStatus) {
  switch (toStatus) {
    case 'pending':
      return 'Order Placed';
    case 'confirmed':
      return 'Order Confirmed by Seller';
    case 'processing':
      return 'Produce Preparation & Packing';
    case 'ready':
      return 'Ready for Delivery / Pickup';
    case 'completed':
      return 'Order Completed & Delivered';
    case 'cancelled':
      return 'Order Cancelled';
    default:
      return `Status: ${toStatus}`;
  }
}

/**
 * Returns step indicator icon for the timeline node
 */
function renderTimelineNodeIcon(status) {
  switch (status) {
    case 'completed':
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'cancelled':
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'ready':
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    case 'processing':
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      );
    case 'confirmed':
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'pending':
    default:
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
  }
}

/**
 * OrderStatusTimeline — Status History & Lifecycle Progress Component
 * SRS References: ORD-02, ORD-06, ORD-07, BR-07, NFR-LOC-02
 *
 * Visualizes:
 * 1. Progress stepper of standard order lifecycle stages
 * 2. Chronological timeline of status changes with timestamps, actors, and notes
 * 3. Highlights cancellations and mandatory cancellation reasons (ORD-07)
 */
export function OrderStatusTimeline({
  statusHistory = [],
  currentStatus = 'pending',
  cancelReason,
  showPipeline = true,
  title,
  className = '',
  testId = 'order-status-timeline',
}) {
  const normCurrentStatus = normalizeOrderStatus(currentStatus);
  const isCancelled = isCancelledStatus(normCurrentStatus);
  const currentStepIdx = getOrderStepIndex(normCurrentStatus);

  // Sort history chronologically (ascending by created_at)
  const sortedHistory = [...statusHistory].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeA - timeB;
  });

  return (
    <div
      className={`order-status-timeline-wrapper ${className}`.trim()}
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
      }}
    >
      {/* Optional Title */}
      {title !== false && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.75rem',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            {title ||
              STRINGS.ORDER_STATUS?.TIMELINE_TITLE ||
              'Status History & Timeline'}
          </h2>
          <OrderStatusBadge status={normCurrentStatus} />
        </div>
      )}

      {/* Visual Pipeline Stepper (Pending -> Confirmed -> Processing -> Ready -> Completed) */}
      {showPipeline && (
        <div
          className="order-pipeline"
          data-testid={`${testId}-pipeline`}
          aria-label="Order progress stages"
        >
          {ORDER_LIFECYCLE_STEPS.map((stepKey, idx) => {
            const stepConfig = getOrderStatusConfig(stepKey);
            const isCompleted =
              !isCancelled && currentStepIdx >= 0 && idx < currentStepIdx;
            const isActive = !isCancelled && idx === currentStepIdx;

            return (
              <div
                key={stepKey}
                className="order-pipeline-step"
                data-testid={`${testId}-step-${stepKey}`}
                data-step-status={
                  isCompleted ? 'completed' : isActive ? 'active' : 'pending'
                }
              >
                {/* Horizontal connector line */}
                {idx > 0 && (
                  <div
                    className={`order-pipeline-connector ${
                      isCompleted || isActive
                        ? 'order-pipeline-connector-active'
                        : ''
                    }`.trim()}
                    aria-hidden="true"
                  />
                )}

                {/* Step Circle */}
                <div
                  className={`order-pipeline-circle ${
                    isCompleted
                      ? 'order-pipeline-circle-completed'
                      : isActive
                        ? 'order-pipeline-circle-active'
                        : ''
                  }`.trim()}
                  aria-hidden="true"
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>

                {/* Step Label */}
                <span
                  className={`order-pipeline-label ${
                    isActive ? 'order-pipeline-label-active' : ''
                  }`.trim()}
                >
                  {stepConfig.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancelled Banner if Order is Cancelled */}
      {isCancelled && (
        <div
          data-testid={`${testId}-cancelled-banner`}
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            color: '#b91c1c',
          }}
        >
          <span
            style={{ fontSize: '1.25rem', lineHeight: 1 }}
            aria-hidden="true"
          >
            ⚠️
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong
              style={{
                display: 'block',
                fontSize: '0.9rem',
                marginBottom: '0.25rem',
              }}
            >
              Order Cancelled
            </strong>
            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>
              {cancelReason ||
                sortedHistory.find((h) => h.to_status === 'cancelled')?.note ||
                'This order was cancelled. Reserved stock has been restored to inventory.'}
            </p>
          </div>
        </div>
      )}

      {/* Detailed Chronological History Timeline (ORD-06) */}
      <div className="order-timeline" data-testid={`${testId}-history`}>
        {sortedHistory.length === 0 ? (
          <p
            style={{
              color: '#64748b',
              fontSize: '0.875rem',
              fontStyle: 'italic',
              margin: 0,
            }}
          >
            {STRINGS.ORDER_STATUS?.NO_HISTORY ||
              'No status history recorded yet.'}
          </p>
        ) : (
          <ol
            className="order-timeline-list"
            data-testid={`${testId}-history-list`}
          >
            {/* Background vertical connecting track line */}
            <div className="order-timeline-track" aria-hidden="true" />

            {sortedHistory.map((item, idx) => {
              const toStatusNorm = normalizeOrderStatus(item.to_status);
              const config = getOrderStatusConfig(toStatusNorm);
              const isItemCancelled = toStatusNorm === 'cancelled';
              const eventTitle = getStatusEventTitle(toStatusNorm);
              const formattedTime = item.created_at
                ? formatDate(item.created_at, {
                    format: 'dateTime',
                    includeTimezone: true,
                  })
                : '';

              const actorDisplay =
                item.actor ||
                (item.changed_by
                  ? typeof item.changed_by === 'string'
                    ? item.changed_by
                    : `User #${item.changed_by}`
                  : null);

              return (
                <li
                  key={item.id || idx}
                  className="order-timeline-item"
                  data-testid={`${testId}-item-${idx}`}
                >
                  {/* Status Node Icon */}
                  <div
                    className="order-timeline-node"
                    aria-hidden="true"
                    style={{
                      backgroundColor: config.bg,
                      color: config.text,
                      borderColor: config.border,
                    }}
                  >
                    {renderTimelineNodeIcon(toStatusNorm)}
                  </div>

                  {/* Content Box */}
                  <div className="order-timeline-content">
                    <div className="order-timeline-header">
                      <div>
                        <strong
                          style={{
                            fontSize: '0.925rem',
                            color: '#0f172a',
                            display: 'block',
                          }}
                        >
                          {eventTitle}
                        </strong>
                        {actorDisplay && (
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: '#64748b',
                            }}
                          >
                            {actorDisplay}
                          </span>
                        )}
                      </div>

                      {formattedTime && (
                        <time
                          dateTime={item.created_at}
                          className="order-timeline-timestamp"
                          data-testid={`${testId}-timestamp-${idx}`}
                        >
                          {formattedTime}
                        </time>
                      )}
                    </div>

                    {/* Note / Cancellation Reason */}
                    {item.note && (
                      <div
                        data-testid={`${testId}-note-${idx}`}
                        className={`order-timeline-note ${
                          isItemCancelled ? 'order-timeline-note-cancelled' : ''
                        }`.trim()}
                      >
                        {isItemCancelled && (
                          <span
                            style={{
                              fontWeight: 600,
                              marginRight: '0.35rem',
                            }}
                          >
                            {STRINGS.ORDER_STATUS?.REASON_LABEL || 'Reason'}:
                          </span>
                        )}
                        <span>{item.note}</span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

OrderStatusTimeline.propTypes = {
  statusHistory: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      order_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      from_status: PropTypes.string,
      to_status: PropTypes.string.isRequired,
      changed_by: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      actor: PropTypes.string,
      note: PropTypes.string,
      created_at: PropTypes.string,
    })
  ),
  currentStatus: PropTypes.string,
  cancelReason: PropTypes.string,
  showPipeline: PropTypes.bool,
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
    PropTypes.node,
  ]),
  className: PropTypes.string,
  testId: PropTypes.string,
};

export default OrderStatusTimeline;
