import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { CHECKOUT_STEPS } from '../../constants';

/**
 * Screen-reader hidden text helper style (WCAG 2.1 AA accessible).
 */
const srOnlyStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * CheckoutStepper — Visual 4-Step Progress Indicator for Checkout Flow
 *
 * SRS References:
 * - CHK-10: Cart → Delivery details → Review → Confirmation in no more than four steps.
 * - Figma Section 10: Visible progress indicator across checkout journey.
 * - NFR-USAB-02: WCAG 2.1 AA accessibility (semantic nav, ol, aria-current, text contrast).
 * - NFR-USAB-03: Minimum touch targets of 44x44px for interactive links.
 *
 * @param {Object} props
 * @param {1|2|3|4} [props.currentStep=2] - Active step index (1-based, 1 to 4).
 * @param {boolean} [props.clickable=true] - Whether previously completed steps can be clicked to navigate back.
 * @param {Function} [props.onStepClick] - Optional callback triggered when a completed step is clicked: (stepNumber) => void.
 * @param {boolean} [props.compact=false] - More compact spacing for modals/small containers.
 * @param {string} [props.className=''] - Additional CSS classes.
 * @param {Object} [props.style={}] - Inline style overrides.
 */
export function CheckoutStepper({
  currentStep = 2,
  clickable = true,
  onStepClick,
  compact = false,
  className = '',
  style = {},
}) {
  const normalizedStep = Math.max(1, Math.min(4, Number(currentStep) || 1));

  return (
    <nav
      aria-label="Checkout Progress"
      data-testid="checkout-stepper"
      className={`checkout-stepper ${className}`.trim()}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        borderRadius: compact ? '8px' : '10px',
        border: '1px solid #e2e8f0',
        padding: compact ? '0.5rem 0.75rem' : '0.75rem 1rem',
        boxShadow: compact ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        ...style,
      }}
    >
      <ol
        data-testid="checkout-stepper-list"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          gap: compact ? '0.25rem' : '0.5rem',
          minWidth: 'max-content',
        }}
      >
        {CHECKOUT_STEPS.map((s, idx) => {
          const isCompleted = s.step < normalizedStep;
          const isCurrent = s.step === normalizedStep;
          const isUpcoming = s.step > normalizedStep;
          const isInteractive = isCompleted && clickable;

          const stepStatusLabel = isCompleted
            ? 'Completed'
            : isCurrent
              ? 'Current Step'
              : 'Upcoming';

          // Inner badge and text content
          const stepContent = (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: compact ? '0.35rem' : '0.45rem',
                minHeight: compact ? '32px' : '44px',
                padding: compact ? '0.15rem 0.35rem' : '0.25rem 0.5rem',
                borderRadius: '6px',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              {/* Step circle badge */}
              <span
                data-testid={`checkout-step-badge-${s.step}`}
                style={{
                  width: compact ? '22px' : '26px',
                  height: compact ? '22px' : '26px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: compact ? '0.7rem' : '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  backgroundColor: isCompleted
                    ? '#15803d'
                    : isCurrent
                      ? '#dcfce7'
                      : '#f1f5f9',
                  color: isCompleted
                    ? '#ffffff'
                    : isCurrent
                      ? '#15803d'
                      : '#64748b',
                  border: isCurrent
                    ? '2px solid #15803d'
                    : isCompleted
                      ? '1px solid #15803d'
                      : '1px solid #cbd5e1',
                  boxShadow: isCurrent
                    ? '0 0 0 3px rgba(21, 128, 61, 0.15)'
                    : 'none',
                }}
              >
                {isCompleted ? '✓' : s.step}
              </span>

              {/* Step label text */}
              <span
                data-testid={`checkout-step-label-${s.step}`}
                style={{
                  fontSize: compact ? '0.75rem' : '0.825rem',
                  fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
                  color: isCurrent
                    ? '#15803d'
                    : isCompleted
                      ? '#0f172a'
                      : '#64748b',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </span>

              {/* Accessible screen-reader descriptor */}
              <span style={srOnlyStyle}>
                Step {s.step} of 4: {s.label} ({stepStatusLabel})
              </span>
            </div>
          );

          return (
            <li
              key={s.step}
              data-testid={`checkout-step-${s.step}`}
              data-step={s.step}
              data-status={
                isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming'
              }
              aria-current={isCurrent ? 'step' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                opacity: isUpcoming ? 0.6 : 1,
              }}
            >
              {isInteractive ? (
                onStepClick ? (
                  <button
                    type="button"
                    onClick={() => onStepClick(s.step)}
                    data-testid={`checkout-step-btn-${s.step}`}
                    aria-label={`Go to Step ${s.step}: ${s.label}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      cursor: 'pointer',
                      font: 'inherit',
                      color: 'inherit',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: '6px',
                    }}
                  >
                    {stepContent}
                  </button>
                ) : s.path ? (
                  <Link
                    to={s.path}
                    data-testid={`checkout-step-link-${s.step}`}
                    aria-label={`Go back to Step ${s.step}: ${s.label}`}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: '6px',
                    }}
                  >
                    {stepContent}
                  </Link>
                ) : (
                  stepContent
                )
              ) : (
                stepContent
              )}

              {/* Arrow connector between steps (CHK-10: Cart → Delivery → Review → Confirmation) */}
              {idx < CHECKOUT_STEPS.length - 1 && (
                <span
                  data-testid={`checkout-step-connector-${s.step}`}
                  aria-hidden="true"
                  style={{
                    color: isCompleted ? '#15803d' : '#cbd5e1',
                    margin: compact ? '0 0.2rem' : '0 0.35rem',
                    fontSize: compact ? '0.75rem' : '0.9rem',
                    fontWeight: 600,
                    userSelect: 'none',
                  }}
                >
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

CheckoutStepper.propTypes = {
  currentStep: PropTypes.oneOfType([
    PropTypes.oneOf([1, 2, 3, 4]),
    PropTypes.number,
  ]),
  clickable: PropTypes.bool,
  onStepClick: PropTypes.func,
  compact: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default CheckoutStepper;
