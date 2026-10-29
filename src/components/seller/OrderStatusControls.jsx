import { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { ToastContext } from '../../context/toastContextDef';
import { sellerService } from '../../services/sellerService';
import {
  ORDER_STATUSES,
  normalizeOrderStatus,
  getOrderStatusConfig,
  getSellerLifecycleConfig,
  canSellerCancel,
  isTerminalStatus,
} from '../../utils/orderStatus';
import { Button, Modal, OrderStatusBadge, Textarea } from '../common';

/**
 * OrderStatusControls — Seller Order Lifecycle Management Component
 *
 * SRS References:
 * - SEL-11: The seller shall be able to advance order status according to the lifecycle in 3.6.2.
 * - ORD-05: The system shall reject any status change that is not in the transition table with a clear error.
 * - ORD-07: Cancellation by a Seller or Administrator shall require a reason, which shall be visible to the buyer.
 * - BR-07: Order status may only change along the lifecycle in 3.6.2; Completed and Cancelled are terminal.
 * - SRS 3.6.2 (Figure 2):
 *     - Pending -> Confirmed (Seller)
 *     - Confirmed -> Processing (Seller)
 *     - Processing -> Ready (Seller)
 *     - Ready -> Completed (Seller)
 *     - Pending, Confirmed, Processing -> Cancelled (Seller, reason required)
 *     - Ready -> Cancelled (Administrator only)
 *     - Completed, Cancelled (Terminal)
 */
export function OrderStatusControls({
  order,
  onStatusUpdated,
  disabled = false,
  className = '',
  style = {},
}) {
  const toast = useContext(ToastContext);

  // Advancement state
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceNote, setAdvanceNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [advanceError, setAdvanceError] = useState(null);

  // Cancellation modal state (ORD-07)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelApiError, setCancelApiError] = useState(null);

  if (!order) return null;

  const currentStatus = normalizeOrderStatus(order.status);
  const sellerConfig = getSellerLifecycleConfig(currentStatus);

  const { nextStatus, nextActionLabel, nextActionHelper, canAdvance } =
    sellerConfig;
  const sellerCanCancel = canSellerCancel(currentStatus);
  const isTerminal = isTerminalStatus(currentStatus);

  // Handle advancing to the next permitted lifecycle step (SEL-11, ORD-05)
  const handleAdvanceStatus = async () => {
    if (!nextStatus || !canAdvance || isAdvancing || disabled) return;

    setIsAdvancing(true);
    setAdvanceError(null);

    try {
      const updated = await sellerService.updateOrderStatus(
        order.id,
        nextStatus,
        advanceNote.trim()
      );

      const targetLabel = getOrderStatusConfig(nextStatus).label;
      if (toast?.success) {
        toast.success(
          `Order #${order.order_number || order.id} advanced to ${targetLabel}.`
        );
      }

      setAdvanceNote('');
      setShowNoteInput(false);

      if (onStatusUpdated && typeof onStatusUpdated === 'function') {
        onStatusUpdated(updated || { ...order, status: nextStatus });
      }
    } catch (err) {
      const msg =
        err?.message ||
        `Failed to advance order status to ${nextStatus}. Please try again.`;
      setAdvanceError(msg);
      if (toast?.error) {
        toast.error(msg);
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  // Open cancellation modal
  const handleOpenCancelModal = () => {
    setCancelReason('');
    setCancelReasonError(null);
    setCancelApiError(null);
    setIsCancelModalOpen(true);
  };

  // Close cancellation modal
  const handleCloseCancelModal = () => {
    if (isCancelling) return;
    setIsCancelModalOpen(false);
    setCancelReason('');
    setCancelReasonError(null);
    setCancelApiError(null);
  };

  // Confirm cancellation with mandatory reason (ORD-07)
  const handleConfirmCancel = async (e) => {
    if (e) e.preventDefault();

    const trimmedReason = cancelReason.trim();

    // ORD-07: Cancellation by Seller requires a non-empty reason
    if (!trimmedReason) {
      setCancelReasonError(
        'A reason is required to cancel this order (ORD-07).'
      );
      return;
    }

    if (trimmedReason.length < 5) {
      setCancelReasonError(
        'Please provide a more descriptive cancellation reason (at least 5 characters).'
      );
      return;
    }

    setIsCancelling(true);
    setCancelReasonError(null);
    setCancelApiError(null);

    try {
      const updated = await sellerService.cancelOrder(order.id, trimmedReason);

      if (toast?.success) {
        toast.success(
          `Order #${order.order_number || order.id} has been cancelled and stock has been restored.`
        );
      }

      setIsCancelModalOpen(false);

      if (onStatusUpdated && typeof onStatusUpdated === 'function') {
        onStatusUpdated(
          updated || {
            ...order,
            status: ORDER_STATUSES.CANCELLED,
            cancel_reason: trimmedReason,
          }
        );
      }
    } catch (err) {
      const msg = err?.message || 'Failed to cancel order. Please try again.';
      setCancelApiError(msg);
      if (toast?.error) {
        toast.error(msg);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div
      data-testid="order-status-controls"
      className={`order-status-controls ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        ...style,
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '0.75rem',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: 0,
            }}
          >
            Order Status Controls
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            SRS SEL-11, ORD-05, ORD-07 Lifecycle
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Current:
          </span>
          <OrderStatusBadge status={currentStatus} size="sm" />
        </div>
      </div>

      {/* Advance Error Message */}
      {advanceError && (
        <div
          role="alert"
          data-testid="status-advance-error"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: '#991b1b',
            fontSize: '0.85rem',
            lineHeight: 1.4,
          }}
        >
          <strong>Error advancing status:</strong> {advanceError}
        </div>
      )}

      {/* Terminal States Banner (Completed / Cancelled - BR-07) */}
      {isTerminal && (
        <div
          data-testid="terminal-status-notice"
          style={{
            backgroundColor:
              currentStatus === ORDER_STATUSES.COMPLETED
                ? '#f0fdf4'
                : '#fef2f2',
            border: `1px solid ${
              currentStatus === ORDER_STATUSES.COMPLETED ? '#bbf7d0' : '#fecaca'
            }`,
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '1.35rem' }}>
            {currentStatus === ORDER_STATUSES.COMPLETED ? '✅' : '🚫'}
          </span>
          <div style={{ fontSize: '0.875rem' }}>
            <strong
              style={{
                display: 'block',
                color:
                  currentStatus === ORDER_STATUSES.COMPLETED
                    ? '#166534'
                    : '#991b1b',
                fontWeight: 700,
              }}
            >
              {currentStatus === ORDER_STATUSES.COMPLETED
                ? 'Order Completed'
                : 'Order Cancelled'}
            </strong>
            <p
              style={{
                margin: '0.25rem 0 0 0',
                color:
                  currentStatus === ORDER_STATUSES.COMPLETED
                    ? '#15803d'
                    : '#7f1d1d',
                lineHeight: 1.4,
              }}
            >
              {currentStatus === ORDER_STATUSES.COMPLETED
                ? 'This order has reached its final delivery state and is marked completed. Per marketplace rules (BR-07), no further status modifications are permitted.'
                : 'This order was cancelled and inventory stock has been restored. No further lifecycle actions can be performed.'}
            </p>
          </div>
        </div>
      )}

      {/* Active Lifecycle Actions (Only valid next step offered - SEL-11, ORD-05) */}
      {!isTerminal && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Action Row */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
            }}
          >
            {/* The ONLY valid advancement button (SEL-11, ORD-05) */}
            {canAdvance && nextStatus && (
              <Button
                variant="primary"
                data-testid="advance-status-btn"
                onClick={handleAdvanceStatus}
                loading={isAdvancing}
                disabled={isAdvancing || isCancelling || disabled}
                style={{
                  minHeight: '44px',
                  fontWeight: 700,
                  padding: '0.6rem 1.25rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>{nextActionLabel}</span>
                <span aria-hidden="true">→</span>
              </Button>
            )}

            {/* Optional note toggle */}
            {canAdvance && !showNoteInput && (
              <button
                type="button"
                data-testid="toggle-note-btn"
                onClick={() => setShowNoteInput(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  fontSize: '0.85rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  minHeight: '44px',
                }}
              >
                + Add transition note (optional)
              </button>
            )}

            {/* Cancel button if permitted at this stage (ORD-07) */}
            {sellerCanCancel && (
              <Button
                variant="outline"
                data-testid="open-cancel-dialog-btn"
                onClick={handleOpenCancelModal}
                disabled={isAdvancing || isCancelling || disabled}
                style={{
                  minHeight: '44px',
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  marginLeft: 'auto',
                }}
              >
                Cancel Order...
              </Button>
            )}
          </div>

          {/* Optional Note Input Form */}
          {showNoteInput && canAdvance && (
            <div
              data-testid="status-note-container"
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <label
                htmlFor="order-transition-note"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                Optional note for status history (ORD-06):
              </label>
              <input
                id="order-transition-note"
                data-testid="status-note-input"
                type="text"
                value={advanceNote}
                onChange={(e) => setAdvanceNote(e.target.value)}
                placeholder="e.g., Packed in 3 crates, dispatched with rider John."
                maxLength={255}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setAdvanceNote('');
                    setShowNoteInput(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.75rem',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '0.2rem 0.5rem',
                  }}
                >
                  Discard note
                </button>
              </div>
            </div>
          )}

          {/* Lifecycle Step Guidance */}
          {nextActionHelper && (
            <p
              data-testid="status-step-helper"
              style={{
                fontSize: '0.825rem',
                color: '#64748b',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              <strong>Next step:</strong> {nextActionHelper}
            </p>
          )}

          {/* Special notice when ready: Cancellation requires Admin */}
          {currentStatus === ORDER_STATUSES.READY && (
            <p
              data-testid="ready-cancellation-notice"
              style={{
                fontSize: '0.785rem',
                color: '#0f766e',
                backgroundColor: '#f0fdfa',
                border: '1px solid #ccfbf1',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              ℹ️ Package is ready for dispatch. Cancellation at this stage
              requires Administrator assistance per SRS 3.6.2.
            </p>
          )}
        </div>
      )}

      {/* Cancellation Reason Modal Dialog (ORD-07, UI-03) */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        title="Cancel Order"
        size="md"
        closeOnBackdrop={false}
        testId="cancel-order-modal"
      >
        <div data-testid="cancel-order-form">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Warning Message */}
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: '#9f1239',
                fontSize: '0.875rem',
                lineHeight: 1.4,
              }}
            >
              <strong>⚠️ Restoring Inventory (ORD-03):</strong>
              <p style={{ margin: '0.25rem 0 0 0' }}>
                Cancelling order{' '}
                <strong>#{order.order_number || order.id}</strong> will
                automatically return the reserved produce back to your active
                stock. This action cannot be reversed.
              </p>
            </div>

            {/* API Error Message inside Modal */}
            {cancelApiError && (
              <div
                role="alert"
                data-testid="cancel-api-error"
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                }}
              >
                {cancelApiError}
              </div>
            )}

            {/* Mandatory Reason Field (ORD-07) */}
            <div>
              <label
                htmlFor="cancellation-reason-textarea"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.35rem',
                }}
              >
                Reason for Cancellation{' '}
                <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <Textarea
                id="cancellation-reason-textarea"
                data-testid="cancellation-reason-input"
                name="cancellation_reason"
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  if (cancelReasonError) setCancelReasonError(null);
                }}
                rows={3}
                placeholder="e.g., Produce was damaged during morning harvest, out of stock, or customer requested cancellation."
                error={cancelReasonError}
                aria-required="true"
                disabled={isCancelling}
              />
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  margin: '0.35rem 0 0 0',
                }}
              >
                Requirement ORD-07: The cancellation reason will be recorded in
                the order status history and displayed to the buyer.
              </p>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '0.5rem',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '1rem',
              }}
            >
              <Button
                type="button"
                variant="outline"
                data-testid="cancel-modal-dismiss-btn"
                onClick={handleCloseCancelModal}
                disabled={isCancelling}
                style={{ minHeight: '44px' }}
              >
                Keep Order
              </Button>
              <Button
                type="button"
                variant="danger"
                data-testid="confirm-cancel-order-btn"
                loading={isCancelling}
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                style={{ minHeight: '44px', fontWeight: 700 }}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

OrderStatusControls.propTypes = {
  order: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    order_number: PropTypes.string,
    status: PropTypes.string.isRequired,
    total_amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    items: PropTypes.array,
    cancel_reason: PropTypes.string,
  }),
  onStatusUpdated: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default OrderStatusControls;
