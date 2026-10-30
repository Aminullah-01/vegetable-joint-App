import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNetworkStatus } from '../../hooks/useNetworkStatus.js';

/**
 * Offline & Network Status Notification Banner
 * Strictly conforms to SRS NFR-REL-05:
 * "If the API is unreachable the UI shall show a friendly error and a retry option and shall not lose the cart."
 */
export function OfflineBanner({ onRetry, className = '', style = {} }) {
  const { isOnline, isOffline, wasOffline } = useNetworkStatus();
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (wasOffline && isOnline) {
      const showTimer = setTimeout(() => setShowRestored(true), 0);
      const hideTimer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [wasOffline, isOnline]);

  if (!isOffline && !showRestored) {
    return null;
  }

  const handleRetryConnection = () => {
    if (typeof onRetry === 'function') {
      onRetry();
    } else if (typeof window !== 'undefined') {
      // Trigger a window online event check or dispatch
      if (navigator.onLine) {
        window.dispatchEvent(new Event('online'));
      }
    }
  };

  if (showRestored) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="online-restored-banner"
        className={className}
        style={{
          backgroundColor: '#ecfdf5',
          borderBottom: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '0.65rem 1rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          ...style,
        }}
      >
        <span aria-hidden="true">✓</span>
        <span>Back online — internet connection restored!</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="offline-banner"
      className={className}
      style={{
        backgroundColor: '#fffbeb',
        borderBottom: '1px solid #fde68a',
        color: '#92400e',
        padding: '0.65rem 1.25rem',
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        zIndex: 9999,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>
          📡
        </span>
        <span>
          <strong>You are currently offline.</strong> Your cart and details are
          safely preserved on this device.
        </span>
      </div>

      <button
        type="button"
        onClick={handleRetryConnection}
        data-testid="offline-retry-button"
        style={{
          backgroundColor: '#d97706',
          color: '#ffffff',
          border: 'none',
          padding: '0.35rem 0.75rem',
          borderRadius: '6px',
          fontWeight: '600',
          fontSize: '0.8rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background-color 0.15s ease-in-out',
        }}
      >
        Retry Connection
      </button>
    </div>
  );
}

OfflineBanner.propTypes = {
  onRetry: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default OfflineBanner;
