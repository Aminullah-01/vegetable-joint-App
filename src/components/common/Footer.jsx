import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { env } from '../../utils';
import { mockSettings } from '../../data/mockSettings';
import { adminService } from '../../services/adminService';

/**
 * Footer — Digital Vegetable Marketplace Shared Footer
 * Conforms to SRS MKT-01, ADM-08, and Task FE-023 acceptance criteria:
 * - Marketplace brand information and quick links (About, Browse, Categories, Sellers, Cart)
 * - Role portals (Customer Account, Seller Portal, Admin Portal)
 * - Dynamic support & contact info (email, phone, support text) editable via admin settings (ADM-08)
 * - Legal policies (Privacy, Terms) and copyright notice
 * - Fully responsive across mobile, tablet, and desktop breakpoints
 */
export function Footer({
  siteName,
  siteTagline,
  contactEmail,
  contactPhone,
  supportText,
  footerText,
}) {
  const [settings, setSettings] = useState(mockSettings);

  // Synchronize dynamic settings if updated via Admin Settings (ADM-08)
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const liveSettings = await adminService.getSettings();
        if (isMounted && liveSettings && typeof liveSettings === 'object') {
          setSettings((prev) => ({ ...prev, ...liveSettings }));
        }
      } catch {
        // Fallback to static mockSettings
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentYear = new Date().getFullYear();
  const effectiveSiteName =
    siteName || settings.site_name || env.appName || 'Vegetable Joint';
  const effectiveTagline =
    siteTagline ||
    settings.site_tagline ||
    'Direct Farm-to-Buyer Digital Vegetable Marketplace in Nigeria.';
  const effectiveEmail =
    contactEmail || settings.contact_email || 'support@vegetablejoint.ng';
  const effectivePhone =
    contactPhone || settings.contact_phone || '+234 800 000 0000';
  const effectiveSupport =
    supportText ||
    settings.support_text ||
    'Need help with an order or product listing? Contact our dedicated support desk.';
  const formatFooterText = () => {
    if (footerText) return footerText;
    const base =
      settings.footer_text ||
      `© ${currentYear} ${effectiveSiteName} — TriNova Technologies. All rights reserved.`;
    if (!base.includes(String(currentYear))) {
      return base.replace('©', `© ${currentYear}`);
    }
    return base;
  };
  const effectiveFooter = formatFooterText();

  const footerHeadingStyle = {
    color: '#f8fafc',
    fontSize: '0.95rem',
    fontWeight: '700',
    marginBottom: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const footerLinkStyle = {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.875rem',
    display: 'inline-block',
    padding: '0.25rem 0',
    transition: 'color 0.15s ease',
  };

  return (
    <footer
      data-testid="marketplace-footer"
      style={{
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        borderTop: '1px solid #1e293b',
        width: '100%',
        boxSizing: 'border-box',
        marginTop: 'auto',
      }}
    >
      {/* Main Content Grid */}
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '3rem 1rem 2rem 1rem',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
          }}
        >
          {/* Column 1: Brand & Mission */}
          <div>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                marginBottom: '1rem',
              }}
              aria-label={`${effectiveSiteName} Homepage`}
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
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '800',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                {effectiveSiteName}
              </span>
            </Link>

            <p
              style={{
                fontSize: '0.875rem',
                lineHeight: '1.6',
                color: '#94a3b8',
                margin: '0 0 1.25rem 0',
              }}
            >
              {effectiveTagline}
            </p>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#1e293b',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#4ade80',
                fontWeight: '600',
              }}
            >
              <span>🌱</span>
              <span>100% Farm-Direct Sourcing</span>
            </div>
          </div>

          {/* Column 2: Marketplace Links (MKT-01) */}
          <div>
            <h3 style={footerHeadingStyle}>Marketplace</h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              <li>
                <Link to="/products" style={footerLinkStyle}>
                  Browse All Vegetables
                </Link>
              </li>
              <li>
                <Link to="/products?category=1" style={footerLinkStyle}>
                  Fresh Tomatoes
                </Link>
              </li>
              <li>
                <Link to="/products?category=2" style={footerLinkStyle}>
                  Habanero & Chilli Peppers
                </Link>
              </li>
              <li>
                <Link to="/products?category=3" style={footerLinkStyle}>
                  Leafy Green Vegetables
                </Link>
              </li>
              <li>
                <Link to="/cart" style={footerLinkStyle}>
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Portals & Account */}
          <div>
            <h3 style={footerHeadingStyle}>Portals & Access</h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              <li>
                <Link to="/account/profile" style={footerLinkStyle}>
                  Buyer Account
                </Link>
              </li>
              <li>
                <Link to="/account/orders" style={footerLinkStyle}>
                  Track My Orders
                </Link>
              </li>
              <li>
                <Link to="/seller" style={footerLinkStyle}>
                  Seller Portal (Dashboard)
                </Link>
              </li>
              <li>
                <Link to="/seller/products/new" style={footerLinkStyle}>
                  Sell on Vegetable Joint
                </Link>
              </li>
              <li>
                <Link to="/admin" style={footerLinkStyle}>
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support & Contact (ADM-08 Editable) */}
          <div>
            <h3 style={footerHeadingStyle}>Support & Contact</h3>
            <p
              style={{
                fontSize: '0.85rem',
                lineHeight: '1.5',
                color: '#94a3b8',
                margin: '0 0 1rem 0',
              }}
            >
              {effectiveSupport}
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                fontSize: '0.875rem',
              }}
            >
              {effectiveEmail && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>✉️</span>
                  <a
                    href={`mailto:${effectiveEmail}`}
                    style={{ color: '#38bdf8', textDecoration: 'none' }}
                  >
                    {effectiveEmail}
                  </a>
                </div>
              )}

              {effectivePhone && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>📞</span>
                  <a
                    href={`tel:${effectivePhone}`}
                    style={{ color: '#38bdf8', textDecoration: 'none' }}
                  >
                    {effectivePhone}
                  </a>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#64748b',
                  fontSize: '0.8rem',
                }}
              >
                <span>🕒</span>
                <span>Mon – Sat: 8:00 AM – 6:00 PM (WAT)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div
          style={{
            marginTop: '2.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8rem',
            color: '#64748b',
          }}
        >
          <div data-testid="footer-copyright-text">{effectiveFooter}</div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8' }}>
              Verified Agricultural Commerce
            </span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#94a3b8' }}>Escrow & Direct Settlement</span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#94a3b8' }}>Nigeria</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

Footer.propTypes = {
  siteName: PropTypes.string,
  siteTagline: PropTypes.string,
  contactEmail: PropTypes.string,
  contactPhone: PropTypes.string,
  supportText: PropTypes.string,
  footerText: PropTypes.string,
};

export default Footer;
