import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ToastContext } from './toastContextDef.js';
import { ToastContainer } from '../components/common/Toast.jsx';

let toastCounter = 0;

/**
 * Toast Provider Component
 * Supplies toast notification methods throughout the application.
 * Conforms to SRS ERR-03 and Figma UI feedback guidelines.
 */
export function ToastProvider({ children, position = 'top-right' }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    // Clear timer if exists
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const show = useCallback(
    ({ type = 'info', message, title, duration = 4000 }) => {
      const id = `toast-${Date.now()}-${++toastCounter}`;
      const newToast = { id, type, message, title };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (message, options = {}) => {
      return show({ type: 'success', message, ...options });
    },
    [show]
  );

  const error = useCallback(
    (message, options = {}) => {
      return show({ type: 'error', message, ...options });
    },
    [show]
  );

  const info = useCallback(
    (message, options = {}) => {
      return show({ type: 'info', message, ...options });
    },
    [show]
  );

  const warning = useCallback(
    (message, options = {}) => {
      return show({ type: 'warning', message, ...options });
    },
    [show]
  );

  // Clear timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      show,
      success,
      error,
      info,
      warning,
      dismiss,
      clear,
    }),
    [show, success, error, info, warning, dismiss, clear]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} position={position} />
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
  position: PropTypes.oneOf([
    'top-right',
    'top-left',
    'bottom-right',
    'bottom-left',
  ]),
};

export default ToastProvider;
