import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Products } from '../Products';
import {
  productService,
  categoryService,
  sellerService,
} from '../../../services';
import { CartProvider, ToastProvider } from '../../../context';
import { STRINGS } from '../../../constants';

const mockProductList = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  seller_id: 1,
  category_id: 1,
  name: `Fresh Vegetable ${i + 1}`,
  description: `Delicious organic vegetable item ${i + 1}`,
  price: 1500 + i * 200,
  unit: 'basket',
  quantity: 20 + i,
  low_stock_threshold: 5,
  image: `https://example.com/veg-${i + 1}.jpg`,
  availability: 'in_stock',
  average_rating: 4.8,
  rating_count: 15,
  deleted_at: null,
  is_published: true,
  status: 'published',
  category: {
    id: 1,
    name: 'Tomato',
    slug: 'tomato',
    is_active: true,
  },
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    location: 'Gombe',
    approval_status: 'approved',
  },
}));

function renderProducts(initialEntries = ['/products']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <CartProvider>
          <Products />
        </CartProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Products Marketplace Listing Page (FE-046, MKT-02, MKT-03, MKT-04)', () => {
  let getProductsSpy;

  beforeEach(() => {
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([
      { id: 1, name: 'Tomato', slug: 'tomato', is_active: true },
      { id: 2, name: 'Pepper', slug: 'pepper', is_active: true },
    ]);

    vi.spyOn(sellerService, 'getPublicSellers').mockResolvedValue({
      data: [
        {
          id: 1,
          business_name: 'Arewa Fresh Farms',
          location: 'Gombe',
          approval_status: 'approved',
        },
      ],
    });

    getProductsSpy = vi.spyOn(productService, 'getProducts').mockResolvedValue({
      data: mockProductList,
      meta: {
        total: 24,
        current_page: 1,
        per_page: 12,
        last_page: 2,
        from: 1,
        to: 12,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders header banner, catalog title, subtitle, and search bar (MKT-02, SRCH-01)', async () => {
    renderProducts();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: STRINGS.PRODUCTS.CATALOG_TITLE,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(STRINGS.PRODUCTS.CATALOG_SUBTITLE)
    ).toBeInTheDocument();

    // Integrated search bar
    expect(
      screen.getByRole('searchbox', {
        name: /Search vegetables, categories, and sellers/i,
      })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });
  });

  it('renders 2-column desktop layout with FilterPanel sidebar and products main area (Figma Section 5)', async () => {
    renderProducts();

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    // Sidebar landmark
    const sidebar = screen.getByTestId('products-sidebar');
    expect(sidebar).toBeInTheDocument();

    // Main area landmark
    const main = screen.getByRole('main', { name: 'Marketplace Vegetables' });
    expect(main).toBeInTheDocument();

    // Toolbar
    expect(screen.getByTestId('products-toolbar')).toBeInTheDocument();
  });

  it('renders paginated grid of ProductCards with image, name, price, unit, seller, location, availability (MKT-02)', async () => {
    renderProducts();

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    // Check first product card elements
    expect(screen.getByText('Fresh Vegetable 1')).toBeInTheDocument();
    expect(screen.getByText(/₦1,500 \/ basket/)).toBeInTheDocument();
    expect(screen.getAllByText('Arewa Fresh Farms')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Gombe')[0]).toBeInTheDocument();

    // Availability badges
    const badges = screen.getAllByText('In Stock');
    expect(badges.length).toBeGreaterThan(0);

    // "View Product" links
    const viewButtons = screen.getAllByRole('link', { name: 'View Product' });
    expect(viewButtons.length).toBe(12);
    expect(viewButtons[0]).toHaveAttribute('href', '/products/1');
  });

  it('supports "Add to Cart" action directly from ProductCard with toast feedback (CART-01, CART-02)', async () => {
    const user = userEvent.setup();
    renderProducts();

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    const addToCartButtons = screen.getAllByRole('button', {
      name: /Add to Cart/i,
    });
    expect(addToCartButtons.length).toBe(12);

    await user.click(addToCartButtons[0]);

    // Toast notification should announce the addition
    await waitFor(() => {
      expect(
        screen.getByText(/Added Fresh Vegetable 1 to cart!/i)
      ).toBeInTheDocument();
    });
  });

  it('renders pagination controls defaulting to 12 items per page and displays results summary (MKT-03)', async () => {
    renderProducts();

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    // Summary count text
    expect(screen.getByTestId('products-count-summary')).toHaveTextContent(
      'Showing 1–12 of 24 vegetables'
    );

    // Pagination navigation landmark
    const pagination = screen.getByRole('navigation', { name: /pagination/i });
    expect(pagination).toBeInTheDocument();

    // Smart windowed page 1 and page 2 buttons
    expect(screen.getByRole('button', { name: /page 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /page 2/i })).toBeInTheDocument();
  });

  it('strictly displays only publicly purchasable listings per MKT-04', async () => {
    const mixedProducts = [
      {
        id: 101,
        name: 'Valid Public Tomato',
        price: 2000,
        unit: 'basket',
        deleted_at: null,
        is_published: true,
        seller: {
          id: 1,
          business_name: 'Approved Farm',
          approval_status: 'approved',
        },
        category: { id: 1, name: 'Tomato', is_active: true },
      },
      {
        id: 102,
        name: 'Soft Deleted Tomato',
        price: 1500,
        unit: 'basket',
        deleted_at: '2026-03-01T00:00:00Z',
        is_published: true,
        seller: {
          id: 1,
          business_name: 'Approved Farm',
          approval_status: 'approved',
        },
        category: { id: 1, name: 'Tomato', is_active: true },
      },
      {
        id: 103,
        name: 'Unpublished Draft Pepper',
        price: 1800,
        unit: 'kg',
        deleted_at: null,
        is_published: false,
        seller: {
          id: 1,
          business_name: 'Approved Farm',
          approval_status: 'approved',
        },
        category: { id: 2, name: 'Pepper', is_active: true },
      },
      {
        id: 104,
        name: 'Pending Seller Onion',
        price: 3000,
        unit: 'bag',
        deleted_at: null,
        is_published: true,
        seller: {
          id: 2,
          business_name: 'Unapproved Farm',
          approval_status: 'pending',
        },
        category: { id: 3, name: 'Onion', is_active: true },
      },
      {
        id: 105,
        name: 'Inactive Category Cabbage',
        price: 1200,
        unit: 'piece',
        deleted_at: null,
        is_published: true,
        seller: {
          id: 1,
          business_name: 'Approved Farm',
          approval_status: 'approved',
        },
        category: { id: 4, name: 'Cabbage', is_active: false },
      },
    ];

    getProductsSpy.mockResolvedValueOnce({
      data: mixedProducts,
      meta: {
        total: 1,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 1,
        to: 1,
      },
    });

    renderProducts();

    await waitFor(() => {
      expect(screen.getByText('Valid Public Tomato')).toBeInTheDocument();
    });

    // MKT-04 exclusions:
    expect(screen.queryByText('Soft Deleted Tomato')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Unpublished Draft Pepper')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Seller Onion')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Inactive Category Cabbage')
    ).not.toBeInTheDocument();
  });

  it('renders EmptyState when 0 products match criteria (MKT-10, SRCH-08)', async () => {
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

    renderProducts(['/products?search=nonexistent']);

    await waitFor(() => {
      expect(
        screen.getByText(/No matching vegetables found/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/0 vegetables found/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Clear all filters/i })
    ).toBeInTheDocument();
  });

  it('renders ErrorState with retry button when API fails and handles retry (MKT-10, ERR-01)', async () => {
    const user = userEvent.setup();
    getProductsSpy.mockRejectedValueOnce(
      new Error('Network connection failed')
    );

    renderProducts();

    await waitFor(() => {
      expect(screen.getByText('Unable to load vegetables')).toBeInTheDocument();
    });

    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Try Again/i });
    expect(retryBtn).toBeInTheDocument();

    // Prepare successful resolution on retry
    getProductsSpy.mockResolvedValueOnce({
      data: mockProductList.slice(0, 4),
      meta: {
        total: 4,
        current_page: 1,
        per_page: 12,
        last_page: 1,
        from: 1,
        to: 4,
      },
    });

    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Fresh Vegetable 1')).toBeInTheDocument();
    });
  });

  it('renders SortDropdown with all required options (SRCH-04, SRCH-05, FE-035)', async () => {
    renderProducts();

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    const sortSelect = screen.getByRole('combobox', { name: /Sort by:/i });
    expect(sortSelect).toBeInTheDocument();
    expect(sortSelect).toHaveValue('newest');

    // Options check
    expect(
      screen.getByRole('option', { name: 'Newest First' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Price: Low to High' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Price: High to Low' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Popularity' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Highest Rated' })
    ).toBeInTheDocument();
  });

  it('opens mobile filter drawer when mobile filter toggle button is clicked (FE-034, Figma Section 5)', async () => {
    const user = userEvent.setup();
    renderProducts();

    await waitFor(() => {
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
    });

    const mobileToggleBtn = screen.getByRole('button', {
      name: /Open filter panel/i,
    });
    expect(mobileToggleBtn).toBeInTheDocument();

    await user.click(mobileToggleBtn);

    // Filter drawer should now be open
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Product Filters' })
      ).toBeInTheDocument();
    });
  });
});
