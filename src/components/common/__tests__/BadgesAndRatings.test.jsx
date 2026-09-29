import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvailabilityBadge } from '../AvailabilityBadge';
import { RatingDisplay } from '../RatingDisplay';

describe('AvailabilityBadge and RatingDisplay (SEL-07, BR-01, REV-01)', () => {
  describe('AvailabilityBadge Component (SEL-07, BR-01)', () => {
    it('renders "In Stock" badge when status is in_stock', () => {
      render(<AvailabilityBadge status="in_stock" />);
      expect(screen.getByText('In Stock')).toBeInTheDocument();
    });

    it('renders "Low Stock" when status is low_stock or quantity <= 5', () => {
      const { rerender } = render(<AvailabilityBadge status="low_stock" />);
      expect(screen.getByText('Low Stock')).toBeInTheDocument();

      rerender(<AvailabilityBadge quantity={3} showQuantity />);
      expect(screen.getByText('Only 3 left')).toBeInTheDocument();
    });

    it('renders "Out of Stock" when quantity is 0 or status is out_of_stock, and "Unavailable" when isAvailable is false', () => {
      const { rerender } = render(<AvailabilityBadge status="out_of_stock" />);
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();

      rerender(<AvailabilityBadge quantity={0} />);
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();

      rerender(<AvailabilityBadge isAvailable={false} />);
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });
  });

  describe('RatingDisplay Component (REV-01)', () => {
    it('renders rating value with one decimal place and star', () => {
      render(<RatingDisplay rating={4.8} reviewCount={25} />);

      expect(screen.getByText('4.8')).toBeInTheDocument();
      expect(screen.getByText('(25)')).toBeInTheDocument();
    });

    it('renders "No ratings yet" when rating is null, undefined, or 0 (REV-01)', () => {
      const { rerender } = render(<RatingDisplay rating={null} />);
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();

      rerender(<RatingDisplay rating={0} />);
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();

      rerender(<RatingDisplay rating={undefined} />);
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    });
  });
});
