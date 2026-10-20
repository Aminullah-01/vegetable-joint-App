import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { CheckoutStepper } from '../CheckoutStepper';
import { CHECKOUT_STEPS } from '../../../constants';

function renderWithRouter(ui, initialRoute = '/checkout') {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/cart" element={<div>Cart Destination</div>} />
          <Route path="/checkout" element={children} />
          <Route
            path="/checkout/confirmation/:ref"
            element={<div>Confirmation Destination</div>}
          />
        </Routes>
      </MemoryRouter>
    );
  }

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return render(ui, { wrapper: Wrapper });
}

describe('CheckoutStepper Component (FE-072 / CHK-10, Figma Section 10)', () => {
  describe('1. Four Canonical Steps Structure (CHK-10)', () => {
    it('defines exactly four steps in sequence: Cart → Delivery details → Review → Confirmation', () => {
      // CHK-10: in no more than four steps
      expect(CHECKOUT_STEPS).toHaveLength(4);
      expect(CHECKOUT_STEPS.map((s) => s.step)).toEqual([1, 2, 3, 4]);

      expect(CHECKOUT_STEPS[0].label).toBe('Cart');
      expect(CHECKOUT_STEPS[1].label).toBe('Delivery Details');
      expect(CHECKOUT_STEPS[2].label).toMatch(/Review/i);
      expect(CHECKOUT_STEPS[3].label).toBe('Confirmation');
    });

    it('renders all four steps and connectors inside a semantic nav list', () => {
      renderWithRouter(<CheckoutStepper currentStep={2} />);

      const nav = screen.getByTestId('checkout-stepper');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Checkout Progress');

      const list = screen.getByTestId('checkout-stepper-list');
      expect(list.tagName).toBe('OL');

      // Verify 4 steps rendered
      for (let step = 1; step <= 4; step++) {
        expect(screen.getByTestId(`checkout-step-${step}`)).toBeInTheDocument();
      }

      // Verify exactly 3 connectors between 4 steps
      expect(screen.getByTestId('checkout-step-connector-1')).toHaveTextContent(
        '→'
      );
      expect(screen.getByTestId('checkout-step-connector-2')).toHaveTextContent(
        '→'
      );
      expect(screen.getByTestId('checkout-step-connector-3')).toHaveTextContent(
        '→'
      );
      expect(
        screen.queryByTestId('checkout-step-connector-4')
      ).not.toBeInTheDocument();
    });
  });

  describe('2. Active Step Highlighting and ARIA Current (NFR-USAB-02)', () => {
    it('sets aria-current="step" on Step 1 when currentStep=1', () => {
      renderWithRouter(<CheckoutStepper currentStep={1} />);

      const step1 = screen.getByTestId('checkout-step-1');
      expect(step1).toHaveAttribute('aria-current', 'step');
      expect(step1).toHaveAttribute('data-status', 'current');
      expect(screen.getByTestId('checkout-step-badge-1')).toHaveTextContent(
        '1'
      );

      // Steps 2, 3, 4 are upcoming
      expect(screen.getByTestId('checkout-step-2')).toHaveAttribute(
        'data-status',
        'upcoming'
      );
      expect(screen.getByTestId('checkout-step-3')).toHaveAttribute(
        'data-status',
        'upcoming'
      );
      expect(screen.getByTestId('checkout-step-4')).toHaveAttribute(
        'data-status',
        'upcoming'
      );
    });

    it('sets Step 1 as completed with checkmark and Step 2 as current when currentStep=2', () => {
      renderWithRouter(<CheckoutStepper currentStep={2} />);

      const step1 = screen.getByTestId('checkout-step-1');
      expect(step1).toHaveAttribute('data-status', 'completed');
      expect(screen.getByTestId('checkout-step-badge-1')).toHaveTextContent(
        '✓'
      );

      const step2 = screen.getByTestId('checkout-step-2');
      expect(step2).toHaveAttribute('aria-current', 'step');
      expect(step2).toHaveAttribute('data-status', 'current');
      expect(screen.getByTestId('checkout-step-badge-2')).toHaveTextContent(
        '2'
      );

      expect(screen.getByTestId('checkout-step-3')).toHaveAttribute(
        'data-status',
        'upcoming'
      );
      expect(screen.getByTestId('checkout-step-4')).toHaveAttribute(
        'data-status',
        'upcoming'
      );
    });

    it('sets Steps 1 and 2 as completed and Step 3 as current when currentStep=3', () => {
      renderWithRouter(<CheckoutStepper currentStep={3} />);

      expect(screen.getByTestId('checkout-step-1')).toHaveAttribute(
        'data-status',
        'completed'
      );
      expect(screen.getByTestId('checkout-step-badge-1')).toHaveTextContent(
        '✓'
      );

      expect(screen.getByTestId('checkout-step-2')).toHaveAttribute(
        'data-status',
        'completed'
      );
      expect(screen.getByTestId('checkout-step-badge-2')).toHaveTextContent(
        '✓'
      );

      const step3 = screen.getByTestId('checkout-step-3');
      expect(step3).toHaveAttribute('aria-current', 'step');
      expect(step3).toHaveAttribute('data-status', 'current');
      expect(screen.getByTestId('checkout-step-badge-3')).toHaveTextContent(
        '3'
      );

      expect(screen.getByTestId('checkout-step-4')).toHaveAttribute(
        'data-status',
        'upcoming'
      );
    });

    it('sets Steps 1, 2, and 3 as completed and Step 4 as current when currentStep=4', () => {
      renderWithRouter(<CheckoutStepper currentStep={4} />);

      expect(screen.getByTestId('checkout-step-1')).toHaveAttribute(
        'data-status',
        'completed'
      );
      expect(screen.getByTestId('checkout-step-2')).toHaveAttribute(
        'data-status',
        'completed'
      );
      expect(screen.getByTestId('checkout-step-3')).toHaveAttribute(
        'data-status',
        'completed'
      );

      const step4 = screen.getByTestId('checkout-step-4');
      expect(step4).toHaveAttribute('aria-current', 'step');
      expect(step4).toHaveAttribute('data-status', 'current');
      expect(screen.getByTestId('checkout-step-badge-4')).toHaveTextContent(
        '4'
      );
    });

    it('clamps currentStep between 1 and 4 safely for out-of-range inputs', () => {
      // Negative / zero clamps to 1
      const { unmount } = renderWithRouter(<CheckoutStepper currentStep={0} />);
      expect(screen.getByTestId('checkout-step-1')).toHaveAttribute(
        'aria-current',
        'step'
      );
      unmount();

      // Greater than 4 clamps to 4
      renderWithRouter(<CheckoutStepper currentStep={99} />);
      expect(screen.getByTestId('checkout-step-4')).toHaveAttribute(
        'aria-current',
        'step'
      );
    });
  });

  describe('3. Step Navigation & Interactive Links (Figma: Checkout Navigation)', () => {
    it('renders completed Step 1 as a link to /cart when on Step 2', async () => {
      const user = userEvent.setup();
      renderWithRouter(<CheckoutStepper currentStep={2} clickable={true} />);

      const cartLink = screen.getByTestId('checkout-step-link-1');
      expect(cartLink).toBeInTheDocument();
      expect(cartLink).toHaveAttribute('href', '/cart');

      await user.click(cartLink);
      expect(screen.getByText('Cart Destination')).toBeInTheDocument();
    });

    it('does not render upcoming steps as clickable links', () => {
      renderWithRouter(<CheckoutStepper currentStep={2} clickable={true} />);

      expect(
        screen.queryByTestId('checkout-step-link-3')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('checkout-step-link-4')
      ).not.toBeInTheDocument();
    });

    it('triggers onStepClick callback when provided for completed steps', async () => {
      const user = userEvent.setup();
      const onStepClickSpy = vi.fn();

      renderWithRouter(
        <CheckoutStepper
          currentStep={3}
          clickable={true}
          onStepClick={onStepClickSpy}
        />
      );

      const step1Btn = screen.getByTestId('checkout-step-btn-1');
      await user.click(step1Btn);
      expect(onStepClickSpy).toHaveBeenCalledWith(1);

      const step2Btn = screen.getByTestId('checkout-step-btn-2');
      await user.click(step2Btn);
      expect(onStepClickSpy).toHaveBeenCalledWith(2);
    });

    it('does not render links or buttons when clickable={false}', () => {
      renderWithRouter(<CheckoutStepper currentStep={3} clickable={false} />);

      expect(
        screen.queryByTestId('checkout-step-link-1')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('checkout-step-btn-1')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('checkout-step-link-2')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('checkout-step-btn-2')
      ).not.toBeInTheDocument();
    });
  });

  describe('4. Accessibility and Compact Variant (NFR-USAB-02, NFR-USAB-03)', () => {
    it('provides accessible screen-reader descriptions for all steps', () => {
      renderWithRouter(<CheckoutStepper currentStep={2} />);

      expect(
        screen.getByText('Step 1 of 4: Cart (Completed)')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Step 2 of 4: Delivery Details (Current Step)')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Step 3 of 4: Review & Confirm (Upcoming)')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Step 4 of 4: Confirmation (Upcoming)')
      ).toBeInTheDocument();
    });

    it('renders with compact styling when compact={true}', () => {
      renderWithRouter(<CheckoutStepper currentStep={3} compact={true} />);

      const stepper = screen.getByTestId('checkout-stepper');
      expect(stepper).toBeInTheDocument();
      // Compact badge dimensions check
      const badge = screen.getByTestId('checkout-step-badge-1');
      expect(badge).toHaveStyle({ width: '22px', height: '22px' });
    });
  });
});
