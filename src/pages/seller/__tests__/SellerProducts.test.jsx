import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SellerProducts } from '../SellerProducts';
import { AuthContext } from '../../../context/authContextDef';
import { sellerService } from '../../../services/sellerService';
import { categoryService } from '../../../services/categoryService';
import { mockStore } from '../../../data/mockStore';

// Mock approved seller user
const mockApprovedSeller = {
  id: 2,
  seller_id: 1,
  name: 'Ibrahim Danladi',
  email: 'seller@arewafarms.ng',
  role: 'seller',
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    approval_status: 'approved',
    location: 'Gombe',
  },
};

// Mock pending seller user (AUTH-03)
const mockPendingSeller = {
  id: 5,
  seller_id: 4,
  name: 'Pending Farmer',
  email: 'pending@seller.ng',
  role: 'seller',
  seller: {
    id: 4,
    business_name: 'Kano Green Fields',
    approval_status: 'pending',
    location: 'Kano',
  },
};

// Mock sample products list for Seller 1
const sampleSellerProducts = [
  {
    id: 1,
    seller_id: 1,
    category_id: 1,
    name: 'Fresh Roma Tomatoes',
    description: 'Bright red, firm Roma tomatoes harvested in Gombe.',
    price: 2500,
    unit: 'basket',
    quantity: 45,
    low_stock_threshold: 5,
    image: 'https://images.unsplash.com/photo-tomatoes.jpg',
    availability: 'in_stock',
    created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-02-01T08:00:00Z',
    category: { id: 1, name: 'Tomato', slug: 'tomato' },
  },
  {
    id: 2,
    seller_id: 1,
    category_id: 2,
    name: 'Fresh Scotch Bonnet (Ata Rodo)',
    description: 'Crisp aromatic yellow and red peppers.',
    price: 1800,
    unit: 'basket',
    quantity: 4, // low stock (<= 5)
    low_stock_threshold: 5,
    image: 'https://images.unsplash.com/photo-peppers.jpg',
    availability: 'low_stock',
    created_at: '2026-02-02T09:00:00Z',
    updated_at: '2026-02-02T09:00:00Z',
    category: { id: 2, name: 'Pepper', slug: 'pepper' },
  },
  {
    id: 5,
    seller_id: 1,
    category_id: 2,
    name: 'Habanero Pepper',
    description: 'Extra fiery orange habanero produce.',
    price: 3200,
    unit: 'bag',
    quantity: 0, // out of stock
    low_stock_threshold: 5,
    image: null,
    availability: 'out_of_stock',
    created_at: '2026-02-05T10:00:00Z',
    updated_at: '2026-02-05T10:00:00Z',
    category: { id: 2, name: 'Pepper', slug: 'pepper' },
  },
];

const sampleCategories = [
  { id: 1, name: 'Tomato', slug: 'tomato' },
  { id: 2, name: 'Pepper', slug: 'pepper' },
  { id: 3, name: 'Leafy Greens', slug: 'leafy-greens' },
];

function renderSellerProducts({
  user = mockApprovedSeller,
  initialRoute = '/seller/products',
} = {}) {
  const authValue = {
    user,
    role: user?.role || 'seller',
    isAuthenticated: Boolean(user),
    token: 'test-token',
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    updateUser: vi.fn(),
  };

  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthContext.Provider value={authValue}>
          <Routes>
            <Route path="/seller/products" element={children} />
            <Route
              path="/seller/products/new"
              element={<div>Mock Add Product Page</div>}
            />
            <Route
              path="/seller/products/:id/edit"
              element={<div>Mock Edit Product Page</div>}
            />
            <Route
              path="/products/:id"
              element={<div>Mock Public Product Detail</div>}
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  }

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return render(<SellerProducts />, { wrapper: Wrapper });
}

describe('FE-082 / SEL-02, SEL-03: Seller Products List Page', () => {
  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    vi.restoreAllMocks();

    // Default mock responses
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(
      sampleCategories
    );
    vi.spyOn(sellerService, 'getSellerProducts').mockResolvedValue({
      data: sampleSellerProducts,
      meta: {
        total: sampleSellerProducts.length,
        current_page: 1,
        last_page: 1,
        per_page: 10,
      },
    });
  });

  describe('1. Header & Access Control (SEL-02, AUTH-03)', () => {
    it('renders page title and subtitle', async () => {
      renderSellerProducts();

      expect(
        await screen.findByTestId('seller-products-title')
      ).toHaveTextContent(/My Vegetables & Listings/i);
      expect(
        screen.getByTestId('seller-products-subtitle')
      ).toBeInTheDocument();
    });

    it('enables "+ Add Product" link pointing to /seller/products/new for approved seller', async () => {
      renderSellerProducts({ user: mockApprovedSeller });

      const addLink = await screen.findByTestId('add-product-link');
      expect(addLink).toHaveAttribute('href', '/seller/products/new');
      expect(
        screen.queryByTestId('products-publishing-disabled-notice')
      ).not.toBeInTheDocument();
    });

    it('locks "+ Add Product" action and shows restricted notice for unapproved seller (AUTH-03)', async () => {
      renderSellerProducts({ user: mockPendingSeller });

      expect(
        await screen.findByTestId('add-product-disabled-btn')
      ).toBeDisabled();
      expect(screen.getByTestId('add-product-btn-disabled')).toBeDisabled();
      expect(screen.queryByTestId('add-product-link')).not.toBeInTheDocument();

      const notice = screen.getByTestId('products-publishing-disabled-notice');
      expect(notice).toHaveTextContent(/Publishing disabled/i);
      expect(
        screen.getByTestId('seller-products-restricted-notice')
      ).toBeInTheDocument();
    });

    it('re-fetches products when refresh button is clicked', async () => {
      const getSpy = vi.spyOn(sellerService, 'getSellerProducts');
      const user = userEvent.setup();

      renderSellerProducts();

      const refreshBtn = await screen.findByTestId('products-refresh-btn');
      await user.click(refreshBtn);

      expect(getSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('2. Metrics & Status Mini-Bar (SEL-02, SEL-07)', () => {
    it('displays counts for total listings, in stock, low stock, and out of stock', async () => {
      renderSellerProducts();

      expect(await screen.findByTestId('kpi-total-products')).toHaveTextContent(
        '3'
      );
      expect(screen.getByTestId('kpi-in-stock')).toHaveTextContent('1');
      expect(screen.getByTestId('kpi-low-stock')).toHaveTextContent('1');
      expect(screen.getByTestId('kpi-out-of-stock')).toHaveTextContent('1');
    });
  });

  describe('3. Products Management Table (SEL-02, Figma Section 13)', () => {
    it('renders table headers: Product, Category, Price, Stock, Availability, Updated, Actions', async () => {
      renderSellerProducts();

      await screen.findByTestId('seller-products-table');

      expect(
        screen.getByRole('columnheader', { name: /Product/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: /Category/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: /Price/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: /Stock/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: /Availability/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: /Updated/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: /Actions/i })
      ).toBeInTheDocument();
    });

    it('renders all product rows with exact details, formatted prices and stock levels', async () => {
      renderSellerProducts();

      // Row 1: Fresh Roma Tomatoes (In Stock)
      const row1 = await screen.findByTestId('product-row-1');
      expect(row1).toBeInTheDocument();
      expect(screen.getByTestId('product-name-1')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
      expect(screen.getByTestId('product-category-1')).toHaveTextContent(
        'Tomato'
      );
      expect(screen.getByTestId('product-price-1')).toHaveTextContent(
        /₦2,500 \/ basket/i
      );
      expect(screen.getByTestId('product-stock-1')).toHaveTextContent(
        '45 basket'
      );
      expect(screen.getByTestId('product-availability-1')).toHaveTextContent(
        /Available|In Stock/i
      );
      expect(screen.getByTestId('product-image-1')).toBeInTheDocument();

      // Row 2: Fresh Scotch Bonnet (Low Stock)
      const row2 = screen.getByTestId('product-row-2');
      expect(row2).toBeInTheDocument();
      expect(screen.getByTestId('product-stock-2')).toHaveTextContent(
        /Low stock/i
      );
      expect(screen.getByTestId('product-stock-2')).toHaveTextContent(
        '4 basket'
      );

      // Row 3: Habanero Pepper (Out of Stock, Fallback Icon)
      const row3 = screen.getByTestId('product-row-5');
      expect(row3).toBeInTheDocument();
      expect(screen.getByTestId('product-stock-5')).toHaveTextContent(
        /Out of stock/i
      );
      expect(screen.getByTestId('product-fallback-icon-5')).toBeInTheDocument();
    });

    it('renders View, Edit, and Delete action controls for each product', async () => {
      renderSellerProducts();

      await screen.findByTestId('product-row-1');

      const viewLink = screen.getByTestId('product-view-link-1');
      expect(viewLink).toHaveAttribute('href', '/products/1');

      const editLink = screen.getByTestId('product-edit-link-1');
      expect(editLink).toHaveAttribute('href', '/seller/products/1/edit');

      const deleteBtn = screen.getByTestId('product-delete-btn-1');
      expect(deleteBtn).toBeInTheDocument();
    });
  });

  describe('4. Search, Availability & Category Filters (SEL-02, SEL-07)', () => {
    it('triggers search query filtering when typing in search input', async () => {
      const getSpy = vi.spyOn(sellerService, 'getSellerProducts');
      const user = userEvent.setup();

      renderSellerProducts();

      const searchInput = await screen.findByTestId('products-search-input');
      await user.type(searchInput, 'Tomatoes');

      expect(getSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Tomatoes',
        })
      );

      // Verify clear search button appears
      const clearBtn = screen.getByTestId('products-clear-search-btn');
      expect(clearBtn).toBeInTheDocument();

      await user.click(clearBtn);
      expect(searchInput).toHaveValue('');
    });

    it('filters by availability dropdown (e.g. low_stock)', async () => {
      const getSpy = vi.spyOn(sellerService, 'getSellerProducts');
      const user = userEvent.setup();

      renderSellerProducts();

      const availSelect = await screen.findByTestId(
        'products-availability-filter'
      );
      await user.selectOptions(availSelect, 'low_stock');

      expect(getSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          availability: 'low_stock',
        })
      );
    });

    it('filters by category dropdown', async () => {
      const getSpy = vi.spyOn(sellerService, 'getSellerProducts');
      const user = userEvent.setup();

      renderSellerProducts();

      const catSelect = await screen.findByTestId('products-category-filter');
      await user.selectOptions(catSelect, 'pepper');

      expect(getSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'pepper',
        })
      );
    });

    it('sorts products by selected sort option', async () => {
      const getSpy = vi.spyOn(sellerService, 'getSellerProducts');
      const user = userEvent.setup();

      renderSellerProducts();

      const sortSelect = await screen.findByTestId('products-sort-select');
      await user.selectOptions(sortSelect, 'price_asc');

      expect(getSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'price_asc',
        })
      );
    });

    it('resets all filters when clicking Reset Filters button', async () => {
      const user = userEvent.setup();

      renderSellerProducts();

      const searchInput = await screen.findByTestId('products-search-input');
      await user.type(searchInput, 'Tomatoes');

      const resetBtn = screen.getByTestId('products-reset-filters-btn');
      expect(resetBtn).toBeInTheDocument();

      await user.click(resetBtn);
      expect(searchInput).toHaveValue('');
      expect(
        screen.queryByTestId('products-reset-filters-btn')
      ).not.toBeInTheDocument();
    });
  });

  describe('5. Soft Delete Action & Confirmation Dialog (SEL-04, BR-10)', () => {
    it('opens confirm dialog when clicking delete, and dismisses on Cancel without deleting', async () => {
      const deleteSpy = vi.spyOn(sellerService, 'deleteProduct');
      const user = userEvent.setup();

      renderSellerProducts();

      const deleteBtn = await screen.findByTestId('product-delete-btn-1');
      await user.click(deleteBtn);

      // Verify dialog is open
      const dialog = await screen.findByTestId('delete-product-confirm-dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent(/Delete Vegetable Listing/i);
      expect(dialog).toHaveTextContent(/Fresh Roma Tomatoes/i);
      expect(dialog).toHaveTextContent(/soft-deleted/i);
      expect(dialog).toHaveTextContent(
        /Past orders referencing this vegetable will not be affected/i
      );

      // Click Cancel
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelBtn);

      expect(deleteSpy).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(
          screen.queryByTestId('delete-product-confirm-dialog')
        ).not.toBeInTheDocument();
      });
    });

    it('soft deletes the product upon confirmation, updates table and shows success alert (SEL-04)', async () => {
      const deleteSpy = vi
        .spyOn(sellerService, 'deleteProduct')
        .mockResolvedValue({ message: 'Product deleted successfully.' });
      const user = userEvent.setup();

      renderSellerProducts();

      const deleteBtn = await screen.findByTestId('product-delete-btn-1');
      await user.click(deleteBtn);

      const confirmBtn = screen.getByRole('button', {
        name: /Delete Vegetable/i,
      });
      await user.click(confirmBtn);

      expect(deleteSpy).toHaveBeenCalledWith(1);

      // Dialog closes
      await waitFor(() => {
        expect(
          screen.queryByTestId('delete-product-confirm-dialog')
        ).not.toBeInTheDocument();
      });

      // Product 1 removed from visible list
      expect(screen.queryByTestId('product-row-1')).not.toBeInTheDocument();

      // Success notification rendered
      const alert = screen.getByTestId('products-success-alert');
      expect(alert).toHaveTextContent(/successfully deleted \(SEL-04\)/i);
    });

    it('surfaces an error alert if delete API call fails', async () => {
      vi.spyOn(sellerService, 'deleteProduct').mockRejectedValue(
        new Error('Network error deleting product')
      );
      const user = userEvent.setup();

      renderSellerProducts();

      const deleteBtn = await screen.findByTestId('product-delete-btn-1');
      await user.click(deleteBtn);

      const confirmBtn = screen.getByRole('button', {
        name: /Delete Vegetable/i,
      });
      await user.click(confirmBtn);

      expect(
        await screen.findByTestId('delete-dialog-error')
      ).toHaveTextContent(/Network error deleting product/i);
    });
  });

  describe('6. Empty States & Error Handling', () => {
    it('renders initial empty state with "+ Add Your First Vegetable" CTA when seller has 0 listings', async () => {
      vi.spyOn(sellerService, 'getSellerProducts').mockResolvedValue({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderSellerProducts();

      const emptyState = await screen.findByTestId('products-empty-state');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent(/No vegetables listed yet/i);

      const addBtn = screen.getByTestId('products-empty-add-btn');
      expect(addBtn).toHaveAttribute('href', '/seller/products/new');
    });

    it('renders search empty state with "Clear Filters" button when search finds 0 matches', async () => {
      vi.spyOn(sellerService, 'getSellerProducts').mockResolvedValue({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1, per_page: 10 },
      });
      const user = userEvent.setup();

      renderSellerProducts();

      const searchInput = await screen.findByTestId('products-search-input');
      await user.type(searchInput, 'NonExistentVegetableXYZ');

      const searchEmptyState = await screen.findByTestId(
        'products-search-empty-state'
      );
      expect(searchEmptyState).toHaveTextContent(
        /No vegetables match your search/i
      );

      const clearBtn = screen.getByTestId('products-empty-reset-btn');
      expect(clearBtn).toBeInTheDocument();
      await user.click(clearBtn);
      expect(searchInput).toHaveValue('');
    });

    it('renders error state with retry button on service failure', async () => {
      vi.spyOn(sellerService, 'getSellerProducts').mockRejectedValue(
        new Error('Failed to retrieve inventory')
      );

      renderSellerProducts();

      const errorState = await screen.findByTestId('products-error-state');
      expect(errorState).toHaveTextContent(/Failed to retrieve inventory/i);

      const retryBtn = screen.getByTestId('products-error-retry-btn');
      expect(retryBtn).toBeInTheDocument();
    });
  });

  describe('7. Pagination Controls (SEL-02, MKT-03)', () => {
    it('renders pagination controls when total items exceed per-page limit', async () => {
      vi.spyOn(sellerService, 'getSellerProducts').mockResolvedValue({
        data: sampleSellerProducts,
        meta: {
          total: 25,
          current_page: 1,
          last_page: 3,
          per_page: 10,
        },
      });

      renderSellerProducts();

      const pagination = await screen.findByTestId('products-pagination');
      expect(pagination).toBeInTheDocument();
      expect(
        screen.getByRole('navigation', { name: /Pagination Navigation/i })
      ).toBeInTheDocument();
    });
  });
});
