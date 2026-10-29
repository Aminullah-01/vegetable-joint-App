import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SellerProductForm } from '../SellerProductForm';
import { AuthContext } from '../../../context/authContextDef';
import { ToastContext } from '../../../context/toastContextDef';
import { sellerService } from '../../../services/sellerService';
import { categoryService } from '../../../services/categoryService';
import { mockStore } from '../../../data/mockStore';

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

const mockExistingProduct = {
  id: 42,
  seller_id: 1,
  category_id: 2,
  name: 'Jos Green Bell Peppers',
  description:
    'Crisp green bell peppers grown in the fertile plains of Jos plateau.',
  price: 1800,
  unit: 'kg',
  quantity: 45,
  low_stock_threshold: 5,
  availability: 'in_stock',
  image: 'https://images.unsplash.com/sample-peppers.jpg',
  category: {
    id: 2,
    name: 'Pepper',
    slug: 'pepper',
  },
};

const mockCategories = [
  { id: 1, name: 'Tomato', slug: 'tomato' },
  { id: 2, name: 'Pepper', slug: 'pepper' },
  { id: 3, name: 'Leafy Greens', slug: 'leafy-greens' },
  { id: 4, name: 'Onion', slug: 'onion' },
];

function renderEditProductForm({
  user = mockApprovedSeller,
  productId = '42',
  toast = { success: vi.fn(), error: vi.fn() },
} = {}) {
  const authContextValue = {
    user,
    isAuthenticated: Boolean(user),
    isLoading: false,
  };

  const toastContextValue = {
    showToast: vi.fn(),
    success: toast.success,
    error: toast.error,
  };

  function DummyProductsList() {
    return <div data-testid="seller-products-list-page">My Products Page</div>;
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

renderEditProductForm.propTypes = {
  user: PropTypes.object,
  productId: PropTypes.string,
  toast: PropTypes.shape({
    success: PropTypes.func,
    error: PropTypes.func,
  }),
};

describe('FE-085 / SEL-03, SEL-06: Edit Product Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(
      mockCategories
    );
    vi.spyOn(sellerService, 'getProductById').mockResolvedValue(
      mockExistingProduct
    );
    global.URL.createObjectURL = vi.fn(
      () => 'blob:http://localhost/test-preview'
    );
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('1. Form Loading & Data Pre-population (SEL-03, TC-20)', () => {
    it('displays loading state while product is being loaded', async () => {
      // Delay response to check loading indicator
      vi.spyOn(sellerService, 'getProductById').mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockExistingProduct), 80)
          )
      );

      renderEditProductForm();

      expect(screen.getByTestId('product-form-loading')).toBeInTheDocument();
      expect(
        screen.getByText(/Loading vegetable listing details\.\.\./i)
      ).toBeInTheDocument();

      // Wait for product details to load
      expect(await screen.findByTestId('product-form-title')).toHaveTextContent(
        'Edit Vegetable Listing #42'
      );
    });

    it('pre-populates all existing product attributes accurately', async () => {
      renderEditProductForm();

      expect(await screen.findByTestId('product-name-input')).toHaveValue(
        'Jos Green Bell Peppers'
      );
      expect(screen.getByTestId('product-category-select')).toHaveValue('2');
      expect(screen.getByTestId('product-price-input')).toHaveValue(1800);
      expect(screen.getByTestId('product-unit-select')).toHaveValue('kg');
      expect(screen.getByTestId('product-quantity-input')).toHaveValue(45);
      expect(screen.getByTestId('product-threshold-input')).toHaveValue(5);
      expect(screen.getByTestId('product-description-input')).toHaveValue(
        'Crisp green bell peppers grown in the fertile plains of Jos plateau.'
      );
      expect(screen.getByTestId('product-availability-select')).toHaveValue(
        'available'
      );
      expect(
        screen.getByTestId('product-derived-availability-label')
      ).toHaveTextContent(/Available \(In Stock\)/i);
      expect(screen.getByTestId('save-product-submit-btn')).toHaveTextContent(
        'Update Listing'
      );
    });
  });

  describe('2. Editing Price and Stock Fields (SEL-03, TC-20, TC-21)', () => {
    it('allows updating product price and quantity, saving changes with success feedback', async () => {
      const updateSpy = vi
        .spyOn(sellerService, 'updateProduct')
        .mockResolvedValue({
          ...mockExistingProduct,
          price: 2200,
          quantity: 60,
        });

      const user = userEvent.setup();
      const { toast } = renderEditProductForm();

      const priceInput = await screen.findByTestId('product-price-input');
      const qtyInput = screen.getByTestId('product-quantity-input');

      // Change price to ₦2,200 and quantity to 60
      await user.clear(priceInput);
      await user.type(priceInput, '2200');

      await user.clear(qtyInput);
      await user.type(qtyInput, '60');

      // Submit form
      const submitBtn = screen.getByTestId('save-product-submit-btn');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          '42',
          expect.objectContaining({
            name: 'Jos Green Bell Peppers',
            price: 2200,
            quantity: 60,
            unit: 'kg',
            category_id: 2,
          })
        );
      });

      // Verify success feedback (SEL-03)
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('updated successfully (SEL-03)')
      );

      // Verify redirection to /seller/products
      expect(
        await screen.findByTestId('seller-products-list-page')
      ).toBeInTheDocument();
    });

    it('updates stock to 0 and immediately reflects "Out of Stock" (TC-21, SEL-07)', async () => {
      const user = userEvent.setup();
      renderEditProductForm();

      const qtyInput = await screen.findByTestId('product-quantity-input');
      await user.clear(qtyInput);
      await user.type(qtyInput, '0');

      expect(
        screen.getByTestId('product-derived-availability-label')
      ).toHaveTextContent(/Out of Stock \(Automatic\)/i);
    });

    it('allows manual toggling of availability to "Unavailable" to delist product', async () => {
      const user = userEvent.setup();
      renderEditProductForm();

      const availSelect = await screen.findByTestId(
        'product-availability-select'
      );
      await user.selectOptions(availSelect, 'unavailable');

      expect(
        screen.getByTestId('product-derived-availability-label')
      ).toHaveTextContent(/Unavailable \(Hidden from buyers\)/i);
    });
  });

  describe('3. Price Snapshot Rule on Past Orders (SEL-06, BR-03)', () => {
    it('verifies price change does not mutate snapshot price of existing order items', () => {
      // Find an order referencing product #1
      const sampleOrder = mockStore.orders.find((o) =>
        o.items?.some((item) => item.product_id === 1)
      );
      expect(sampleOrder).toBeDefined();

      const orderItem = sampleOrder.items.find((item) => item.product_id === 1);
      const originalSnapshotPrice = orderItem.unit_price;

      // Update product price via mockStore
      mockStore.updateProduct(1, { price: 9999 });
      const updatedProduct = mockStore.getProductById(1);
      expect(updatedProduct.price).toBe(9999);

      // Verify order snapshot price remains untouched (SEL-06)
      const orderAfterUpdate = mockStore.getOrderById(sampleOrder.id);
      const orderItemAfter = orderAfterUpdate.items.find(
        (item) => item.product_id === 1
      );
      expect(orderItemAfter.unit_price).toBe(originalSnapshotPrice);
      expect(orderItemAfter.unit_price).not.toBe(9999);
    });
  });

  describe('4. Validation and Resilience in Edit Mode (UI-05, NFR-USAB-05)', () => {
    it('prevents update when price is set to 0 or negative and displays inline error', async () => {
      const updateSpy = vi.spyOn(sellerService, 'updateProduct');
      const user = userEvent.setup();
      renderEditProductForm();

      // Wait for existing produce details to be loaded
      expect(
        await screen.findByDisplayValue('Jos Green Bell Peppers')
      ).toBeInTheDocument();

      const priceInput = screen.getByTestId('product-price-input');
      await user.clear(priceInput);
      await user.type(priceInput, '0');

      const submitBtn = screen.getByTestId('save-product-submit-btn');
      await user.click(submitBtn);

      expect(updateSpy).not.toHaveBeenCalled();
      expect(
        await screen.findByText(/Price must be greater than ₦0 \(SEL-02\)/i)
      ).toBeInTheDocument();
    });

    it('surfaces error banner if server fails to update product', async () => {
      vi.spyOn(sellerService, 'updateProduct').mockRejectedValue(
        new Error('Database deadlock on product update')
      );

      const user = userEvent.setup();
      renderEditProductForm();

      // Wait for existing produce details to be loaded
      expect(
        await screen.findByDisplayValue('Jos Green Bell Peppers')
      ).toBeInTheDocument();

      const submitBtn = screen.getByTestId('save-product-submit-btn');
      await user.click(submitBtn);

      expect(
        await screen.findByTestId('product-form-error-alert')
      ).toHaveTextContent('Database deadlock on product update');
    });
  });

  describe('5. Error State When Product Is Not Found (ERR-01)', () => {
    it('renders "Listing Not Found" view with back link when product ID is invalid', async () => {
      vi.spyOn(sellerService, 'getProductById').mockRejectedValue(
        new Error('Product not found or soft deleted')
      );

      renderEditProductForm({ productId: '999999' });

      expect(
        await screen.findByTestId('product-not-found-state')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Product not found or soft deleted/i)
      ).toBeInTheDocument();
      expect(screen.getByTestId('product-error-back-link')).toHaveAttribute(
        'href',
        '/seller/products'
      );
    });
  });

  describe('6. Publishing Lock for Unapproved Sellers (AUTH-03, ADM-03)', () => {
    it('locks edit form and prevents unapproved seller from submitting edits', async () => {
      const pendingSeller = {
        ...mockApprovedSeller,
        approval_status: 'pending',
        seller_profile: {
          approval_status: 'pending',
        },
      };

      renderEditProductForm({ user: pendingSeller });

      expect(
        await screen.findByTestId('product-form-publishing-locked')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Your seller account is not currently approved/i)
      ).toBeInTheDocument();

      const disabledBtn = screen.getByTestId('save-product-submit-btn');
      expect(disabledBtn).toBeDisabled();
      expect(disabledBtn).toHaveTextContent(
        /Publishing Disabled \(Pending Approval\)/i
      );
    });
  });
});
