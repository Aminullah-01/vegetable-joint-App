import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SortDropdown } from '../SortDropdown';
import {
  SORT_OPTIONS,
  DEFAULT_SORT,
  isValidSortOption,
  getSortOptionLabel,
  normalizeSortOption,
} from '../../../utils/sorting';

// Helper component to inspect URL search params in tests
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe('SortDropdown Component (FE-035, SRCH-04, SRCH-05)', () => {
  describe('Acceptance Criteria: Sort Options (SRCH-04, SRCH-05, FE-035)', () => {
    it('renders all 5 required sort options by default', () => {
      render(<SortDropdown tieToUrl={false} />);

      const select = screen.getByRole('combobox', { name: /Sort by:/i });
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('newest');

      // Price low->high, high->low, newest (SRCH-04)
      expect(
        screen.getByRole('option', { name: 'Price: Low to High' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Price: High to Low' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Newest First' })
      ).toBeInTheDocument();

      // Popularity and rating when available (SRCH-05)
      expect(
        screen.getByRole('option', { name: 'Popularity' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Highest Rated' })
      ).toBeInTheDocument();
    });

    it('verifies DEFAULT_SORT constant is newest', () => {
      expect(DEFAULT_SORT).toBe('newest');
      expect(SORT_OPTIONS).toHaveLength(5);
    });

    it('conditionally excludes popularity or rating when flags are false', () => {
      render(
        <SortDropdown
          includePopularity={false}
          includeRating={false}
          tieToUrl={false}
        />
      );

      expect(
        screen.queryByRole('option', { name: 'Popularity' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('option', { name: 'Highest Rated' })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Price: Low to High' })
      ).toBeInTheDocument();
    });
  });

  describe('URL Synchronization (SRCH-06, FE-035)', () => {
    it('initializes selected option from URL query string ?sort=price_asc', () => {
      render(
        <MemoryRouter initialEntries={['/products?sort=price_asc']}>
          <SortDropdown />
          <LocationDisplay />
        </MemoryRouter>
      );

      const select = screen.getByRole('combobox', { name: /Sort by:/i });
      expect(select).toHaveValue('price_asc');
    });

    it('updates URL search parameters when a new sort is chosen', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/products?sort=newest']}>
          <SortDropdown />
          <LocationDisplay />
        </MemoryRouter>
      );

      const select = screen.getByRole('combobox', { name: /Sort by:/i });
      await user.selectOptions(select, 'price_desc');

      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'sort=price_desc'
      );
    });

    it('resets page parameter when sort changes so user starts on page 1', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/products?sort=newest&page=4']}>
          <SortDropdown />
          <LocationDisplay />
        </MemoryRouter>
      );

      const select = screen.getByRole('combobox', { name: /Sort by:/i });
      await user.selectOptions(select, 'rating');

      const search = screen.getByTestId('location-search').textContent;
      expect(search).toContain('sort=rating');
      expect(search).not.toContain('page=4');
    });

    it('preserves other search and filter parameters when sorting', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter
          initialEntries={[
            '/products?search=tomato&category=leafy&min_price=1000',
          ]}
        >
          <SortDropdown />
          <LocationDisplay />
        </MemoryRouter>
      );

      const select = screen.getByRole('combobox', { name: /Sort by:/i });
      await user.selectOptions(select, 'popularity');

      const search = screen.getByTestId('location-search').textContent;
      expect(search).toContain('search=tomato');
      expect(search).toContain('category=leafy');
      expect(search).toContain('min_price=1000');
      expect(search).toContain('sort=popularity');
    });
  });

  describe('Controlled and Standalone Mode (outside Router or tieToUrl=false)', () => {
    it('calls onSortChange callback with chosen value', async () => {
      const user = userEvent.setup();
      const onSortChange = vi.fn();

      render(
        <SortDropdown
          value="newest"
          onSortChange={onSortChange}
          tieToUrl={false}
        />
      );

      const select = screen.getByRole('combobox', { name: /Sort by:/i });
      await user.selectOptions(select, 'price_asc');

      expect(onSortChange).toHaveBeenCalledWith('price_asc');
    });

    it('disables dropdown when disabled prop is true', () => {
      render(<SortDropdown disabled tieToUrl={false} />);
      const select = screen.getByRole('combobox', { name: /Sort by:/i });
      expect(select).toBeDisabled();
    });

    it('supports hidden label with aria-label fallback', () => {
      render(<SortDropdown showLabel={false} tieToUrl={false} />);
      expect(screen.queryByText('Sort by:')).not.toBeInTheDocument();
      expect(
        screen.getByRole('combobox', { name: /Sort products by/i })
      ).toBeInTheDocument();
    });
  });

  describe('Sorting Helper Utilities', () => {
    it('isValidSortOption identifies valid and invalid options', () => {
      expect(isValidSortOption('newest')).toBe(true);
      expect(isValidSortOption('price_asc')).toBe(true);
      expect(isValidSortOption('price_desc')).toBe(true);
      expect(isValidSortOption('popularity')).toBe(true);
      expect(isValidSortOption('rating')).toBe(true);
      expect(isValidSortOption('unknown')).toBe(false);
      expect(isValidSortOption(null)).toBe(false);
    });

    it('getSortOptionLabel returns human-readable label', () => {
      expect(getSortOptionLabel('price_asc')).toBe('Price: Low to High');
      expect(getSortOptionLabel('popularity')).toBe('Popularity');
      expect(getSortOptionLabel('invalid')).toBe('Newest First');
    });

    it('normalizeSortOption falls back to default on invalid option', () => {
      expect(normalizeSortOption('rating')).toBe('rating');
      expect(normalizeSortOption('invalid')).toBe('newest');
      expect(normalizeSortOption('')).toBe('newest');
    });
  });
});
