import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { SearchBar } from '../common/SearchBar';
import { Button } from '../common/Button';
import { STRINGS } from '../../constants';
import { ROUTES } from '../../routes/routeConfig';

/**
 * HeroSection — Primary Agricultural Hero Banner with Search
 *
 * SRS References:
 * - MKT-01: Homepage hero section with product search, CTAs, and value propositions.
 * - SRCH-01: Product search integration linking to filtered marketplace catalogue.
 * - NFR-USAB-02: Clear visual hierarchy, accessible contrast, and screen reader labels.
 * - NFR-USAB-03: Touch targets stay ≥ 44×44px.
 * - Figma UI Section 4: "Fresh Vegetables. Trusted Sellers. Simple Shopping."
 */
export function HeroSection({
  headline = STRINGS.HOME.HERO_HEADLINE,
  subheading = STRINGS.HOME.HERO_TITLE,
  subtitle = STRINGS.HOME.HERO_SUBTITLE,
  searchPlaceholder = STRINGS.HOME.SEARCH_PLACEHOLDER,
  quickTags = STRINGS.HOME.QUICK_TAGS,
  onSearch,
  showTrustBadges = true,
  className = '',
  style = {},
}) {
  return (
    <section
      className={`hero-section ${className}`.trim()}
      style={{
        position: 'relative',
        background:
          'linear-gradient(135deg, #14532d 0%, #15803d 50%, #166534 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '3.5rem 2rem 2.5rem 2rem',
        textAlign: 'center',
        boxShadow:
          '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
      aria-label="Fresh vegetables marketplace hero"
      data-testid="hero-section"
    >
      {/* Decorative Produce Icon Cluster */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          padding: '0.4rem 1rem',
          borderRadius: '9999px',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
        data-testid="hero-badge"
      >
        <span role="img" aria-label="Produce">
          🥦 🥕 🍅
        </span>
        <span>{subheading}</span>
      </div>

      {/* Main Hero Headline (Figma Section 4) */}
      <h1
        style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          lineHeight: 1.2,
          margin: '0 auto 1rem auto',
          maxWidth: '820px',
          letterSpacing: '-0.025em',
        }}
        data-testid="hero-headline"
      >
        {headline}
      </h1>

      {/* Supporting Narrative */}
      <p
        style={{
          fontSize: '1.125rem',
          lineHeight: 1.6,
          color: 'rgba(255, 255, 255, 0.92)',
          maxWidth: '680px',
          margin: '0 auto 2rem auto',
        }}
        data-testid="hero-subtitle"
      >
        {subtitle}
      </p>

      {/* Central Search Box (FE-033, SRCH-01, MKT-01) */}
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <SearchBar
          size="lg"
          placeholder={searchPlaceholder}
          ariaLabel="Search marketplace vegetables, categories, or sellers"
          submitText="Search"
          submitLabel="Search"
          onSearch={onSearch}
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 12px 25px -4px rgba(0, 0, 0, 0.25)',
          }}
        />

        {/* Quick Search Chips / Tags */}
        {quickTags && quickTags.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginTop: '1rem',
            }}
            data-testid="hero-quick-tags"
          >
            <span
              style={{
                fontSize: '0.8125rem',
                color: 'rgba(255, 255, 255, 0.85)',
                fontWeight: 600,
              }}
            >
              {STRINGS.HOME.POPULAR_SEARCHES}
            </span>
            {quickTags.map((tag) => (
              <Link
                key={tag}
                to={`${ROUTES.PRODUCTS}?search=${encodeURIComponent(tag)}`}
                className="hero-quick-tag"
                aria-label={`Search for ${tag}`}
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Primary & Secondary Call-to-Action Buttons (MKT-01) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginTop: '2rem',
        }}
        data-testid="hero-actions"
      >
        <Button
          to={ROUTES.PRODUCTS}
          variant="primary"
          size="lg"
          style={{
            backgroundColor: '#ffffff',
            color: '#15803d',
            fontWeight: 700,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: 'none',
            minHeight: '48px',
            padding: '0 1.75rem',
          }}
        >
          {STRINGS.HOME.SHOP_VEGETABLES} 🥦
        </Button>

        <Button
          to="/register?role=seller"
          variant="outline"
          size="lg"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.5)',
            color: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            fontWeight: 600,
            minHeight: '48px',
            padding: '0 1.75rem',
          }}
        >
          {STRINGS.HOME.START_SELLING} 🧑‍🌾
        </Button>
      </div>

      {/* Trust Highlights & Value Propositions (MKT-01) */}
      {showTrustBadges && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '2.5rem',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          }}
          data-testid="hero-trust-badges"
        >
          {[
            {
              icon: '🌿',
              title: STRINGS.HOME.BENEFIT_FRESH,
              desc: 'Harvested directly from local growers',
            },
            {
              icon: '👨‍🌾',
              title: STRINGS.HOME.BENEFIT_VERIFIED,
              desc: 'Vetted farmers and authentic traders',
            },
            {
              icon: '💰',
              title: STRINGS.HOME.BENEFIT_PRICING,
              desc: 'Fair prices in Nigerian Naira (₦)',
            },
            {
              icon: '🤝',
              title: STRINGS.HOME.BENEFIT_PAYMENT,
              desc: 'Inspect produce before payment',
            },
          ].map((item) => (
            <div key={item.title} className="hero-trust-badge">
              <span
                style={{ fontSize: '1.75rem', lineHeight: 1 }}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.125rem',
                }}
              >
                <strong
                  style={{
                    fontSize: '0.875rem',
                    color: '#ffffff',
                    fontWeight: 700,
                  }}
                >
                  {item.title}
                </strong>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: 1.3,
                  }}
                >
                  {item.desc}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

HeroSection.propTypes = {
  headline: PropTypes.string,
  subheading: PropTypes.string,
  subtitle: PropTypes.string,
  searchPlaceholder: PropTypes.string,
  quickTags: PropTypes.arrayOf(PropTypes.string),
  onSearch: PropTypes.func,
  showTrustBadges: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default HeroSection;
