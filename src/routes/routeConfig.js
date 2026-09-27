/**
 * Route Configuration Map
 * Derived strictly from SRS Section 4.1.2 (Page inventory)
 */

export const ROUTES = {
  // Public
  HOME: '/',
  PRODUCTS: '/products',
  PRODUCT_DETAILS: '/products/:id',
  SELLER_PROFILE: '/sellers/:id',
  CART: '/cart',

  // Guest / Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Buyer
  CHECKOUT: '/checkout',
  ORDER_CONFIRMATION: '/checkout/confirmation/:ref',
  MY_ORDERS: '/account/orders',
  ORDER_DETAIL: '/account/orders/:id',

  // Account (Buyer, Seller)
  PROFILE: '/account/profile',

  // Seller Dashboard
  SELLER_OVERVIEW: '/seller',
  SELLER_PRODUCTS: '/seller/products',
  SELLER_ADD_PRODUCT: '/seller/products/new',
  SELLER_EDIT_PRODUCT: '/seller/products/:id/edit',
  SELLER_ORDERS: '/seller/orders',
  SELLER_ORDER_DETAIL: '/seller/orders/:id',
  SELLER_INVENTORY: '/seller/inventory',
  SELLER_SALES: '/seller/sales',

  // Admin Dashboard
  ADMIN_OVERVIEW: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_SELLERS: '/admin/sellers',
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_AUDIT_LOG: '/admin/audit-log',

  // Error Pages
  FORBIDDEN: '/403',
  NOT_FOUND: '/404',
  SERVER_ERROR: '/500',
};

// Helper functions for parameterised routes
export const buildPath = {
  productDetails: (id) => `/products/${id}`,
  sellerProfile: (id) => `/sellers/${id}`,
  orderConfirmation: (ref) => `/checkout/confirmation/${ref}`,
  orderDetail: (id) => `/account/orders/${id}`,
  sellerEditProduct: (id) => `/seller/products/${id}/edit`,
  sellerOrderDetail: (id) => `/seller/orders/${id}`,
};

export default ROUTES;
