import PropTypes from 'prop-types';
import { STRINGS } from '../../constants/strings.js';

const DEFAULT_BENEFITS = [
  {
    title: 'Fresh vegetable marketplace',
    description:
      'Access 100% farm-fresh vegetables harvested directly by verified local growers.',
    icon: '🌿',
  },
  {
    title: 'Multiple trusted sellers',
    description:
      'Connect with vetted, approved vegetable farmers and vendor cooperatives nationwide.',
    icon: '👨‍🌾',
  },
  {
    title: 'Easy product discovery',
    description:
      'Find exactly what you need with keyword search, variety categories, and price filters.',
    icon: '🔎',
  },
  {
    title: 'Simple ordering',
    description:
      'Intuitive cart and checkout flow with live stock indicators and no complicated procedures.',
    icon: '⚡',
  },
  {
    title: 'Transparent pricing',
    description:
      'Clear pricing in Nigerian Naira (₦) with standardized units (baskets, bunches, kg) and zero hidden fees.',
    icon: '🏷️',
  },
  {
    title: 'Convenient delivery details',
    description:
      'Coordinate direct drop-off or local hub pickup across Lagos and major Nigerian hubs.',
    icon: '📍',
  },
];

/**
 * BenefitsSection — Marketplace Value Propositions and Trust Elements
 *
 * SRS References:
 * - MKT-01: Homepage benefits and trust elements (verified sellers, fresh quality, direct farm connection).
 * - Figma Section 4: Public Homepage — Benefits Section:
 *   "Highlight: Fresh vegetable marketplace, Multiple trusted sellers, Easy product discovery,
 *    Simple ordering, Transparent pricing, Convenient delivery details."
 * - NFR-USAB-01: Responsive grid layout across mobile, tablet, and desktop viewports.
 * - NFR-USAB-02: Accessible typography, icons, and contrast.
 */
export function BenefitsSection({
  badge = STRINGS.HOME?.BENEFITS_BADGE || 'Why Vegetable Joint',
  title = STRINGS.HOME?.BENEFITS_TITLE || 'Freshness, Trust & Transparency',
  subtitle = STRINGS.HOME?.BENEFITS_SUBTITLE ||
    'Experience a modernized vegetable marketplace designed for Nigerian buyers and farmers.',
  items = STRINGS.HOME?.BENEFITS_ITEMS || DEFAULT_BENEFITS,
  className = '',
  style = {},
}) {
  return (
    <section
      className={`benefits-section ${className}`.trim()}
      aria-labelledby="benefits-heading"
      data-testid="benefits-section"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        width: '100%',
        boxSizing: 'border-box',
        padding: '2.5rem 2rem',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        ...style,
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '0.5rem',
        }}
      >
        {badge && (
          <div
            className="benefits-badge"
            data-testid="benefits-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#15803d',
              backgroundColor: '#dcfce7',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              width: 'fit-content',
            }}
          >
            <span role="img" aria-hidden="true">
              🛡️
            </span>
            <span>{badge}</span>
          </div>
        )}

        <h2
          id="benefits-heading"
          data-testid="benefits-heading"
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.025em',
          }}
        >
          {title}
        </h2>

        {subtitle && (
          <p
            data-testid="benefits-subtitle"
            style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: 0,
              maxWidth: '640px',
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Benefits 6-Item Grid */}
      <div
        className="benefits-grid"
        data-testid="benefits-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {items.map((benefit, index) => (
          <div
            key={index}
            className="benefit-card"
            data-testid={`benefit-card-${index}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              padding: '1.5rem',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #f1f5f9',
              boxSizing: 'border-box',
            }}
          >
            <div
              className="benefit-icon-wrapper"
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                flexShrink: 0,
                borderRadius: '10px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                fontSize: '1.5rem',
              }}
            >
              <span role="img" aria-hidden="true">
                {benefit.icon || '🌱'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                  lineHeight: 1.35,
                }}
              >
                {benefit.title}
              </h3>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {benefit.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

BenefitsSection.propTypes = {
  badge: PropTypes.string,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      icon: PropTypes.string,
    })
  ),
  className: PropTypes.string,
  style: PropTypes.object,
};

export default BenefitsSection;
