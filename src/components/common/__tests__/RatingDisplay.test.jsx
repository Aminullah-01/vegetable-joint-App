import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RatingDisplay } from '../RatingDisplay';
import { formatRating } from '../../../utils/formatters.js';

describe('RatingDisplay Component (FE-028, REV-01)', () => {
  describe('Acceptance Criteria: Shows 0–5 value with one decimal (REV-01)', () => {
    it('formats integer rating with one decimal place', () => {
      render(<RatingDisplay rating={4} />);
      expect(screen.getByText('4.0')).toBeInTheDocument();
    });

    it('formats float rating with one decimal place', () => {
      render(<RatingDisplay rating={4.8} />);
      expect(screen.getByText('4.8')).toBeInTheDocument();
    });

    it('formats maximum rating 5 as 5.0', () => {
      render(<RatingDisplay rating={5} />);
      expect(screen.getByText('5.0')).toBeInTheDocument();
    });

    it('formats string rating into one decimal place', () => {
      render(<RatingDisplay rating="3.5" />);
      expect(screen.getByText('3.5')).toBeInTheDocument();
    });

    it('clamps values greater than 5 to 5.0', () => {
      render(<RatingDisplay rating={5.8} />);
      expect(screen.getByText('5.0')).toBeInTheDocument();
    });
  });

  describe('Acceptance Criteria: Shows "No ratings yet" when unrated (REV-01)', () => {
    it('displays "No ratings yet" when rating is null', () => {
      render(<RatingDisplay rating={null} />);
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    });

    it('displays "No ratings yet" when rating is undefined', () => {
      render(<RatingDisplay rating={undefined} />);
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    });

    it('displays "No ratings yet" when rating is 0', () => {
      render(<RatingDisplay rating={0} />);
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    });

    it('displays "No ratings yet" when rating is negative', () => {
      render(<RatingDisplay rating={-1.5} />);
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    });

    it('displays "No ratings yet" when rating is an empty string or non-numeric', () => {
      const { rerender } = render(<RatingDisplay rating="" />);
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();

      rerender(<RatingDisplay rating="invalid" />);
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    });
  });

  describe('Rating count and review count display', () => {
    it('renders rating count with parentheses by default', () => {
      render(<RatingDisplay rating={4.5} ratingCount={18} />);
      expect(screen.getByText('(18)')).toBeInTheDocument();
    });

    it('supports reviewCount prop interchangeably', () => {
      render(<RatingDisplay rating={4.2} reviewCount={42} />);
      expect(screen.getByText('(42)')).toBeInTheDocument();
    });

    it('hides count when showCount is false', () => {
      render(<RatingDisplay rating={4.8} reviewCount={25} showCount={false} />);
      expect(screen.queryByText('(25)')).not.toBeInTheDocument();
    });

    it('renders zero count when explicitly passed with positive rating', () => {
      render(<RatingDisplay rating={4.0} ratingCount={0} />);
      expect(screen.getByText('(0)')).toBeInTheDocument();
    });
  });

  describe('Display Variants (compact vs full 5-star display)', () => {
    it('renders single star in compact mode by default', () => {
      const { container } = render(<RatingDisplay rating={4.5} />);
      const stars = container.querySelectorAll('[data-testid^="star-"]');
      expect(stars).toHaveLength(1);
      expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('renders 5 visual stars in variant="stars" mode with full, half, and empty stars', () => {
      const { container } = render(
        <RatingDisplay rating={3.5} variant="stars" reviewCount={12} />
      );
      const allStars = container.querySelectorAll('[data-testid^="star-"]');
      expect(allStars).toHaveLength(5);

      const fullStars = container.querySelectorAll('[data-testid="star-full"]');
      const halfStars = container.querySelectorAll('[data-testid="star-half"]');
      const emptyStars = container.querySelectorAll(
        '[data-testid="star-empty"]'
      );

      expect(fullStars).toHaveLength(3);
      expect(halfStars).toHaveLength(1);
      expect(emptyStars).toHaveLength(1);

      expect(screen.getByText('3.5')).toBeInTheDocument();
      expect(screen.getByText('/ 5.0')).toBeInTheDocument();
      expect(screen.getByText('(12 reviews)')).toBeInTheDocument();
    });

    it('renders singular "1 review" in full stars mode when count is 1', () => {
      render(<RatingDisplay rating={5.0} variant="stars" reviewCount={1} />);
      expect(screen.getByText('(1 review)')).toBeInTheDocument();
    });

    it('renders 5 empty stars in full mode when unrated', () => {
      const { container } = render(
        <RatingDisplay rating={null} variant="stars" />
      );
      const emptyStars = container.querySelectorAll(
        '[data-testid="star-empty"]'
      );
      expect(emptyStars).toHaveLength(5);
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    });
  });

  describe('Accessibility & Screen Reader attributes', () => {
    it('sets informative aria-label on rated status container', () => {
      render(<RatingDisplay rating={4.8} reviewCount={25} />);
      const element = screen.getByRole('status');
      expect(element).toHaveAttribute(
        'aria-label',
        'Rating: 4.8 out of 5 stars based on 25 reviews'
      );
    });

    it('sets aria-label="No ratings yet" on empty status container', () => {
      render(<RatingDisplay rating={null} />);
      const element = screen.getByRole('status');
      expect(element).toHaveAttribute('aria-label', 'No ratings yet');
    });

    it('hides stars from screen readers via aria-hidden="true"', () => {
      const { container } = render(
        <RatingDisplay rating={4.5} variant="stars" />
      );
      const stars = container.querySelectorAll('[aria-hidden="true"]');
      expect(stars.length).toBeGreaterThan(0);
    });
  });

  describe('Sizing and styling props', () => {
    it('applies custom className and style', () => {
      const { container } = render(
        <RatingDisplay
          rating={4.2}
          className="custom-rating-class"
          style={{ marginTop: '10px' }}
        />
      );
      const element = container.querySelector('.custom-rating-class');
      expect(element).toBeInTheDocument();
      expect(element).toHaveStyle({ marginTop: '10px' });
    });

    it('renders across size variations (sm, md, lg)', () => {
      const { container, rerender } = render(
        <RatingDisplay rating={4.0} size="sm" />
      );
      expect(container.firstChild).toBeInTheDocument();

      rerender(<RatingDisplay rating={4.0} size="md" />);
      expect(container.firstChild).toBeInTheDocument();

      rerender(<RatingDisplay rating={4.0} size="lg" />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('formatRating utility function (REV-01)', () => {
    it('formats numbers to one decimal place string', () => {
      expect(formatRating(4.8)).toBe('4.8');
      expect(formatRating(5)).toBe('5.0');
      expect(formatRating(3)).toBe('3.0');
      expect(formatRating('4.2')).toBe('4.2');
    });

    it('clamps values above 5.0 to 5.0', () => {
      expect(formatRating(5.5)).toBe('5.0');
      expect(formatRating(10)).toBe('5.0');
    });

    it('returns "No ratings yet" for unrated or zero/negative inputs', () => {
      expect(formatRating(null)).toBe('No ratings yet');
      expect(formatRating(undefined)).toBe('No ratings yet');
      expect(formatRating(0)).toBe('No ratings yet');
      expect(formatRating(-1)).toBe('No ratings yet');
      expect(formatRating('')).toBe('No ratings yet');
      expect(formatRating('abc')).toBe('No ratings yet');
    });
  });
});
