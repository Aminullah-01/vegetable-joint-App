import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvailabilityBadge } from '../AvailabilityBadge';

describe('AvailabilityBadge Component (FE-027, SEL-07, BR-01)', () => {
  // ============================================================================
  // 1. Available / In Stock Tests (SEL-07)
  // ============================================================================
  describe('Available / In Stock State', () => {
    it('shows "Available" by default when stock > 0 and availability is active (SEL-07)', () => {
      render(<AvailabilityBadge quantity={20} availability={1} />);

      const badge = screen.getByTestId('availability-badge');
      expect(badge).toHaveTextContent('Available');
      expect(badge).toHaveAttribute('data-status', 'available');
      expect(badge).toHaveClass('badge-available');
    });

    it('shows "In Stock" when labelType="in_stock" or status="in_stock"', () => {
      const { rerender } = render(
        <AvailabilityBadge quantity={20} labelType="in_stock" />
      );
      expect(screen.getByText('In Stock')).toBeInTheDocument();

      rerender(<AvailabilityBadge status="in_stock" />);
      expect(screen.getByText('In Stock')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 2. Out of Stock Tests (BR-01, SEL-07)
  // ============================================================================
  describe('Out of Stock State', () => {
    it('shows "Out of Stock" automatically when stock is 0 (BR-01, SEL-07)', () => {
      render(<AvailabilityBadge quantity={0} availability={1} />);

      const badge = screen.getByTestId('availability-badge');
      expect(badge).toHaveTextContent('Out of Stock');
      expect(badge).toHaveAttribute('data-status', 'out_of_stock');
      expect(badge).toHaveClass('badge-out_of_stock');
    });

    it('shows "Out of Stock" when explicit status="out_of_stock"', () => {
      render(<AvailabilityBadge status="out_of_stock" />);

      const badge = screen.getByTestId('availability-badge');
      expect(badge).toHaveTextContent('Out of Stock');
    });
  });

  // ============================================================================
  // 3. Unavailable State (SEL-07, BR-01 manual on/off switch)
  // ============================================================================
  describe('Unavailable State (Manual Switch)', () => {
    it('shows "Unavailable" when seller manual switch is 0, even with positive stock (SEL-07)', () => {
      render(<AvailabilityBadge quantity={50} availability={0} />);

      const badge = screen.getByTestId('availability-badge');
      expect(badge).toHaveTextContent('Unavailable');
      expect(badge).toHaveAttribute('data-status', 'unavailable');
      expect(badge).toHaveClass('badge-unavailable');
    });

    it('shows "Unavailable" when availability is false or isAvailable is false', () => {
      const { rerender } = render(
        <AvailabilityBadge availability={false} quantity={10} />
      );
      expect(screen.getByText('Unavailable')).toBeInTheDocument();

      rerender(<AvailabilityBadge isAvailable={false} quantity={15} />);
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });

    it('shows "Unavailable" when explicit status="unavailable"', () => {
      render(<AvailabilityBadge status="unavailable" />);

      const badge = screen.getByTestId('availability-badge');
      expect(badge).toHaveTextContent('Unavailable');
      expect(badge).toHaveAttribute('data-status', 'unavailable');
    });
  });

  // ============================================================================
  // 4. Low Stock State
  // ============================================================================
  describe('Low Stock State', () => {
    it('shows "Low Stock" when 0 < quantity <= default threshold 5', () => {
      render(<AvailabilityBadge quantity={4} availability={1} />);

      const badge = screen.getByTestId('availability-badge');
      expect(badge).toHaveTextContent('Low Stock');
      expect(badge).toHaveAttribute('data-status', 'low_stock');
      expect(badge).toHaveClass('badge-low_stock');
    });

    it('respects custom low_stock_threshold', () => {
      render(
        <AvailabilityBadge
          quantity={8}
          lowStockThreshold={10}
          availability={1}
        />
      );

      expect(screen.getByText('Low Stock')).toBeInTheDocument();
    });

    it('shows "Only X left" when showQuantity is true', () => {
      render(<AvailabilityBadge quantity={3} availability={1} showQuantity />);

      expect(screen.getByText('Only 3 left')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 5. Product Object Integration
  // ============================================================================
  describe('Product Object Integration', () => {
    it('extracts availability and quantity from product object', () => {
      const activeProduct = {
        name: 'Fresh Tomatoes',
        quantity: 25,
        availability: 1,
      };
      const { rerender } = render(
        <AvailabilityBadge product={activeProduct} />
      );
      expect(screen.getByText('Available')).toBeInTheDocument();

      const outOfStockProduct = {
        name: 'Carrots',
        quantity: 0,
        availability: 1,
      };
      rerender(<AvailabilityBadge product={outOfStockProduct} />);
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();

      const unavailableProduct = {
        name: 'Onions',
        quantity: 100,
        availability: 0,
      };
      rerender(<AvailabilityBadge product={unavailableProduct} />);
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 6. Sizes and Visual Accessibility
  // ============================================================================
  describe('Sizes and Visual Accessibility', () => {
    it('supports sm, md, and lg sizes', () => {
      const { rerender } = render(
        <AvailabilityBadge status="available" size="sm" />
      );
      expect(screen.getByTestId('availability-badge')).toHaveClass('badge-sm');

      rerender(<AvailabilityBadge status="available" size="md" />);
      expect(screen.getByTestId('availability-badge')).toHaveClass('badge-md');

      rerender(<AvailabilityBadge status="available" size="lg" />);
      expect(screen.getByTestId('availability-badge')).toHaveClass('badge-lg');
    });
  });
});
