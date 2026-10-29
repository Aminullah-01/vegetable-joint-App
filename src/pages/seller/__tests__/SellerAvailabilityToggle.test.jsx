import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SellerProducts } from '../SellerProducts';
import { SellerProductForm } from '../SellerProductForm';
import { sellerService } from '../../../services/sellerService';
import { AuthContext } from '../../../context/authContextDef';
import { ToastContext } from '../../../context/toastContextDef';
import { mockStore } from '../../../data/mockStore';

/**
 * Task FE-087 / SEL-07: Availability Toggle
 *
 * SRS References:
 * - SEL-07: Availability shall be derived automatically: stock > 0 -> "Available"; stock = 0 -> "Out of Stock".
 *           A seller may additionally mark a product "Unavailable" manually, which hides it from purchase regardless of stock.
 * - BR-01: Effective availability: a product is purchasable only if its availability switch is on and quantity > 0
 *          and its seller is approved/active and its category is active. Quantity = 0 shows "Out of Stock".
 * - TC-21: Seller updates stock to 0 -> Product shows "Out of Stock"; Add to Cart disabled.
 * - AUTH-03, ADM-03: Publishing and editing restrictions for unapproved or suspended sellers.
 * - Figma Section 13: Seller Dashboard Products table with availability toggle switches.
 */

const mockApprovedSeller = {
  id: 2,
  name: 'Bello Farms Admin',
  email: 'seller@example.com',
  role: 'seller',
  seller_id: 1,
  approval_status: 'approved',
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
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

function renderSellerProductsPage({
  user = mockApprovedSeller,
  toast = { success: vi.fn(), error: vi.fn() },
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
          <MemoryRouter initialEntries={['/seller/products']}>
            <Routes>
              <Route path="/seller/products" element={<SellerProducts />} />
            </Routes>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
  };
}

renderSellerProductsPage.propTypes = {
  user: PropTypes.object,
  toast: PropTypes.object,
};

function renderSellerForm({
  productId = '1',
  user = mockApprovedSeller,
  toast = { success: vi.fn(), error: vi.fn() },
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
          <MemoryRouter initialEntries={[`/seller/products/${productId}/edit`]}>
            <Routes>
              <Route
                path="/seller/products/:id/edit"
                element={<SellerProductForm />}
              />
            </Routes>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
  };
}

renderSellerForm.propTypes = {
  productId: PropTypes.string,
  user: PropTypes.object,
  toast: PropTypes.object,
};

describe('FE-087 / SEL-07: Availability Toggle & Automatic Stock Derivation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockStore.products.forEach((p) => {
      p.deleted_at = null;
    });
    mockStore.currentUser = null;
  });

  describe('1. Manual Availability Toggle in Products Table (SEL-07)', () => {
    it('renders an interactive toggle switch for each product in the availability column', async () => {
      renderSellerProductsPage();

      // Product 1 (Roma Tomatoes, stock > 0, in_stock)
      const toggle1 = await screen.findByTestId(
        'product-availability-toggle-1'
      );
      expect(toggle1).toBeInTheDocument();
      expect(toggle1).toHaveAttribute('role', 'switch');
      expect(toggle1).toHaveAttribute('aria-checked', 'true');

      // Product 1 availability cell contains AvailabilityBadge
      const cell1 = screen.getByTestId('product-availability-1');
      expect(cell1).toHaveTextContent(/Available|In Stock/i);
    });

    it('toggles product OFF manually to "Unavailable" (hiding it from buyers regardless of stock)', async () => {
      const updateStockSpy = vi
        .spyOn(sellerService, 'updateProductStock')
        .mockResolvedValue({ id: 1, availability: 'unavailable' });

      const user = userEvent.setup();
      const { toast } = renderSellerProductsPage();

      const toggle1 = await screen.findByTestId(
        'product-availability-toggle-1'
      );
      expect(toggle1).toHaveAttribute('aria-checked', 'true');

      // Click to toggle switch OFF
      await user.click(toggle1);

      expect(updateStockSpy).toHaveBeenCalledWith(1, {
        availability: 'unavailable',
      });

      // Switch becomes unchecked
      expect(toggle1).toHaveAttribute('aria-checked', 'false');

      // Badge in row reflects Unavailable
      const cell1 = screen.getByTestId('product-availability-1');
      expect(cell1).toHaveTextContent(/Unavailable/i);

      // Feedback message rendered
      expect(screen.getByTestId('products-success-alert')).toHaveTextContent(
        /now marked Unavailable and hidden from marketplace buyers \(SEL-07\)/i
      );
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('marked Unavailable')
      );
    });

    it('toggles product ON manually to make it Available when stock is positive', async () => {
      // Mock product 1 initially being unavailable
      const getProductsSpy = vi
        .spyOn(sellerService, 'getSellerProducts')
        .mockResolvedValue({
          data: [
            {
              id: 1,
              seller_id: 1,
              name: 'Fresh Roma Tomatoes',
              category_id: 1,
              price: 2500,
              unit: 'basket',
              quantity: 30,
              low_stock_threshold: 5,
              availability: 'unavailable',
              category: { id: 1, name: 'Tomato' },
              updated_at: '2026-02-20T10:00:00Z',
            },
          ],
          meta: { total: 1, current_page: 1, last_page: 1, per_page: 10 },
        });

      const updateStockSpy = vi
        .spyOn(sellerService, 'updateProductStock')
        .mockResolvedValue({ id: 1, availability: 'in_stock' });

      const user = userEvent.setup();
      const { toast } = renderSellerProductsPage();

      const toggle1 = await screen.findByTestId(
        'product-availability-toggle-1'
      );
      expect(toggle1).toHaveAttribute('aria-checked', 'false');

      const cell1 = screen.getByTestId('product-availability-1');
      expect(cell1).toHaveTextContent(/Unavailable/i);

      // Click to turn ON
      await user.click(toggle1);

      expect(updateStockSpy).toHaveBeenCalledWith(1, {
        availability: 'available',
      });

      // Switch becomes ON and badge changes to In Stock / Available
      expect(toggle1).toHaveAttribute('aria-checked', 'true');
      expect(cell1).toHaveTextContent(/Available|In Stock/i);
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining(
          'is now Available for marketplace buyers (SEL-07)'
        )
      );

      getProductsSpy.mockRestore();
    });
  });

  describe('2. Auto "Out of Stock" Derivation when Quantity is 0 (SEL-07, BR-01, TC-21)', () => {
    it('automatically displays "Out of Stock" when quantity is 0 even if switch is ON', async () => {
      const getProductsSpy = vi
        .spyOn(sellerService, 'getSellerProducts')
        .mockResolvedValue({
          data: [
            {
              id: 10,
              seller_id: 1,
              name: 'Sweet Bell Pepper (Tatashe)',
              category_id: 2,
              price: 1800,
              unit: 'basket',
              quantity: 0,
              low_stock_threshold: 5,
              availability: 'out_of_stock',
              category: { id: 2, name: 'Pepper' },
              updated_at: '2026-02-20T10:00:00Z',
            },
          ],
          meta: { total: 1, current_page: 1, last_page: 1, per_page: 10 },
        });

      renderSellerProductsPage();

      const toggle10 = await screen.findByTestId(
        'product-availability-toggle-10'
      );
      expect(toggle10).toBeInTheDocument();

      const cell10 = screen.getByTestId('product-availability-10');
      expect(cell10).toHaveTextContent(/Out of Stock/i);

      // Displays auto out-of-stock hint
      const hint = screen.getByTestId('auto-out-of-stock-hint-10');
      expect(hint).toHaveTextContent(/Auto Out of Stock \(0 stock\)/i);

      getProductsSpy.mockRestore();
    });

    it('shows toast explaining auto out-of-stock when turning switch ON for a 0-stock product', async () => {
      // Mock a product with 0 stock that is currently unavailable
      const getProductsSpy = vi
        .spyOn(sellerService, 'getSellerProducts')
        .mockResolvedValue({
          data: [
            {
              id: 99,
              seller_id: 1,
              name: 'Dry Onions',
              category_id: 4,
              price: 1500,
              unit: 'bag',
              quantity: 0,
              low_stock_threshold: 5,
              availability: 'unavailable',
              category: { id: 4, name: 'Onion' },
              updated_at: '2026-02-20T10:00:00Z',
            },
          ],
          meta: { total: 1, current_page: 1, last_page: 1, per_page: 10 },
        });

      const updateStockSpy = vi
        .spyOn(sellerService, 'updateProductStock')
        .mockResolvedValue({ id: 99, availability: 'out_of_stock' });

      const user = userEvent.setup();
      const { toast } = renderSellerProductsPage();

      const toggle99 = await screen.findByTestId(
        'product-availability-toggle-99'
      );
      expect(toggle99).toHaveAttribute('aria-checked', 'false');

      // Click to turn ON
      await user.click(toggle99);

      expect(updateStockSpy).toHaveBeenCalledWith(99, {
        availability: 'available',
      });

      // Switch is ON, but badge derives to Out of Stock
      expect(toggle99).toHaveAttribute('aria-checked', 'true');
      const cell99 = screen.getByTestId('product-availability-99');
      expect(cell99).toHaveTextContent(/Out of Stock/i);

      // Hint is visible
      expect(screen.getByTestId('auto-out-of-stock-hint-99')).toHaveTextContent(
        /Auto Out of Stock \(0 stock\)/i
      );

      // Toast explains the auto-derivation rule (SEL-07, BR-01)
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining(
          'automatically Out of Stock (0 units) (SEL-07, BR-01)'
        )
      );

      getProductsSpy.mockRestore();
    });
  });

  describe('3. Availability Toggle in Add / Edit Product Form (SEL-07)', () => {
    it('synchronizes toggle switch with live derived availability in edit form', async () => {
      vi.spyOn(sellerService, 'getProductById').mockResolvedValue({
        id: 1,
        seller_id: 1,
        name: 'Fresh Roma Tomatoes',
        category_id: 1,
        price: 2500,
        unit: 'basket',
        quantity: 20,
        low_stock_threshold: 5,
        availability: 'available',
      });

      const user = userEvent.setup();
      renderSellerForm({ productId: '1' });

      // Wait for product details to load
      expect(
        await screen.findByDisplayValue('Fresh Roma Tomatoes')
      ).toBeInTheDocument();

      const formToggle = screen.getByTestId('product-availability-toggle');
      expect(formToggle).toHaveAttribute('aria-checked', 'true');

      // Check current derived status
      const statusLabel = screen.getByTestId(
        'product-derived-availability-label'
      );
      expect(statusLabel).toHaveTextContent(/Available \(In Stock\)/i);

      // Toggle switch OFF
      await user.click(formToggle);

      expect(formToggle).toHaveAttribute('aria-checked', 'false');
      expect(statusLabel).toHaveTextContent(
        /Unavailable \(Hidden from buyers\)/i
      );

      // Toggle switch back ON
      await user.click(formToggle);
      expect(formToggle).toHaveAttribute('aria-checked', 'true');
      expect(statusLabel).toHaveTextContent(/Available \(In Stock\)/i);
    });

    it('reflects "Out of Stock (Automatic)" in form when quantity is set to 0 with switch ON', async () => {
      vi.spyOn(sellerService, 'getProductById').mockResolvedValue({
        id: 1,
        seller_id: 1,
        name: 'Fresh Roma Tomatoes',
        category_id: 1,
        price: 2500,
        unit: 'basket',
        quantity: 15,
        low_stock_threshold: 5,
        availability: 'available',
      });

      const user = userEvent.setup();
      renderSellerForm({ productId: '1' });

      expect(
        await screen.findByDisplayValue('Fresh Roma Tomatoes')
      ).toBeInTheDocument();

      const qtyInput = screen.getByTestId('product-quantity-input');
      const statusLabel = screen.getByTestId(
        'product-derived-availability-label'
      );

      expect(statusLabel).toHaveTextContent(/Available \(In Stock\)/i);

      // Clear and type 0
      await user.clear(qtyInput);
      await user.type(qtyInput, '0');

      // Immediately reflects Out of Stock (Automatic) (TC-21, SEL-07)
      expect(statusLabel).toHaveTextContent(/Out of Stock \(Automatic\)/i);
    });
  });

  describe('4. Error Resilience & Revert on Failure (ERR-01)', () => {
    it('reverts switch to previous state and displays error toast if API call fails', async () => {
      vi.spyOn(sellerService, 'updateProductStock').mockRejectedValue(
        new Error('Network disconnected or server timeout.')
      );

      const user = userEvent.setup();
      const { toast } = renderSellerProductsPage();

      const toggle1 = await screen.findByTestId(
        'product-availability-toggle-1'
      );
      expect(toggle1).toHaveAttribute('aria-checked', 'true');

      // Attempt to toggle
      await user.click(toggle1);

      // Should revert back to checked: true
      await waitFor(() => {
        expect(toggle1).toHaveAttribute('aria-checked', 'true');
      });

      // Error toast fired
      expect(toast.error).toHaveBeenCalledWith(
        'Network disconnected or server timeout.'
      );
    });
  });

  describe('5. Access Control & Permission Lock for Unapproved Sellers (AUTH-03, ADM-03)', () => {
    it('disables all availability toggles when seller account is pending approval', async () => {
      renderSellerProductsPage({ user: mockPendingSeller });

      await screen.findByTestId('seller-products-table');

      const toggles = screen.getAllByRole('switch');
      expect(toggles.length).toBeGreaterThan(0);
      toggles.forEach((t) => {
        expect(t).toBeDisabled();
      });
    });
  });
});
