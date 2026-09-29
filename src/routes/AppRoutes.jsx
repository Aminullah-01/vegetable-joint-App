import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout, DashboardLayout } from '../components/layout';
import { ROUTES } from './routeConfig';
import { ProtectedRoute } from './ProtectedRoute';
import { GuestRoute } from './GuestRoute';
import { Spinner } from '../components/common';

// Eagerly loaded Public Pages
import { Home } from '../pages/public/Home';
import { Products } from '../pages/public/Products';
import { ProductDetails } from '../pages/public/ProductDetails';
import { SellerProfile } from '../pages/public/SellerProfile';
import { Cart } from '../pages/public/Cart';

// Eagerly loaded Auth Pages
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';

// Eagerly loaded Error Pages
import { Forbidden } from '../pages/errors/Forbidden';
import { NotFound } from '../pages/errors/NotFound';
import { ServerError } from '../pages/errors/ServerError';

// Lazy-loaded Seller Dashboard Pages (FE-021 / NFR-PERF-01)
const SellerOverview = lazy(() => import('../pages/seller/SellerOverview'));
const SellerProducts = lazy(() => import('../pages/seller/SellerProducts'));
const SellerProductForm = lazy(
  () => import('../pages/seller/SellerProductForm')
);
const SellerOrders = lazy(() => import('../pages/seller/SellerOrders'));
const SellerOrderDetail = lazy(
  () => import('../pages/seller/SellerOrderDetail')
);
const SellerInventory = lazy(() => import('../pages/seller/SellerInventory'));
const SellerSales = lazy(() => import('../pages/seller/SellerSales'));

// Lazy-loaded Admin Dashboard Pages (FE-021 / NFR-PERF-01)
const AdminOverview = lazy(() => import('../pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('../pages/admin/AdminUsers'));
const AdminSellers = lazy(() => import('../pages/admin/AdminSellers'));
const AdminProducts = lazy(() => import('../pages/admin/AdminProducts'));
const AdminCategories = lazy(() => import('../pages/admin/AdminCategories'));
const AdminOrders = lazy(() => import('../pages/admin/AdminOrders'));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));
const AdminAuditLog = lazy(() => import('../pages/admin/AdminAuditLog'));

// Lazy-loaded Buyer Pages
const Checkout = lazy(() => import('../pages/buyer/Checkout'));
const OrderConfirmation = lazy(
  () => import('../pages/buyer/OrderConfirmation')
);
const MyOrders = lazy(() => import('../pages/buyer/MyOrders'));
const OrderDetail = lazy(() => import('../pages/buyer/OrderDetail'));

// Lazy-loaded Account Pages
const Profile = lazy(() => import('../pages/account/Profile'));

// Lazy-loaded Secondary Auth Pages
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));

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
    <Suspense fallback={<Spinner size="lg" center text="Loading..." />}>
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
    </Suspense>
  );
}

export default AppRoutes;
