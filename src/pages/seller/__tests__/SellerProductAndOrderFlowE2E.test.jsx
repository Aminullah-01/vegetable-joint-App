import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  within,
  cleanup,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';

import { Navbar } from '../../../components/common/Navbar';
import { SellerProducts } from '../SellerProducts';
import { SellerProductForm } from '../SellerProductForm';
import { SellerOrders } from '../SellerOrders';
import { SellerOrderDetail } from '../SellerOrderDetail';
import { Products } from '../../public/Products';
import { ProductDetails } from '../../public/ProductDetails';
import { ProtectedRoute } from '../../../routes/ProtectedRoute';

import { AuthProvider, CartProvider, ToastProvider } from '../../../context';
import { mockStore } from '../../../data/mockStore';
import { mockSwitch } from '../../../services/mockSwitch';
import { sellerService } from '../../../services/sellerService';

// Approved Seller 1 (Arewa Fresh Farms)
const mockSellerUser1 = {
  id: 2,
  seller_id: 1,
  name: 'Ibrahim Danladi',
  email: 'seller@arewafarms.ng',
  phone: '+2348031234567',
  role: 'seller',
  status: 'active',
  seller: {
    id: 1,
    user_id: 2,
    business_name: 'Arewa Fresh Farms',
    location: 'Gombe',
    approval_status: 'approved',
  },
  seller_profile: {
    id: 1,
    user_id: 2,
    business_name: 'Arewa Fresh Farms',
    location: 'Gombe',
    approval_status: 'approved',
  },
};

// Approved Seller 2 (Green Harvest Cooperative)
const mockSellerUser2 = {
  id: 3,
  seller_id: 2,
  name: 'Chidinma Okafor',
  email: 'seller@greenharvest.ng',
  phone: '+2348023456789',
  role: 'seller',
  status: 'active',
  seller: {
    id: 2,
    user_id: 3,
    business_name: 'Green Harvest Cooperative',
    location: 'Kaduna',
    approval_status: 'approved',
  },
  seller_profile: {
    id: 2,
    user_id: 3,
    business_name: 'Green Harvest Cooperative',
    location: 'Kaduna',
    approval_status: 'approved',
  },
};

/**
 * End-to-End Test Harness for Seller Product and Order Workflows
 */
function SellerJourneyApp({
  initialEntries = ['/seller/products'],
  initialUser = mockSellerUser1,
}) {
  if (initialUser) {
    localStorage.setItem('vegetable_joint_user', JSON.stringify(initialUser));
    localStorage.setItem('vegetable_joint_token', 'mock-seller-jwt-token');
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Navbar />
            <Routes>
              {/* Public Marketplace Catalog & Details */}
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetails />} />

              {/* Protected Seller Dashboard Pages */}
              <Route element={<ProtectedRoute allowedRoles={['seller']} />}>
                <Route path="/seller/products" element={<SellerProducts />} />
                <Route
                  path="/seller/products/new"
                  element={<SellerProductForm />}
                />
                <Route
                  path="/seller/products/:id/edit"
                  element={<SellerProductForm />}
                />
                <Route path="/seller/orders" element={<SellerOrders />} />
                <Route
                  path="/seller/orders/:id"
                  element={<SellerOrderDetail />}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

SellerJourneyApp.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
  initialUser: PropTypes.object,
};

describe('FE-115 E2E: Seller Product and Order Flow (TC-19 to TC-24)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockSwitch.setMockMode(true);
    mockStore.reset();
    mockStore.currentUser = { ...mockSellerUser1 };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    mockSwitch.reset();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // TC-19: Seller adds product (SEL-02, MKT-04)
  // ---------------------------------------------------------------------------
  describe('TC-19: Seller adds product (SEL-02, MKT-04)', () => {
    it('creates product and makes it visible in the marketplace', async () => {
      const user = userEvent.setup();

      render(<SellerJourneyApp initialEntries={['/seller/products/new']} />);

      // Wait for form title
      expect(
        await screen.findByRole('heading', {
          name: /Add New Vegetable Listing/i,
        })
      ).toBeInTheDocument();

      // Fill in all mandatory fields (SEL-02)
      const nameInput = screen.getByTestId('product-name-input');
      const categorySelect = screen.getByTestId('product-category-select');
      const priceInput = screen.getByTestId('product-price-input');
      const unitSelect = screen.getByTestId('product-unit-select');
      const qtyInput = screen.getByTestId('product-quantity-input');
      const descInput = screen.getByTestId('product-description-input');
      const submitBtn = screen.getByTestId('save-product-submit-btn');

      await user.clear(nameInput);
      await user.type(nameInput, 'Zaria Fresh Green Cabbage');

      await user.selectOptions(categorySelect, '2'); // Pepper or category
      await user.clear(priceInput);
      await user.type(priceInput, '1600');

      await user.selectOptions(unitSelect, 'basket');
      await user.clear(qtyInput);
      await user.type(qtyInput, '35');

      await user.clear(descInput);
      await user.type(
        descInput,
        'Crisp, freshly harvested organic green cabbage directly from Zaria farms.'
      );

      // Submit creation form
      await user.click(submitBtn);

      // Form submits and redirects to /seller/products
      expect(
        await screen.findByTestId('seller-products-page')
      ).toBeInTheDocument();

      // Newly added product is listed in the seller dashboard
      expect(
        await screen.findByText('Zaria Fresh Green Cabbage')
      ).toBeInTheDocument();

      // Verify product is publicly visible in marketplace catalog (MKT-04)
      const newProductInStore = mockStore.products.find(
        (p) => p.name === 'Zaria Fresh Green Cabbage'
      );
      expect(newProductInStore).toBeDefined();
      expect(newProductInStore.price).toBe(1600);
      expect(newProductInStore.quantity).toBe(35);
      expect(newProductInStore.seller_id).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // TC-20: Seller edits product (SEL-03)
  // ---------------------------------------------------------------------------
  describe('TC-20: Seller edits product (SEL-03)', () => {
    it('persists changes and updates publicly displayed details', async () => {
      const user = userEvent.setup();

      // Product 1 initially exists with price 2500
      render(<SellerJourneyApp initialEntries={['/seller/products/1/edit']} />);

      // Wait for edit form to pre-populate product 1 details
      expect(await screen.findByTestId('product-form-title')).toHaveTextContent(
        /Edit Vegetable Listing #1/i
      );

      const nameInput = screen.getByTestId('product-name-input');
      const priceInput = screen.getByTestId('product-price-input');
      const qtyInput = screen.getByTestId('product-quantity-input');
      const submitBtn = screen.getByTestId('save-product-submit-btn');

      expect(nameInput).toHaveValue('Fresh Roma Tomatoes');
      expect(priceInput).toHaveValue(2500);

      // Edit name, price and quantity (SEL-03)
      await user.clear(nameInput);
      await user.type(nameInput, 'Organic Sun-Ripened Roma Tomatoes');

      await user.clear(priceInput);
      await user.type(priceInput, '3200');

      await user.clear(qtyInput);
      await user.type(qtyInput, '55');

      // Submit edit form
      await user.click(submitBtn);

      // Redirects to seller products list
      expect(
        await screen.findByTestId('seller-products-page')
      ).toBeInTheDocument();

      // Updated product reflects in store
      const updatedProduct = mockStore.products.find((p) => p.id === 1);
      expect(updatedProduct.name).toBe('Organic Sun-Ripened Roma Tomatoes');
      expect(updatedProduct.price).toBe(3200);
      expect(updatedProduct.quantity).toBe(55);

      // Verify publicly displayed detail page shows updated name and price
      cleanup();
      render(
        <SellerJourneyApp initialEntries={['/products/1']} initialUser={null} />
      );

      expect(await screen.findByTestId('product-name')).toHaveTextContent(
        'Organic Sun-Ripened Roma Tomatoes'
      );
      expect(screen.getByTestId('product-price')).toHaveTextContent('₦3,200');
      expect(screen.getByTestId('product-stock')).toHaveTextContent(
        '55 available'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // TC-21: Seller updates stock to 0 (SEL-07, SEL-08)
  // ---------------------------------------------------------------------------
  describe('TC-21: Seller updates stock to 0 (SEL-07, SEL-08)', () => {
    it('displays Out of Stock and disables Add to Cart when stock is updated to 0', async () => {
      const user = userEvent.setup();

      render(<SellerJourneyApp initialEntries={['/seller/products/1/edit']} />);

      expect(
        await screen.findByTestId('product-form-title')
      ).toBeInTheDocument();

      const qtyInput = screen.getByTestId('product-quantity-input');
      const submitBtn = screen.getByTestId('save-product-submit-btn');

      // Update quantity to 0
      await user.clear(qtyInput);
      await user.type(qtyInput, '0');

      // Derived label automatically indicates Out of Stock (SEL-07)
      expect(
        screen.getByTestId('product-derived-availability-label')
      ).toHaveTextContent(/Out of Stock \(Automatic\)/i);

      // Save changes
      await user.click(submitBtn);

      expect(
        await screen.findByTestId('seller-products-page')
      ).toBeInTheDocument();

      // Check public product details page as buyer
      cleanup();
      render(
        <SellerJourneyApp initialEntries={['/products/1']} initialUser={null} />
      );

      expect(await screen.findByTestId('product-name')).toBeInTheDocument();

      // Availability badge reflects Out of Stock (SEL-07, MKT-06)
      const badges = screen.getAllByTestId('availability-badge');
      expect(badges[0]).toHaveTextContent(/out of stock/i);

      // Add to Cart button is disabled (SEL-08, CART-01)
      const addToCartBtn = screen.getByTestId('add-to-cart-button');
      expect(addToCartBtn).toBeDisabled();
      expect(addToCartBtn).toHaveTextContent(/out of stock/i);
    });
  });

  // ---------------------------------------------------------------------------
  // TC-22: Seller deletes product with past orders (SEL-04, BR-10)
  // ---------------------------------------------------------------------------
  describe('TC-22: Seller deletes product with past orders (SEL-04, BR-10)', () => {
    it('hides deleted product from marketplace while preserving past orders intact', async () => {
      const user = userEvent.setup();

      // Verify Product 1 is referenced in Order 1
      const order1 = mockStore.orders.find((o) => o.id === 1);
      expect(order1).toBeDefined();
      expect(order1.items.some((it) => it.product_id === 1)).toBe(true);

      render(<SellerJourneyApp initialEntries={['/seller/products']} />);

      // Wait for seller products page
      expect(
        await screen.findByTestId('seller-products-page')
      ).toBeInTheDocument();

      // Find delete button for product 1
      const deleteBtn = await screen.findByTestId('product-delete-btn-1');
      await user.click(deleteBtn);

      // Delete confirmation dialog opens with warning about preserving past orders (SEL-04, BR-10)
      const dialog = await screen.findByTestId('delete-product-confirm-dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent(/Fresh Roma Tomatoes/i);
      expect(dialog).toHaveTextContent(
        /Past orders referencing this vegetable will not be affected/i
      );

      // Confirm deletion
      const confirmDeleteBtn = within(dialog).getByRole('button', {
        name: /Delete Vegetable/i,
      });
      await user.click(confirmDeleteBtn);

      // Product row 1 is removed from the active seller products list
      await waitFor(() => {
        expect(screen.queryByTestId('product-row-1')).not.toBeInTheDocument();
      });

      // Verify product is soft-deleted in store (deleted_at is set, not physically deleted)
      const rawProduct = mockStore.products.find((p) => p.id === 1);
      expect(rawProduct.deleted_at).toBeTruthy();

      // Public marketplace details page returns 404 Product Not Found
      cleanup();
      render(
        <SellerJourneyApp initialEntries={['/products/1']} initialUser={null} />
      );

      expect(await screen.findByText(/Product not found/i)).toBeInTheDocument();

      // Past order in Seller Order Detail still displays past order snapshot cleanly (BR-10)
      cleanup();
      render(
        <SellerJourneyApp
          initialEntries={['/seller/orders/1']}
          initialUser={mockSellerUser1}
        />
      );

      expect(await screen.findByTestId('order-number')).toHaveTextContent(
        'VJ-20260220-001'
      );
      expect(screen.getByTestId('order-items-table')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // TC-23: Seller views orders (SEL-10)
  // ---------------------------------------------------------------------------
  describe('TC-23: Seller views orders (SEL-10)', () => {
    it('lists only orders containing the seller own products with buyer and delivery details', async () => {
      render(<SellerJourneyApp initialEntries={['/seller/orders']} />);

      expect(
        await screen.findByTestId('seller-orders-page')
      ).toBeInTheDocument();

      // Seller 1 orders (1, 4, 5, 6) are visible
      expect(
        await screen.findByTestId('seller-order-row-1')
      ).toBeInTheDocument();
      expect(screen.getByTestId('seller-order-row-5')).toBeInTheDocument();

      // Seller 2 order (Order 2) and Seller 3 order (Order 3) must NOT be listed (SEL-10, SEL-14)
      expect(
        screen.queryByTestId('seller-order-row-2')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('seller-order-row-3')
      ).not.toBeInTheDocument();

      // Verify buyer name, phone, delivery address, and items are displayed (SEL-10)
      const order1Row = screen.getByTestId('seller-order-row-1');
      expect(
        within(order1Row).getByTestId('seller-order-buyer-1')
      ).toHaveTextContent('Amina Bello');
      expect(
        within(order1Row).getByTestId('seller-order-phone-1')
      ).toHaveTextContent('+2348078901234');
      expect(
        within(order1Row).getByTestId('seller-order-address-1')
      ).toHaveTextContent(/12 Ahmadu Bello Way, Victoria Island, Lagos/i);
      expect(
        within(order1Row).getByTestId('seller-order-items-1')
      ).toHaveTextContent(/Fresh Roma Tomatoes/i);

      // Object-level authorization check: direct access to another seller's order is blocked (SEL-14)
      cleanup();
      render(
        <SellerJourneyApp
          initialEntries={['/seller/orders/2']}
          initialUser={mockSellerUser1}
        />
      );

      expect(
        await screen.findByTestId('seller-order-unauthorized')
      ).toBeInTheDocument();
      expect(screen.getByText(/Access Denied \(SEL-14\)/i)).toBeInTheDocument();

      // Seller 2 is authorized to view their own order 2 (SEL-10, SEL-14)
      cleanup();
      mockStore.currentUser = { ...mockSellerUser2 };
      render(
        <SellerJourneyApp
          initialEntries={['/seller/orders/2']}
          initialUser={mockSellerUser2}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-number')).toHaveTextContent(
          'VJ-20260221-002'
        );
      });
      expect(
        screen.queryByTestId('seller-order-unauthorized')
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // TC-24: Seller advances order status along lifecycle (SEL-11, ORD-05, ORD-06)
  // ---------------------------------------------------------------------------
  describe('TC-24: Seller advances order status along lifecycle (SEL-11, ORD-05, ORD-06)', () => {
    it('advances order Pending → Confirmed → Processing → Ready → Completed and logs history', async () => {
      const user = userEvent.setup();

      // Order 5 starts with status 'pending'
      expect(mockStore.orders.find((o) => o.id === 5).status).toBe('pending');

      render(<SellerJourneyApp initialEntries={['/seller/orders/5']} />);

      await waitFor(() => {
        expect(screen.getByTestId('order-number')).toHaveTextContent(
          'VJ-20260224-005'
        );
      });

      // Verify initial status is Pending
      expect(screen.getByTestId('order-header-status-badge')).toHaveTextContent(
        /pending/i
      );

      // Step 1: Advance Pending → Confirmed
      const advanceBtn1 = screen.getByTestId('advance-status-btn');
      expect(advanceBtn1).toHaveTextContent(/Confirm Order/i);
      await user.click(advanceBtn1);

      await waitFor(() => {
        expect(
          screen.getByTestId('order-header-status-badge')
        ).toHaveTextContent(/confirmed/i);
      });
      expect(mockStore.orders.find((o) => o.id === 5).status).toBe('confirmed');

      // Step 2: Advance Confirmed → Processing
      const advanceBtn2 = await screen.findByTestId('advance-status-btn');
      expect(advanceBtn2).toHaveTextContent(/Start Processing/i);
      await user.click(advanceBtn2);

      await waitFor(() => {
        expect(
          screen.getByTestId('order-header-status-badge')
        ).toHaveTextContent(/processing/i);
      });
      expect(mockStore.orders.find((o) => o.id === 5).status).toBe(
        'processing'
      );

      // Step 3: Advance Processing → Ready
      const advanceBtn3 = await screen.findByTestId('advance-status-btn');
      expect(advanceBtn3).toHaveTextContent(/Mark Ready for Delivery/i);
      await user.click(advanceBtn3);

      await waitFor(() => {
        expect(
          screen.getByTestId('order-header-status-badge')
        ).toHaveTextContent(/ready/i);
      });
      expect(mockStore.orders.find((o) => o.id === 5).status).toBe('ready');

      // Step 4: Advance Ready → Completed
      const advanceBtn4 = await screen.findByTestId('advance-status-btn');
      expect(advanceBtn4).toHaveTextContent(/Complete Order/i);
      await user.click(advanceBtn4);

      await waitFor(() => {
        expect(
          screen.getByTestId('order-header-status-badge')
        ).toHaveTextContent(/completed/i);
      });
      expect(mockStore.orders.find((o) => o.id === 5).status).toBe('completed');

      // Completed is terminal; advance button removed and terminal notice shown
      expect(
        await screen.findByTestId('terminal-status-notice')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('advance-status-btn')
      ).not.toBeInTheDocument();

      // Verify status history timeline entries logged (ORD-06)
      const orderHistory = mockStore.orders.find(
        (o) => o.id === 5
      ).status_history;
      expect(orderHistory.length).toBeGreaterThanOrEqual(4);
      const recordedStatuses = orderHistory.map((h) => h.to_status);
      expect(recordedStatuses).toContain('confirmed');
      expect(recordedStatuses).toContain('processing');
      expect(recordedStatuses).toContain('ready');
      expect(recordedStatuses).toContain('completed');

      // Invalid status jump test (ORD-05): jumping directly from completed to pending is rejected
      await expect(
        sellerService.updateOrderStatus(5, 'pending')
      ).rejects.toThrow(/Invalid order status transition/i);
    });
  });

  // ---------------------------------------------------------------------------
  // Full End-to-End Seller Product and Order Lifecycle Flow
  // ---------------------------------------------------------------------------
  describe('Full End-to-End Seller Flow', () => {
    it('executes complete flow from product creation to order completion smoothly', async () => {
      const user = userEvent.setup();

      // 1. Seller opens Add Product form
      render(<SellerJourneyApp initialEntries={['/seller/products/new']} />);

      expect(
        await screen.findByRole('heading', {
          name: /Add New Vegetable Listing/i,
        })
      ).toBeInTheDocument();

      // 2. Fill form and submit
      await user.type(
        screen.getByTestId('product-name-input'),
        'Kaduna Crisp Cucumbers'
      );
      await user.selectOptions(
        screen.getByTestId('product-category-select'),
        '2'
      );
      await user.type(screen.getByTestId('product-price-input'), '1200');
      await user.selectOptions(screen.getByTestId('product-unit-select'), 'kg');
      await user.type(screen.getByTestId('product-quantity-input'), '40');
      await user.type(
        screen.getByTestId('product-description-input'),
        'Cool and crisp greenhouse cucumbers.'
      );

      await user.click(screen.getByTestId('save-product-submit-btn'));

      // 3. Listed in seller products
      expect(
        await screen.findByTestId('seller-products-page')
      ).toBeInTheDocument();
      expect(
        await screen.findByText('Kaduna Crisp Cucumbers')
      ).toBeInTheDocument();

      // 4. Seller checks incoming orders
      cleanup();
      render(<SellerJourneyApp initialEntries={['/seller/orders']} />);
      expect(
        await screen.findByTestId('seller-orders-page')
      ).toBeInTheDocument();

      // 5. Open order 1 and advance through fulfillment
      cleanup();
      render(<SellerJourneyApp initialEntries={['/seller/orders/1']} />);
      await waitFor(() => {
        expect(screen.getByTestId('order-number')).toHaveTextContent(
          'VJ-20260220-001'
        );
      });

      // Order 1 starts at confirmed -> advance to processing
      const advanceBtn = await screen.findByTestId('advance-status-btn');
      await user.click(advanceBtn);

      await waitFor(() => {
        expect(
          screen.getByTestId('order-header-status-badge')
        ).toHaveTextContent(/processing/i);
      });
    });
  });
});
