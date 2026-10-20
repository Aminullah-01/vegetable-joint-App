import PropTypes from 'prop-types';

/**
 * CheckoutStepper — Visual Progress Indicator for Checkout Journey
 *
 * SRS References:
 * - CHK-10: Cart → Delivery details → Review → Confirmation in no more than four steps.
 * - Figma Section 10: "Design checkout as: 1. Cart, 2. Delivery Details, 3. Review, 4. Confirmation. Use a visible progress indicator."
 * - NFR-USAB-02: WCAG 2.1 AA compliant progress element.
 */
export function CheckoutStepper({ currentStep = 2 }) {
  const steps = [
    { step: 1, label: 'Cart', path: '/cart' },
    { step: 2, label: 'Delivery Details', path: '/checkout' },
    { step: 3, label: 'Review & Confirm', path: null },
    { step: 4, label: 'Confirmation', path: null },
  ];

  return (
    <nav
      aria-label="Checkout Progress"
      data-testid="checkout-stepper"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'auto',
      }}
    >
      {steps.map((s, idx) => {
        const isCompleted = s.step < currentStep;
        const isCurrent = s.step === currentStep;

        return (
          <div
            key={s.step}
            data-testid={`checkout-step-${s.step}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: s.step > currentStep ? 0.6 : 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
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
                  border: isCurrent ? '2px solid #15803d' : '1px solid #cbd5e1',
                }}
              >
                {isCompleted ? '✓' : s.step}
              </span>

              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent
                    ? '#15803d'
                    : isCompleted
                      ? '#0f172a'
                      : '#64748b',
                  whiteSpace: 'nowrap',
                }}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {s.label}
              </span>
            </div>

            {idx < steps.length - 1 && (
              <span
                style={{
                  color: '#cbd5e1',
                  margin: '0 0.25rem',
                  fontSize: '0.9rem',
                }}
                aria-hidden="true"
              >
                →
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

CheckoutStepper.propTypes = {
  currentStep: PropTypes.oneOf([1, 2, 3, 4]),
};

export default CheckoutStepper;
