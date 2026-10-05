import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Modal } from './Modal';
import { Button } from './Button';
import { Textarea } from './Textarea';
import { STRINGS } from '../../constants';

/**
 * ConfirmDialog — Accessible Confirmation Dialog
 * SRS References: SEL-04 (Soft delete product confirmation), ORD-07 (Order cancellation with required reason),
 * NFR-USAB-02 (WCAG 2.1 AA Accessibility), NFR-USAB-03 (Touch targets ≥ 44×44px)
 *
 * Designed specifically for:
 * 1. Delete confirmations (SEL-04: soft delete product)
 * 2. Cancel confirmations (ORD-07: seller/admin order cancellation with required reason)
 * 3. Override confirmations (admin/seller settings, stock overrides, status overrides)
 */
export function ConfirmDialog({
  isOpen = false,
  onClose,
  onConfirm,
  title,
  message,
  type = 'danger',
  confirmText,
  cancelText,
  confirmVariant,
  cancelVariant = 'secondary',
  loading = false,
  loadingText,
  requireReason = false,
  reasonLabel,
  reasonPlaceholder,
  reasonHint,
  reasonRequiredError,
  reasonValue: controlledReason,
  onReasonChange,
  initialReason = '',
  details,
  icon,
  size = 'sm',
  role = 'alertdialog',
  testId = 'confirm-dialog',
  ...restProps
}) {
  const [internalReason, setInternalReason] = useState(initialReason);
  const [reasonTouched, setReasonTouched] = useState(false);
  const [validationError, setValidationError] = useState('');

  const reasonInputRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Reset reason state when dialog opens
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setInternalReason(initialReason);
      setReasonTouched(false);
      setValidationError('');
    }
  }

  const activeReason =
    controlledReason !== undefined ? controlledReason : internalReason;

  const handleReasonInputChange = (e) => {
    const val = e.target.value;
    if (controlledReason === undefined) {
      setInternalReason(val);
    }
    onReasonChange?.(val);

    if (reasonTouched && val.trim().length > 0) {
      setValidationError('');
    }
  };

  // Determine variant styling and defaults
  const variantConfig = {
    danger: {
      defaultTitle: STRINGS.MODAL?.DELETE_TITLE || 'Confirm Deletion',
      defaultConfirmText: STRINGS.BUTTONS?.DELETE || 'Delete',
      defaultButtonVariant: 'danger',
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      iconSvg: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      ),
    },
    warning: {
      defaultTitle: STRINGS.MODAL?.CANCEL_ORDER_TITLE || 'Cancel Order',
      defaultConfirmText: STRINGS.MODAL?.CONFIRM || 'Confirm',
      defaultButtonVariant: 'accent',
      iconBg: '#fef3c7',
      iconColor: '#b45309',
      iconSvg: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    primary: {
      defaultTitle: STRINGS.MODAL?.OVERRIDE_TITLE || 'Confirm Action',
      defaultConfirmText: STRINGS.MODAL?.CONFIRM || 'Confirm',
      defaultButtonVariant: 'primary',
      iconBg: '#dcfce7',
      iconColor: '#15803d',
      iconSvg: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    info: {
      defaultTitle: STRINGS.MODAL?.CONFIRM || 'Notice',
      defaultConfirmText: STRINGS.BUTTONS?.CLOSE || 'OK',
      defaultButtonVariant: 'primary',
      iconBg: '#e0f2fe',
      iconColor: '#0284c7',
      iconSvg: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    },
  }[type] || {
    defaultTitle: 'Confirm Action',
    defaultConfirmText: 'Confirm',
    defaultButtonVariant: 'primary',
    iconBg: '#f1f5f9',
    iconColor: '#475569',
    iconSvg: null,
  };

  const effectiveTitle = title || variantConfig.defaultTitle;
  const effectiveConfirmText = confirmText || variantConfig.defaultConfirmText;
  const effectiveCancelText =
    cancelText || STRINGS.BUTTONS?.CANCEL || STRINGS.MODAL?.CANCEL || 'Cancel';
  const effectiveConfirmVariant =
    confirmVariant || variantConfig.defaultButtonVariant;

  const handleConfirmClick = (event) => {
    // ORD-07 compliance: cancellation by seller or administrator requires reason
    if (requireReason) {
      setReasonTouched(true);
      if (!activeReason || activeReason.trim().length === 0) {
        setValidationError(
          reasonRequiredError ||
            STRINGS.MODAL?.CANCELLATION_REASON_REQUIRED_ERROR ||
            'A reason is required to proceed.'
        );
        reasonInputRef.current?.focus();
        return;
      }
    }

    onConfirm?.(requireReason ? activeReason.trim() : undefined, event);
  };

  // Determine initial focus:
  // 1. If reason is required, focus reason input
  // 2. If danger, focus cancel button to avoid accidental deletion
  // 3. Otherwise focus confirm button
  const determineInitialFocus = () => {
    if (requireReason) return reasonInputRef;
    if (type === 'danger') return cancelButtonRef;
    return confirmButtonRef;
  };

  const footerActions = (
    <>
      <Button
        ref={cancelButtonRef}
        variant={cancelVariant}
        onClick={onClose}
        disabled={loading}
        data-testid={`${testId}-cancel-button`}
      >
        {effectiveCancelText}
      </Button>
      <Button
        ref={confirmButtonRef}
        variant={effectiveConfirmVariant}
        onClick={handleConfirmClick}
        loading={loading}
        loadingText={loadingText}
        data-testid={`${testId}-confirm-button`}
      >
        {effectiveConfirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      role={role}
      showCloseButton={!loading}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      initialFocusRef={determineInitialFocus()}
      footer={footerActions}
      testId={testId}
      {...restProps}
    >
      <div
        style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}
      >
        {/* Variant Icon */}
        {icon !== false && (
          <div
            data-testid={`${testId}-icon`}
            style={{
              width: '48px',
              height: '48px',
              minWidth: '48px',
              borderRadius: '50%',
              backgroundColor: variantConfig.iconBg,
              color: variantConfig.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon || variantConfig.iconSvg}
          </div>
        )}

        {/* Content Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.35,
            }}
          >
            {effectiveTitle}
          </h2>

          {message && (
            <div
              data-testid={`${testId}-message`}
              style={{
                color: '#475569',
                fontSize: '0.9rem',
                lineHeight: 1.55,
                marginBottom: details || requireReason ? '1rem' : 0,
              }}
            >
              {message}
            </div>
          )}

          {/* Optional Details Box (e.g. product name, price, stock, order reference) */}
          {details && (
            <div
              data-testid={`${testId}-details`}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                color: '#334155',
                marginBottom: requireReason ? '1rem' : 0,
              }}
            >
              {details}
            </div>
          )}

          {/* ORD-07 Required Cancellation Reason Input */}
          {requireReason && (
            <div
              data-testid={`${testId}-reason-section`}
              style={{ marginTop: '0.75rem' }}
            >
              <Textarea
                ref={reasonInputRef}
                id="cancellation-reason"
                name="cancellationReason"
                label={
                  reasonLabel ||
                  STRINGS.MODAL?.CANCELLATION_REASON_LABEL ||
                  'Reason for cancellation'
                }
                placeholder={
                  reasonPlaceholder ||
                  STRINGS.MODAL?.CANCELLATION_REASON_PLACEHOLDER ||
                  'Enter the reason for cancelling...'
                }
                helperText={
                  !validationError
                    ? reasonHint ||
                      STRINGS.MODAL?.CANCELLATION_REASON_HINT ||
                      'A cancellation reason is required per marketplace rules (ORD-07).'
                    : undefined
                }
                error={validationError}
                value={activeReason}
                onChange={handleReasonInputChange}
                rows={3}
                required
                disabled={loading}
                data-testid={`${testId}-reason-input`}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.node,
  message: PropTypes.node,
  type: PropTypes.oneOf(['danger', 'warning', 'primary', 'info']),
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmVariant: PropTypes.string,
  cancelVariant: PropTypes.string,
  loading: PropTypes.bool,
  loadingText: PropTypes.string,
  requireReason: PropTypes.bool,
  reasonLabel: PropTypes.string,
  reasonPlaceholder: PropTypes.string,
  reasonHint: PropTypes.string,
  reasonRequiredError: PropTypes.string,
  reasonValue: PropTypes.string,
  onReasonChange: PropTypes.func,
  initialReason: PropTypes.string,
  details: PropTypes.node,
  icon: PropTypes.oneOfType([PropTypes.node, PropTypes.bool]),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
  role: PropTypes.oneOf(['dialog', 'alertdialog']),
  testId: PropTypes.string,
};

export default ConfirmDialog;
