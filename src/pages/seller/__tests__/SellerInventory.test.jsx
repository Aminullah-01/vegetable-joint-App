import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SellerInventory } from '../SellerInventory';
import { sellerService } from '../../../services/sellerService';
import { categoryService } from '../../../services/categoryService';
import { AuthContext } from '../../../context/authContextDef';
import { ToastContext } from '../../../context/toastContextDef';

/**
 * Task FE-088 / SEL-08: Inventory Page & Quick Inline Stock Update
 *
 * SRS References:
 * - SEL-08: The Inventory view shall list the seller’s products with current stock, unit, price,
 *           availability and last-updated time, and allow quick stock updates.
 * - SEL-09: The Inventory view shall flag low stock (default threshold 5 units, configurable per product).
 * - SEL-07: Automatic availability derivation (stock > 0 -> Available; stock = 0 -> Out of Stock) and manual toggle.
 * - SEL-14: Object-level authorization (sellers only see and update their own produce).
 * - AUTH-03, ADM-03: Publishing and inventory update restrictions for pending/suspended sellers.
 * - TC-21: Seller updates stock to 0 -> Product shows "Out of Stock"; Add to Cart disabled.
 * - Figma Section 13: Seller Dashboard Inventory view with quick stock editing and low-stock highlights.
 */

const mockApprovedSeller = {
  id: 2,
  name: 'Bello Ibrahim',
  email: 'seller@example.com',
  role: 'seller',
  seller_id: 1,
  approval_status: 'approved',
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Produce',
    approval_status: 'approved',
  },
};

const mockPendingSeller = {
  id: 3,
  name: 'Pending Farmer',
  email: 'pending@example.com',
  role: 'seller',
  seller_id: 2,
  approval_status: 'pending',
  seller: {
    id: 2,
    business_name: 'Kano Green Agro',
    approval_status: 'pending',
  },
};

const mockCategories = [
  { id: 1, name: 'Leafy Greens', slug: 'leafy-greens' },
  { id: 2, name: 'Root Vegetables', slug: 'root-vegetables' },
  { id: 3, name: 'Peppers & Tomatoes', slug: 'peppers-tomatoes' },
];

const mockProductList = [
  {
    id: 101,
    seller_id: 1,
    name: 'Fresh Spinach (Alayahu)',
    description: 'Farm-fresh organic spinach harvested daily in Kaduna.',
    category_id: 1,
    category: { id: 1, name: 'Leafy Greens', slug: 'leafy-greens' },
    price: 800,
    quantity: 25,
    unit: 'bunch',
    availability: 'in_stock',
    is_available: true,
    low_stock_threshold: 5,
    image: 'https://example.com/spinach.jpg',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-25T14:30:00Z',
  },
  {
    id: 102,
    seller_id: 1,
    name: 'Red Ripe Tomatoes',
    description: 'Firm and sweet basket of Jos tomatoes.',
    category_id: 3,
    category: { id: 3, name: 'Peppers & Tomatoes', slug: 'peppers-tomatoes' },
    price: 4500,
    quantity: 4,
    unit: 'basket',
    availability: 'low_stock',
    is_available: true,
    low_stock_threshold: 5,
    image: 'https://example.com/tomatoes.jpg',
    created_at: '2026-10-02T09:00:00Z',
    updated_at: '2026-10-26T10:15:00Z',
  },
  {
    id: 103,
    seller_id: 1,
    name: 'Scotch Bonnet Pepper (Ata Rodo)',
    description: 'Extra fiery hot red habanero peppers.',
    category_id: 3,
    category: { id: 3, name: 'Peppers & Tomatoes', slug: 'peppers-tomatoes' },
    price: 3000,
    quantity: 0,
    unit: 'basket',
    availability: 'out_of_stock',
    is_available: false,
    low_stock_threshold: 5,
    image: null,
    created_at: '2026-10-03T11:00:00Z',
    updated_at: '2026-10-27T16:45:00Z',
  },
  {
    id: 104,
    seller_id: 1,
    name: 'Sweet Orange Carrots',
    description: 'Crisp northern carrots direct from farm.',
    category_id: 2,
    category: { id: 2, name: 'Root Vegetables', slug: 'root-vegetables' },
    price: 1500,
    quantity: 50,
    unit: 'kg',
    availability: 'unavailable',
    is_available: false,
    low_stock_threshold: 10,
    image: null,
    created_at: '2026-10-04T12:00:00Z',
    updated_at: '2026-10-28T09:00:00Z',
  },
];

function renderSellerInventory({
  user = mockApprovedSeller,
  toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() },
} = {}) {
  const authContextValue = {
    user,
    isAuthenticated: true,
    isSeller: true,
    isAdmin: false,
    isBuyer: false,
  };

  const toastContextValue = toast;

  return {
    toast,
    ...render(
      <AuthContext.Provider value={authContextValue}>
        <ToastContext.Provider value={toastContextValue}>
          <MemoryRouter initialEntries={['/seller/inventory']}>
            <SellerInventory />
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
  };
}

renderSellerInventory.propTypes = {
  user: PropTypes.object,
  toast: PropTypes.object,
};

describe('FE-088 / SEL-08: Seller Inventory Page & Quick Inline Stock Update', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(
      mockCategories
    );

    vi.spyOn(sellerService, 'getSellerProducts').mockResolvedValue({
      data: JSON.parse(JSON.stringify(mockProductList)),
      meta: {
        total: 4,
        current_page: 1,
        last_page: 1,
        per_page: 10,
      },
    });

    vi.spyOn(sellerService, 'updateProductStock').mockImplementation(
      async (id, data) => {
        const product = mockProductList.find((p) => p.id === Number(id));
        if (!product) throw new Error('Product not found');
        return {
          ...product,
          ...data,
          updated_at: new Date().toISOString(),
        };
      }
    );
  });

  describe('1. Inventory Table Rendering & Product Data (SEL-08)', () => {
    it('renders page title, subtitle, refresh button, and add produce action', async () => {
      renderSellerInventory();

      expect(screen.getByTestId('seller-inventory-page')).toBeInTheDocument();
      expect(screen.getByTestId('inventory-title')).toHaveTextContent(
        /Inventory Management/i
      );
      expect(screen.getByTestId('inventory-subtitle')).toHaveTextContent(
        /Real-time stock tracking/i
      );
      expect(screen.getByTestId('inventory-refresh-btn')).toBeInTheDocument();
      expect(
        screen.getByTestId('inventory-add-product-link')
      ).toBeInTheDocument();
    });

    it('renders all required table headers: Produce, Price, Stock, Unit, Availability, Last Updated, Actions', async () => {
      renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('inventory-table')).toBeInTheDocument();
      });

      const table = screen.getByTestId('inventory-table');
      expect(
        within(table).getByRole('columnheader', { name: /Produce \/ Name/i })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Unit Price/i })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', {
          name: /Current Stock \(SEL-08\)/i,
        })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /^Unit$/i })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', {
          name: /Availability \(SEL-07\)/i,
        })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Last Updated/i })
      ).toBeInTheDocument();
      expect(
        within(table).getByRole('columnheader', { name: /Actions/i })
      ).toBeInTheDocument();
    });

    it('displays product details with accurate prices, units, and availability badges', async () => {
      renderSellerInventory();

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-product-name-101')
        ).toHaveTextContent('Fresh Spinach (Alayahu)');
      });

      // Price formatted in ₦
      expect(screen.getByTestId('inventory-price-101')).toHaveTextContent(
        '₦800'
      );
      expect(
        screen.getByTestId('inventory-stock-amount-101')
      ).toHaveTextContent('25');
      expect(screen.getByTestId('inventory-unit-101')).toHaveTextContent(
        'bunch'
      );

      // Links
      expect(screen.getByTestId('inventory-view-link-101')).toHaveAttribute(
        'href',
        '/products/101'
      );
      expect(screen.getByTestId('inventory-edit-link-101')).toHaveAttribute(
        'href',
        '/seller/products/101/edit'
      );
    });
  });

  describe('2. KPI Summary Cards (SEL-08, SEL-09)', () => {
    it('displays live KPI metrics: Total, In Stock, Low Stock, and Out of Stock', async () => {
      renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('inventory-kpi-bar')).toBeInTheDocument();
      });

      // Total listings = 4
      expect(screen.getByTestId('kpi-total-products')).toHaveTextContent('4');

      // Healthy In Stock = 1 (Spinach qty 25 > 5, available; Carrots is unavailable)
      expect(screen.getByTestId('kpi-in-stock')).toHaveTextContent('1');

      // Low Stock = 1 (Tomatoes qty 4 <= 5, available)
      expect(screen.getByTestId('kpi-low-stock')).toHaveTextContent('1');

      // Out of Stock = 1 (Peppers qty 0)
      expect(screen.getByTestId('kpi-out-of-stock')).toHaveTextContent('1');
    });
  });

  describe('3. Stock Flags: Low Stock and Out of Stock (SEL-09, SEL-07, TC-21)', () => {
    it('flags produce with quantity <= threshold with Low Stock warning tag (SEL-09)', async () => {
      renderSellerInventory();

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-low-stock-warning-102')
        ).toBeInTheDocument();
      });

      const warningTag = screen.getByTestId('inventory-low-stock-warning-102');
      expect(warningTag).toHaveTextContent(/Low \(≤ 5\)/i);

      // Healthy stock does NOT show warning tag
      expect(
        screen.queryByTestId('inventory-low-stock-warning-101')
      ).not.toBeInTheDocument();
    });

    it('flags produce with 0 quantity with Out of Stock warning tag (SEL-07, TC-21)', async () => {
      renderSellerInventory();

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-out-of-stock-warning-103')
        ).toBeInTheDocument();
      });

      const outOfStockTag = screen.getByTestId(
        'inventory-out-of-stock-warning-103'
      );
      expect(outOfStockTag).toHaveTextContent(/Out of Stock/i);
    });
  });

  describe('4. Quick Inline Stock Update (SEL-08, TC-21)', () => {
    it('opens inline editor when clicking Quick Edit button', async () => {
      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('edit-stock-btn-101')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-stock-btn-101'));

      // Editor controls should appear
      expect(screen.getByTestId('inline-stock-input-101')).toBeInTheDocument();
      expect(screen.getByTestId('inline-stock-input-101')).toHaveValue(25);
      expect(
        screen.getByTestId('inline-stock-increment-101')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('inline-stock-decrement-101')
      ).toBeInTheDocument();
      expect(screen.getByTestId('save-stock-btn-101')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-stock-btn-101')).toBeInTheDocument();
    });

    it('adjusts stock using increment (+) and decrement (-) stepper buttons', async () => {
      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('edit-stock-btn-101')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-stock-btn-101'));
      const input = screen.getByTestId('inline-stock-input-101');

      // Click + button -> 26
      await user.click(screen.getByTestId('inline-stock-increment-101'));
      expect(input).toHaveValue(26);

      // Click - button -> 25
      await user.click(screen.getByTestId('inline-stock-decrement-101'));
      expect(input).toHaveValue(25);
    });

    it('cancels inline stock edit and restores display without modifying data', async () => {
      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('edit-stock-btn-101')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-stock-btn-101'));
      await user.click(screen.getByTestId('inline-stock-increment-101'));

      // Click cancel
      await user.click(screen.getByTestId('cancel-stock-btn-101'));

      // Editor should close and stock should remain original
      expect(
        screen.queryByTestId('inline-stock-input-101')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('inventory-stock-amount-101')
      ).toHaveTextContent('25');
      expect(sellerService.updateProductStock).not.toHaveBeenCalled();
    });

    it('validates empty stock input and displays validation error', async () => {
      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('edit-stock-btn-101')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-stock-btn-101'));
      const input = screen.getByTestId('inline-stock-input-101');

      await user.clear(input);
      await user.click(screen.getByTestId('save-stock-btn-101'));

      expect(screen.getByTestId('inline-stock-error-101')).toHaveTextContent(
        /Stock quantity is required/i
      );
      expect(sellerService.updateProductStock).not.toHaveBeenCalled();
    });

    it('validates negative or non-integer stock input (A-10)', async () => {
      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('edit-stock-btn-101')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-stock-btn-101'));
      const input = screen.getByTestId('inline-stock-input-101');

      await user.clear(input);
      await user.type(input, '-5');
      await user.click(screen.getByTestId('save-stock-btn-101'));

      expect(screen.getByTestId('inline-stock-error-101')).toHaveTextContent(
        /Stock must be a whole number ≥ 0/i
      );
      expect(sellerService.updateProductStock).not.toHaveBeenCalled();
    });

    it('successfully saves new stock value and notifies user with toast feedback (SEL-08)', async () => {
      const user = userEvent.setup();
      const { toast } = renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('edit-stock-btn-101')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-stock-btn-101'));
      const input = screen.getByTestId('inline-stock-input-101');

      await user.clear(input);
      await user.type(input, '30');
      await user.click(screen.getByTestId('save-stock-btn-101'));

      await waitFor(() => {
        expect(sellerService.updateProductStock).toHaveBeenCalledWith(101, {
          quantity: 30,
        });
      });

      // Updated value in table
      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-stock-amount-101')
        ).toHaveTextContent('30');
      });

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(
          /Stock for "Fresh Spinach \(Alayahu\)" updated to 30 bunch/i
        )
      );
    });

    it('updating stock to 0 automatically updates availability badge to Out of Stock (SEL-07, TC-21, BR-01)', async () => {
      const user = userEvent.setup();
      const { toast } = renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('edit-stock-btn-101')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-stock-btn-101'));
      const input = screen.getByTestId('inline-stock-input-101');

      await user.clear(input);
      await user.type(input, '0');
      await user.click(screen.getByTestId('save-stock-btn-101'));

      await waitFor(() => {
        expect(sellerService.updateProductStock).toHaveBeenCalledWith(101, {
          quantity: 0,
        });
      });

      // Toast mentions automatic Out of Stock derivation
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/automatically Out of Stock/i)
      );

      // Row should now show Out of Stock warning
      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-out-of-stock-warning-101')
        ).toBeInTheDocument();
      });
    });

    it('handles stock update failure with rollback and error notification (ERR-01)', async () => {
      const user = userEvent.setup();
      const { toast } = renderSellerInventory();

      sellerService.updateProductStock.mockRejectedValueOnce(
        new Error('Network error: Database timeout')
      );

      await waitFor(() => {
        expect(screen.getByTestId('edit-stock-btn-101')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-stock-btn-101'));
      const input = screen.getByTestId('inline-stock-input-101');

      await user.clear(input);
      await user.type(input, '99');
      await user.click(screen.getByTestId('save-stock-btn-101'));

      await waitFor(() => {
        expect(screen.getByTestId('inline-stock-error-101')).toHaveTextContent(
          /Database timeout/i
        );
      });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Database timeout/i)
      );
    });
  });

  describe('5. Quick Availability Toggle Switch (SEL-07)', () => {
    it('toggles product availability between active and unavailable', async () => {
      const user = userEvent.setup();
      const { toast } = renderSellerInventory();

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-availability-toggle-101')
        ).toBeInTheDocument();
      });

      // Spinach is currently active (checked) -> turn off to unavailable
      const toggle = screen.getByTestId('inventory-availability-toggle-101');
      expect(toggle).toBeChecked();

      await user.click(toggle);

      await waitFor(() => {
        expect(sellerService.updateProductStock).toHaveBeenCalledWith(101, {
          availability: 'unavailable',
        });
      });

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/marked Unavailable/i)
      );
    });
  });

  describe('6. Search, Filter, Sort & Reset Controls (SEL-08)', () => {
    it('filters inventory by search query', async () => {
      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-search-input')
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('inventory-search-input');
      await user.type(searchInput, 'Spinach');

      await waitFor(() => {
        expect(sellerService.getSellerProducts).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Spinach',
          })
        );
      });
    });

    it('filters inventory by category', async () => {
      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-category-filter')
        ).toBeInTheDocument();
      });

      const categorySelect = screen.getByTestId('inventory-category-filter');
      await user.selectOptions(categorySelect, 'leafy-greens');

      await waitFor(() => {
        expect(sellerService.getSellerProducts).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'leafy-greens',
          })
        );
      });
    });

    it('filters inventory by stock level', async () => {
      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-stock-filter')
        ).toBeInTheDocument();
      });

      const stockSelect = screen.getByTestId('inventory-stock-filter');
      await user.selectOptions(stockSelect, 'low_stock');

      await waitFor(() => {
        expect(sellerService.getSellerProducts).toHaveBeenCalledWith(
          expect.objectContaining({
            availability: 'low_stock',
          })
        );
      });
    });

    it('sorts inventory by chosen sort option', async () => {
      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('inventory-sort-select')).toBeInTheDocument();
      });

      const sortSelect = screen.getByTestId('inventory-sort-select');
      await user.selectOptions(sortSelect, 'stock_desc');

      await waitFor(() => {
        expect(sellerService.getSellerProducts).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: 'stock_desc',
          })
        );
      });
    });

    it('resets filters when clicking Reset Filters button', async () => {
      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-search-input')
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('inventory-search-input');
      await user.type(searchInput, 'Carrots');

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-reset-filters-btn')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('inventory-reset-filters-btn'));

      expect(searchInput).toHaveValue('');
    });
  });

  describe('7. Refresh and Manual Reload Flow', () => {
    it('manually refreshes inventory when clicking Refresh button', async () => {
      const user = userEvent.setup();
      const { toast } = renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('inventory-refresh-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('inventory-refresh-btn'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringMatching(/refreshed successfully/i)
        );
      });
    });
  });

  describe('8. Empty States & Error Handling', () => {
    it('displays error state with retry button when initial fetch fails', async () => {
      sellerService.getSellerProducts.mockRejectedValueOnce(
        new Error('Failed to connect to backend server')
      );

      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('inventory-error-state')).toBeInTheDocument();
      });

      expect(screen.getByText(/Unable to Load Inventory/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Failed to connect to backend server/i)
      ).toBeInTheDocument();

      // Retry
      sellerService.getSellerProducts.mockResolvedValueOnce({
        data: mockProductList,
        meta: { total: 4, current_page: 1, last_page: 1, per_page: 10 },
      });

      await user.click(screen.getByTestId('inventory-retry-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('inventory-table')).toBeInTheDocument();
      });
    });

    it('displays empty state when seller has no produce listed', async () => {
      sellerService.getSellerProducts.mockResolvedValueOnce({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1, per_page: 10 },
      });

      renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('inventory-empty-state')).toBeInTheDocument();
      });

      expect(screen.getByText(/Your inventory is empty/i)).toBeInTheDocument();
      expect(screen.getByTestId('inventory-empty-add-btn')).toBeInTheDocument();
    });

    it('displays search empty state when active filters match 0 items', async () => {
      const user = userEvent.setup();
      renderSellerInventory();

      await waitFor(() => {
        expect(screen.getByTestId('inventory-table')).toBeInTheDocument();
      });

      sellerService.getSellerProducts.mockResolvedValue({
        data: [],
        meta: { total: 0, current_page: 1, last_page: 1, per_page: 10 },
      });

      const searchInput = screen.getByTestId('inventory-search-input');
      await user.type(searchInput, 'NonExistent');

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-search-empty')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/No produce match your filter criteria/i)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('inventory-search-empty-reset')
      ).toBeInTheDocument();
    });
  });

  describe('9. Seller Approval Guard (AUTH-03, ADM-03)', () => {
    it('disables quick stock editing and displays restriction notice for pending sellers', async () => {
      const user = userEvent.setup();
      renderSellerInventory({
        user: mockPendingSeller,
      });

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-restricted-notice')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          /Stock updates are disabled until your seller account is approved/i
        )
      ).toBeInTheDocument();

      // Quick Edit button should be disabled
      const quickEditBtn = screen.getByTestId('edit-stock-btn-101');
      expect(quickEditBtn).toBeDisabled();

      // Clicking disabled button doesn't trigger edit mode
      await user.click(quickEditBtn);
      expect(
        screen.queryByTestId('inline-stock-input-101')
      ).not.toBeInTheDocument();
    });

    it('disables availability toggle switch for pending sellers', async () => {
      renderSellerInventory({
        user: mockPendingSeller,
      });

      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-availability-toggle-101')
        ).toBeInTheDocument();
      });

      const toggle = screen.getByTestId('inventory-availability-toggle-101');
      expect(toggle).toBeDisabled();
    });
  });
});
