import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Home } from '../Home';
import { Products } from '../Products';
import {
  productService,
  categoryService,
  sellerService,
} from '../../../services';
import { CartProvider, ToastProvider } from '../../../context';

// URL Inspector helper
function UrlInspector() {
  const location = useLocation();
  return (
    <div data-testid="url-inspector">{location.pathname + location.search}</div>
  );
}

const mockCategories = [
  {
    id: 1,
    name: 'Tomato',
    slug: 'tomato',
    description: 'Fresh farm tomatoes',
    is_active: true,
    products_count: 5,
  },
  {
    id: 2,
    name: 'Pepper',
    slug: 'pepper',
    description: 'Habanero and bell peppers',
    is_active: true,
    products_count: 3,
  },
  {
    id: 3,
    name: 'Onion',
    slug: 'onion',
    description: 'Dry red and white onions',
    is_active: true,
    products_count: 4,
  },
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

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ToastProvider>
        <CartProvider>
          <Home />
          <UrlInspector />
        </CartProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

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

describe('Category Browsing (FE-049, MKT-08)', () => {
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

  describe('1. Homepage Category Browsing (MKT-08)', () => {
    it('lists data-driven categories in CategoriesSection on the homepage and links to filtered catalogue', async () => {
      renderHome();

      // Wait for CategoriesSection to finish loading
      await waitFor(() => {
        expect(screen.getByTestId('categories-section')).toBeInTheDocument();
      });

      // Verify category headings and cards are rendered
      expect(
        screen.getByText('Browse by Vegetable Category')
      ).toBeInTheDocument();

      const tomatoLink = screen.getByRole('link', { name: /Browse Tomato/i });
      expect(tomatoLink).toBeInTheDocument();
      // CategoryCard links directly to the category filtered catalogue route
      expect(tomatoLink).toHaveAttribute('href', '/products?category=1');

      const pepperLink = screen.getByRole('link', { name: /Browse Pepper/i });
      expect(pepperLink).toHaveAttribute('href', '/products?category=2');

      const onionLink = screen.getByRole('link', { name: /Browse Onion/i });
      expect(onionLink).toHaveAttribute('href', '/products?category=3');
    });
  });

  describe('2. Filter Panel Category Browsing (MKT-08, SRCH-02)', () => {
    it('lists categories in FilterPanel dropdown and updates URL on selection', async () => {
      const user = userEvent.setup();
      renderProductsWithUrl('/products');

      await waitFor(() => {
        expect(screen.getByTestId('products-grid')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText(/^Category$/i);
      expect(categorySelect).toBeInTheDocument();

      // Change category to Pepper
      await user.selectOptions(categorySelect, 'Pepper');

      // Verifies URL updated
      await waitFor(() => {
        const urlText = screen.getByTestId('url-inspector').textContent;
        expect(urlText).toContain('category=pepper');
      });

      // Verifies productService queried with category
      expect(getProductsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          category: 'pepper',
        })
      );

      // Verifies active filter chip rendered
      expect(screen.getByText(/Category: Pepper/i)).toBeInTheDocument();
    });

    it('clearing category filter via active chip removes category filter and restores all categories', async () => {
      const user = userEvent.setup();
      renderProductsWithUrl('/products?category=pepper');

      await waitFor(() => {
        expect(screen.getByTestId('products-grid')).toBeInTheDocument();
      });

      // Active chip has individual remove button
      const removeChipBtn = screen.getByRole('button', {
        name: /Remove category filter: Pepper/i,
      });
      await user.click(removeChipBtn);

      // Verifies category dropped from URL
      await waitFor(() => {
        const urlText = screen.getByTestId('url-inspector').textContent;
        expect(urlText).not.toContain('category=');
      });

      // Category select in FilterPanel returns to all
      const categorySelect = screen.getByLabelText(/^Category$/i);
      expect(categorySelect).toHaveValue('all');
    });

    it('selecting "All Categories" in dropdown clears category filter', async () => {
      const user = userEvent.setup();
      renderProductsWithUrl('/products?category=tomato');

      await waitFor(() => {
        expect(screen.getByTestId('products-grid')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText(/^Category$/i);
      await user.selectOptions(categorySelect, 'all');

      await waitFor(() => {
        const urlText = screen.getByTestId('url-inspector').textContent;
        expect(urlText).not.toContain('category=');
      });
    });
  });

  describe('3. Quick Category Browse Pills on Products Page (MKT-08, FE-049)', () => {
    it('renders quick category pills and toggles category filter on click', async () => {
      const user = userEvent.setup();
      renderProductsWithUrl('/products');

      await waitFor(() => {
        expect(
          screen.getByTestId('products-category-pills')
        ).toBeInTheDocument();
      });

      // "All" is initially active
      const allPill = screen.getByTestId('category-pill-all');
      expect(allPill).toHaveAttribute('aria-pressed', 'true');

      // Click "Pepper" pill
      const pepperPill = screen.getByTestId('category-pill-pepper');
      await user.click(pepperPill);

      await waitFor(() => {
        const urlText = screen.getByTestId('url-inspector').textContent;
        expect(urlText).toContain('category=pepper');
      });

      expect(pepperPill).toHaveAttribute('aria-pressed', 'true');
      expect(allPill).toHaveAttribute('aria-pressed', 'false');

      // Clicking "All" pill resets category
      await user.click(allPill);

      await waitFor(() => {
        const urlText = screen.getByTestId('url-inspector').textContent;
        expect(urlText).not.toContain('category=');
      });

      expect(allPill).toHaveAttribute('aria-pressed', 'true');
    });

    it('synchronizes category selection between pills, dropdown, and URL', async () => {
      const user = userEvent.setup();
      renderProductsWithUrl('/products?category=tomato');

      await waitFor(() => {
        expect(
          screen.getByTestId('products-category-pills')
        ).toBeInTheDocument();
      });

      // Tomato pill should be active from URL
      const tomatoPill = screen.getByTestId('category-pill-tomato');
      expect(tomatoPill).toHaveAttribute('aria-pressed', 'true');

      // Dropdown should be Tomato
      const categorySelect = screen.getByLabelText(/^Category$/i);
      expect(categorySelect).toHaveValue('tomato');

      // Selecting Pepper in dropdown updates the pill
      await user.selectOptions(categorySelect, 'Pepper');

      await waitFor(() => {
        const pepperPill = screen.getByTestId('category-pill-pepper');
        expect(pepperPill).toHaveAttribute('aria-pressed', 'true');
        expect(tomatoPill).toHaveAttribute('aria-pressed', 'false');
      });
    });
  });
});
