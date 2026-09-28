import PropTypes from 'prop-types';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks';
import { ROUTES } from './routeConfig.js';
import { isRoleAllowed } from './navigationHelpers.js';
import { Spinner } from '../components/common/Spinner.jsx';

/**
 * Route guard component enforcing authentication and role-based authorization.
 * Conforms to SRS AUTH-07, TC-28, and FE-015 acceptance criteria:
 * - Unauthenticated visitors attempting to access protected routes are redirected to /login with `state.from` preserved.
 * - Authenticated users attempting to access routes outside their role are blocked and redirected to /403 Forbidden.
 * - Displays a loading indicator while session restore is in flight to avoid premature redirection.
 *
 * @param {Object} props
 * @param {string[]} [props.allowedRoles] - List of permitted roles (e.g. ['buyer'], ['seller'], ['admin'])
 * @param {string} [props.redirectPath] - Optional override for unauthenticated redirect (defaults to /login)
 * @param {React.ReactNode} [props.children] - Child components or Outlet
 */
export function ProtectedRoute({ allowedRoles, redirectPath, children }) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  // Wait for session verification on mount/refresh
  if (isLoading) {
    return <Spinner size="lg" center text="Verifying authorization..." />;
  }

  // 1. Unauthenticated users: redirect to login and preserve origin
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectPath || ROUTES.LOGIN}
        state={{ from: location }}
        replace
      />
    );
  }

  // 2. Role-based check: block users without required role (AUTH-07, TC-28)
  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !isRoleAllowed(role, allowedRoles)
  ) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />;
  }

  // 3. Authorized
  return children ? children : <Outlet />;
}

ProtectedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  redirectPath: PropTypes.string,
  children: PropTypes.node,
};

export default ProtectedRoute;
