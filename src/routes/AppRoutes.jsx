import { Routes, Route } from 'react-router-dom';
import { MainLayout, DashboardLayout } from '../components/layout';
import { ROUTES } from './routeConfig';
import { ProtectedRoute } from './ProtectedRoute';
import { GuestRoute } from './GuestRoute';

// Page Imports
import {
  // Public
  Home,
  Products,
  ProductDetails,
  SellerProfile,
  Cart,
  // Auth
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  // Buyer
  Checkout,
  OrderConfirmation,
  MyOrders,
  OrderDetail,
  // Account
  Profile,
  // Seller
  SellerOverview,
  SellerProducts,
  SellerProductForm,
  SellerOrders,
  SellerOrderDetail,
  SellerInventory,
  SellerSales,
  // Admin
  AdminOverview,
  AdminUsers,
  AdminSellers,
  AdminProducts,
  AdminCategories,
  AdminOrders,
  AdminSettings,
  AdminAuditLog,
  // Errors
  Forbidden,
  NotFound,
  ServerError,
} from '../pages';

const sellerNavItems = [
  { path: '/seller', label: 'Overview', icon: '📊', end: true },
  { path: '/seller/products', label: 'My Products', icon: '🥦', end: true },
  { path: '/seller/products/new', label: 'Add Product', icon: '➕' },
  { path: '/seller/orders', label: 'Orders', icon: '📦' },
  { path: '/seller/inventory', label: 'Inventory', icon: '📋' },
  { path: '/seller/sales', label: 'Sales & Revenue', icon: '💰' },
];

const adminNavItems = [
  { path: '/admin', label: 'Overview', icon: '📊', end: true },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/sellers', label: 'Sellers', icon: '🌾' },
  { path: '/admin/products', label: 'Product Moderation', icon: '🥕' },
  { path: '/admin/categories', label: 'Categories', icon: '📁' },
  { path: '/admin/orders', label: 'Orders Monitor', icon: '🛍️' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
  { path: '/admin/audit-log', label: 'Audit Log', icon: '📜' },
];

export function AppRoutes() {
  return (
    <Routes>
      {/* Public, Buyer, Auth, and Error pages with Main Layout */}
      <Route element={<MainLayout />}>
        {/* Public Routes */}
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.PRODUCTS} element={<Products />} />
        <Route path={ROUTES.PRODUCT_DETAILS} element={<ProductDetails />} />
        <Route path={ROUTES.SELLER_PROFILE} element={<SellerProfile />} />
        <Route path={ROUTES.CART} element={<Cart />} />

        {/* Guest / Auth Routes (Restricted to unauthenticated visitors) */}
        <Route element={<GuestRoute />}>
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
        </Route>

        {/* Buyer Routes (Protected: unauthenticated -> login; non-buyer -> 403) */}
        <Route element={<ProtectedRoute allowedRoles={['buyer']} />}>
          <Route path={ROUTES.CHECKOUT} element={<Checkout />} />
          <Route
            path={ROUTES.ORDER_CONFIRMATION}
            element={<OrderConfirmation />}
          />
          <Route path={ROUTES.MY_ORDERS} element={<MyOrders />} />
          <Route path={ROUTES.ORDER_DETAIL} element={<OrderDetail />} />
        </Route>

        {/* Authenticated Account Profile Route (Any logged in role) */}
        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.PROFILE} element={<Profile />} />
        </Route>

        {/* Error Routes */}
        <Route path={ROUTES.FORBIDDEN} element={<Forbidden />} />
        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
        <Route path={ROUTES.SERVER_ERROR} element={<ServerError />} />
      </Route>

      {/* Seller Dashboard Routes (Protected: seller role only) */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['seller']}>
            <DashboardLayout
              title="Seller Portal"
              role="seller"
              navItems={sellerNavItems}
            />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTES.SELLER_OVERVIEW} element={<SellerOverview />} />
        <Route path={ROUTES.SELLER_PRODUCTS} element={<SellerProducts />} />
        <Route
          path={ROUTES.SELLER_ADD_PRODUCT}
          element={<SellerProductForm />}
        />
        <Route
          path={ROUTES.SELLER_EDIT_PRODUCT}
          element={<SellerProductForm />}
        />
        <Route path={ROUTES.SELLER_ORDERS} element={<SellerOrders />} />
        <Route
          path={ROUTES.SELLER_ORDER_DETAIL}
          element={<SellerOrderDetail />}
        />
        <Route path={ROUTES.SELLER_INVENTORY} element={<SellerInventory />} />
        <Route path={ROUTES.SELLER_SALES} element={<SellerSales />} />
      </Route>

      {/* Admin Dashboard Routes (Protected: admin role only) */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout
              title="Admin Portal"
              role="admin"
              navItems={adminNavItems}
            />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTES.ADMIN_OVERVIEW} element={<AdminOverview />} />
        <Route path={ROUTES.ADMIN_USERS} element={<AdminUsers />} />
        <Route path={ROUTES.ADMIN_SELLERS} element={<AdminSellers />} />
        <Route path={ROUTES.ADMIN_PRODUCTS} element={<AdminProducts />} />
        <Route path={ROUTES.ADMIN_CATEGORIES} element={<AdminCategories />} />
        <Route path={ROUTES.ADMIN_ORDERS} element={<AdminOrders />} />
        <Route path={ROUTES.ADMIN_SETTINGS} element={<AdminSettings />} />
        <Route path={ROUTES.ADMIN_AUDIT_LOG} element={<AdminAuditLog />} />
      </Route>

      {/* Catch-all Wildcard Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
