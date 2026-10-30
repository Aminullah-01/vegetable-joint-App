import { describe, it, expect } from 'vitest';
import { isRoleAllowed, getPostLoginRedirect } from '../navigationHelpers.js';
import { ROUTES } from '../routeConfig.js';

describe('Navigation & Authorization Policy Helpers (AUTH-07, AUTH-13, TC-28, NFR-MAIN-04)', () => {
  describe('isRoleAllowed (AUTH-07, TC-28)', () => {
    it('returns true when allowedRoles is not specified or empty (public route)', () => {
      expect(isRoleAllowed('buyer', undefined)).toBe(true);
      expect(isRoleAllowed('seller', [])).toBe(true);
      expect(isRoleAllowed(null, null)).toBe(true);
    });

    it('returns true when user role is included in allowedRoles', () => {
      expect(isRoleAllowed('buyer', ['buyer'])).toBe(true);
      expect(isRoleAllowed('seller', ['seller', 'admin'])).toBe(true);
      expect(isRoleAllowed('admin', ['admin'])).toBe(true);
    });

    it('returns false when user role is not permitted', () => {
      expect(isRoleAllowed('buyer', ['seller', 'admin'])).toBe(false);
      expect(isRoleAllowed('seller', ['admin'])).toBe(false);
      expect(isRoleAllowed(null, ['buyer'])).toBe(false);
      expect(isRoleAllowed(undefined, ['seller'])).toBe(false);
    });
  });

  describe('getPostLoginRedirect (AUTH-13)', () => {
    describe('Default role-based landings (no previous location)', () => {
      it('redirects buyer to HOME', () => {
        expect(getPostLoginRedirect('buyer')).toBe(ROUTES.HOME);
        expect(getPostLoginRedirect('buyer', null)).toBe(ROUTES.HOME);
      });

      it('redirects seller to SELLER_OVERVIEW', () => {
        expect(getPostLoginRedirect('seller')).toBe(ROUTES.SELLER_OVERVIEW);
      });

      it('redirects admin to ADMIN_OVERVIEW', () => {
        expect(getPostLoginRedirect('admin')).toBe(ROUTES.ADMIN_OVERVIEW);
      });

      it('falls back to HOME for unknown or null role', () => {
        expect(getPostLoginRedirect(null)).toBe(ROUTES.HOME);
        expect(getPostLoginRedirect('guest')).toBe(ROUTES.HOME);
      });
    });

    describe('Attempted destination preservation with role authorization checks', () => {
      it('preserves valid destination and query parameters for buyer', () => {
        expect(getPostLoginRedirect('buyer', '/checkout')).toBe('/checkout');
        expect(getPostLoginRedirect('buyer', '/orders?status=pending')).toBe(
          '/orders?status=pending'
        );
        expect(
          getPostLoginRedirect('buyer', {
            pathname: '/cart',
            search: '?updated=true',
          })
        ).toBe('/cart?updated=true');
      });

      it('prevents buyer from accessing seller or admin paths and redirects to HOME (TC-28)', () => {
        expect(getPostLoginRedirect('buyer', '/seller/products')).toBe(
          ROUTES.HOME
        );
        expect(getPostLoginRedirect('buyer', '/admin/users')).toBe(ROUTES.HOME);
      });

      it('preserves seller dashboard and public paths for seller', () => {
        expect(getPostLoginRedirect('seller', '/seller/orders')).toBe(
          '/seller/orders'
        );
        expect(getPostLoginRedirect('seller', '/seller/inventory')).toBe(
          '/seller/inventory'
        );
        expect(getPostLoginRedirect('seller', '/products/1')).toBe(
          '/products/1'
        );
      });

      it('prevents seller from accessing admin portal or buyer checkout', () => {
        expect(getPostLoginRedirect('seller', '/admin/settings')).toBe(
          ROUTES.SELLER_OVERVIEW
        );
        expect(getPostLoginRedirect('seller', '/checkout')).toBe(
          ROUTES.SELLER_OVERVIEW
        );
        expect(getPostLoginRedirect('seller', '/buyer/orders')).toBe(
          ROUTES.SELLER_OVERVIEW
        );
      });

      it('preserves admin portal paths for admin', () => {
        expect(getPostLoginRedirect('admin', '/admin/categories')).toBe(
          '/admin/categories'
        );
        expect(getPostLoginRedirect('admin', '/admin/sellers')).toBe(
          '/admin/sellers'
        );
      });

      it('prevents admin from landing in seller portal or buyer checkout', () => {
        expect(getPostLoginRedirect('admin', '/seller/products')).toBe(
          ROUTES.ADMIN_OVERVIEW
        );
        expect(getPostLoginRedirect('admin', '/checkout')).toBe(
          ROUTES.ADMIN_OVERVIEW
        );
      });

      it('ignores auth routes and error pages as return targets', () => {
        expect(getPostLoginRedirect('buyer', ROUTES.LOGIN)).toBe(ROUTES.HOME);
        expect(getPostLoginRedirect('seller', ROUTES.REGISTER)).toBe(
          ROUTES.SELLER_OVERVIEW
        );
        expect(getPostLoginRedirect('admin', ROUTES.FORGOT_PASSWORD)).toBe(
          ROUTES.ADMIN_OVERVIEW
        );
        expect(getPostLoginRedirect('buyer', ROUTES.FORBIDDEN)).toBe(
          ROUTES.HOME
        );
        expect(getPostLoginRedirect('buyer', ROUTES.NOT_FOUND)).toBe(
          ROUTES.HOME
        );
        expect(getPostLoginRedirect('buyer', ROUTES.SERVER_ERROR)).toBe(
          ROUTES.HOME
        );
      });
    });
  });
});
