import { createContext } from 'react';

/**
 * Toast context definition.
 * Kept in separate file to comply with React Refresh rules.
 */
export const ToastContext = createContext(null);

export default ToastContext;
