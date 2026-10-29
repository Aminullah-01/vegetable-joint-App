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
 * Task FE-086 / SEL-04: Delete Product (Soft Delete)
 *
 * SRS References:
 * - SEL-04: The system shall allow a seller to delete a product. Deletion shall be a soft delete:
 *           the product disappears from the marketplace and seller lists but remains referenced by past orders.
 * - SEL-14: A seller shall never be able to view, edit or delete another seller’s products (object-level authorization).
 * - AUTH-03, ADM-03: Publishing and editing restrictions for unapproved or suspended sellers.
 * - BR-10: Deleting a product is a soft delete; products referenced by orders are never physically removed.
 * - TC-22: Seller deletes product with past orders -> Product hidden; old orders still display correctly.
 * - Figma Section 13: Seller Dashboard Products table actions (Delete with ConfirmDialog).
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

const mockExistingProduct = {
  id: 1,
  seller_id: 1,
  name: 'Fresh Roma Tomatoes',
  category_id: 1,
  price: 2500,
  unit: 'basket',
  quantity: 40,
  low_stock_threshold: 5,
  availability: 'in_stock',
  description:
    'Crisp, vine-ripened red tomatoes directly harvested from Gombe farms.',
  image:
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
  category: { id: 1, name: 'Tomato', slug: 'tomato' },
  updated_at: '2026-02-20T10:00:00Z',
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

function renderSellerEditForm({
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

  function DummyProductsList() {
    return <div data-testid="seller-products-page">Seller Products Page</div>;
  }

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
              <Route path="/seller/products" element={<DummyProductsList />} />
            </Routes>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
  };
}

renderSellerEditForm.propTypes = {
  productId: PropTypes.string,
  user: PropTypes.object,
  toast: PropTypes.object,
};

describe('FE-086 / SEL-04: Delete Product (Soft Delete)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockStore.products.forEach((p) => {
      p.deleted_at = null;
    });
    mockStore.currentUser = null;
  });

  describe('1. Confirmation Dialog & Soft Delete from Products Table (SEL-04)', () => {
    it('opens confirm dialog when clicking delete button, and cancels without calling API', async () => {
      const deleteSpy = vi.spyOn(sellerService, 'deleteProduct');
      const user = userEvent.setup();

      renderSellerProductsPage();

      const deleteBtn = await screen.findByTestId('product-delete-btn-1');
      expect(deleteBtn).toBeInTheDocument();

      await user.click(deleteBtn);

      // Verify dialog opened with clear soft-delete and past orders warning (SEL-04, BR-10)
      const dialog = await screen.findByTestId('delete-product-confirm-dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent(/Delete Vegetable Listing/i);
      expect(dialog).toHaveTextContent(/Fresh Roma Tomatoes/i);
      expect(dialog).toHaveTextContent(
        /soft-deleted and removed from the marketplace/i
      );
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
      // Product 1 remains in the table
      expect(screen.getByTestId('product-row-1')).toBeInTheDocument();
    });

    it('confirms soft delete, removes product row, decrements count, and renders success feedback (SEL-04)', async () => {
      const deleteSpy = vi
        .spyOn(sellerService, 'deleteProduct')
        .mockResolvedValue({ message: 'Product deleted successfully.' });
      const user = userEvent.setup();

      const { toast } = renderSellerProductsPage();

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

      // Product 1 row is removed from visible table
      expect(screen.queryByTestId('product-row-1')).not.toBeInTheDocument();

      // In-page success banner is displayed
      const alert = screen.getByTestId('products-success-alert');
      expect(alert).toHaveTextContent(
        /Vegetable "Fresh Roma Tomatoes" was successfully deleted \(SEL-04\)/i
      );

      // Toast notification is also triggered
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining(
          'Vegetable "Fresh Roma Tomatoes" was successfully deleted (SEL-04)'
        )
      );
    });

    it('surfaces an error in the dialog when delete API fails, keeping dialog open and row intact (ERR-01)', async () => {
      vi.spyOn(sellerService, 'deleteProduct').mockRejectedValue(
        new Error('Network error or server timeout while deleting produce.')
      );
      const user = userEvent.setup();

      renderSellerProductsPage();

      const deleteBtn = await screen.findByTestId('product-delete-btn-1');
      await user.click(deleteBtn);

      const confirmBtn = screen.getByRole('button', {
        name: /Delete Vegetable/i,
      });
      await user.click(confirmBtn);

      // Dialog displays the error
      const errorAlert = await screen.findByTestId('delete-dialog-error');
      expect(errorAlert).toHaveTextContent(
        'Network error or server timeout while deleting produce.'
      );

      // Close dialog via cancel
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelBtn);

      // Product 1 row remains visible
      expect(screen.getByTestId('product-row-1')).toBeInTheDocument();
    });
  });

  describe('2. Delete Product from Edit Form View (SEL-04, BR-10)', () => {
    it('renders "Delete Listing" action button on edit form with modal confirmation', async () => {
      vi.spyOn(sellerService, 'getProductById').mockResolvedValue(
        mockExistingProduct
      );
      const deleteSpy = vi
        .spyOn(sellerService, 'deleteProduct')
        .mockResolvedValue({ message: 'Product deleted successfully.' });
      const user = userEvent.setup();

      const { toast } = renderSellerEditForm({ productId: '1' });

      // Wait for product details to load
      expect(
        await screen.findByDisplayValue('Fresh Roma Tomatoes')
      ).toBeInTheDocument();

      // Find the Delete Listing button on the edit form
      const editDeleteBtn = screen.getByTestId('edit-form-delete-btn');
      expect(editDeleteBtn).toBeInTheDocument();
      expect(editDeleteBtn).toHaveTextContent(/Delete Listing/i);

      await user.click(editDeleteBtn);

      // Dialog opens
      const dialog = await screen.findByTestId('delete-product-confirm-dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent(/Delete Vegetable Listing/i);

      // Confirm deletion
      const confirmBtn = screen.getByRole('button', {
        name: /Delete Vegetable/i,
      });
      await user.click(confirmBtn);

      expect(deleteSpy).toHaveBeenCalledWith('1');

      // Toast notification fires and user is redirected to /seller/products
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining(
            'Vegetable "Fresh Roma Tomatoes" was successfully deleted (SEL-04)'
          )
        );
        expect(screen.getByTestId('seller-products-page')).toBeInTheDocument();
      });
    });

    it('handles delete failure gracefully in the edit form dialog', async () => {
      vi.spyOn(sellerService, 'getProductById').mockResolvedValue(
        mockExistingProduct
      );
      vi.spyOn(sellerService, 'deleteProduct').mockRejectedValue(
        new Error('Failed to delete listing due to server error.')
      );
      const user = userEvent.setup();

      renderSellerEditForm({ productId: '1' });

      expect(
        await screen.findByDisplayValue('Fresh Roma Tomatoes')
      ).toBeInTheDocument();

      const editDeleteBtn = screen.getByTestId('edit-form-delete-btn');
      await user.click(editDeleteBtn);

      const confirmBtn = screen.getByRole('button', {
        name: /Delete Vegetable/i,
      });
      await user.click(confirmBtn);

      const dialogError = await screen.findByTestId('delete-dialog-error');
      expect(dialogError).toHaveTextContent(
        'Failed to delete listing due to server error.'
      );
    });
  });

  describe('3. Soft Deletion Guarantee & Past Orders Snapshot Integrity (BR-10, TC-22, BR-03)', () => {
    it('sets deleted_at timestamp, removes from public & seller listings, but preserves past order items', () => {
      // Find product 1 in mockStore
      const prod = mockStore.products.find((p) => p.id === 1);
      expect(prod).toBeDefined();
      expect(prod.deleted_at).toBeNull();

      // Verify product 1 is part of past order 1
      const order1 = mockStore.orders.find((o) => o.id === 1);
      expect(order1).toBeDefined();
      const orderItem = order1.items.find((item) => item.product_id === 1);
      expect(orderItem).toBeDefined();
      expect(orderItem.product_name).toBe('Fresh Roma Tomatoes');
      expect(orderItem.price).toBe(2500);

      // Execute soft delete directly on mockStore
      mockStore.currentUser = { id: 2, role: 'seller', seller_id: 1 };
      const result = mockStore.deleteProduct(1);
      expect(result.message).toMatch(/Product deleted successfully/i);

      // 1. Soft delete verification (BR-10): product is not physically removed
      expect(prod.deleted_at).not.toBeNull();
      expect(typeof prod.deleted_at).toBe('string');

      // 2. Public marketplace query excludes deleted product (SEL-04)
      const publicProducts = mockStore.getProducts();
      expect(publicProducts.data.some((p) => p.id === 1)).toBe(false);

      // 3. Seller listings query excludes deleted product (SEL-04)
      const sellerProducts = mockStore.getSellerProducts({ sellerId: 1 });
      expect(sellerProducts.data.some((p) => p.id === 1)).toBe(false);

      // 4. Single product detail throws 404 for soft deleted product (ERR-01)
      expect(() => mockStore.getProductById(1)).toThrow(/Product not found/i);

      // 5. Past orders snapshot integrity (TC-22, BR-03, BR-10):
      // The order item still has the original produce name, unit, and price snapshot
      const pastOrder = mockStore.getOrderById(1);
      const pastItem = pastOrder.items.find((item) => item.product_id === 1);
      expect(pastItem).toBeDefined();
      expect(pastItem.product_name).toBe('Fresh Roma Tomatoes');
      expect(pastItem.unit).toBe('basket');
      expect(pastItem.price).toBe(2500);
      expect(pastItem.subtotal).toBe(7500);

      // Clean up for other tests
      prod.deleted_at = null;
    });
  });

  describe('4. Authorization & Account Approval Guards (SEL-14, AUTH-03, ADM-03)', () => {
    it('blocks a seller from deleting another seller’s product (SEL-14)', () => {
      // Product 1 belongs to seller_id: 1. Let current seller be seller_id: 2
      mockStore.currentUser = { id: 3, role: 'seller', seller_id: 2 };

      expect(() => mockStore.deleteProduct(1)).toThrow(
        /You are not authorized to delete another seller’s product \(SEL-14\)/i
      );
    });

    it('disables delete action in products table and blocks delete API for unapproved/pending seller (AUTH-03, ADM-03)', async () => {
      renderSellerProductsPage({ user: mockPendingSeller });

      // Wait for table to load
      await screen.findByTestId('seller-products-table');

      // Delete buttons should be disabled
      const deleteButtons = screen.getAllByRole('button', {
        name: /^Delete$/i,
      });
      expect(deleteButtons.length).toBeGreaterThan(0);
      deleteButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });

      // Direct call on mockStore also throws approval guard
      const originalStatus = mockStore.sellers[0].approval_status;
      mockStore.sellers[0].approval_status = 'pending';
      mockStore.currentUser = { id: 2, role: 'seller', seller_id: 1 };
      try {
        expect(() => mockStore.deleteProduct(1)).toThrow(
          /Cannot delete product: seller account status is pending/i
        );
      } finally {
        mockStore.sellers[0].approval_status = originalStatus;
      }
    });
  });
});
