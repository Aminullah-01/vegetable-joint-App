import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { env } from '../../utils';
import { useAuth, useCart } from '../../hooks';
import { mockCategories } from '../../data/mockCategories';
import { categoryService } from '../../services/categoryService';

/**
 * Navbar — Digital Vegetable Marketplace Shared Navigation Header
 * Conforms to SRS UI-01, UI-07, CART-07, and Task FE-022 acceptance criteria:
 * - Logo & Branding with link to homepage
 * - Search bar with instant navigation to product search
 * - Categories link with quick-browse dropdown
 * - Cart indicator with real-time item count badge (CART-07)
 * - Role-dependent navigation & account menu (UI-07: guest, buyer, seller, admin)
 * - Responsive desktop navigation and mobile drawer with touch targets >= 44px
 */
export function Navbar({
  searchPlaceholder = 'Search fresh vegetables, sellers...',
  onSearch,
  showCategoriesDropdown = true,
}) {
  const { user, role, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile menu toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dropdown states
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Categories list
  const [categories, setCategories] = useState(mockCategories);

  // Refs for click-outside dismissal
  const categoryRef = useRef(null);
  const accountRef = useRef(null);

  // Load live categories on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const fetched = await categoryService.getCategories();
        if (isMounted && Array.isArray(fetched) && fetched.length > 0) {
          setCategories(fetched);
        }
      } catch {
        // Fallback to mockCategories
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync search input when search query changes in URL
  const currentSearchParam =
    new URLSearchParams(location.search).get('search') || '';
  const [prevSearchParam, setPrevSearchParam] = useState(currentSearchParam);
  if (prevSearchParam !== currentSearchParam) {
    setPrevSearchParam(currentSearchParam);
    setSearchQuery(currentSearchParam);
  }

  // Reset dropdowns and mobile menu on route change
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    setIsMobileMenuOpen(false);
    setIsCategoryOpen(false);
    setIsAccountOpen(false);
  }

  // Click-outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setIsCategoryOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setIsAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search submission handler
  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (onSearch) {
      onSearch(query);
    } else {
      if (query) {
        navigate(`/products?search=${encodeURIComponent(query)}`);
      } else {
        navigate('/products');
      }
    }
    setIsMobileMenuOpen(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Nav link style helper
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
    gap: '0.35rem',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap',
  });

  const mobileNavLinkStyle = ({ isActive }) => ({
    color: isActive ? '#15803d' : '#1e293b',
    fontWeight: isActive ? '700' : '500',
    textDecoration: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: isActive ? '#f0fdf4' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
    borderBottom: '1px solid #f1f5f9',
    minHeight: '44px',
  });

  // Role badge styling helper
  const getRoleBadgeStyle = (userRole) => {
    switch (userRole) {
      case 'seller':
        return {
          backgroundColor: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fde68a',
        };
      case 'admin':
        return {
          backgroundColor: '#e0e7ff',
          color: '#3730a3',
          border: '1px solid #c7d2fe',
        };
      default:
        return {
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0',
        };
    }
  };

  return (
    <header
      data-testid="navbar"
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
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
          gap: '1rem',
        }}
      >
        {/* Left: Brand & Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
            flexShrink: 0,
          }}
          aria-label={`${env.appName || 'Vegetable Joint'} Homepage`}
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
                fontSize: '1.15rem',
                fontWeight: '700',
                color: '#15803d',
                display: 'block',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              {env.appName || 'Vegetable Joint'}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                color: '#64748b',
                display: 'block',
                fontWeight: '500',
              }}
            >
              Digital Marketplace
            </span>
          </div>
        </Link>

        {/* Center: Search Bar (Desktop) */}
        <form
          onSubmit={handleSearch}
          role="search"
          className="hide-mobile"
          style={{
            flex: 1,
            maxWidth: '440px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              color: '#94a3b8',
              fontSize: '0.95rem',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search vegetables, categories, and sellers"
            style={{
              width: '100%',
              padding: '0.5rem 2.25rem 0.5rem 2.25rem',
              fontSize: '0.875rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              color: '#1e293b',
              outline: 'none',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#15803d';
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.boxShadow = '0 0 0 3px rgba(21, 128, 61, 0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#cbd5e1';
              e.target.style.backgroundColor = '#f8fafc';
              e.target.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search query"
              style={{
                position: 'absolute',
                right: '2.5rem',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: '0.2rem',
              }}
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            aria-label="Submit search"
            style={{
              position: 'absolute',
              right: '0.25rem',
              backgroundColor: '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.3rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Go
          </button>
        </form>

        {/* Right-Center: Navigation Links (Desktop, Role-dependent UI-07) */}
        <nav
          className="hide-mobile"
          aria-label="Primary Navigation"
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
            Browse
          </NavLink>

          {/* Categories Dropdown */}
          {showCategoriesDropdown && (
            <div ref={categoryRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsCategoryOpen((prev) => !prev)}
                aria-expanded={isCategoryOpen}
                aria-haspopup="true"
                style={{
                  ...navLinkStyle({ isActive: false }),
                  border: 'none',
                  background: isCategoryOpen ? '#f0fdf4' : 'transparent',
                  cursor: 'pointer',
                  color: isCategoryOpen ? '#15803d' : '#475569',
                }}
              >
                <span>Categories</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    transition: 'transform 0.15s ease',
                    transform: isCategoryOpen ? 'rotate(180deg)' : 'none',
                  }}
                  aria-hidden="true"
                >
                  ▼
                </span>
              </button>

              {isCategoryOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    width: '240px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '0.5rem 0',
                    zIndex: 100,
                  }}
                >
                  <div
                    style={{
                      padding: '0.4rem 1rem',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: '#94a3b8',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Fresh Categories
                  </div>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/products?category=${cat.id}`}
                      onClick={() => setIsCategoryOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        color: '#1e293b',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0fdf4';
                        e.currentTarget.style.color = '#15803d';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#1e293b';
                      }}
                    >
                      <span>{cat.name}</span>
                      {cat.products_count !== undefined && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            backgroundColor: '#f1f5f9',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '999px',
                          }}
                        >
                          {cat.products_count}
                        </span>
                      )}
                    </Link>
                  ))}
                  <div
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      marginTop: '0.3rem',
                      paddingTop: '0.3rem',
                    }}
                  >
                    <Link
                      to="/products"
                      onClick={() => setIsCategoryOpen(false)}
                      style={{
                        display: 'block',
                        padding: '0.4rem 1rem',
                        fontSize: '0.8rem',
                        color: '#15803d',
                        fontWeight: '600',
                        textDecoration: 'none',
                      }}
                    >
                      View All Vegetables →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Role-specific Navigation Links (UI-07) */}
          {isAuthenticated && role === 'buyer' && (
            <NavLink to="/account/orders" style={navLinkStyle}>
              My Orders
            </NavLink>
          )}

          {isAuthenticated && role === 'seller' && (
            <NavLink to="/seller" style={navLinkStyle}>
              Seller Portal
            </NavLink>
          )}

          {isAuthenticated && role === 'admin' && (
            <NavLink to="/admin" style={navLinkStyle}>
              Admin Portal
            </NavLink>
          )}
        </nav>

        {/* Right: Cart & Authentication (Desktop) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexShrink: 0,
          }}
        >
          {/* Cart Icon with Live Item Count (CART-07) */}
          <Link
            to="/cart"
            aria-label={
              itemCount > 0
                ? `Shopping Cart with ${itemCount} items`
                : 'Shopping Cart (empty)'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#1e293b',
              textDecoration: 'none',
              position: 'relative',
              transition: 'background-color 0.15s ease',
              minWidth: '42px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0fdf4';
              e.currentTarget.style.borderColor = '#bbf7d0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
              🛒
            </span>
            {itemCount > 0 && (
              <span
                data-testid="navbar-cart-badge"
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }}
              >
                {itemCount}
              </span>
            )}
          </Link>

          {/* Desktop Auth Controls (> 768px) */}
          <div className="hide-mobile">
            {isAuthenticated ? (
              <div ref={accountRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsAccountOpen((prev) => !prev)}
                  aria-expanded={isAccountOpen}
                  aria-haspopup="true"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.4rem 0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#1e293b',
                  }}
                >
                  <span aria-hidden="true">👤</span>
                  <span
                    style={{
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user?.name || user?.email || 'Account'}
                  </span>
                  {role && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                        fontWeight: '700',
                        ...getRoleBadgeStyle(role),
                      }}
                    >
                      {role}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: '#64748b',
                      marginLeft: '0.1rem',
                      transform: isAccountOpen ? 'rotate(180deg)' : 'none',
                    }}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </button>

                {/* Account Popover Menu */}
                {isAccountOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '220px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      padding: '0.5rem 0',
                      zIndex: 100,
                    }}
                  >
                    <div
                      style={{
                        padding: '0.5rem 1rem',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: '700',
                          fontSize: '0.875rem',
                          color: '#0f172a',
                        }}
                      >
                        {user?.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {user?.email}
                      </div>
                    </div>

                    {/* Common Account Profile Link */}
                    <Link
                      to="/account/profile"
                      onClick={() => setIsAccountOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 1rem',
                        fontSize: '0.85rem',
                        color: '#334155',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span>👤</span>
                      <span>Profile Settings</span>
                    </Link>

                    {/* Buyer Links */}
                    {role === 'buyer' && (
                      <Link
                        to="/account/orders"
                        onClick={() => setIsAccountOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.55rem 1rem',
                          fontSize: '0.85rem',
                          color: '#334155',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span>📦</span>
                        <span>My Orders</span>
                      </Link>
                    )}

                    {/* Seller Links */}
                    {role === 'seller' && (
                      <>
                        <Link
                          to="/seller"
                          onClick={() => setIsAccountOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.55rem 1rem',
                            fontSize: '0.85rem',
                            color: '#334155',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'transparent';
                          }}
                        >
                          <span>📊</span>
                          <span>Seller Dashboard</span>
                        </Link>
                        <Link
                          to="/seller/products"
                          onClick={() => setIsAccountOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.55rem 1rem',
                            fontSize: '0.85rem',
                            color: '#334155',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'transparent';
                          }}
                        >
                          <span>🥦</span>
                          <span>My Products</span>
                        </Link>
                      </>
                    )}

                    {/* Admin Links */}
                    {role === 'admin' && (
                      <>
                        <Link
                          to="/admin"
                          onClick={() => setIsAccountOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.55rem 1rem',
                            fontSize: '0.85rem',
                            color: '#334155',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'transparent';
                          }}
                        >
                          <span>⚙️</span>
                          <span>Admin Portal</span>
                        </Link>
                        <Link
                          to="/admin/users"
                          onClick={() => setIsAccountOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.55rem 1rem',
                            fontSize: '0.85rem',
                            color: '#334155',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'transparent';
                          }}
                        >
                          <span>👥</span>
                          <span>Users & Moderation</span>
                        </Link>
                      </>
                    )}

                    <div
                      style={{
                        borderTop: '1px solid #f1f5f9',
                        marginTop: '0.4rem',
                        paddingTop: '0.4rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountOpen(false);
                          logout();
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.55rem 1rem',
                          fontSize: '0.85rem',
                          color: '#dc2626',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fef2f2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span>🚪</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <NavLink
                  to="/login"
                  style={{
                    color: '#15803d',
                    textDecoration: 'none',
                    fontWeight: '600',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
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
                    fontWeight: '600',
                    padding: '0.45rem 0.95rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  Register
                </NavLink>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle (≤ 768px) */}
          <button
            type="button"
            className="show-mobile"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            style={{
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: isMobileMenuOpen ? '#f0fdf4' : '#ffffff',
              color: isMobileMenuOpen ? '#15803d' : '#1e293b',
              fontSize: '1.25rem',
              cursor: 'pointer',
            }}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (≤ 768px) */}
      {isMobileMenuOpen && (
        <div
          data-testid="navbar-mobile-drawer"
          style={{
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            padding: '1rem',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            maxHeight: 'calc(100vh - 65px)',
            overflowY: 'auto',
          }}
        >
          {/* Mobile Search Input */}
          <form
            onSubmit={handleSearch}
            role="search"
            style={{
              position: 'relative',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                color: '#94a3b8',
                fontSize: '0.95rem',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              🔍
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search vegetables and sellers (mobile)"
              style={{
                width: '100%',
                padding: '0.65rem 2.25rem 0.65rem 2.25rem',
                fontSize: '0.9rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                outline: 'none',
                minHeight: '44px',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear mobile search query"
                style={{
                  position: 'absolute',
                  right: '2.75rem',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  padding: '0.3rem',
                }}
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              aria-label="Submit mobile search"
              style={{
                position: 'absolute',
                right: '0.35rem',
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: '34px',
              }}
            >
              Go
            </button>
          </form>

          {/* Primary Mobile Links */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <NavLink
              to="/"
              style={mobileNavLinkStyle}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>🏠 Home</span>
            </NavLink>
            <NavLink
              to="/products"
              style={mobileNavLinkStyle}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>🥦 Browse Vegetables</span>
            </NavLink>
            <NavLink
              to="/cart"
              style={mobileNavLinkStyle}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>🛒 Shopping Cart</span>
              {itemCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '0.1rem 0.5rem',
                    borderRadius: '999px',
                  }}
                >
                  {itemCount}
                </span>
              )}
            </NavLink>

            {/* Role-Specific Links in Mobile (UI-07) */}
            {isAuthenticated && role === 'buyer' && (
              <NavLink
                to="/account/orders"
                style={mobileNavLinkStyle}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>📦 My Orders</span>
              </NavLink>
            )}

            {isAuthenticated && role === 'seller' && (
              <>
                <NavLink
                  to="/seller"
                  style={mobileNavLinkStyle}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>📊 Seller Overview</span>
                </NavLink>
                <NavLink
                  to="/seller/products"
                  style={mobileNavLinkStyle}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>🥦 My Products</span>
                </NavLink>
                <NavLink
                  to="/seller/orders"
                  style={mobileNavLinkStyle}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>📋 Seller Orders</span>
                </NavLink>
              </>
            )}

            {isAuthenticated && role === 'admin' && (
              <>
                <NavLink
                  to="/admin"
                  style={mobileNavLinkStyle}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>⚙️ Admin Portal</span>
                </NavLink>
                <NavLink
                  to="/admin/users"
                  style={mobileNavLinkStyle}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>👥 Users Management</span>
                </NavLink>
                <NavLink
                  to="/admin/products"
                  style={mobileNavLinkStyle}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>🥕 Product Moderation</span>
                </NavLink>
              </>
            )}
          </div>

          {/* Quick Category Tags in Mobile */}
          <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#94a3b8',
                marginBottom: '0.5rem',
                letterSpacing: '0.05em',
              }}
            >
              Categories
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.id}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.35rem 0.7rem',
                    borderRadius: '20px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    textDecoration: 'none',
                    fontWeight: '500',
                  }}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Auth / Profile Section */}
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            {isAuthenticated ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        color: '#0f172a',
                      }}
                    >
                      {user?.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {user?.email}
                    </div>
                  </div>
                  {role && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        textTransform: 'capitalize',
                        fontWeight: '700',
                        ...getRoleBadgeStyle(role),
                      }}
                    >
                      {role}
                    </span>
                  )}
                </div>

                <Link
                  to="/account/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    minHeight: '44px',
                  }}
                >
                  <span>👤</span>
                  <span>Manage Profile</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#b91c1c',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #15803d',
                    color: '#15803d',
                    backgroundColor: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

Navbar.propTypes = {
  searchPlaceholder: PropTypes.string,
  onSearch: PropTypes.func,
  showCategoriesDropdown: PropTypes.bool,
};

export default Navbar;
