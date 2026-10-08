import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Products } from '../Products';
import {
  productService,
  categoryService,
  sellerService,
} from '../../../services';
import { CartProvider, ToastProvider } from '../../../context';

// Inspector helper to inspect active URL query string
function UrlInspector() {
  const location = useLocation();
  return (
    <div data-testid="url-inspector">{location.pathname + location.search}</div>
  );
}

const mockCategories = [
  { id: 1, name: 'Tomato', slug: 'tomato', is_active: true },
  { id: 2, name: 'Pepper', slug: 'pepper', is_active: true },
  { id: 3, name: 'Onion', slug: 'onion', is_active: true },
];

const mockSellers = [
  {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    location: 'Gombe',
    approval_status: 'approved',
  },
  {
    id: 2,
    business_name: 'Plateau Greens',
    location: 'Plateau',
    approval_status: 'approved',
  },
];

const sampleProducts = [
  {
    id: 1,
    seller_id: 1,
    category_id: 1,
    name: 'Fresh Roma Tomatoes',
    price: 2500,
    unit: 'basket',
    quantity: 30,
    availability: 'in_stock',
    average_rating: 4.8,
    rating_count: 20,
    deleted_at: null,
    is_published: true,
    category: { id: 1, name: 'Tomato', slug: 'tomato', is_active: true },
    seller: {
      id: 1,
      business_name: 'Arewa Fresh Farms',
      location: 'Gombe',
      approval_status: 'approved',
    },
  },
  {
    id: 2,
    seller_id: 2,
    category_id: 2,
    name: 'Habanero Pepper (Ata Rodo)',
    price: 1800,
    unit: 'basket',
    quantity: 15,
    availability: 'in_stock',
    average_rating: 4.9,
    rating_count: 14,
    deleted_at: null,
    is_published: true,
    category: { id: 2, name: 'Pepper', slug: 'pepper', is_active: true },
    seller: {
      id: 2,
      business_name: 'Plateau Greens',
      location: 'Plateau',
      approval_status: 'approved',
    },
  },
];

function renderProductsWithUrl(initialUrl = '/products') {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <ToastProvider>
        <CartProvider>
          <Products />
          <UrlInspector />
        </CartProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('No-Results State and Clear Filters (FE-048, SRCH-07, SRCH-08, TC-06)', () => {
  let getProductsSpy;

  beforeEach(() => {
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(
      mockCategories
    );
    vi.spyOn(sellerService, 'getPublicSellers').mockResolvedValue({
      data: mockSellers,
    });

    getProductsSpy = vi.spyOn(productService, 'getProducts');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "No results" message with one-click clear filters control when search has no match (SRCH-07, TC-06)', async () => {
    getProductsSpy.mockResolvedValueOnce({
      data: [],
      meta: {
        total: 0,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 0,
        to: 0,
      },
    });

    renderProductsWithUrl('/products?search=nonexistent_produce');

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    // 1. "No results" message heading and description (SRCH-07, TC-06)
    expect(
      screen.getByRole('heading', { name: /No results found/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No matching vegetables found/i)
    ).toBeInTheDocument();

    // 2. Toolbar indicates 0 results
    expect(screen.getByText(/0 vegetables found/i)).toBeInTheDocument();

    // 3. One-click clear filters control is rendered in empty state
    const clearFiltersBtn = screen.getByTestId('empty-clear-filters-btn');
    expect(clearFiltersBtn).toBeInTheDocument();
    expect(clearFiltersBtn).toHaveTextContent(/Clear all filters/i);

    // 4. Search input reflects active query
    const searchInput = screen.getByRole('searchbox', {
      name: /Search vegetables, categories, and sellers/i,
    });
    expect(searchInput).toHaveValue('nonexistent_produce');
  });

  it('one-click clear all filters in empty state clears search and restores catalog (SRCH-07, SRCH-08)', async () => {
    const user = userEvent.setup();

    // First call: empty search result
    getProductsSpy.mockResolvedValueOnce({
      data: [],
      meta: {
        total: 0,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 0,
        to: 0,
      },
    });

    // Second call after clearing filters: full catalog
    getProductsSpy.mockResolvedValueOnce({
      data: sampleProducts,
      meta: {
        total: 2,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 1,
        to: 2,
      },
    });

    renderProductsWithUrl('/products?search=nonexistent_produce');

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    const clearFiltersBtn = screen.getByTestId('empty-clear-filters-btn');
    await user.click(clearFiltersBtn);

    // Verify URL no longer contains the search query
    await waitFor(() => {
      const urlText = screen.getByTestId('url-inspector').textContent;
      expect(urlText).not.toContain('search=nonexistent_produce');
    });

    // Verify productService queried without search term
    expect(getProductsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: '',
        q: '',
      })
    );

    // Verify catalog product grid restored
    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
      expect(
        screen.getByText('Habanero Pepper (Ata Rodo)')
      ).toBeInTheDocument();
    });
  });

  it('renders "No results" and clears active filters in one action when filter combinations yield 0 items (SRCH-07, SRCH-08)', async () => {
    const user = userEvent.setup();

    // First call: no products match filters
    getProductsSpy.mockResolvedValueOnce({
      data: [],
      meta: {
        total: 0,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 0,
        to: 0,
      },
    });

    // Second call after clearing filters: catalog populated
    getProductsSpy.mockResolvedValueOnce({
      data: sampleProducts,
      meta: {
        total: 2,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 1,
        to: 2,
      },
    });

    renderProductsWithUrl('/products?category=tomato&min_price=50000');

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { name: /No results found/i })
    ).toBeInTheDocument();

    const clearFiltersBtn = screen.getByTestId('empty-clear-filters-btn');
    await user.click(clearFiltersBtn);

    // URL cleared of all filters
    await waitFor(() => {
      const urlText = screen.getByTestId('url-inspector').textContent;
      expect(urlText).not.toContain('category=');
      expect(urlText).not.toContain('min_price=');
    });

    // Products grid returns
    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });
  });

  it('one-click clear all filters drops search and filters while preserving chosen sort (SRCH-06, SRCH-08)', async () => {
    const user = userEvent.setup();

    getProductsSpy.mockResolvedValueOnce({
      data: [],
      meta: {
        total: 0,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 0,
        to: 0,
      },
    });

    getProductsSpy.mockResolvedValueOnce({
      data: sampleProducts,
      meta: {
        total: 2,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 1,
        to: 2,
      },
    });

    renderProductsWithUrl(
      '/products?search=exotic&category=1&min_price=10000&sort=price_desc'
    );

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    const clearFiltersBtn = screen.getByTestId('empty-clear-filters-btn');
    await user.click(clearFiltersBtn);

    await waitFor(() => {
      const urlText = screen.getByTestId('url-inspector').textContent;
      expect(urlText).not.toContain('search=exotic');
      expect(urlText).not.toContain('category=1');
      expect(urlText).not.toContain('min_price=10000');
      // Chosen sort option preserved
      expect(urlText).toContain('sort=price_desc');
    });
  });

  it('toolbar inline "Clear all" button resets search and filters from no-results state (SRCH-08)', async () => {
    const user = userEvent.setup();

    getProductsSpy.mockResolvedValueOnce({
      data: [],
      meta: {
        total: 0,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 0,
        to: 0,
      },
    });

    getProductsSpy.mockResolvedValueOnce({
      data: sampleProducts,
      meta: {
        total: 2,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 1,
        to: 2,
      },
    });

    renderProductsWithUrl('/products?search=rareproduce&category=pepper');

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    // Click the toolbar inline clear button
    const inlineClearBtn = screen.getByTestId('products-clear-all-inline');
    await user.click(inlineClearBtn);

    await waitFor(() => {
      const urlText = screen.getByTestId('url-inspector').textContent;
      expect(urlText).not.toContain('search=rareproduce');
      expect(urlText).not.toContain('category=pepper');
    });
  });

  it('sidebar "Clear All" button resets active filters from no-results state (SRCH-08)', async () => {
    const user = userEvent.setup();

    getProductsSpy.mockResolvedValueOnce({
      data: [],
      meta: {
        total: 0,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 0,
        to: 0,
      },
    });

    getProductsSpy.mockResolvedValueOnce({
      data: sampleProducts,
      meta: {
        total: 2,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 1,
        to: 2,
      },
    });

    renderProductsWithUrl('/products?category=pepper&min_price=8000');

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    const sidebar = screen.getByTestId('products-sidebar');
    const sidebarClearAllBtn = within(sidebar).getByRole('button', {
      name: /Clear All/i,
    });
    expect(sidebarClearAllBtn).toBeEnabled();
    await user.click(sidebarClearAllBtn);

    await waitFor(() => {
      const urlText = screen.getByTestId('url-inspector').textContent;
      expect(urlText).not.toContain('category=pepper');
      expect(urlText).not.toContain('min_price=8000');
    });
  });

  it('renders default empty catalogue message without clear button when catalog has 0 items and no filters are active (MKT-10)', async () => {
    getProductsSpy.mockResolvedValueOnce({
      data: [],
      meta: {
        total: 0,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 0,
        to: 0,
      },
    });

    renderProductsWithUrl('/products');

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    // Default message when store has 0 products
    expect(
      screen.getByRole('heading', { name: /No vegetables listed yet/i })
    ).toBeInTheDocument();
    // No clear filters button should be shown when no filters were applied
    expect(
      screen.queryByTestId('empty-clear-filters-btn')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('products-clear-all-inline')
    ).not.toBeInTheDocument();
  });
});
