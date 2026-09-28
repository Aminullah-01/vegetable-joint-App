import { useContext } from 'react';
import { ToastContext } from '../context/toastContextDef.js';

/**
 * Custom React hook to trigger and manage Toast notifications.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Product updated successfully!');
 *   toast.error('Unable to place order. Please try again.');
 *
 * @returns {Object} Toast helper methods (success, error, info, warning, show, dismiss, clear)
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default useToast;
