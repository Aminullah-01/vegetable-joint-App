import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { STRINGS } from '../../constants/strings.js';
import { ROUTES } from '../../routes/routeConfig.js';

/**
 * CtaSection — Homepage Bottom Call-to-Action Banner
 *
 * SRS References:
 * - MKT-01: Homepage call-to-action section.
 * - Figma Section 4: Public Homepage — CTA:
 *   "Ready to find fresh vegetables? Button: Start Shopping, Secondary CTA: Sell on Vegetable Joint."
 * - NFR-USAB-02: Accessible text contrast and clear hierarchy.
 * - NFR-USAB-03: Minimum touch target size ≥ 44×44px.
 */
export function CtaSection({
  title = STRINGS.HOME?.CTA_TITLE || 'Ready to find fresh vegetables?',
  subtitle = STRINGS.HOME?.CTA_SUBTITLE ||
    'Join thousands of happy consumers and businesses sourcing high quality vegetables directly from Nigerian farms.',
  primaryText = STRINGS.HOME?.CTA_PRIMARY || 'Start Shopping',
  primaryTo = ROUTES.PRODUCTS || '/products',
  secondaryText = STRINGS.HOME?.CTA_SECONDARY || 'Sell on Vegetable Joint',
  secondaryTo = ROUTES.REGISTER || '/register',
  className = '',
  style = {},
}) {
  return (
    <section
      className={`home-cta-section ${className}`.trim()}
      aria-labelledby="cta-heading"
      data-testid="cta-section"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '3.5rem 2rem',
        borderRadius: '16px',
        background:
          'linear-gradient(135deg, #14532d 0%, #15803d 50%, #166534 100%)',
        color: '#ffffff',
        boxShadow:
          '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        width: '100%',
        ...style,
      }}
    >
      {/* Decorative Badge */}
      <div
        data-testid="cta-badge"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          padding: '0.4rem 1rem',
          borderRadius: '9999px',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
      >
        <span role="img" aria-label="Farm fresh">
          🌽 🥕 🍅
        </span>
        <span>Farm-to-Doorstep Marketplace</span>
      </div>

      {/* Main Headline (Figma Section 4) */}
      <h2
        id="cta-heading"
        data-testid="cta-heading"
        style={{
          fontSize: '2.25rem',
          fontWeight: 800,
          lineHeight: 1.25,
          color: '#ffffff',
          margin: '0 auto 1rem auto',
          maxWidth: '700px',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p
          data-testid="cta-subtitle"
          style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.9)',
            margin: '0 auto 2rem auto',
            maxWidth: '620px',
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}

      {/* Action Buttons */}
      <div
        data-testid="cta-actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {primaryText && primaryTo && (
          <Link
            to={primaryTo}
            data-testid="cta-primary-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              color: '#15803d',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '0.75rem 1.75rem',
              borderRadius: '8px',
              textDecoration: 'none',
              minHeight: '48px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
          >
            {primaryText}
          </Link>
        )}

        {secondaryText && secondaryTo && (
          <Link
            to={secondaryTo}
            data-testid="cta-secondary-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1rem',
              padding: '0.75rem 1.75rem',
              borderRadius: '8px',
              textDecoration: 'none',
              minHeight: '48px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              transition: 'background-color 0.15s ease',
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'rgba(255, 255, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'rgba(255, 255, 255, 0.15)';
            }}
          >
            {secondaryText}
          </Link>
        )}
      </div>

      {/* Trust Elements Subline */}
      <div
        data-testid="cta-trust-elements"
        style={{
          marginTop: '2rem',
          fontSize: '0.85rem',
          color: 'rgba(255, 255, 255, 0.75)',
          display: 'flex',
          gap: '1.25rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <span>🌾 100% Direct Farm Produce</span>
        <span>🛡️ Verified Local Sellers</span>
        <span>₦ Transparent Pricing in Naira</span>
      </div>
    </section>
  );
}

CtaSection.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  primaryText: PropTypes.string,
  primaryTo: PropTypes.string,
  secondaryText: PropTypes.string,
  secondaryTo: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default CtaSection;
