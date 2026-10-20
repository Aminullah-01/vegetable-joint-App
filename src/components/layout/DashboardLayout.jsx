import { useState, Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import { env } from '../../utils';
import { useAuth } from '../../hooks';
import { Spinner } from '../common/Spinner.jsx';
import {
  getSellerApprovalStatus,
  SELLER_STATUS_CONFIG,
  canSellerPublish,
} from '../../utils/sellerStatus';
import { SellerStatusNotice } from '../seller/SellerStatusNotice';

export function DashboardLayout({ title, role, navItems }) {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const sellerApprovalStatus =
    role === 'seller' ? getSellerApprovalStatus(user) : null;
  const sellerStatusConfig = sellerApprovalStatus
    ? SELLER_STATUS_CONFIG[sellerApprovalStatus]
    : null;
  const canPublish = role === 'seller' ? canSellerPublish(user) : true;

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      {/* Dashboard Top Header */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Mobile/Tablet Sidebar Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            style={{
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: isSidebarOpen ? '#f0fdf4' : '#ffffff',
              color: isSidebarOpen ? '#15803d' : '#1e293b',
              cursor: 'pointer',
              fontSize: '1.25rem',
            }}
            className="show-mobile"
            aria-label="Toggle dashboard navigation"
          >
            {isSidebarOpen ? '✕' : '☰'}
          </button>

          <Link
            to="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#15803d',
              fontWeight: '700',
              fontSize: '1.05rem',
            }}
          >
            <span>🥦</span>
            <span className="hide-mobile">{env.appName}</span>
          </Link>

          <span
            style={{
              backgroundColor: role === 'admin' ? '#fef3c7' : '#e0f2fe',
              color: role === 'admin' ? '#92400e' : '#0369a1',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </span>

          {/* Seller live approval status pill in top header (FE-064 / AUTH-03) */}
          {role === 'seller' && sellerStatusConfig && (
            <span
              data-testid="header-seller-status-badge"
              style={{
                backgroundColor: sellerStatusConfig.badgeBg,
                color: sellerStatusConfig.badgeTextCol,
                border: `1px solid ${sellerStatusConfig.border}`,
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span>{sellerStatusConfig.icon}</span>
              <span>{sellerStatusConfig.badgeText}</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user && (
            <span
              style={{
                fontSize: '0.85rem',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span>👤</span>
              <strong>{user.name}</strong>
            </span>
          )}
          <Link
            to="/account/profile"
            style={{
              color: '#475569',
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            Profile
          </Link>
          <Link
            to="/"
            style={{
              color: '#15803d',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: '500',
            }}
          >
            ← Marketplace
          </Link>
          <button
            type="button"
            onClick={logout}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              padding: '0.3rem 0.65rem',
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Dashboard Body */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Mobile Backdrop Overlay */}
        {isSidebarOpen && (
          <div
            onClick={closeSidebar}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              zIndex: 45,
            }}
            aria-hidden="true"
          />
        )}

        {/* Sidebar (Responsive: drawer on mobile, persistent on desktop) */}
        <aside
          style={{
            width: '250px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            padding: '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            zIndex: 48,
            transition: 'transform 0.25s ease-in-out',
          }}
          className={isSidebarOpen ? 'show-sidebar-mobile' : 'hide-mobile'}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: '#94a3b8',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
              paddingLeft: '0.5rem',
            }}
          >
            Navigation
          </div>
          {navItems.map((item) => {
            const isAddProduct = item.path === '/seller/products/new';
            const isLocked = isAddProduct && role === 'seller' && !canPublish;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={closeSidebar}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.65rem',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '6px',
                  color: isActive ? '#15803d' : '#334155',
                  backgroundColor: isActive ? '#f0fdf4' : 'transparent',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  minHeight: '44px',
                })}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {isLocked && (
                  <span
                    data-testid="sidebar-locked-badge"
                    style={{
                      fontSize: '0.7rem',
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    🔒 Locked
                  </span>
                )}
              </NavLink>
            );
          })}
        </aside>

        {/* Dashboard Main Content Area */}
        <main
          style={{
            flex: 1,
            padding: '1.5rem 1rem',
            overflowY: 'auto',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {role === 'seller' && <SellerStatusNotice user={user} />}
          <Suspense
            fallback={
              <Spinner size="lg" center text="Loading dashboard page..." />
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

DashboardLayout.propTypes = {
  title: PropTypes.string.isRequired,
  role: PropTypes.string.isRequired,
  navItems: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      end: PropTypes.bool,
    })
  ).isRequired,
};

export default DashboardLayout;
