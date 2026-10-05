import { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { handleTabFocusTrap, getFocusableElements } from '../../utils/modal';
import { STRINGS } from '../../constants';

/**
 * Modal — Reusable Accessible Dialog Wrapper
 * SRS References: UI-03, NFR-USAB-02 (WCAG 2.1 AA Accessibility), NFR-USAB-03 (Touch targets ≥ 44×44px)
 *
 * Implements WAI-ARIA modal dialog best practices:
 * - Proper role ('dialog' or 'alertdialog') and aria-modal="true"
 * - aria-labelledby and aria-describedby binding
 * - Strict focus trapping (Tab / Shift+Tab)
 * - Auto-focus on open (first interactive element or custom initialFocusRef)
 * - Focus restoration to original trigger element on dismiss
 * - Escape key dismiss and backdrop click dismiss
 * - Body scroll locking while visible
 * - Rendered through React portal into document.body
 */
export function Modal({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  role = 'dialog',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  preventScroll = true,
  initialFocusRef,
  returnFocusRef,
  titleId: explicitTitleId,
  descriptionId: explicitDescId,
  className = '',
  contentStyle = {},
  overlayStyle = {},
  testId = 'modal-dialog',
  portalContainer,
}) {
  const generatedId = useId();
  const titleId =
    explicitTitleId || (title ? `${generatedId}-title` : undefined);
  const descriptionId =
    explicitDescId || (description ? `${generatedId}-desc` : undefined);

  const modalRef = useRef(null);
  const prevActiveElementRef = useRef(null);

  // Capture trigger element & manage body scroll lock + focus
  useEffect(() => {
    if (!isOpen) return undefined;

    // Save currently focused element to return focus later
    prevActiveElementRef.current =
      returnFocusRef?.current || document.activeElement;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    if (preventScroll) {
      document.body.style.overflow = 'hidden';
    }

    // Set initial focus
    const focusTimer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (modalRef.current) {
        const focusable = getFocusableElements(modalRef.current);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 30);

    return () => {
      clearTimeout(focusTimer);
      if (preventScroll) {
        document.body.style.overflow = originalOverflow;
      }
      // Return focus to trigger element if still attached to DOM
      if (
        prevActiveElementRef.current &&
        typeof prevActiveElementRef.current.focus === 'function' &&
        document.body.contains(prevActiveElementRef.current)
      ) {
        prevActiveElementRef.current.focus();
      }
    };
  }, [isOpen, initialFocusRef, returnFocusRef, preventScroll]);

  // Keyboard navigation: Escape key & focus trapping
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key === 'Tab' && modalRef.current) {
        handleTabFocusTrap(event, modalRef.current);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  // Width size styles
  const maxWidthMap = {
    sm: '420px',
    md: '540px',
    lg: '720px',
    xl: '900px',
    full: '95vw',
  };

  const selectedMaxWidth = maxWidthMap[size] || maxWidthMap.md;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose?.();
    }
  };

  const modalContent = (
    <div
      role="presentation"
      onClick={handleBackdropClick}
      data-testid={`${testId}-backdrop`}
      className="animate-modal-fade"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box',
        overflowY: 'auto',
        ...overlayStyle,
      }}
    >
      <div
        ref={modalRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex="-1"
        data-testid={testId}
        className={`modal-container animate-modal-zoom ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e2e8f0',
          maxWidth: selectedMaxWidth,
          width: '100%',
          maxHeight: size === 'full' ? '92vh' : 'calc(100vh - 2rem)',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          boxSizing: 'border-box',
          ...contentStyle,
        }}
      >
        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              flexShrink: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && (
                <h2
                  id={titleId}
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    lineHeight: 1.35,
                  }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id={descriptionId}
                  style={{
                    margin: '0.35rem 0 0 0',
                    fontSize: '0.875rem',
                    color: '#64748b',
                    lineHeight: 1.5,
                  }}
                >
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label={STRINGS.MODAL?.CLOSE || 'Close dialog'}
                data-testid={`${testId}-close-button`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  minHeight: '44px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  transition: 'background-color 0.15s, color 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #15803d';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div
          data-testid={`${testId}-body`}
          style={{
            padding: '1.25rem 1.5rem',
            overflowY: 'auto',
            flex: '1 1 auto',
            fontSize: '0.9375rem',
            lineHeight: 1.6,
            color: '#334155',
          }}
        >
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div
            data-testid={`${testId}-footer`}
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, portalContainer || document.body);
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node,
  description: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
  role: PropTypes.oneOf(['dialog', 'alertdialog']),
  showCloseButton: PropTypes.bool,
  closeOnBackdrop: PropTypes.bool,
  closeOnEscape: PropTypes.bool,
  preventScroll: PropTypes.bool,
  initialFocusRef: PropTypes.shape({ current: PropTypes.any }),
  returnFocusRef: PropTypes.shape({ current: PropTypes.any }),
  titleId: PropTypes.string,
  descriptionId: PropTypes.string,
  className: PropTypes.string,
  contentStyle: PropTypes.object,
  overlayStyle: PropTypes.object,
  testId: PropTypes.string,
  portalContainer: PropTypes.instanceOf(
    typeof HTMLElement !== 'undefined' ? HTMLElement : Object
  ),
};

export default Modal;
