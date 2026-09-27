import { Link } from 'react-router-dom';
import { env } from '../../utils';

export function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <span
          style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}
        >
          🥦🥕🍅
        </span>
        <h1
          style={{
            fontSize: '2.25rem',
            fontWeight: '800',
            marginBottom: '0.75rem',
          }}
        >
          Fresh Vegetables, Directly from Verified Sellers
        </h1>
        <p
          style={{
            fontSize: '1.1rem',
            opacity: 0.9,
            maxWidth: '650px',
            margin: '0 auto 1.5rem auto',
          }}
        >
          Connecting vegetable sellers, farmers, and consumers across Nigeria.
          Transparent pricing in Nigerian Naira (₦), guaranteed freshness, and
          convenient delivery.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/products"
            style={{
              backgroundColor: '#ffffff',
              color: '#15803d',
              padding: '0.75rem 1.75rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '700',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Explore Vegetables
          </Link>
          <Link
            to="/register"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              padding: '0.75rem 1.75rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            Become a Seller
          </Link>
        </div>
      </section>

      {/* Route Directory Grid (Demonstrating Route Map) */}
      <section
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: '1.35rem',
              color: '#15803d',
              marginBottom: '0.25rem',
            }}
          >
            Interactive Route Directory (SRS 4.1.2)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Full page inventory implemented with client-side React Router
            navigation. Current data mode:{' '}
            <strong>{env.useMockData ? 'Mock Mode' : 'API Mode'}</strong>.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Public & Buyer Links */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              backgroundColor: '#fafafa',
            }}
          >
            <h3
              style={{
                fontSize: '1rem',
                color: '#166534',
                marginBottom: '0.75rem',
              }}
            >
              🛒 Public & Marketplace
            </h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.85rem',
              }}
            >
              <li>
                <Link
                  to="/products"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /products — Product Catalog
                </Link>
              </li>
              <li>
                <Link
                  to="/products/1"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /products/1 — Product Details
                </Link>
              </li>
              <li>
                <Link
                  to="/sellers/1"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /sellers/1 — Seller Profile
                </Link>
              </li>
              <li>
                <Link
                  to="/cart"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /cart — Shopping Cart
                </Link>
              </li>
              <li>
                <Link
                  to="/checkout"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /checkout — Checkout
                </Link>
              </li>
              <li>
                <Link
                  to="/checkout/confirmation/ORD-2026-001"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /checkout/confirmation/ORD-2026-001 — Confirmation
                </Link>
              </li>
              <li>
                <Link
                  to="/account/orders"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /account/orders — My Orders
                </Link>
              </li>
              <li>
                <Link
                  to="/account/orders/1"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /account/orders/1 — Order Detail
                </Link>
              </li>
            </ul>
          </div>

          {/* Authentication Links */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              backgroundColor: '#fafafa',
            }}
          >
            <h3
              style={{
                fontSize: '1rem',
                color: '#166534',
                marginBottom: '0.75rem',
              }}
            >
              🔐 Authentication & Account
            </h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.85rem',
              }}
            >
              <li>
                <Link
                  to="/login"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /login — Sign In
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /register — Create Account
                </Link>
              </li>
              <li>
                <Link
                  to="/forgot-password"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /forgot-password — Password Recovery
                </Link>
              </li>
              <li>
                <Link
                  to="/reset-password"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /reset-password — Set New Password
                </Link>
              </li>
              <li>
                <Link
                  to="/account/profile"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /account/profile — User Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Seller Dashboard Links */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              backgroundColor: '#fafafa',
            }}
          >
            <h3
              style={{
                fontSize: '1rem',
                color: '#166534',
                marginBottom: '0.75rem',
              }}
            >
              🧑‍🌾 Seller Portal
            </h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.85rem',
              }}
            >
              <li>
                <Link
                  to="/seller"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /seller — Overview
                </Link>
              </li>
              <li>
                <Link
                  to="/seller/products"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /seller/products — Product List
                </Link>
              </li>
              <li>
                <Link
                  to="/seller/products/new"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /seller/products/new — Add Product
                </Link>
              </li>
              <li>
                <Link
                  to="/seller/products/1/edit"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /seller/products/1/edit — Edit Product
                </Link>
              </li>
              <li>
                <Link
                  to="/seller/orders"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /seller/orders — Incoming Orders
                </Link>
              </li>
              <li>
                <Link
                  to="/seller/orders/1"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /seller/orders/1 — Order Detail
                </Link>
              </li>
              <li>
                <Link
                  to="/seller/inventory"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /seller/inventory — Stock Control
                </Link>
              </li>
              <li>
                <Link
                  to="/seller/sales"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /seller/sales — Revenue & Metrics
                </Link>
              </li>
            </ul>
          </div>

          {/* Admin & Error Links */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              backgroundColor: '#fafafa',
            }}
          >
            <h3
              style={{
                fontSize: '1rem',
                color: '#166534',
                marginBottom: '0.75rem',
              }}
            >
              🛡️ Admin & System Pages
            </h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.85rem',
              }}
            >
              <li>
                <Link
                  to="/admin"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /admin — Admin Overview
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/users"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /admin/users — User Management
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/sellers"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /admin/sellers — Seller Moderation
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/products"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /admin/products — Product Moderation
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/categories"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /admin/categories — Category List
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/orders"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /admin/orders — Global Orders
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/settings"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /admin/settings — System Settings
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/audit-log"
                  style={{ color: '#15803d', textDecoration: 'none' }}
                >
                  /admin/audit-log — Audit Log
                </Link>
              </li>
              <li>
                <Link
                  to="/403"
                  style={{ color: '#d97706', textDecoration: 'none' }}
                >
                  /403 — Forbidden
                </Link>
              </li>
              <li>
                <Link
                  to="/404"
                  style={{ color: '#dc2626', textDecoration: 'none' }}
                >
                  /404 — Not Found
                </Link>
              </li>
              <li>
                <Link
                  to="/500"
                  style={{ color: '#dc2626', textDecoration: 'none' }}
                >
                  /500 — Server Error
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Design Tokens & Styles Showcase (FE-005, UI-02, NFR-COMP-02) */}
      <section
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>🎨</span>
            <h2 style={{ fontSize: '1.35rem', color: '#15803d', margin: 0 }}>
              Design Tokens & Global Styles (UI-02)
            </h2>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Colours, typography hierarchy, 8px spacing, and responsive
            breakpoints defined once and shared across all user roles.
          </p>
        </div>

        {/* Color Palette Tokens */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3
            style={{
              fontSize: '1rem',
              color: '#1e293b',
              marginBottom: '0.75rem',
            }}
          >
            1. Semantic Color Tokens
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {[
              { label: 'Primary', val: '#15803d', text: '#fff' },
              { label: 'Primary Hover', val: '#166534', text: '#fff' },
              { label: 'Primary Light', val: '#dcfce7', text: '#15803d' },
              { label: 'Accent', val: '#f97316', text: '#fff' },
              { label: 'Success', val: '#16a34a', text: '#fff' },
              { label: 'Warning', val: '#d97706', text: '#fff' },
              { label: 'Error', val: '#dc2626', text: '#fff' },
              { label: 'Info', val: '#0284c7', text: '#fff' },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  backgroundColor: c.val,
                  color: c.text,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div>{c.label}</div>
                <div
                  style={{
                    opacity: 0.85,
                    fontWeight: 'normal',
                    fontSize: '0.7rem',
                  }}
                >
                  {c.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spacing & Breakpoints Info */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Spacing System */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              backgroundColor: '#fafafa',
            }}
          >
            <h4
              style={{
                fontSize: '0.95rem',
                color: '#166534',
                marginBottom: '0.5rem',
              }}
            >
              📐 8px Spacing System
            </h4>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                fontSize: '0.8rem',
                color: '#475569',
              }}
            >
              <div>
                <code>--space-1</code>: 0.25rem (4px) — micro gaps, inline
                badges
              </div>
              <div>
                <code>--space-2</code>: 0.5rem (8px) — base unit, compact
                buttons
              </div>
              <div>
                <code>--space-4</code>: 1.0rem (16px) — standard card padding
              </div>
              <div>
                <code>--space-6</code>: 1.5rem (24px) — grid gutters
              </div>
              <div>
                <code>--space-8</code>: 2.0rem (32px) — section separators
              </div>
            </div>
          </div>

          {/* Breakpoints */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              backgroundColor: '#fafafa',
            }}
          >
            <h4
              style={{
                fontSize: '0.95rem',
                color: '#166534',
                marginBottom: '0.5rem',
              }}
            >
              📱 Responsive Breakpoints (NFR-COMP-02)
            </h4>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                fontSize: '0.8rem',
                color: '#475569',
              }}
            >
              <div>
                <code>sm: 360px</code> — Mobile minimum screen width
              </div>
              <div>
                <code>md: 768px</code> — Tablet viewport
              </div>
              <div>
                <code>lg: 1024px</code> — Laptop / Small desktop
              </div>
              <div>
                <code>xl: 1280px</code> — Desktop viewport
              </div>
              <div>
                <code>2xl: 1920px</code> — Maximum responsive boundary
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
