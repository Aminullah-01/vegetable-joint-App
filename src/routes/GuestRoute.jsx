import PropTypes from 'prop-types';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks';
import { getPostLoginRedirect } from './navigationHelpers.js';

/**
 * Route guard component for guest-only pages (login, register, forgot-password).
 * Redirects already authenticated users to their role-specific landing or return URL.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.children] - Child components or Outlet
 */
export function GuestRoute({ children }) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    const destination = getPostLoginRedirect(role, location.state?.from);
    return <Navigate to={destination} replace />;
  }

  return children ? children : <Outlet />;
}

GuestRoute.propTypes = {
  children: PropTypes.node,
};

export default GuestRoute;
