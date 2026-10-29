import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AdminProducts } from '../AdminProducts';
import { adminService } from '../../../services/adminService';
import { categoryService } from '../../../services/categoryService';
import { ToastContext } from '../../../context/toastContextDef';

// Mock Categories
const mockCategories = [
  { id: 1, name: 'Fresh Vegetables', slug: 'fresh-vegetables' },
  { id: 2, name: 'Root Vegetables', slug: 'root-vegetables' },
  { id: 3, name: 'Peppers & Spices', slug: 'peppers-spices' },
];

// Mock Products conforming to ADM-04, BR-10, and DB Schema
const mockProductsList = [
  {
    id: 1,
    name: 'Fresh Roma Tomatoes',
    description:
      'Firm, sun-ripened Northern Nigerian Roma tomatoes in 25kg crates.',
    category_id: 1,
    category: { id: 1, name: 'Fresh Vegetables', slug: 'fresh-vegetables' },
    seller_id: 2,
    seller: {
      id: 2,
      business_name: 'Arewa Fresh Farms',
      location: 'Gombe',
    },
    price: 18500,
    unit: 'crate',
    quantity: 35,
    low_stock_threshold: 10,
    is_published: true,
    status: 'published',
    deleted_at: null,
    moderation_reason: null,
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=100',
    created_at: '2026-01-15T09:00:00Z',
  },
  {
    id: 2,
    name: 'Red Scotch Bonnet (Atarodo)',
    description: 'Pungent hot pepper baskets directly harvested from Danbatta.',
    category_id: 3,
    category: { id: 3, name: 'Peppers & Spices', slug: 'peppers-spices' },
    seller_id: 4,
    seller: {
      id: 4,
      business_name: 'Danbatta Agro Ventures',
      location: 'Kano',
    },
    price: 12000,
    unit: 'basket',
    quantity: 4, // low stock
    low_stock_threshold: 5,
    is_published: true,
    status: 'published',
    deleted_at: null,
    moderation_reason: null,
    image: null,
    created_at: '2026-01-20T11:30:00Z',
  },
  {
    id: 3,
    name: 'Unverified Exotic Capsicum',
    description:
      'Suspicious or mislabeled capsicum listing with pending check.',
    category_id: 3,
    category: { id: 3, name: 'Peppers & Spices', slug: 'peppers-spices' },
    seller_id: 6,
    seller: {
      id: 6,
      business_name: 'Niger River Veggies',
      location: 'Niger',
    },
    price: 25000,
    unit: 'bag',
    quantity: 12,
    low_stock_threshold: 5,
    is_published: false,
    status: 'unpublished',
    deleted_at: null,
    moderation_reason:
      'Inaccurate produce photos and unverified certification claims.',
    image: null,
    created_at: '2026-02-01T14:00:00Z',
  },
  {
    id: 4,
    name: 'Spoiled Leafy Greens',
    description: 'Violating listing soft-deleted by platform moderators.',
    category_id: 1,
    category: { id: 1, name: 'Fresh Vegetables', slug: 'fresh-vegetables' },
    seller_id: 2,
    seller: {
      id: 2,
      business_name: 'Arewa Fresh Farms',
      location: 'Gombe',
    },
    price: 5000,
    unit: 'bundle',
    quantity: 0,
    low_stock_threshold: 5,
    is_published: false,
    status: 'unpublished',
    deleted_at: '2026-02-10T10:00:00Z',
    moderation_reason:
      'Reported rotten goods; vendor violated quality assurance rules.',
    image: null,
    created_at: '2026-01-10T08:00:00Z',
  },
];

function TestWrapper({ children, toastMocks = {} }) {
  const toastValue = {
    success: toastMocks.success || vi.fn(),
    error: toastMocks.error || vi.fn(),
    info: toastMocks.info || vi.fn(),
  };

  return (
    <ToastContext.Provider value={toastValue}>
      <MemoryRouter initialEntries={['/admin/products']}>
        <Routes>
          <Route path="/admin/products" element={children} />
        </Routes>
      </MemoryRouter>
    </ToastContext.Provider>
  );
}

TestWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  toastMocks: PropTypes.object,
};

describe('FE-099 / ADM-04: Admin Products Moderation Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(
      mockCategories
    );

    vi.spyOn(adminService, 'getProducts').mockResolvedValue({
      data: mockProductsList,
      meta: {
        total: mockProductsList.length,
        current_page: 1,
        last_page: 1,
      },
      links: {},
    });

    vi.spyOn(adminService, 'unpublishProduct').mockImplementation(
      async (id, reason = '') => {
        const found = mockProductsList.find((p) => p.id === Number(id));
        return {
          ...found,
          is_published: false,
          status: 'unpublished',
          moderation_reason: reason,
          updated_at: new Date().toISOString(),
        };
      }
    );

    vi.spyOn(adminService, 'publishProduct').mockImplementation(async (id) => {
      const found = mockProductsList.find((p) => p.id === Number(id));
      return {
        ...found,
        is_published: true,
        status: 'published',
        moderation_reason: null,
        updated_at: new Date().toISOString(),
      };
    });

    vi.spyOn(adminService, 'removeProduct').mockImplementation(
      async (id, reason = '') => {
        const found = mockProductsList.find((p) => p.id === Number(id));
        return {
          ...found,
          is_published: false,
          status: 'unpublished',
          deleted_at: new Date().toISOString(),
          moderation_reason: reason,
          updated_at: new Date().toISOString(),
        };
      }
    );
  });

  describe('1. Products Table & Listing (ADM-04, Figma Section 14)', () => {
    it('renders the product moderation table with headers, product counts, and listing rows', async () => {
      render(
        <TestWrapper>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('products-table')).toBeInTheDocument();
      });

      // Total count badge
      expect(screen.getByTestId('products-total-badge')).toHaveTextContent(
        '4 products'
      );

      // Product 1 (Roma Tomatoes)
      expect(screen.getByTestId('product-name-1')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
      expect(screen.getByTestId('product-seller-1')).toHaveTextContent(
        'Arewa Fresh Farms'
      );
      expect(screen.getByTestId('product-category-1')).toHaveTextContent(
        'Fresh Vegetables'
      );
      expect(screen.getByTestId('product-price-1')).toHaveTextContent(
        '₦18,500 / crate'
      );
      expect(screen.getByTestId('product-quantity-1')).toHaveTextContent(
        '35 crates'
      );
      expect(screen.getByTestId('product-status-badge-1')).toHaveTextContent(
        'Published'
      );

      // Product 3 (Unverified Capsicum - Unpublished)
      expect(screen.getByTestId('product-name-3')).toHaveTextContent(
        'Unverified Exotic Capsicum'
      );
      expect(screen.getByTestId('product-status-badge-3')).toHaveTextContent(
        'Unpublished'
      );

      // Product 4 (Spoiled Greens - Removed / Soft-deleted)
      expect(screen.getByTestId('product-name-4')).toHaveTextContent(
        'Spoiled Leafy Greens'
      );
      expect(screen.getByTestId('product-status-badge-4')).toHaveTextContent(
        'Removed'
      );
    });

    it('renders appropriate action buttons depending on listing status', async () => {
      render(
        <TestWrapper>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('products-table')).toBeInTheDocument();
      });

      // Product 1 (Published): View, Unpublish, Remove
      expect(screen.getByTestId('view-product-btn-1')).toBeInTheDocument();
      expect(screen.getByTestId('unpublish-product-btn-1')).toBeInTheDocument();
      expect(screen.getByTestId('remove-product-btn-1')).toBeInTheDocument();
      expect(
        screen.queryByTestId('publish-product-btn-1')
      ).not.toBeInTheDocument();

      // Product 3 (Unpublished): View, Publish, Remove
      expect(screen.getByTestId('view-product-btn-3')).toBeInTheDocument();
      expect(screen.getByTestId('publish-product-btn-3')).toBeInTheDocument();
      expect(screen.getByTestId('remove-product-btn-3')).toBeInTheDocument();
      expect(
        screen.queryByTestId('unpublish-product-btn-3')
      ).not.toBeInTheDocument();

      // Product 4 (Removed/Deleted): Only View (Unpublish and Remove disabled/hidden)
      expect(screen.getByTestId('view-product-btn-4')).toBeInTheDocument();
      expect(
        screen.queryByTestId('unpublish-product-btn-4')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('publish-product-btn-4')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('remove-product-btn-4')
      ).not.toBeInTheDocument();
    });
  });

  describe('2. Search, Status & Category Filtering (ADM-04)', () => {
    it('queries products by search input keyword', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('products-table')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-products-input');
      await user.type(searchInput, 'Tomatoes');

      await waitFor(() => {
        expect(adminService.getProducts).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Tomatoes',
          })
        );
      });
    });

    it('filters products by publication status', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('products-table')).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId('filter-status-select');
      await user.selectOptions(statusSelect, 'unpublished');

      await waitFor(() => {
        expect(adminService.getProducts).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'unpublished',
          })
        );
      });
    });

    it('filters products by category dropdown and resets with clear filters button', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('products-table')).toBeInTheDocument();
      });

      const categorySelect = screen.getByTestId('filter-category-select');
      await user.selectOptions(categorySelect, 'peppers-spices');

      await waitFor(() => {
        expect(adminService.getProducts).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'peppers-spices',
          })
        );
      });

      // Reset button should now be visible
      const resetBtn = screen.getByTestId('clear-filters-btn');
      expect(resetBtn).toBeInTheDocument();

      await user.click(resetBtn);

      await waitFor(() => {
        expect(adminService.getProducts).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
          })
        );
      });
      expect(categorySelect).toHaveValue('all');
    });
  });

  describe('3. View Product Details Modal (Figma Section 14)', () => {
    it('opens modal on View button click displaying full produce details', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('view-product-btn-1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('view-product-btn-1'));

      await waitFor(() => {
        expect(screen.getByTestId('view-product-modal')).toBeInTheDocument();
      });

      expect(screen.getByTestId('modal-product-name')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
      expect(screen.getByTestId('modal-product-price')).toHaveTextContent(
        '₦18,500 / crate'
      );
      expect(screen.getByTestId('modal-product-stock')).toHaveTextContent(
        '35 crates'
      );
      expect(screen.getByTestId('modal-product-seller')).toHaveTextContent(
        'Arewa Fresh Farms'
      );
      expect(screen.getByTestId('modal-product-category')).toHaveTextContent(
        'Fresh Vegetables'
      );
      expect(screen.getByTestId('modal-product-description')).toHaveTextContent(
        'Firm, sun-ripened Northern Nigerian Roma tomatoes in 25kg crates.'
      );

      // Close modal
      await user.click(screen.getByTestId('modal-close-btn'));

      await waitFor(() => {
        expect(
          screen.queryByTestId('view-product-modal')
        ).not.toBeInTheDocument();
      });
    });

    it('shows moderation note in modal for flagged or unpublished products', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('view-product-btn-3')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('view-product-btn-3'));

      await waitFor(() => {
        expect(
          screen.getByTestId('modal-moderation-reason-block')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByTestId('modal-moderation-reason-block')
      ).toHaveTextContent(
        'Inaccurate produce photos and unverified certification claims.'
      );
    });
  });

  describe('4. Product Moderation Actions (ADM-04, BR-10)', () => {
    it('unpublishes an active listing with moderation reason upon confirmation', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('unpublish-product-btn-1')
        ).toBeInTheDocument();
      });

      // Click Unpublish
      await user.click(screen.getByTestId('unpublish-product-btn-1'));

      // Confirm dialog appears
      await waitFor(() => {
        expect(
          screen.getByTestId('product-action-confirm-dialog')
        ).toBeInTheDocument();
      });
      expect(screen.getByText('Unpublish Product Listing')).toBeInTheDocument();

      // Enter optional moderation reason
      const reasonInput = screen.getByLabelText(
        /Moderation Reason \(Optional\/Recommended\)/i
      );
      await user.type(reasonInput, 'Misleading weight claims');

      // Click confirm button
      const confirmBtn = screen.getByTestId(
        'product-action-confirm-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(adminService.unpublishProduct).toHaveBeenCalledWith(
          1,
          'Misleading weight claims'
        );
      });

      // Row status changes to Unpublished
      await waitFor(() => {
        expect(screen.getByTestId('product-status-badge-1')).toHaveTextContent(
          'Unpublished'
        );
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('successfully unpublished')
      );
    });

    it('re-publishes an unpublished listing', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('publish-product-btn-3')).toBeInTheDocument();
      });

      // Click Publish
      await user.click(screen.getByTestId('publish-product-btn-3'));

      // Confirm dialog appears
      await waitFor(() => {
        expect(
          screen.getByTestId('product-action-confirm-dialog')
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText('Re-publish Product Listing')
      ).toBeInTheDocument();

      // Confirm action
      const confirmBtn = screen.getByTestId(
        'product-action-confirm-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(adminService.publishProduct).toHaveBeenCalledWith(3);
      });

      // Row status badge updates to Published
      await waitFor(() => {
        expect(screen.getByTestId('product-status-badge-3')).toHaveTextContent(
          'Published'
        );
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('successfully published')
      );
    });

    it('removes (soft-deletes) product per BR-10 when admin confirms removal', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('remove-product-btn-2')).toBeInTheDocument();
      });

      // Click Remove
      await user.click(screen.getByTestId('remove-product-btn-2'));

      // Confirm dialog appears with BR-10 explanation
      await waitFor(() => {
        expect(
          screen.getByTestId('product-action-confirm-dialog')
        ).toBeInTheDocument();
      });
      expect(screen.getByText('Remove Product Listing')).toBeInTheDocument();

      // Click confirm remove button
      const confirmBtn = screen.getByTestId(
        'product-action-confirm-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(adminService.removeProduct).toHaveBeenCalledWith(2, '');
      });

      // Row status updates to Removed
      await waitFor(() => {
        expect(screen.getByTestId('product-status-badge-2')).toHaveTextContent(
          'Removed'
        );
      });

      // Action buttons for unpublish and remove are no longer displayed for deleted items
      expect(
        screen.queryByTestId('remove-product-btn-2')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('unpublish-product-btn-2')
      ).not.toBeInTheDocument();

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('successfully removed and soft-deleted')
      );
    });
  });

  describe('5. Error Handling, Empty State & Refresh', () => {
    it('displays error state with retry button when fetching fails', async () => {
      adminService.getProducts.mockRejectedValueOnce(
        new Error('Network error loading products')
      );

      render(
        <TestWrapper>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('products-error-state')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Network error loading products')
      ).toBeInTheDocument();

      // Click Retry
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId('products-table')).toBeInTheDocument();
      });
    });

    it('displays empty state when no products match search criteria', async () => {
      adminService.getProducts.mockResolvedValueOnce({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1 },
      });

      render(
        <TestWrapper>
          <AdminProducts />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('products-empty-state')).toBeInTheDocument();
      });

      expect(screen.getByText('No Products Found')).toBeInTheDocument();
    });
  });
});
