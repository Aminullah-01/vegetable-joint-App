import { Link, NavLink, Outlet } from 'react-router-dom';
import { env } from '../../utils';

export function MainLayout() {
  const navLinkStyle = ({ isActive }) => ({
    color: isActive ? '#15803d' : '#475569',
    fontWeight: isActive ? '600' : '400',
    textDecoration: 'none',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    backgroundColor: isActive ? '#f0fdf4' : 'transparent',
    transition: 'all 0.15s ease-in-out',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Logo & App Title */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#15803d',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}
            >
              🥦
            </div>
            <div>
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#15803d',
                  display: 'block',
                  lineHeight: 1.2,
                }}
              >
                {env.appName}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  display: 'block',
                }}
              >
                Digital Vegetable Marketplace
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <NavLink to="/" style={navLinkStyle}>
              Home
            </NavLink>
            <NavLink to="/products" style={navLinkStyle}>
              Browse Vegetables
            </NavLink>
            <NavLink to="/cart" style={navLinkStyle}>
              Cart 🛒
            </NavLink>
            <NavLink to="/account/orders" style={navLinkStyle}>
              My Orders
            </NavLink>
            <NavLink to="/seller" style={navLinkStyle}>
              Seller Portal
            </NavLink>
            <NavLink to="/admin" style={navLinkStyle}>
              Admin
            </NavLink>
          </nav>

          {/* Auth Controls */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <NavLink
              to="/login"
              style={{
                color: '#15803d',
                textDecoration: 'none',
                fontWeight: '500',
                padding: '0.4rem 0.8rem',
              }}
            >
              Sign In
            </NavLink>
            <NavLink
              to="/register"
              style={{
                backgroundColor: '#15803d',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: '500',
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
              }}
            >
              Register
            </NavLink>
          </div>
        </div>
      </header>

      {/* Main Outlet */}
      <main
        style={{
          flex: 1,
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '2rem 1.5rem',
        }}
      >
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '1.5rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            Vegetable Joint — Direct Farm-to-Buyer Marketplace (Nigeria)
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1.5rem',
              fontSize: '0.8rem',
            }}
          >
            <Link
              to="/products"
              style={{ color: '#15803d', textDecoration: 'none' }}
            >
              Products
            </Link>
            <Link
              to="/sellers/1"
              style={{ color: '#15803d', textDecoration: 'none' }}
            >
              Sample Seller
            </Link>
            <Link
              to="/seller"
              style={{ color: '#15803d', textDecoration: 'none' }}
            >
              Seller Dashboard
            </Link>
            <Link
              to="/admin"
              style={{ color: '#15803d', textDecoration: 'none' }}
            >
              Admin Dashboard
            </Link>
            <Link
              to="/404"
              style={{ color: '#64748b', textDecoration: 'none' }}
            >
              404 Page
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
