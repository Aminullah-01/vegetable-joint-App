import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentMethodDisplay } from '../PaymentMethodDisplay';
import { PAYMENT_METHOD_INFO } from '../../../constants';

describe('PaymentMethodDisplay Component (FE-073 / CHK-09, A-07, OI-01)', () => {
  describe('1. Card Variant (Default Checkout Page View)', () => {
    it('renders the payment method card with title and Pay on Delivery badge', () => {
      render(<PaymentMethodDisplay variant="card" />);

      const display = screen.getByTestId('checkout-payment-method-display');
      expect(display).toBeInTheDocument();
      expect(display).toHaveAttribute('data-variant', 'card');

      // Heading and badge
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        /Payment Method/i
      );
      expect(screen.getByTestId('payment-method-badge')).toHaveTextContent(
        /Pay on Delivery/i
      );
    });

    it('displays the required "Pay on delivery / pay seller directly" title (CHK-09)', () => {
      render(<PaymentMethodDisplay variant="card" />);

      const title = screen.getByTestId('payment-method-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent(
        /Pay on delivery \/ pay seller directly/i
      );
    });

    it('renders the checked read-only radio button for pay_on_delivery', () => {
      render(<PaymentMethodDisplay variant="card" />);

      const radio = screen.getByTestId('payment-method-radio');
      expect(radio).toBeInTheDocument();
      expect(radio).toBeChecked();
      expect(radio).toHaveAttribute('value', 'pay_on_delivery');
      expect(radio).toHaveAttribute('aria-checked', 'true');
    });

    it('highlights both Cash on Delivery and Mobile/Bank Transfer accepted options', () => {
      render(<PaymentMethodDisplay variant="card" />);

      expect(screen.getByText(/Cash on Delivery/i)).toBeInTheDocument();
      expect(screen.getByText(/Mobile \/ Bank Transfer/i)).toBeInTheDocument();
    });

    it('clearly communicates that NO online payment is processed in Release 1.0 (A-07, OI-01, Figma)', () => {
      render(<PaymentMethodDisplay variant="card" />);

      const disclosure = screen.getByTestId(
        'payment-method-no-online-disclosure'
      );
      expect(disclosure).toBeInTheDocument();
      expect(disclosure).toHaveTextContent(/No Online Payment in Release 1.0/i);
      expect(disclosure).toHaveTextContent(
        /does not process online payments or charge debit cards/i
      );
    });
  });

  describe('2. Inline and Compact Variants', () => {
    it('renders the inline variant with label and explanation', () => {
      render(<PaymentMethodDisplay variant="inline" />);

      const display = screen.getByTestId('checkout-payment-method-display');
      expect(display).toHaveAttribute('data-variant', 'inline');

      const label = screen.getByTestId('payment-method-label');
      expect(label).toHaveTextContent(
        /Pay on delivery \/ pay seller directly/i
      );

      const notice = screen.getByTestId('payment-method-notice');
      expect(notice).toHaveTextContent(/Online payment is not processed/i);
    });

    it('renders the compact variant with smaller styling', () => {
      render(<PaymentMethodDisplay variant="compact" />);

      const display = screen.getByTestId('checkout-payment-method-display');
      expect(display).toHaveAttribute('data-variant', 'compact');
      expect(display).toHaveTextContent(/Pay on delivery/i);
    });

    it('hides the notice when showNotice={false}', () => {
      render(<PaymentMethodDisplay variant="inline" showNotice={false} />);

      expect(
        screen.queryByTestId('payment-method-notice')
      ).not.toBeInTheDocument();
    });
  });

  describe('3. PAYMENT_METHOD_INFO Constant', () => {
    it('exposes the canonical payment method metadata for Release 1.0', () => {
      expect(PAYMENT_METHOD_INFO.id).toBe('pay_on_delivery');
      expect(PAYMENT_METHOD_INFO.label).toBe(
        'Pay on delivery / pay seller directly'
      );
      expect(PAYMENT_METHOD_INFO.acceptedModes).toContain('Cash on delivery');
      expect(PAYMENT_METHOD_INFO.disclaimer).toMatch(
        /Online payment is not processed/i
      );
    });
  });
});
