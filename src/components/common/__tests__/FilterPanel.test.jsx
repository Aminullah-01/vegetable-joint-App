import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { FilterPanel } from '../FilterPanel';
import {
  extractFiltersFromParams,
  countActiveFilters,
} from '../../../utils/filters';

// Helper component to inspect URL search params in tests
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

const mockCustomCategories = [
  { id: 1, name: 'Leafy Vegetables', slug: 'leafy' },
  { id: 2, name: 'Root Vegetables', slug: 'root' },
];

const mockCustomSellers = [
  { id: 10, business_name: 'Kaduna Greens', location: 'Kaduna' },
  { id: 20, business_name: 'Jos Farm Hub', location: 'Plateau' },
];

const mockCustomLocations = ['Kaduna', 'Kano', 'Plateau'];

describe('FilterPanel Component (FE-034, SRCH-02, SRCH-03)', () => {
  describe('Acceptance Criteria: All 5 Filter Dimensions Present (SRCH-02, SRCH-03, FE-034)', () => {
    it('renders Category, Price Range, Availability, Seller, and Location filters', () => {
      render(
        <FilterPanel
          categories={mockCustomCategories}
          sellers={mockCustomSellers}
          locations={mockCustomLocations}
          tieToUrl={false}
        />
      );

      // 1. Category (SRCH-02)
      expect(
        screen.getByRole('combobox', { name: /^Category$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'All Categories' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Leafy Vegetables' })
      ).toBeInTheDocument();

      // 2. Price Range (SRCH-02)
      expect(screen.getByLabelText(/^Min Price$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Max Price$/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Apply price filter/i })
      ).toBeInTheDocument();

      // 3. Availability (SRCH-02)
      expect(
        screen.getByRole('combobox', { name: /^Availability$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'All Statuses' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'In Stock Only' })
      ).toBeInTheDocument();

      // 4. Seller (SRCH-03)
      expect(
        screen.getByRole('combobox', { name: /^Seller$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'All Sellers' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Kaduna Greens' })
      ).toBeInTheDocument();

      // 5. Location (SRCH-03)
      expect(
        screen.getByRole('combobox', { name: /^Location$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'All Locations' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Kaduna' })
      ).toBeInTheDocument();
    });
  });

  describe('Page Controls & URL Synchronization (SRCH-06, FE-034)', () => {
    it('initializes filter inputs from URL search parameters', () => {
      render(
        <MemoryRouter
          initialEntries={[
            '/products?category=leafy&min_price=1000&max_price=5000&availability=in_stock&seller=10&location=Kaduna',
          ]}
        >
          <FilterPanel
            categories={mockCustomCategories}
            sellers={mockCustomSellers}
            locations={mockCustomLocations}
          />
        </MemoryRouter>
      );

      expect(screen.getByRole('combobox', { name: /^Category$/i })).toHaveValue(
        'leafy'
      );
      expect(screen.getByLabelText(/^Min Price$/i)).toHaveValue(1000);
      expect(screen.getByLabelText(/^Max Price$/i)).toHaveValue(5000);
      expect(
        screen.getByRole('combobox', { name: /^Availability$/i })
      ).toHaveValue('in_stock');
      expect(screen.getByRole('combobox', { name: /^Seller$/i })).toHaveValue(
        '10'
      );
      expect(screen.getByRole('combobox', { name: /^Location$/i })).toHaveValue(
        'Kaduna'
      );
    });

    it('updates URL when category is changed and resets page', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/products?page=3']}>
          <FilterPanel categories={mockCustomCategories} />
          <LocationDisplay />
        </MemoryRouter>
      );

      const categorySelect = screen.getByRole('combobox', {
        name: /^Category$/i,
      });
      await user.selectOptions(categorySelect, 'leafy');

      const search = screen.getByTestId('location-search').textContent;
      expect(search).toContain('category=leafy');
      expect(search).not.toContain('page=3');
    });

    it('updates URL when price range is submitted', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/products']}>
          <FilterPanel />
          <LocationDisplay />
        </MemoryRouter>
      );

      const minInput = screen.getByLabelText(/^Min Price$/i);
      const maxInput = screen.getByLabelText(/^Max Price$/i);
      const applyBtn = screen.getByRole('button', {
        name: /Apply price filter/i,
      });

      await user.type(minInput, '1500');
      await user.type(maxInput, '4500');
      await user.click(applyBtn);

      const search = screen.getByTestId('location-search').textContent;
      expect(search).toContain('min_price=1500');
      expect(search).toContain('max_price=4500');
    });

    it('updates URL when a quick price preset button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/products']}>
          <FilterPanel />
          <LocationDisplay />
        </MemoryRouter>
      );

      const presetBtn = screen.getByRole('button', { name: /Under ₦2,000/i });
      await user.click(presetBtn);

      const search = screen.getByTestId('location-search').textContent;
      expect(search).toContain('max_price=2000');
    });

    it('updates URL when availability is selected', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/products']}>
          <FilterPanel />
          <LocationDisplay />
        </MemoryRouter>
      );

      const availSelect = screen.getByRole('combobox', {
        name: /^Availability$/i,
      });
      await user.selectOptions(availSelect, 'in_stock');

      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'availability=in_stock'
      );
    });

    it('updates URL when seller is selected', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/products']}>
          <FilterPanel sellers={mockCustomSellers} />
          <LocationDisplay />
        </MemoryRouter>
      );

      const sellerSelect = screen.getByRole('combobox', { name: /^Seller$/i });
      await user.selectOptions(sellerSelect, '10');

      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'seller=10'
      );
    });

    it('updates URL when location is selected', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/products']}>
          <FilterPanel locations={mockCustomLocations} />
          <LocationDisplay />
        </MemoryRouter>
      );

      const locationSelect = screen.getByRole('combobox', {
        name: /^Location$/i,
      });
      await user.selectOptions(locationSelect, 'Kaduna');

      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'location=Kaduna'
      );
    });

    it('preserves unrelated search query and sort parameters', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter
          initialEntries={['/products?search=tomato&sort=price_asc']}
        >
          <FilterPanel locations={mockCustomLocations} />
          <LocationDisplay />
        </MemoryRouter>
      );

      const locationSelect = screen.getByRole('combobox', {
        name: /^Location$/i,
      });
      await user.selectOptions(locationSelect, 'Plateau');

      const search = screen.getByTestId('location-search').textContent;
      expect(search).toContain('search=tomato');
      expect(search).toContain('sort=price_asc');
      expect(search).toContain('location=Plateau');
    });
  });

  describe('Clear All Filters Action (SRCH-08)', () => {
    it('disables Clear All button when no filters are active', () => {
      render(<FilterPanel tieToUrl={false} />);
      const clearBtn = screen.getByRole('button', { name: /Clear All/i });
      expect(clearBtn).toBeDisabled();
    });

    it('clears all active filters when Clear All is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter
          initialEntries={[
            '/products?category=leafy&min_price=1000&location=Kano',
          ]}
        >
          <FilterPanel
            categories={mockCustomCategories}
            locations={mockCustomLocations}
          />
          <LocationDisplay />
        </MemoryRouter>
      );

      const clearBtn = screen.getByRole('button', { name: /Clear All/i });
      expect(clearBtn).not.toBeDisabled();

      await user.click(clearBtn);

      const search = screen.getByTestId('location-search').textContent;
      expect(search).not.toContain('category=');
      expect(search).not.toContain('min_price=');
      expect(search).not.toContain('location=');
    });
  });

  describe('Active Filter Chips (SRCH-06, Figma prompt)', () => {
    it('displays active filter chips with remove button', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter
          initialEntries={['/products?category=leafy&location=Kaduna']}
        >
          <FilterPanel
            categories={mockCustomCategories}
            locations={mockCustomLocations}
          />
          <LocationDisplay />
        </MemoryRouter>
      );

      expect(
        screen.getByText(/Category: Leafy Vegetables/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Location: Kaduna/i)).toBeInTheDocument();

      const removeCategoryBtn = screen.getByRole('button', {
        name: /Remove category filter: Leafy Vegetables/i,
      });
      await user.click(removeCategoryBtn);

      const search = screen.getByTestId('location-search').textContent;
      expect(search).not.toContain('category=');
      expect(search).toContain('location=Kaduna');
    });
  });

  describe('Collapsible on Mobile (FE-034, Figma prompt)', () => {
    it('renders mobile toggle button with active count badge', () => {
      render(
        <FilterPanel
          filters={{ category: 'leafy', location: 'Kano' }}
          tieToUrl={false}
          collapsibleOnMobile
        />
      );

      const toggleBtn = screen.getByRole('button', {
        name: /Filters \(2 active\)/i,
      });
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens mobile drawer when toggle button is clicked', async () => {
      const user = userEvent.setup();
      render(<FilterPanel tieToUrl={false} collapsibleOnMobile />);

      const toggleBtn = screen.getByRole('button', { name: /Filters/i });
      await user.click(toggleBtn);

      const drawer = screen.getByRole('dialog', { name: /Product Filters/i });
      expect(drawer).toBeInTheDocument();
      expect(drawer).toHaveAttribute('aria-modal', 'true');
    });

    it('closes mobile drawer when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<FilterPanel tieToUrl={false} collapsibleOnMobile />);

      const toggleBtn = screen.getByRole('button', { name: /Filters/i });
      await user.click(toggleBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes mobile drawer when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<FilterPanel tieToUrl={false} collapsibleOnMobile />);

      await user.click(screen.getByRole('button', { name: /Filters/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const closeBtn = screen.getByRole('button', { name: /Close Filters/i });
      await user.click(closeBtn);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Controlled / Standalone Mode (outside Router or tieToUrl=false)', () => {
    it('calls onFilterChange callback when a filter is modified', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();

      render(
        <FilterPanel
          filters={{
            category: '',
            min_price: '',
            max_price: '',
            availability: '',
            seller: '',
            location: '',
          }}
          onFilterChange={onFilterChange}
          categories={mockCustomCategories}
          tieToUrl={false}
        />
      );

      const categorySelect = screen.getByRole('combobox', {
        name: /^Category$/i,
      });
      await user.selectOptions(categorySelect, 'leafy');

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'leafy' })
      );
    });

    it('calls onClearFilters when Clear All is clicked', async () => {
      const user = userEvent.setup();
      const onClearFilters = vi.fn();

      render(
        <FilterPanel
          filters={{ category: 'leafy', min_price: '1000' }}
          onClearFilters={onClearFilters}
          tieToUrl={false}
        />
      );

      const clearBtn = screen.getByRole('button', { name: /Clear All/i });
      await user.click(clearBtn);

      expect(onClearFilters).toHaveBeenCalled();
    });
  });

  describe('Filter Helper Utilities', () => {
    it('extractFiltersFromParams normalizes params object and URLSearchParams', () => {
      const params = new URLSearchParams(
        'category=tomato&min_price=500&availability=in_stock'
      );
      const extracted = extractFiltersFromParams(params);
      expect(extracted.category).toBe('tomato');
      expect(extracted.min_price).toBe('500');
      expect(extracted.availability).toBe('in_stock');
      expect(extracted.seller).toBe('');
    });

    it('countActiveFilters accurately tallies non-empty non-all criteria', () => {
      expect(countActiveFilters(null)).toBe(0);
      expect(countActiveFilters({})).toBe(0);
      expect(
        countActiveFilters({
          category: 'tomato',
          min_price: '1000',
          max_price: '5000',
          availability: 'all', // all should not count
        })
      ).toBe(3);
    });
  });
});
