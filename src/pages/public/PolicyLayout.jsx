import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../../components/common/Button';

const POLICY_NAV_ITEMS = [
  {
    path: '/terms',
    label: 'Terms of Use',
    icon: '📜',
    description: 'Marketplace rules, seller standards & order fulfillment',
  },
  {
    path: '/privacy',
    label: 'Privacy Notice',
    icon: '🛡️',
    description: 'NDPA 2023 compliance, data retention & privacy rights',
  },
  {
    path: '/refunds',
    label: 'Refund & Dispute Policy',
    icon: '🔄',
    description: 'Perishable goods returns, inspection & dispute mediation',
  },
];

/**
 * Shared Policy Page Layout
 * Provides a standardized legal document layout with navigation sidebar,
 * table of contents, print action, and support desk contact info.
 */
export function PolicyLayout({
  title,
  subtitle,
  lastUpdated = 'February 2026',
  badge = 'Legal & Policy',
  tableOfContents = [],
  children,
  className = '',
  style = {},
}) {
  const location = useLocation();

  const handlePrint = () => {
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    }
  };

  return (
    <div
      className={`policy-page-container ${className}`.trim()}
      data-testid="policy-layout"
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1.5rem 1rem 4rem',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* 1. Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        style={{
          fontSize: '0.875rem',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        <Link
          to="/"
          style={{
            color: '#15803d',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: '#64748b' }}>Policies</span>
        <span aria-hidden="true">/</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }} aria-current="page">
          {title}
        </span>
      </nav>

      {/* 2. Policy Hero Header */}
      <header
        className="policy-hero-card card"
        data-testid="policy-hero-header"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2.25rem 2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <span
            style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {badge}
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              fontSize: '0.875rem',
              color: '#64748b',
            }}
          >
            <span>
              📅 Last Updated: <strong>{lastUpdated}</strong>
            </span>
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print policy document"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <span>🖨️</span>
              <span>Print Policy</span>
            </button>
          </div>
        </div>

        <h1
          style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0.25rem 0 0',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            style={{
              fontSize: '1.05rem',
              color: '#475569',
              margin: 0,
              lineHeight: 1.6,
              maxWidth: '850px',
            }}
          >
            {subtitle}
          </p>
        )}
      </header>

      {/* 3. Mobile Policy Switcher Tabs */}
      <div
        className="mobile-policy-nav"
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        {POLICY_NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                backgroundColor: isActive ? '#15803d' : '#f1f5f9',
                color: isActive ? '#ffffff' : '#334155',
                transition: 'all 0.15s ease',
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* 4. Main Grid: Policy Nav Sidebar + Document Content */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2.5rem',
          alignItems: 'start',
        }}
      >
        {/* Sidebar */}
        <aside
          aria-label="Policy Navigation"
          data-testid="policy-sidebar"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* Policy Navigation Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h2
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 0.85rem 0',
              }}
            >
              Marketplace Policies
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {POLICY_NAV_ITEMS.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      backgroundColor: isActive ? '#f0fdf4' : 'transparent',
                      border: isActive
                        ? '1px solid #bbf7d0'
                        : '1px solid transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: isActive ? '#15803d' : '#1e293b',
                        fontWeight: isActive ? 700 : 600,
                        fontSize: '0.925rem',
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        paddingLeft: '1.5rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Table of Contents (if provided) */}
          {tableOfContents.length > 0 && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
              }}
            >
              <h2
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 0.75rem 0',
                }}
              >
                Table of Contents
              </h2>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  color: '#64748b',
                }}
              >
                {tableOfContents.map((item, index) => (
                  <li key={item.id || index}>
                    <a
                      href={`#${item.id}`}
                      style={{
                        color: '#15803d',
                        textDecoration: 'none',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Support Desk Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 0.5rem 0',
              }}
            >
              Questions or Concerns?
            </h3>
            <p
              style={{
                fontSize: '0.825rem',
                color: '#64748b',
                lineHeight: 1.5,
                margin: '0 0 0.75rem 0',
              }}
            >
              Our legal and dispute resolution team is available to help resolve
              any marketplace inquiry.
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                fontSize: '0.825rem',
              }}
            >
              <div>
                ✉️{' '}
                <a
                  href="mailto:support@vegetablejoint.ng"
                  style={{
                    color: '#15803d',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  support@vegetablejoint.ng
                </a>
              </div>
              <div>
                📞{' '}
                <a
                  href="tel:+2348000000000"
                  style={{
                    color: '#15803d',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  +234 800 000 0000
                </a>
              </div>
            </div>
          </div>
        </aside>

        {/* Policy Document Content Body */}
        <article
          className="policy-content"
          data-testid="policy-content"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '2.5rem 2rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            boxSizing: 'border-box',
            minWidth: 0,
            gridColumn: 'span 2',
          }}
        >
          {children}

          {/* Bottom Navigation CTA */}
          <div
            style={{
              borderTop: '1px solid #e2e8f0',
              marginTop: '3rem',
              paddingTop: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h4
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 0.25rem 0',
                }}
              >
                Ready to explore farm-fresh produce?
              </h4>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: '#64748b',
                  margin: 0,
                }}
              >
                Discover vegetables directly from vetted Nigerian farmers.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button to="/products" variant="primary" size="md">
                Browse Marketplace
              </Button>
              <Button to="/register" variant="outline" size="md">
                Create Account
              </Button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

PolicyLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  lastUpdated: PropTypes.string,
  badge: PropTypes.string,
  tableOfContents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    })
  ),
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default PolicyLayout;
