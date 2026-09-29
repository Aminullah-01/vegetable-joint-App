import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Pagination } from '../Pagination';
import {
  DEFAULT_ITEMS_PER_PAGE,
  getPaginationRange,
  calculatePaginationMeta,
} from '../../../utils/pagination.js';
import { usePagination } from '../../../hooks/usePagination.js';
import { queryMockProducts } from '../../../data/index.js';

// Helper component to inspect URL search params in tests
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe('Pagination Component (FE-029, MKT-03, IF-04)', () => {
  describe('Default 12 items per page acceptance criteria (MKT-03, FE-029)', () => {
    it('defaults to 12 items per page and computes pages accordingly', () => {
      // 36 items / 12 items per page = 3 pages
      render(<Pagination totalItems={36} tieToUrl={false} />);

      // Verify summary shows 1-12 of 36 items
      expect(screen.getByRole('status')).toHaveTextContent(
        /Showing\s+1\s*–\s*12\s+of\s+36\s+items/
      );

      // Verify page buttons 1, 2, 3 exist
      expect(
        screen.getByRole('button', { name: /Page 1/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Go to page 2/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Go to page 3/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Go to page 4/i })
      ).not.toBeInTheDocument();
    });

    it('verifies DEFAULT_ITEMS_PER_PAGE constant equals 12', () => {
      expect(DEFAULT_ITEMS_PER_PAGE).toBe(12);
    });

    it('uses 12 items per page for the public mock catalogue when omitted', () => {
      expect(queryMockProducts().meta.per_page).toBe(DEFAULT_ITEMS_PER_PAGE);
    });

    it('customizes itemLabel in summary', () => {
      render(
        <Pagination totalItems={24} itemLabel="vegetables" tieToUrl={false} />
      );
      expect(screen.getByText(/vegetables/i)).toBeInTheDocument();
    });
  });

  describe('Page controls tied to URL acceptance criteria (FE-029)', () => {
    it('initializes active page from URL query string ?page=2', () => {
      render(
        <MemoryRouter initialEntries={['/products?page=2']}>
          <Pagination totalItems={48} />
          <LocationDisplay />
        </MemoryRouter>
      );

      // Active button should be Page 2
      const page2Btn = screen.getByRole('button', { name: /Page 2/i });
      expect(page2Btn).toHaveAttribute('aria-current', 'page');

      // Range should be 13-24 of 48
      expect(screen.getByRole('status')).toHaveTextContent(
        /Showing\s+13\s*–\s*24\s+of\s+48\s+items/
      );
    });

    it('updates URL search parameters when a page button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/products?page=1']}>
          <Pagination totalItems={48} />
          <LocationDisplay />
        </MemoryRouter>
      );

      const page3Btn = screen.getByRole('button', { name: /Go to page 3/i });
      await user.click(page3Btn);

      expect(screen.getByTestId('location-search')).toHaveTextContent('page=3');
    });

    it('preserves existing query parameters when changing page', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter
          initialEntries={['/products?category=leafy&sort=price_asc']}
        >
          <Pagination totalItems={48} />
          <LocationDisplay />
        </MemoryRouter>
      );

      const nextBtn = screen.getByRole('button', { name: /Go to next page/i });
      await user.click(nextBtn);

      const search = screen.getByTestId('location-search').textContent;
      expect(search).toContain('category=leafy');
      expect(search).toContain('sort=price_asc');
      expect(search).toContain('page=2');
    });

    it('navigates with Next and Previous buttons through URL', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/products?page=2']}>
          <Pagination totalItems={48} />
          <LocationDisplay />
        </MemoryRouter>
      );

      // Click Previous
      const prevBtn = screen.getByRole('button', {
        name: /Go to previous page/i,
      });
      await user.click(prevBtn);
      expect(screen.getByTestId('location-search')).toHaveTextContent('page=1');

      // Click Next
      const nextBtn = screen.getByRole('button', { name: /Go to next page/i });
      await user.click(nextBtn);
      expect(screen.getByTestId('location-search')).toHaveTextContent('page=2');
    });
  });

  describe('Controlled and Standalone mode (outside Router or tieToUrl=false)', () => {
    it('calls onPageChange callback with target page', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();

      render(
        <Pagination
          totalItems={36}
          currentPage={1}
          onPageChange={onPageChange}
          tieToUrl={false}
        />
      );

      const page2Btn = screen.getByRole('button', { name: /Go to page 2/i });
      await user.click(page2Btn);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('disables Previous button on first page', () => {
      render(<Pagination totalItems={36} currentPage={1} tieToUrl={false} />);

      const prevBtn = screen.getByRole('button', {
        name: /Go to previous page/i,
      });
      expect(prevBtn).toBeDisabled();

      const nextBtn = screen.getByRole('button', { name: /Go to next page/i });
      expect(nextBtn).not.toBeDisabled();
    });

    it('disables Next button on last page', () => {
      render(<Pagination totalItems={36} currentPage={3} tieToUrl={false} />);

      const nextBtn = screen.getByRole('button', { name: /Go to next page/i });
      expect(nextBtn).toBeDisabled();

      const prevBtn = screen.getByRole('button', {
        name: /Go to previous page/i,
      });
      expect(prevBtn).not.toBeDisabled();
    });

    it('disables all buttons when disabled prop is true', () => {
      render(
        <Pagination totalItems={36} currentPage={2} disabled tieToUrl={false} />
      );

      const prevBtn = screen.getByRole('button', {
        name: /Go to previous page/i,
      });
      const nextBtn = screen.getByRole('button', { name: /Go to next page/i });
      const pageBtn = screen.getByRole('button', { name: /Go to page 1/i });

      expect(prevBtn).toBeDisabled();
      expect(nextBtn).toBeDisabled();
      expect(pageBtn).toBeDisabled();
    });
  });

  describe('Smart ellipsis and range windowing', () => {
    it('shows right ellipsis when on early page of long list', () => {
      render(<Pagination totalItems={120} currentPage={1} tieToUrl={false} />);

      expect(screen.getByText('…')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Go to page 10/i })
      ).toBeInTheDocument();
    });

    it('shows both left and right ellipsis when in the middle of long list', () => {
      render(<Pagination totalItems={120} currentPage={5} tieToUrl={false} />);

      const ellipses = screen.getAllByText('…');
      expect(ellipses).toHaveLength(2);
      expect(
        screen.getByRole('button', { name: /Page 5/i })
      ).toBeInTheDocument();
    });

    it('shows left ellipsis when near the end of long list', () => {
      render(<Pagination totalItems={120} currentPage={10} tieToUrl={false} />);

      expect(screen.getByText('…')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Go to page 1/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Page 10/i })
      ).toBeInTheDocument();
    });
  });

  describe('Per-page selector and Edge Cases', () => {
    it('supports selecting different items per page count', async () => {
      const user = userEvent.setup();
      const onPerPageChange = vi.fn();

      render(
        <Pagination
          totalItems={60}
          showItemsPerPage
          onPerPageChange={onPerPageChange}
          tieToUrl={false}
        />
      );

      const select = screen.getByLabelText(/Per page:/i);
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('12');

      await user.selectOptions(select, '24');
      expect(onPerPageChange).toHaveBeenCalledWith(24);
    });

    it('handles totalItems=0 gracefully', () => {
      render(<Pagination totalItems={0} tieToUrl={false} />);

      expect(screen.getByRole('status')).toHaveTextContent(
        'Showing 0 of 0 items'
      );
      const prevBtn = screen.getByRole('button', {
        name: /Go to previous page/i,
      });
      const nextBtn = screen.getByRole('button', { name: /Go to next page/i });
      expect(prevBtn).toBeDisabled();
      expect(nextBtn).toBeDisabled();
    });

    it('returns null when hideOnSinglePage is true and totalPages <= 1', () => {
      const { container } = render(
        <Pagination totalItems={8} hideOnSinglePage tieToUrl={false} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility & Usability (NFR-USAB-03)', () => {
    it('renders accessible navigation container with aria-label', () => {
      render(<Pagination totalItems={24} tieToUrl={false} />);
      const nav = screen.getByRole('navigation', {
        name: /Pagination Navigation/i,
      });
      expect(nav).toBeInTheDocument();
    });

    it('sets aria-current="page" on the currently active page', () => {
      render(<Pagination totalItems={36} currentPage={2} tieToUrl={false} />);
      const activeBtn = screen.getByRole('button', {
        name: /Page 2, current page/i,
      });
      expect(activeBtn).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Pagination Utilities and usePagination Hook', () => {
    it('getPaginationRange generates expected ranges', () => {
      expect(getPaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
      expect(getPaginationRange(1, 10)).toEqual([1, 2, 3, 4, 5, '...', 10]);
      expect(getPaginationRange(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10]);
      expect(getPaginationRange(10, 10)).toEqual([1, '...', 6, 7, 8, 9, 10]);
    });

    it('calculatePaginationMeta calculates metadata accurately', () => {
      const meta = calculatePaginationMeta(45, 2, 12);
      expect(meta.totalPages).toBe(4);
      expect(meta.currentPage).toBe(2);
      expect(meta.from).toBe(13);
      expect(meta.to).toBe(24);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPrevPage).toBe(true);
    });

    it('usePagination hook handles navigation actions', () => {
      const { result } = renderHook(() =>
        usePagination({ totalItems: 36, initialPage: 1, itemsPerPage: 12 })
      );

      expect(result.current.page).toBe(1);
      expect(result.current.totalPages).toBe(3);
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.hasPrevPage).toBe(false);

      act(() => {
        result.current.nextPage();
      });
      expect(result.current.page).toBe(2);
      expect(result.current.hasPrevPage).toBe(true);

      act(() => {
        result.current.setPage(3);
      });
      expect(result.current.page).toBe(3);
      expect(result.current.hasNextPage).toBe(false);

      act(() => {
        result.current.prevPage();
      });
      expect(result.current.page).toBe(2);
    });
  });
});
