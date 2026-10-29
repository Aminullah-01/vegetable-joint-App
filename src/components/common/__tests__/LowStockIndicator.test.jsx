import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LowStockIndicator } from '../LowStockIndicator';
import { isLowStock, isOutOfStock, getStockStatus } from '../../../utils/stock';

/**
 * Task FE-089 / SEL-09: Low-stock indicator
 *
 * SRS References:
 * - SEL-09: The Inventory view shall flag low stock (default threshold 5 units, configurable per product). [ASSUMPTION A-09]
 * - SEL-07 / BR-01 / TC-21: Quantity 0 flags Out of Stock automatically.
 * - Figma Section 13: Seller Dashboard Low-Stock indicators and warning badges.
 *
 * Acceptance Criteria (FE-089):
 * - Highlight items at or below threshold (default 5).
 */

describe('FE-089 / SEL-09: LowStockIndicator Component & Helper Functions', () => {
  describe('1. Pure Helper Functions (isLowStock, isOutOfStock, getStockStatus)', () => {
    it('isLowStock returns true for quantity between 1 and default threshold (5)', () => {
      expect(isLowStock(1)).toBe(true);
      expect(isLowStock(3)).toBe(true);
      expect(isLowStock(5)).toBe(true);
      expect(isLowStock('4')).toBe(true);
    });

    it('isLowStock returns false for quantity > threshold, 0, or negative', () => {
      expect(isLowStock(6)).toBe(false);
      expect(isLowStock(50)).toBe(false);
      expect(isLowStock(0)).toBe(false);
      expect(isLowStock(-1)).toBe(false);
      expect(isLowStock(null)).toBe(false);
    });

    it('isLowStock respects custom per-product threshold (SEL-09)', () => {
      // Custom threshold = 10
      expect(isLowStock(10, 10)).toBe(true);
      expect(isLowStock(7, 10)).toBe(true);
      expect(isLowStock(11, 10)).toBe(false);

      // Custom threshold = 2
      expect(isLowStock(2, 2)).toBe(true);
      expect(isLowStock(3, 2)).toBe(false);
    });

    it('isOutOfStock returns true for 0 or negative numbers', () => {
      expect(isOutOfStock(0)).toBe(true);
      expect(isOutOfStock('0')).toBe(true);
      expect(isOutOfStock(-5)).toBe(true);
      expect(isOutOfStock(null)).toBe(true);
      expect(isOutOfStock(undefined)).toBe(true);
      expect(isOutOfStock(1)).toBe(false);
      expect(isOutOfStock(10)).toBe(false);
    });

    it('getStockStatus returns accurate status based on availability, quantity, and threshold', () => {
      expect(getStockStatus(10, 5, 'unavailable')).toBe('unavailable');
      expect(getStockStatus(10, 5, false)).toBe('unavailable');
      expect(getStockStatus(0, 5, 'available')).toBe('out_of_stock');
      expect(getStockStatus(4, 5, 'available')).toBe('low_stock');
      expect(getStockStatus(5, 5, 'available')).toBe('low_stock');
      expect(getStockStatus(6, 5, 'available')).toBe('in_stock');
      expect(getStockStatus(9, 10, 'available')).toBe('low_stock');
    });
  });

  describe('2. Rendering Low Stock State (SEL-09)', () => {
    it('renders a warning badge when quantity is at default threshold (5)', () => {
      render(<LowStockIndicator quantity={5} testId="indicator-threshold-5" />);

      const indicator = screen.getByTestId('indicator-threshold-5');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent(/Low \(≤ 5\)/i);
      expect(indicator).toHaveAttribute('data-status', 'low_stock');
      expect(indicator).toHaveAttribute('data-quantity', '5');
      expect(indicator).toHaveAttribute('data-threshold', '5');
      expect(indicator).toHaveAttribute('role', 'status');
    });

    it('renders a warning badge when quantity is below threshold (e.g. 2)', () => {
      render(
        <LowStockIndicator
          quantity={2}
          threshold={5}
          unit="baskets"
          testId="indicator-qty-2"
        />
      );

      const indicator = screen.getByTestId('indicator-qty-2');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent(/Low \(≤ 5\)/i);
      expect(indicator).toHaveAttribute('data-status', 'low_stock');
    });

    it('highlights low stock with custom per-product threshold (e.g. threshold 12, qty 8)', () => {
      render(
        <LowStockIndicator
          quantity={8}
          threshold={12}
          unit="kg"
          testId="indicator-custom-thresh"
        />
      );

      const indicator = screen.getByTestId('indicator-custom-thresh');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent(/Low \(≤ 12\)/i);
      expect(indicator).toHaveAttribute('data-status', 'low_stock');
    });

    it('displays custom count text when showCount=true', () => {
      render(
        <LowStockIndicator
          quantity={3}
          threshold={5}
          unit="bunches"
          showCount={true}
          testId="indicator-show-count"
        />
      );

      const indicator = screen.getByTestId('indicator-show-count');
      expect(indicator).toHaveTextContent('Only 3 bunches left');
    });

    it('displays simple "Low Stock" label when showThreshold=false and showCount=false', () => {
      render(
        <LowStockIndicator
          quantity={3}
          threshold={5}
          showThreshold={false}
          showCount={false}
          testId="indicator-simple-label"
        />
      );

      const indicator = screen.getByTestId('indicator-simple-label');
      expect(indicator).toHaveTextContent('Low Stock');
    });
  });

  describe('3. Rendering Out of Stock State (SEL-07, TC-21)', () => {
    it('renders an Out of Stock badge when quantity is 0', () => {
      render(
        <LowStockIndicator
          quantity={0}
          threshold={5}
          testId="indicator-out-of-stock"
        />
      );

      const indicator = screen.getByTestId('indicator-out-of-stock');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent(/Out of Stock/i);
      expect(indicator).toHaveAttribute('data-status', 'out_of_stock');
    });
  });

  describe('4. Normal / Healthy Stock Handling', () => {
    it('returns null and does not render when stock is above threshold and showWhenNormal is false', () => {
      const { container } = render(
        <LowStockIndicator
          quantity={25}
          threshold={5}
          testId="indicator-healthy"
        />
      );

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByTestId('indicator-healthy')).not.toBeInTheDocument();
    });

    it('renders "In Stock" badge when stock is above threshold and showWhenNormal is true', () => {
      render(
        <LowStockIndicator
          quantity={25}
          threshold={5}
          showWhenNormal={true}
          testId="indicator-in-stock"
        />
      );

      const indicator = screen.getByTestId('indicator-in-stock');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent(/In Stock/i);
      expect(indicator).toHaveAttribute('data-status', 'in_stock');
    });
  });

  describe('5. Availability Delisted State Handling', () => {
    it('returns null when product is marked unavailable and showWhenNormal is false', () => {
      const { container } = render(
        <LowStockIndicator
          quantity={2}
          threshold={5}
          availability="unavailable"
          testId="indicator-delisted"
        />
      );

      expect(container).toBeEmptyDOMElement();
      expect(
        screen.queryByTestId('indicator-delisted')
      ).not.toBeInTheDocument();
    });

    it('renders "Unavailable" when showWhenNormal is true', () => {
      render(
        <LowStockIndicator
          quantity={2}
          threshold={5}
          availability="unavailable"
          showWhenNormal={true}
          testId="indicator-delisted-shown"
        />
      );

      const indicator = screen.getByTestId('indicator-delisted-shown');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent(/Unavailable/i);
      expect(indicator).toHaveAttribute('data-status', 'unavailable');
    });
  });

  describe('6. Variants and Sizes', () => {
    it('renders text variant with warning icon and label', () => {
      render(
        <LowStockIndicator
          quantity={4}
          threshold={5}
          variant="text"
          testId="indicator-text-var"
        />
      );

      const indicator = screen.getByTestId('indicator-text-var');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent(/Low \(≤ 5\)/i);
    });

    it('renders banner variant with role="alert" and descriptive warning', () => {
      render(
        <LowStockIndicator
          quantity={3}
          threshold={5}
          unit="crates"
          variant="banner"
          testId="indicator-banner-var"
        />
      );

      const banner = screen.getByTestId('indicator-banner-var');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute('role', 'alert');
      expect(banner).toHaveTextContent(
        /Low Stock Warning: Only 3 crates left in stock/i
      );
    });

    it('renders pill variant with rounded-full styling', () => {
      render(
        <LowStockIndicator
          quantity={2}
          threshold={5}
          variant="pill"
          testId="indicator-pill-var"
        />
      );

      const pill = screen.getByTestId('indicator-pill-var');
      expect(pill).toBeInTheDocument();
      expect(pill.style.borderRadius).toBe('9999px');
    });

    it('applies custom className and style props', () => {
      render(
        <LowStockIndicator
          quantity={1}
          threshold={5}
          className="custom-stock-badge"
          style={{ marginTop: '10px' }}
          testId="indicator-custom-style"
        />
      );

      const el = screen.getByTestId('indicator-custom-style');
      expect(el).toHaveClass('custom-stock-badge');
      expect(el.style.marginTop).toBe('10px');
    });
  });
});
