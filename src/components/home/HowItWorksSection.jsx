import PropTypes from 'prop-types';
import { STRINGS } from '../../constants/strings.js';

const DEFAULT_STEPS = [
  {
    number: 1,
    title: 'Discover',
    description:
      'Browse farm-fresh vegetables, categories, and verified local sellers across Nigeria.',
    icon: '🔍',
  },
  {
    number: 2,
    title: 'Compare',
    description:
      'Compare transparent prices in Naira (₦), quantities, seller ratings, and harvest locations.',
    icon: '⚖️',
  },
  {
    number: 3,
    title: 'Order',
    description:
      'Add fresh produce to your cart and place your order with verified contact & delivery details.',
    icon: '🛒',
  },
  {
    number: 4,
    title: 'Receive',
    description:
      'Coordinate delivery or pickup directly with the seller and inspect fresh produce on arrival.',
    icon: '🚚',
  },
];

/**
 * HowItWorksSection — Visual 4-Step Explanation of Vegetable Joint
 *
 * SRS References:
 * - MKT-01: Homepage section explaining "How Vegetable Joint works".
 * - Figma Section 4: Public Homepage — How Vegetable Joint Works:
 *   "Create a four-step visual explanation: 1. Discover, 2. Compare, 3. Order, 4. Receive."
 * - NFR-USAB-01: Responsive grid layout across mobile, tablet, and desktop viewports.
 * - NFR-USAB-02: Clear typography, color contrast, and semantic hierarchy.
 */
export function HowItWorksSection({
  badge = STRINGS.HOME?.HOW_IT_WORKS_BADGE || 'Simple 4-Step Process',
  title = STRINGS.HOME?.HOW_IT_WORKS_TITLE || 'How Vegetable Joint Works',
  subtitle = STRINGS.HOME?.HOW_IT_WORKS_SUBTITLE ||
    'Buy fresh vegetables directly from local farmers and vendors in four simple steps.',
  steps = STRINGS.HOME?.HOW_IT_WORKS_STEPS || DEFAULT_STEPS,
  className = '',
  style = {},
}) {
  return (
    <section
      className={`how-it-works-section ${className}`.trim()}
      aria-labelledby="how-it-works-heading"
      data-testid="how-it-works-section"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        width: '100%',
        boxSizing: 'border-box',
        padding: '2.5rem 2rem',
        backgroundColor: '#f8fafc',
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
            className="how-it-works-badge"
            data-testid="how-it-works-badge"
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
              ✨
            </span>
            <span>{badge}</span>
          </div>
        )}

        <h2
          id="how-it-works-heading"
          data-testid="how-it-works-heading"
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
            data-testid="how-it-works-subtitle"
            style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: 0,
              maxWidth: '620px',
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* 4-Step Cards Grid */}
      <ol
        className="how-it-works-grid"
        data-testid="how-it-works-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {steps.map((step, index) => {
          const stepNumber = step.number ?? index + 1;
          return (
            <li
              key={stepNumber}
              className="how-it-works-step"
              data-testid={`how-it-works-step-${stepNumber}`}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '1.75rem 1.25rem',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                boxSizing: 'border-box',
              }}
            >
              {/* Step Number Indicator */}
              <div
                className="how-it-works-number"
                aria-hidden="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                }}
              >
                {stepNumber}
              </div>

              {/* Step Illustration Icon */}
              <span
                className="how-it-works-icon"
                role="img"
                aria-hidden="true"
                style={{
                  fontSize: '2.5rem',
                  marginBottom: '0.75rem',
                  lineHeight: 1,
                }}
              >
                {step.icon || '🌱'}
              </span>

              {/* Step Title */}
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 0.5rem 0',
                }}
              >
                {step.title}
              </h3>

              {/* Step Description */}
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

HowItWorksSection.propTypes = {
  badge: PropTypes.string,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      number: PropTypes.number,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      icon: PropTypes.string,
    })
  ),
  className: PropTypes.string,
  style: PropTypes.object,
};

export default HowItWorksSection;
