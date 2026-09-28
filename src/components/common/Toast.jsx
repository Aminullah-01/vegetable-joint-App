import PropTypes from 'prop-types';

const TOAST_THEMES = {
  success: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    text: '#14532d',
    iconBg: '#22c55e',
    iconText: '#ffffff',
    icon: '✓',
    role: 'status',
  },
  error: {
    bg: '#fef2f2',
    border: '#fecaca',
    text: '#7f1d1d',
    iconBg: '#ef4444',
    iconText: '#ffffff',
    icon: '✕',
    role: 'alert',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#78350f',
    iconBg: '#f59e0b',
    iconText: '#ffffff',
    icon: '⚠',
    role: 'status',
  },
  info: {
    bg: '#f0f9ff',
    border: '#bae6fd',
    text: '#0c4a6e',
    iconBg: '#0ea5e9',
    iconText: '#ffffff',
    icon: 'ℹ',
    role: 'status',
  },
};

/**
 * Single Toast Notification item
 */
export function ToastItem({ toast, onDismiss }) {
  const theme = TOAST_THEMES[toast.type] || TOAST_THEMES.info;

  return (
    <div
      role={theme.role}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className="animate-toast-in"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        backgroundColor: theme.bg,
        border: `1px solid ${theme.border}`,
        color: theme.text,
        borderRadius: '10px',
        padding: '0.85rem 1rem',
        boxShadow:
          '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        minWidth: '280px',
        maxWidth: '420px',
        width: '100%',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
      }}
      data-testid={`toast-${toast.type}`}
    >
      {/* Icon Badge */}
      <div
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          backgroundColor: theme.iconBg,
          color: theme.iconText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: '700',
          flexShrink: 0,
          marginTop: '1px',
        }}
        aria-hidden="true"
      >
        {theme.icon}
      </div>

      {/* Message Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div
            style={{
              fontWeight: '600',
              fontSize: '0.9rem',
              marginBottom: '0.15rem',
              lineHeight: 1.3,
            }}
          >
            {toast.title}
          </div>
        )}
        <div
          style={{
            fontSize: '0.875rem',
            lineHeight: 1.45,
            wordBreak: 'break-word',
          }}
        >
          {toast.message}
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: theme.text,
          opacity: 0.65,
          cursor: 'pointer',
          padding: '0 0.25rem',
          fontSize: '1rem',
          lineHeight: 1,
          alignSelf: 'flex-start',
        }}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

ToastItem.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
    message: PropTypes.node.isRequired,
    title: PropTypes.string,
  }).isRequired,
  onDismiss: PropTypes.func.isRequired,
};

/**
 * Toast Container viewport overlay
 */
export function ToastContainer({ toasts, onDismiss, position = 'top-right' }) {
  if (!toasts || toasts.length === 0) {
    return null;
  }

  const isTop = position.startsWith('top');
  const isRight = position.endsWith('right');

  return (
    <div
      style={{
        position: 'fixed',
        top: isTop ? '1.25rem' : 'auto',
        bottom: !isTop ? '1.25rem' : 'auto',
        right: isRight ? '1.25rem' : 'auto',
        left: !isRight ? '1.25rem' : 'auto',
        zIndex: 9999,
        display: 'flex',
        flexDirection: isTop ? 'column' : 'column-reverse',
        gap: '0.65rem',
        maxWidth: 'calc(100vw - 2.5rem)',
        pointerEvents: 'none',
      }}
      aria-live="polite"
      data-testid="toast-container"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

ToastContainer.propTypes = {
  toasts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
      message: PropTypes.node.isRequired,
      title: PropTypes.string,
    })
  ).isRequired,
  onDismiss: PropTypes.func.isRequired,
  position: PropTypes.oneOf([
    'top-right',
    'top-left',
    'bottom-right',
    'bottom-left',
  ]),
};

export default ToastContainer;
