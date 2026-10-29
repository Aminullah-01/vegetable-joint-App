import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AdminCategories } from '../AdminCategories';
import { categoryService } from '../../../services/categoryService';
import { ToastContext } from '../../../context/toastContextDef';

// Mock sample categories conforming to ADM-05, BR-09, TC-31, and schema
const mockCategoriesList = [
  {
    id: 1,
    name: 'Tomato',
    slug: 'tomato',
    description: 'Fresh farm tomatoes, plum, cherry, and paste varieties.',
    is_active: true,
    products_count: 5, // in-use
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Pepper',
    slug: 'pepper',
    description: 'Peppers including habanero (ata rodo), tatashe, and chilli.',
    is_active: true,
    products_count: 8, // in-use
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Leafy Greens',
    slug: 'leafy-greens',
    description: 'Ugwu, waterleaf, spinach, and other fresh green herbs.',
    is_active: false, // inactive, but in use
    products_count: 3,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-03T00:00:00Z',
  },
  {
    id: 4,
    name: 'Exotic Herbs & Microgreens',
    slug: 'exotic-herbs-microgreens',
    description:
      'Specialty culinary herbs, basil, dill, and hydroponic microgreens.',
    is_active: false,
    products_count: 0, // unused
    created_at: '2026-01-05T00:00:00Z',
    updated_at: '2026-01-05T00:00:00Z',
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
      <MemoryRouter initialEntries={['/admin/categories']}>
        <Routes>
          <Route path="/admin/categories" element={children} />
        </Routes>
      </MemoryRouter>
    </ToastContext.Provider>
  );
}

TestWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  toastMocks: PropTypes.object,
};

describe('FE-100 / ADM-05: Admin Categories Management Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(
      JSON.parse(JSON.stringify(mockCategoriesList))
    );

    vi.spyOn(categoryService, 'createCategory').mockImplementation(
      async (data) => {
        const nextId = 5;
        return {
          id: nextId,
          name: data.name,
          slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
          description: data.description || '',
          is_active: data.is_active !== false,
          products_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    );

    vi.spyOn(categoryService, 'updateCategory').mockImplementation(
      async (id, data) => {
        const found = mockCategoriesList.find((c) => c.id === Number(id));
        return {
          ...found,
          ...data,
          updated_at: new Date().toISOString(),
        };
      }
    );

    vi.spyOn(categoryService, 'deactivateCategory').mockImplementation(
      async (id) => {
        const found = mockCategoriesList.find((c) => c.id === Number(id));
        return {
          ...found,
          is_active: false,
          updated_at: new Date().toISOString(),
        };
      }
    );

    vi.spyOn(categoryService, 'reactivateCategory').mockImplementation(
      async (id) => {
        const found = mockCategoriesList.find((c) => c.id === Number(id));
        return {
          ...found,
          is_active: true,
          updated_at: new Date().toISOString(),
        };
      }
    );

    vi.spyOn(categoryService, 'deleteCategory').mockImplementation(
      async (id) => {
        const found = mockCategoriesList.find((c) => c.id === Number(id));
        if (found && found.products_count > 0) {
          const error = new Error(
            'Cannot delete category that contains active products (BR-09). You may deactivate it instead.'
          );
          error.status = 409;
          error.code = 'CONFLICT';
          throw error;
        }
        return { message: 'Category deleted successfully.' };
      }
    );
  });

  describe('1. Categories Table & Listing (ADM-05, Figma Section 14)', () => {
    it('renders categories table with counts, names, slugs, descriptions, and statuses', async () => {
      render(
        <TestWrapper>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('categories-table')).toBeInTheDocument();
      });

      // Header summary badges
      expect(screen.getByTestId('categories-total-badge')).toHaveTextContent(
        '4 categories'
      );
      expect(screen.getByTestId('categories-active-badge')).toHaveTextContent(
        '2 active'
      );
      expect(screen.getByTestId('categories-inactive-badge')).toHaveTextContent(
        '2 inactive'
      );

      // Check Tomato category (in use, active)
      expect(screen.getByTestId('category-name-1')).toHaveTextContent('Tomato');
      expect(screen.getByTestId('category-slug-1')).toHaveTextContent('tomato');
      expect(screen.getByTestId('category-desc-1')).toHaveTextContent(
        /Fresh farm tomatoes/i
      );
      expect(screen.getByTestId('category-products-count-1')).toHaveTextContent(
        '5 products'
      );
      expect(screen.getByTestId('category-status-badge-1')).toHaveTextContent(
        'Active'
      );

      // Check Exotic Herbs category (unused, inactive)
      expect(screen.getByTestId('category-name-4')).toHaveTextContent(
        'Exotic Herbs & Microgreens'
      );
      expect(screen.getByTestId('category-products-count-4')).toHaveTextContent(
        '0 products (Unused)'
      );
      expect(screen.getByTestId('category-status-badge-4')).toHaveTextContent(
        'Inactive'
      );
    });

    it('renders appropriate action buttons for active vs inactive categories', async () => {
      render(
        <TestWrapper>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('categories-table')).toBeInTheDocument();
      });

      // Active category (Tomato): Edit, Deactivate, Delete
      expect(screen.getByTestId('edit-category-btn-1')).toBeInTheDocument();
      expect(
        screen.getByTestId('deactivate-category-btn-1')
      ).toBeInTheDocument();
      expect(screen.getByTestId('delete-category-btn-1')).toBeInTheDocument();

      // Inactive category (Leafy Greens): Edit, Reactivate, Delete
      expect(screen.getByTestId('edit-category-btn-3')).toBeInTheDocument();
      expect(
        screen.getByTestId('reactivate-category-btn-3')
      ).toBeInTheDocument();
      expect(screen.getByTestId('delete-category-btn-3')).toBeInTheDocument();
    });
  });

  describe('2. Search, Status & Usage Filtering (ADM-05)', () => {
    it('filters categories by search keyword matching name or description', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('categories-table')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-categories-input');
      await user.type(searchInput, 'Pepper');

      // Tomato and Leafy Greens should be filtered out
      expect(screen.getByTestId('category-name-2')).toHaveTextContent('Pepper');
      expect(screen.queryByTestId('category-name-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('category-name-3')).not.toBeInTheDocument();
    });

    it('filters categories by status (active vs inactive)', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('categories-table')).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId('filter-status-select');
      await user.selectOptions(statusSelect, 'inactive');

      // Only inactive categories should be displayed (3 and 4)
      expect(screen.queryByTestId('category-name-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('category-name-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('category-name-3')).toBeInTheDocument();
      expect(screen.getByTestId('category-name-4')).toBeInTheDocument();
    });

    it('filters categories by usage (in-use vs unused) and resets filters', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('categories-table')).toBeInTheDocument();
      });

      const usageSelect = screen.getByTestId('filter-usage-select');
      await user.selectOptions(usageSelect, 'unused');

      // Only category 4 has 0 products
      expect(screen.getByTestId('category-name-4')).toBeInTheDocument();
      expect(screen.queryByTestId('category-name-1')).not.toBeInTheDocument();

      // Clear filters button resets
      const resetBtn = screen.getByTestId('clear-filters-btn');
      expect(resetBtn).toBeInTheDocument();

      await user.click(resetBtn);

      expect(screen.getByTestId('category-name-1')).toBeInTheDocument();
      expect(screen.getByTestId('category-name-2')).toBeInTheDocument();
    });
  });

  describe('3. Create Category (ADM-05)', () => {
    it('validates required name field and prevents submitting blank name', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('add-category-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-category-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('category-modal')).toBeInTheDocument();
      });

      // Click save with empty name
      await user.click(screen.getByTestId('category-modal-save-btn'));

      expect(screen.getByTestId('category-name-error')).toHaveTextContent(
        /Category name is required/i
      );
      expect(categoryService.createCategory).not.toHaveBeenCalled();
    });

    it('validates unique category name to prevent duplicate creation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('add-category-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-category-btn'));

      // Enter an already existing name: 'Tomato'
      const nameInput = screen.getByTestId('category-name-input');
      await user.type(nameInput, 'Tomato');

      await user.click(screen.getByTestId('category-modal-save-btn'));

      expect(screen.getByTestId('category-name-error')).toHaveTextContent(
        /already exists/i
      );
      expect(categoryService.createCategory).not.toHaveBeenCalled();
    });

    it('successfully creates new category with name, auto-slug, and description', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('add-category-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-category-btn'));

      const nameInput = screen.getByTestId('category-name-input');
      const descInput = screen.getByTestId('category-description-input');

      await user.type(nameInput, 'Carrot & Radish');
      await user.type(descInput, 'Crunchy roots from Plateau State.');

      await user.click(screen.getByTestId('category-modal-save-btn'));

      await waitFor(() => {
        expect(categoryService.createCategory).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Carrot & Radish',
            slug: 'carrot-radish',
            description: 'Crunchy roots from Plateau State.',
            is_active: true,
          })
        );
      });

      // Modal closes and success notification is shown
      await waitFor(() => {
        expect(screen.queryByTestId('category-modal')).not.toBeInTheDocument();
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('created successfully')
      );
    });
  });

  describe('4. Edit Category (ADM-05)', () => {
    it('opens edit modal pre-filled with existing data and updates category', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('edit-category-btn-1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-category-btn-1'));

      await waitFor(() => {
        expect(screen.getByTestId('category-modal')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('category-name-input');
      expect(nameInput).toHaveValue('Tomato');

      // Update name to 'Fresh Roma Tomato'
      await user.clear(nameInput);
      await user.type(nameInput, 'Fresh Roma Tomato');

      await user.click(screen.getByTestId('category-modal-save-btn'));

      await waitFor(() => {
        expect(categoryService.updateCategory).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            name: 'Fresh Roma Tomato',
          })
        );
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('updated successfully')
      );
    });
  });

  describe('5. Deactivate & Reactivate Categories (ADM-05, BR-09)', () => {
    it('prompts confirmation and deactivates an active category', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('deactivate-category-btn-1')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('deactivate-category-btn-1'));

      // Deactivation dialog appears
      await waitFor(() => {
        expect(
          screen.getByTestId('deactivate-category-confirm-dialog')
        ).toBeInTheDocument();
      });

      const confirmBtn = screen.getByTestId(
        'deactivate-category-confirm-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(categoryService.deactivateCategory).toHaveBeenCalledWith(1);
      });

      // Status badge updates to Inactive
      await waitFor(() => {
        expect(screen.getByTestId('category-status-badge-1')).toHaveTextContent(
          'Inactive'
        );
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('has been deactivated')
      );
    });

    it('reactivates an inactive category', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('reactivate-category-btn-3')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('reactivate-category-btn-3'));

      await waitFor(() => {
        expect(categoryService.reactivateCategory).toHaveBeenCalledWith(3);
      });

      // Status badge updates to Active
      await waitFor(() => {
        expect(screen.getByTestId('category-status-badge-3')).toHaveTextContent(
          'Active'
        );
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('has been activated')
      );
    });
  });

  describe('6. Delete Category Enforcement & TC-31 (ADM-05, BR-09, TC-31)', () => {
    it('blocks deletion of in-use category and offers option to deactivate instead (TC-31, BR-09)', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('delete-category-btn-1')).toBeInTheDocument();
      });

      // Category 1 (Tomato) has 5 products. Attempt delete:
      await user.click(screen.getByTestId('delete-category-btn-1'));

      // Blocked modal MUST appear per TC-31
      await waitFor(() => {
        expect(screen.getByTestId('blocked-delete-modal')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Cannot Delete Category in Use')
      ).toBeInTheDocument();
      expect(screen.getByTestId('blocked-delete-notice')).toHaveTextContent(
        /has active products/i
      );
      expect(categoryService.deleteCategory).not.toHaveBeenCalled();

      // TC-31: Option to deactivate instead
      const deactivateInsteadBtn = screen.getByTestId('deactivate-instead-btn');
      expect(deactivateInsteadBtn).toBeInTheDocument();

      await user.click(deactivateInsteadBtn);

      await waitFor(() => {
        expect(categoryService.deactivateCategory).toHaveBeenCalledWith(1);
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('deactivated instead of deleted')
      );
    });

    it('allows permanently deleting an unused category with 0 products', async () => {
      const user = userEvent.setup();
      const toastSuccess = vi.fn();

      render(
        <TestWrapper toastMocks={{ success: toastSuccess }}>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('delete-category-btn-4')).toBeInTheDocument();
      });

      // Category 4 (Exotic Herbs) has 0 products
      await user.click(screen.getByTestId('delete-category-btn-4'));

      // Confirmation dialog appears
      await waitFor(() => {
        expect(
          screen.getByTestId('delete-category-confirm-dialog')
        ).toBeInTheDocument();
      });

      const confirmBtn = screen.getByTestId(
        'delete-category-confirm-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(categoryService.deleteCategory).toHaveBeenCalledWith(4);
      });

      // Category is removed from the table
      await waitFor(() => {
        expect(screen.queryByTestId('category-name-4')).not.toBeInTheDocument();
      });

      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('permanently deleted')
      );
    });

    it('handles server 409 conflict error when deleting and surfaces the blocked notice', async () => {
      const user = userEvent.setup();

      // Force deleteCategory to reject with 409 conflict
      categoryService.deleteCategory.mockRejectedValueOnce({
        status: 409,
        code: 'CONFLICT',
        message:
          'Cannot delete category that contains active products (BR-09). You may deactivate it instead.',
      });

      render(
        <TestWrapper>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('delete-category-btn-4')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('delete-category-btn-4'));

      await waitFor(() => {
        expect(
          screen.getByTestId('delete-category-confirm-dialog')
        ).toBeInTheDocument();
      });

      const confirmBtn = screen.getByTestId(
        'delete-category-confirm-dialog-confirm-button'
      );
      await user.click(confirmBtn);

      // Blocked modal should be displayed upon server 409 rejection
      await waitFor(() => {
        expect(screen.getByTestId('blocked-delete-modal')).toBeInTheDocument();
      });
    });
  });

  describe('7. Error Handling & Empty States', () => {
    it('displays error state when fetching categories fails, and allows retry', async () => {
      categoryService.getCategories.mockRejectedValueOnce(
        new Error('Failed to load category database')
      );

      render(
        <TestWrapper>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('categories-error-state')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText('Failed to load category database')
      ).toBeInTheDocument();

      // Click retry
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId('categories-table')).toBeInTheDocument();
      });
    });

    it('displays empty state when no categories match search criteria', async () => {
      render(
        <TestWrapper>
          <AdminCategories />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('categories-table')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-categories-input');
      await userEvent.type(searchInput, 'NonExistentCategoryXYZ');

      await waitFor(() => {
        expect(
          screen.getByTestId('categories-empty-state')
        ).toBeInTheDocument();
      });

      expect(screen.getByText('No Matching Categories')).toBeInTheDocument();
    });
  });
});
