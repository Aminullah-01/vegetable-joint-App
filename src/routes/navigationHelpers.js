import { ROUTES } from './routeConfig.js';

/**
 * Checks if a given user role is permitted based on allowed roles list.
 *
 * @param {string|null|undefined} role - Current user's role
 * @param {string[]} [allowedRoles] - Roles permitted on this route
 * @returns {boolean} True if allowed or if no specific roles required
 */
export function isRoleAllowed(role, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  return Boolean(role && allowedRoles.includes(role));
}

/**
 * Calculates the post-login destination based on user role and the attempted destination.
 * Conforms to SRS AUTH-07, AUTH-13, and FE-015 acceptance criteria:
 * - Redirects users after login to destination appropriate to their role
 * - Unauthenticated users sent to login are returned back to their attempted page
 * - Role mismatch protections prevent landing on unauthorized dashboards
 *
 * @param {string|null|undefined} role - The user's role ('buyer' | 'seller' | 'admin')
 * @param {Object|string} [fromLocation] - The location state object or pathname
 * @returns {string} The computed destination path
 */
export function getPostLoginRedirect(role, fromLocation) {
  const path =
    typeof fromLocation === 'string'
      ? fromLocation.split('?')[0]
      : fromLocation?.pathname;
  const search =
    typeof fromLocation === 'string'
      ? fromLocation.includes('?')
        ? `?${fromLocation.split('?')[1]}`
        : ''
      : fromLocation?.search || '';

  const destination = path ? `${path}${search}` : null;
  const basePath = path || '';

  // Ignore navigation back to auth routes or error pages
  if (
    basePath &&
    basePath !== ROUTES.LOGIN &&
    basePath !== ROUTES.REGISTER &&
    basePath !== ROUTES.FORGOT_PASSWORD &&
    basePath !== ROUTES.RESET_PASSWORD &&
    basePath !== ROUTES.FORBIDDEN &&
    basePath !== ROUTES.NOT_FOUND &&
    basePath !== ROUTES.SERVER_ERROR
  ) {
    // Buyers: Allow return to requested page unless it is a seller or admin portal
    if (role === 'buyer') {
      if (basePath.startsWith('/seller') || basePath.startsWith('/admin')) {
        return ROUTES.HOME;
      }
      return destination || basePath;
    }

    // Sellers: Allow return to seller routes and public pages, prevent admin portal and buyer checkout
    if (role === 'seller') {
      if (
        basePath.startsWith('/admin') ||
        basePath.startsWith('/checkout') ||
        basePath.startsWith('/buyer')
      ) {
        return ROUTES.SELLER_OVERVIEW;
      }
      return destination || basePath;
    }

    // Admins: Allow return to admin routes and public pages
    if (role === 'admin') {
      if (
        basePath.startsWith('/seller') ||
        basePath.startsWith('/checkout') ||
        basePath.startsWith('/buyer')
      ) {
        return ROUTES.ADMIN_OVERVIEW;
      }
      return destination || basePath;
    }

    return destination || basePath;
  }

  // Default role-based landing destinations (SRS: AUTH-13)
  if (role === 'seller') {
    return ROUTES.SELLER_OVERVIEW;
  }
  if (role === 'admin') {
    return ROUTES.ADMIN_OVERVIEW;
  }
  return ROUTES.HOME;
}
