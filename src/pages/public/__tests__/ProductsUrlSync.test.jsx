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

// Helper component to inspect the active URL in tests (SRCH-06)
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

const mockProducts = [
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

describe('Search, Filter and Sort Wired to URL (FE-047, SRCH-01 to SRCH-06)', () => {
  let getProductsSpy;

  beforeEach(() => {
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(
      mockCategories
    );
    vi.spyOn(sellerService, 'getPublicSellers').mockResolvedValue({
      data: mockSellers,
    });

    getProductsSpy = vi.spyOn(productService, 'getProducts').mockResolvedValue({
      data: mockProducts,
      meta: {
        total: 2,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 1,
        to: 2,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rehydrates all combined criteria from bookmarkable/shareable URL on initial mount (SRCH-06)', async () => {
    const bookmarkedUrl =
      '/products?search=tomato&category=1&min_price=1000&max_price=3000&availability=in_stock&seller=1&location=Gombe&sort=price_asc&page=1';

    renderProductsWithUrl(bookmarkedUrl);

    await waitFor(() => {
      expect(getProductsSpy).toHaveBeenCalled();
    });

    // Verify productService was queried with ALL combined criteria parsed from the URL
    expect(getProductsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'tomato',
        category: '1',
        min_price: '1000',
        max_price: '3000',
        availability: 'in_stock',
        seller: '1',
        location: 'Gombe',
        sort: 'price_asc',
        page: 1,
      })
    );

    // Verify SearchBar input reflects the active URL search term
    const searchInput = screen.getByRole('searchbox', {
      name: /Search vegetables, categories, and sellers/i,
    });
    expect(searchInput).toHaveValue('tomato');

    // Verify SortDropdown reflects sort=price_asc
    const sortSelect = screen.getByRole('combobox', { name: /Sort by:/i });
    expect(sortSelect).toHaveValue('price_asc');

    // Verify Active Filter Chips are displayed in the UI (SRCH-06)
    const chipsContainer = screen.getByLabelText('Active Filters');
    expect(
      within(chipsContainer).getByText(/Category: Tomato/i)
    ).toBeInTheDocument();
    expect(
      within(chipsContainer).getByText(/Price: ₦1000 – ₦3000/i)
    ).toBeInTheDocument();
    expect(
      within(chipsContainer).getByText(/In Stock Only/i)
    ).toBeInTheDocument();
    expect(
      within(chipsContainer).getByText(/Seller: Arewa Fresh Farms/i)
    ).toBeInTheDocument();
    expect(
      within(chipsContainer).getByText(/Location: Gombe/i)
    ).toBeInTheDocument();
  });

  it('submitting search updates URL while preserving active filters and sort, resetting page to 1 (SRCH-01, SRCH-06)', async () => {
    const user = userEvent.setup();
    renderProductsWithUrl('/products?category=1&sort=price_asc&page=2');

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('searchbox', {
      name: /Search vegetables, categories, and sellers/i,
    });
    const searchSubmit = screen.getByRole('button', { name: /Submit search/i });

    await user.clear(searchInput);
    await user.type(searchInput, 'pepper');
    await user.click(searchSubmit);

    // URL must now combine the search term, preserve category=1 and sort=price_asc, and reset page to 1
    const urlText = screen.getByTestId('url-inspector').textContent;
    expect(urlText).toContain('category=1');
    expect(urlText).toContain('sort=price_asc');
    expect(urlText).toContain('search=pepper');
    expect(urlText).toContain('page=1');
  });

  it('changing filter updates URL while preserving active search query and sort, resetting page to 1 (SRCH-02, SRCH-06)', async () => {
    const user = userEvent.setup();
    renderProductsWithUrl('/products?search=fresh&sort=price_desc&page=3');

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    // Select category in desktop filter panel
    const categorySelect = screen.getByLabelText(/Category/i);
    await user.selectOptions(categorySelect, 'Pepper');

    const urlText = screen.getByTestId('url-inspector').textContent;
    expect(urlText).toContain('category=pepper');
    expect(urlText).toContain('search=fresh');
    expect(urlText).toContain('sort=price_desc');
    // Page is reset from 3 to 1 (page param dropped or defaulted to 1)
    expect(urlText).not.toContain('page=3');
  });

  it('changing sort updates URL while preserving active search and filter criteria (SRCH-04, SRCH-05, SRCH-06)', async () => {
    const user = userEvent.setup();
    renderProductsWithUrl(
      '/products?search=fresh&category=2&availability=in_stock'
    );

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    const sortSelect = screen.getByRole('combobox', { name: /Sort by:/i });
    await user.selectOptions(sortSelect, 'rating');

    const urlText = screen.getByTestId('url-inspector').textContent;
    expect(urlText).toContain('sort=rating');
    expect(urlText).toContain('search=fresh');
    expect(urlText).toContain('category=2');
    expect(urlText).toContain('availability=in_stock');
  });

  it('clicking remove on an individual active chip drops only that filter from URL (SRCH-06, SRCH-08)', async () => {
    const user = userEvent.setup();
    renderProductsWithUrl(
      '/products?category=1&availability=in_stock&sort=price_asc&search=tomato'
    );

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    // Remove category chip
    const removeCategoryBtn = screen.getByRole('button', {
      name: /Remove category filter: Tomato/i,
    });
    await user.click(removeCategoryBtn);

    const urlText = screen.getByTestId('url-inspector').textContent;
    // Category removed
    expect(urlText).not.toContain('category=1');
    // Other criteria preserved
    expect(urlText).toContain('availability=in_stock');
    expect(urlText).toContain('sort=price_asc');
    expect(urlText).toContain('search=tomato');
  });

  it('clearing all filters from inline button resets filters and search while keeping route intact (SRCH-08)', async () => {
    const user = userEvent.setup();
    renderProductsWithUrl(
      '/products?search=tomato&category=1&availability=in_stock&sort=price_asc'
    );

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    const clearAllBtn = screen.getByTestId('products-clear-all-inline');
    await user.click(clearAllBtn);

    const urlText = screen.getByTestId('url-inspector').textContent;
    expect(urlText).not.toContain('search=tomato');
    expect(urlText).not.toContain('category=1');
    expect(urlText).not.toContain('availability=in_stock');
    // Preserves chosen sort
    expect(urlText).toContain('sort=price_asc');
  });

  it('clearing search query from SearchBar clear button updates URL and preserves filters (SRCH-01, SRCH-06)', async () => {
    const user = userEvent.setup();
    renderProductsWithUrl('/products?search=tomato&category=2&sort=popularity');

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    const clearSearchBtn = screen.getByRole('button', {
      name: /Clear search query/i,
    });
    await user.click(clearSearchBtn);

    const urlText = screen.getByTestId('url-inspector').textContent;
    expect(urlText).not.toContain('search=tomato');
    expect(urlText).toContain('category=2');
    expect(urlText).toContain('sort=popularity');
  });
});
