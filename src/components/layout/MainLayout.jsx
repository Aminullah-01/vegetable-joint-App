import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { env } from '../../utils';
import { useAuth, useCart } from '../../hooks';

export function MainLayout() {
  const { user, role, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navLinkStyle = ({ isActive }) => ({
    color: isActive ? '#15803d' : '#475569',
    fontWeight: isActive ? '600' : '500',
    textDecoration: 'none',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    backgroundColor: isActive ? '#f0fdf4' : 'transparent',
    transition: 'all 0.15s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  });

  const mobileNavLinkStyle = ({ isActive }) => ({
    color: isActive ? '#15803d' : '#1e293b',
    fontWeight: isActive ? '700' : '500',
    textDecoration: 'none',
    padding: '0.85rem 1rem',
    borderRadius: '8px',
    backgroundColor: isActive ? '#f0fdf4' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '1rem',
    borderBottom: '1px solid #f1f5f9',
    minHeight: '44px',
  });

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
      {/* Top Header */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          {/* Logo & Brand */}
          <Link
            to="/"
            onClick={closeMobileMenu}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              flexShrink: 0,
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
                flexShrink: 0,
              }}
            >
              🥦
            </div>
            <div>
              <span
                style={{
                  fontSize: '1.1rem',
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
                  fontSize: '0.65rem',
                  color: '#64748b',
                  display: 'block',
                }}
              >
                Digital Marketplace
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (> 768px) */}
          <nav
            className="hide-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <NavLink to="/" style={navLinkStyle}>
              Home
            </NavLink>
            <NavLink to="/products" style={navLinkStyle}>
              Browse Vegetables
            </NavLink>
            <NavLink to="/cart" style={navLinkStyle}>
              <span>Cart 🛒</span>
              {itemCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    marginLeft: '0.2rem',
                  }}
                >
                  {itemCount}
                </span>
              )}
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

          {/* Desktop Auth Controls (> 768px) */}
          <div
            className="hide-mobile"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isAuthenticated ? (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
              >
                <Link
                  to="/account/profile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#1e293b',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                  }}
                >
                  <span>👤</span>
                  <span>{user?.name || 'My Account'}</span>
                  {role && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        textTransform: 'capitalize',
                      }}
                    >
                      {role}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <NavLink
                  to="/login"
                  style={{
                    color: '#15803d',
                    textDecoration: 'none',
                    fontWeight: '500',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.9rem',
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
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                >
                  Register
                </NavLink>
              </>
            )}
          </div>

          {/* Mobile Right Controls (≤ 768px) */}
          <div
            className="show-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Link
              to="/cart"
              onClick={closeMobileMenu}
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                color: '#1e293b',
                textDecoration: 'none',
                fontSize: '1.2rem',
                position: 'relative',
              }}
              aria-label="View Cart"
            >
              <span>🛒</span>
              {itemCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                  }}
                >
                  {itemCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleMobileMenu}
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: isMobileMenuOpen ? '#f0fdf4' : '#ffffff',
                color: isMobileMenuOpen ? '#15803d' : '#1e293b',
                fontSize: '1.4rem',
                cursor: 'pointer',
              }}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer Dropdown */}
        {isMobileMenuOpen && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              padding: '1rem',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                marginBottom: '1rem',
              }}
            >
              <NavLink
                to="/"
                onClick={closeMobileMenu}
                style={mobileNavLinkStyle}
              >
                <span>🏠 Home</span>
                <span>→</span>
              </NavLink>
              <NavLink
                to="/products"
                onClick={closeMobileMenu}
                style={mobileNavLinkStyle}
              >
                <span>🥦 Browse Vegetables</span>
                <span>→</span>
              </NavLink>
              <NavLink
                to="/cart"
                onClick={closeMobileMenu}
                style={mobileNavLinkStyle}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>🛒 Shopping Cart</span>
                  {itemCount > 0 && (
                    <span
                      style={{
                        backgroundColor: '#15803d',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '999px',
                      }}
                    >
                      {itemCount}
                    </span>
                  )}
                </div>
                <span>→</span>
              </NavLink>
              <NavLink
                to="/account/orders"
                onClick={closeMobileMenu}
                style={mobileNavLinkStyle}
              >
                <span>📦 My Orders</span>
                <span>→</span>
              </NavLink>
              <NavLink
                to="/account/profile"
                onClick={closeMobileMenu}
                style={mobileNavLinkStyle}
              >
                <span>👤 Profile</span>
                <span>→</span>
              </NavLink>
              <NavLink
                to="/seller"
                onClick={closeMobileMenu}
                style={mobileNavLinkStyle}
              >
                <span>🌾 Seller Portal</span>
                <span>→</span>
              </NavLink>
              <NavLink
                to="/admin"
                onClick={closeMobileMenu}
                style={mobileNavLinkStyle}
              >
                <span>🛡️ Admin Portal</span>
                <span>→</span>
              </NavLink>
            </div>

            {isAuthenticated ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.9rem',
                    color: '#1e293b',
                  }}
                >
                  <span>
                    Signed in as <strong>{user?.name}</strong>
                  </span>
                  {role && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        textTransform: 'capitalize',
                        fontWeight: '600',
                      }}
                    >
                      {role}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    logout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '44px',
                    borderRadius: '6px',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    backgroundColor: '#fef2f2',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '44px',
                    borderRadius: '6px',
                    border: '1px solid #15803d',
                    color: '#15803d',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '44px',
                    borderRadius: '6px',
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Shell */}
      <main
        style={{
          flex: 1,
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          padding: '1.5rem 1rem',
          boxSizing: 'border-box',
        }}
      >
        <Outlet />
      </main>

      {/* Footer Shell */}
      <footer
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '1.5rem 1rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.85rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            Vegetable Joint — Direct Farm-to-Buyer Marketplace (Nigeria)
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
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
