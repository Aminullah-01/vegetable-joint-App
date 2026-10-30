import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCATIONS,
  AVAILABILITY_OPTIONS,
  PRICE_PRESETS,
  extractFiltersFromParams,
  countActiveFilters,
  resolveCategoryIcon,
} from '../filters.js';
import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  isValidSortOption,
  getSortOptionLabel,
  normalizeSortOption,
} from '../sorting.js';
import {
  DEFAULT_ITEMS_PER_PAGE,
  MAX_ITEMS_PER_PAGE,
  DEFAULT_PER_PAGE_OPTIONS,
  getPaginationRange,
  calculatePaginationMeta,
} from '../pagination.js';

describe('Filters, Sorting & Pagination Utilities (SRCH-02, SRCH-04, SRCH-05, MKT-03, IF-04)', () => {
  describe('Filters Utilities (SRCH-02, SRCH-03, SRCH-08)', () => {
    it('defines standard locations, availability options, and price presets', () => {
      expect(DEFAULT_LOCATIONS).toContain('Lagos');
      expect(DEFAULT_LOCATIONS).toContain('Plateau');
      expect(AVAILABILITY_OPTIONS.length).toBeGreaterThanOrEqual(4);
      expect(PRICE_PRESETS.length).toBe(3);
    });

    it('extracts filters from URLSearchParams instance', () => {
      const searchParams = new URLSearchParams(
        'category=tomato&min_price=1000&max_price=5000&availability=in_stock&seller=2&location=Plateau'
      );
      const filters = extractFiltersFromParams(searchParams);

      expect(filters).toEqual({
        category: 'tomato',
        min_price: '1000',
        max_price: '5000',
        availability: 'in_stock',
        seller: '2',
        location: 'Plateau',
      });
    });

    it('extracts filters from plain object and supports camelCase aliases', () => {
      const obj = {
        category: 'pepper',
        minPrice: '500',
        maxPrice: '3000',
        availability: 'low_stock',
        seller: '3',
        location: 'Gombe',
      };
      const filters = extractFiltersFromParams(obj);

      expect(filters).toEqual({
        category: 'pepper',
        min_price: '500',
        max_price: '3000',
        availability: 'low_stock',
        seller: '3',
        location: 'Gombe',
      });
    });

    it('handles null, undefined, or empty params safely in extractFiltersFromParams', () => {
      const empty = extractFiltersFromParams(null);
      expect(empty).toEqual({
        category: '',
        min_price: '',
        max_price: '',
        availability: '',
        seller: '',
        location: '',
      });
    });

    it('counts active filters accurately, excluding "all" or empty fields', () => {
      expect(countActiveFilters(null)).toBe(0);
      expect(countActiveFilters({})).toBe(0);

      expect(
        countActiveFilters({
          category: 'all',
          min_price: '',
          max_price: '',
          availability: 'all',
          seller: 'all',
          location: 'all',
        })
      ).toBe(0);

      expect(
        countActiveFilters({
          category: 'tomato',
          min_price: '1000',
          max_price: '4000',
          availability: 'in_stock',
          seller: '2',
          location: 'Plateau',
        })
      ).toBe(6);

      // Using camelCase
      expect(
        countActiveFilters({
          minPrice: '500',
          maxPrice: '2000',
        })
      ).toBe(2);
    });

    it('resolves category icons accurately for string slugs, names, and category objects', () => {
      expect(resolveCategoryIcon(null)).toBe('🥬');
      expect(resolveCategoryIcon('')).toBe('🥬');

      // String slugs
      expect(resolveCategoryIcon('tomato')).toBe('🍅');
      expect(resolveCategoryIcon('pepper')).toBe('🌶️');
      expect(resolveCategoryIcon('onion')).toBe('🧅');
      expect(resolveCategoryIcon('carrot')).toBe('🥕');
      expect(resolveCategoryIcon('spinach')).toBe('🥗');
      expect(resolveCategoryIcon('cucumber')).toBe('🥒');
      expect(resolveCategoryIcon('potato')).toBe('🥔');
      expect(resolveCategoryIcon('other-vegetables')).toBe('🥦');
      expect(resolveCategoryIcon('unknown_veg')).toBe('🥬');

      // Objects with direct icon property
      expect(resolveCategoryIcon({ name: 'Special Squash', icon: '🎃' })).toBe(
        '🎃'
      );

      // Objects with slug or name
      expect(
        resolveCategoryIcon({ slug: 'tomato', name: 'Fresh Tomato' })
      ).toBe('🍅');
      expect(resolveCategoryIcon({ slug: 'custom', name: 'Carrot' })).toBe(
        '🥕'
      );
    });
  });

  describe('Sorting Utilities (SRCH-04, SRCH-05, FE-035)', () => {
    it('defines default sort and supported options', () => {
      expect(DEFAULT_SORT).toBe('newest');
      expect(SORT_OPTIONS).toHaveLength(5);
      const values = SORT_OPTIONS.map((o) => o.value);
      expect(values).toEqual([
        'newest',
        'price_asc',
        'price_desc',
        'popularity',
        'rating',
      ]);
    });

    it('validates sort options correctly with isValidSortOption', () => {
      expect(isValidSortOption('newest')).toBe(true);
      expect(isValidSortOption('price_asc')).toBe(true);
      expect(isValidSortOption('price_desc')).toBe(true);
      expect(isValidSortOption('popularity')).toBe(true);
      expect(isValidSortOption('rating')).toBe(true);

      expect(isValidSortOption('invalid_sort')).toBe(false);
      expect(isValidSortOption('')).toBe(false);
      expect(isValidSortOption(null)).toBe(false);
      expect(isValidSortOption(undefined)).toBe(false);
    });

    it('returns human-readable labels with getSortOptionLabel', () => {
      expect(getSortOptionLabel('newest')).toBe('Newest First');
      expect(getSortOptionLabel('price_asc')).toBe('Price: Low to High');
      expect(getSortOptionLabel('price_desc')).toBe('Price: High to Low');
      expect(getSortOptionLabel('popularity')).toBe('Popularity');
      expect(getSortOptionLabel('rating')).toBe('Highest Rated');
      expect(getSortOptionLabel('unrecognized')).toBe('Newest First');
    });

    it('normalizes sort option falling back to default newest', () => {
      expect(normalizeSortOption('price_asc')).toBe('price_asc');
      expect(normalizeSortOption('invalid')).toBe('newest');
      expect(normalizeSortOption(null)).toBe('newest');
    });
  });

  describe('Pagination Utilities (MKT-03, IF-04, FE-029)', () => {
    it('defines pagination constants', () => {
      expect(DEFAULT_ITEMS_PER_PAGE).toBe(12);
      expect(MAX_ITEMS_PER_PAGE).toBe(50);
      expect(DEFAULT_PER_PAGE_OPTIONS).toEqual([12, 24, 36, 48]);
    });

    describe('getPaginationRange', () => {
      it('returns all page numbers when totalPages is small (<= totalSlots)', () => {
        expect(getPaginationRange(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
        expect(getPaginationRange(3, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      });

      it('shows only right ellipsis when currentPage is near start', () => {
        const range = getPaginationRange(1, 10, 1);
        expect(range).toEqual([1, 2, 3, 4, 5, '...', 10]);
      });

      it('shows only left ellipsis when currentPage is near end', () => {
        const range = getPaginationRange(10, 10, 1);
        expect(range).toEqual([1, '...', 6, 7, 8, 9, 10]);
      });

      it('shows both left and right ellipsis when currentPage is in the middle', () => {
        const range = getPaginationRange(5, 10, 1);
        expect(range).toEqual([1, '...', 4, 5, 6, '...', 10]);
      });

      it('safely handles zero, negative, or invalid page inputs', () => {
        expect(getPaginationRange(0, 0, 1)).toEqual([1]);
        expect(getPaginationRange(-5, -10, 1)).toEqual([1]);
      });
    });

    describe('calculatePaginationMeta', () => {
      it('calculates metadata for empty result set', () => {
        const meta = calculatePaginationMeta(0, 1, 12);
        expect(meta).toEqual({
          currentPage: 1,
          perPage: 12,
          totalItems: 0,
          totalPages: 1,
          from: 0,
          to: 0,
          hasNextPage: false,
          hasPrevPage: false,
        });
      });

      it('calculates metadata for populated first page', () => {
        const meta = calculatePaginationMeta(50, 1, 12);
        expect(meta).toEqual({
          currentPage: 1,
          perPage: 12,
          totalItems: 50,
          totalPages: 5,
          from: 1,
          to: 12,
          hasNextPage: true,
          hasPrevPage: false,
        });
      });

      it('calculates metadata for middle page', () => {
        const meta = calculatePaginationMeta(50, 3, 12);
        expect(meta).toEqual({
          currentPage: 3,
          perPage: 12,
          totalItems: 50,
          totalPages: 5,
          from: 25,
          to: 36,
          hasNextPage: true,
          hasPrevPage: true,
        });
      });

      it('calculates metadata for final page', () => {
        const meta = calculatePaginationMeta(50, 5, 12);
        expect(meta).toEqual({
          currentPage: 5,
          perPage: 12,
          totalItems: 50,
          totalPages: 5,
          from: 49,
          to: 50,
          hasNextPage: false,
          hasPrevPage: true,
        });
      });

      it('clamps page index between 1 and totalPages', () => {
        const highPage = calculatePaginationMeta(24, 10, 12);
        expect(highPage.currentPage).toBe(2);

        const lowPage = calculatePaginationMeta(24, -2, 12);
        expect(lowPage.currentPage).toBe(1);
      });

      it('caps perPage at MAX_ITEMS_PER_PAGE (50)', () => {
        const meta = calculatePaginationMeta(100, 1, 200);
        expect(meta.perPage).toBe(50);
      });
    });
  });
});
