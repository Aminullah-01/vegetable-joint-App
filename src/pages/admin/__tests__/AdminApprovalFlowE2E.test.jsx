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
import { AdminSellers } from '../AdminSellers';
import { AdminCategories } from '../AdminCategories';
import { AdminProducts } from '../AdminProducts';
import { SellerProductForm } from '../../seller/SellerProductForm';
import { SellerProducts } from '../../seller/SellerProducts';
import { Products } from '../../public/Products';
import { ProductDetails } from '../../public/ProductDetails';
import { Login } from '../../auth/Login';
import { MyOrders } from '../../buyer/MyOrders';
import { ProtectedRoute } from '../../../routes/ProtectedRoute';

import { AuthProvider, CartProvider, ToastProvider } from '../../../context';
import { mockStore } from '../../../data/mockStore';
import { mockSwitch } from '../../../services/mockSwitch';

// Admin User (Platform Administrator)
const mockAdminUser = {
  id: 1,
  name: 'Platform Administrator',
  email: 'admin@example.com',
  phone: '+2348010000001',
  role: 'admin',
  status: 'active',
};

// Pending Seller 4 (Danbatta Agro Ventures - Musa Abdullahi)
const mockPendingSellerUser = {
  id: 5,
  name: 'Musa Abdullahi',
  email: 'pending@newfarm.ng',
  phone: '+2348067890123',
  role: 'seller',
  seller_id: 4,
  status: 'active',
  seller: {
    id: 4,
    user_id: 5,
    business_name: 'Danbatta Agro Ventures',
    location: 'Kano',
    approval_status: 'pending',
  },
  seller_profile: {
    id: 4,
    user_id: 5,
    business_name: 'Danbatta Agro Ventures',
    location: 'Kano',
    approval_status: 'pending',
  },
};

// Buyer User (Amina Bello)
const mockBuyerUser = {
  id: 6,
  name: 'Amina Bello',
  email: 'buyer@example.com',
  phone: '+2348078901234',
  role: 'buyer',
  status: 'active',
};

/**
 * End-to-End Test Harness for Admin Moderation & Approval Workflows
 */
function AdminJourneyApp({
  initialEntries = ['/admin/sellers'],
  initialUser = mockAdminUser,
}) {
  if (initialUser) {
    localStorage.setItem('vegetable_joint_user', JSON.stringify(initialUser));
    localStorage.setItem('vegetable_joint_token', 'mock-admin-jwt-token');
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Navbar />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetails />} />

              {/* Buyer Routes */}
              <Route
                element={<ProtectedRoute allowedRoles={['buyer', 'admin']} />}
              >
                <Route path="/orders" element={<MyOrders />} />
              </Route>

              {/* Seller Routes */}
              <Route
                element={<ProtectedRoute allowedRoles={['seller', 'admin']} />}
              >
                <Route path="/seller/products" element={<SellerProducts />} />
                <Route
                  path="/seller/products/new"
                  element={<SellerProductForm />}
                />
              </Route>

              {/* Admin Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/sellers" element={<AdminSellers />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/products" element={<AdminProducts />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

AdminJourneyApp.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
  initialUser: PropTypes.object,
};

describe('FE-116 E2E: Admin Approval Flow (TC-29 to TC-31)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockSwitch.setMockMode(true);
    mockStore.reset();
    mockStore.currentUser = { ...mockAdminUser };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    mockSwitch.reset();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // TC-29: Admin approves pending seller (ADM-03, AUTH-03, MKT-04)
  // ---------------------------------------------------------------------------
  describe('TC-29: Admin approves pending seller (ADM-03, AUTH-03, MKT-04)', () => {
    it('approves pending seller, enabling product publishing and public marketplace visibility', async () => {
      const user = userEvent.setup();

      // Step 1: Before approval, Seller 4 is pending and cannot publish (AUTH-03)
      const seller4Before = mockStore.sellers.find((s) => s.id === 4);
      expect(seller4Before).toBeDefined();
      expect(seller4Before.approval_status).toBe('pending');

      mockStore.currentUser = { ...mockPendingSellerUser };
      render(
        <AdminJourneyApp
          initialEntries={['/seller/products/new']}
          initialUser={mockPendingSellerUser}
        />
      );

      // Publishing locked notice is displayed (AUTH-03, ADM-03)
      expect(
        await screen.findByTestId('product-form-publishing-locked-container')
      ).toBeInTheDocument();
      expect(screen.getByTestId('save-product-submit-btn')).toBeDisabled();
      expect(
        screen.getByText(/Publishing Disabled \(Pending Approval\)/i)
      ).toBeInTheDocument();

      // Step 2: Admin navigates to /admin/sellers and approves Seller 4 (ADM-03)
      cleanup();
      mockStore.currentUser = { ...mockAdminUser };
      render(
        <AdminJourneyApp
          initialEntries={['/admin/sellers']}
          initialUser={mockAdminUser}
        />
      );

      expect(await screen.findByTestId('sellers-table')).toBeInTheDocument();

      // Locate Seller 4 row
      expect(screen.getByTestId('seller-name-4')).toHaveTextContent(
        'Danbatta Agro Ventures'
      );
      expect(screen.getByTestId('seller-status-badge-4')).toHaveTextContent(
        /Pending Review/i
      );

      // Click Approve button
      const approveBtn = screen.getByTestId('approve-seller-btn-4');
      await user.click(approveBtn);

      // Confirm dialog opens (ADM-03)
      expect(
        await screen.findByTestId('seller-action-confirm-dialog')
      ).toBeInTheDocument();
      const confirmApproveBtn = screen.getByTestId(
        'seller-action-confirm-dialog-confirm-button'
      );
      await user.click(confirmApproveBtn);

      // Seller status badge updates to Approved
      await waitFor(() => {
        expect(screen.getByTestId('seller-status-badge-4')).toHaveTextContent(
          /Approved/i
        );
      });

      // Verify store updated
      const seller4After = mockStore.sellers.find((s) => s.id === 4);
      expect(seller4After.approval_status).toBe('approved');

      // Step 3: Now approved, seller can publish listings (AUTH-03)
      cleanup();
      const approvedMusaUser = {
        ...mockPendingSellerUser,
        seller: {
          ...mockPendingSellerUser.seller,
          approval_status: 'approved',
        },
        seller_profile: {
          ...mockPendingSellerUser.seller_profile,
          approval_status: 'approved',
        },
      };
      mockStore.currentUser = { ...approvedMusaUser };

      render(
        <AdminJourneyApp
          initialEntries={['/seller/products/new']}
          initialUser={approvedMusaUser}
        />
      );

      expect(
        await screen.findByRole('heading', {
          name: /Add New Vegetable Listing/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('product-form-publishing-locked-container')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('save-product-submit-btn')).toBeEnabled();

      // Submit new vegetable listing
      await user.type(
        screen.getByTestId('product-name-input'),
        'Danbatta Fiery Red Habanero'
      );
      await user.selectOptions(
        screen.getByTestId('product-category-select'),
        '2'
      ); // Pepper
      await user.type(screen.getByTestId('product-price-input'), '1800');
      await user.selectOptions(
        screen.getByTestId('product-unit-select'),
        'basket'
      );
      await user.type(screen.getByTestId('product-quantity-input'), '45');
      await user.type(
        screen.getByTestId('product-description-input'),
        'Organically harvested fiery hot habanero peppers from Danbatta farm.'
      );

      await user.click(screen.getByTestId('save-product-submit-btn'));

      // Redirects to seller products page
      expect(
        await screen.findByTestId('seller-products-page')
      ).toBeInTheDocument();
      expect(
        await screen.findByText('Danbatta Fiery Red Habanero')
      ).toBeInTheDocument();

      // Step 4: Product is publicly visible in marketplace catalog (MKT-04)
      cleanup();
      render(
        <AdminJourneyApp initialEntries={['/products']} initialUser={null} />
      );

      expect(await screen.findByTestId('products-grid')).toBeInTheDocument();
      expect(
        screen.getByText('Danbatta Fiery Red Habanero')
      ).toBeInTheDocument();
    }, 15000);
  });

  // ---------------------------------------------------------------------------
  // TC-30: Admin suspends seller (ADM-03, AUTH-12, BR-11)
  // ---------------------------------------------------------------------------
  describe('TC-30: Admin suspends seller (ADM-03, AUTH-12, BR-11)', () => {
    it('suspends seller, delisting products from marketplace, blocking seller login while preserving open orders', async () => {
      const user = userEvent.setup();

      // Step 1: Initial state - Seller 1 is approved and products are visible
      const seller1Before = mockStore.sellers.find((s) => s.id === 1);
      expect(seller1Before.approval_status).toBe('approved');
      expect(
        mockStore
          .getProducts()
          .data.some((p) => p.name === 'Fresh Roma Tomatoes')
      ).toBe(true);

      // Step 2: Admin navigates to /admin/sellers and suspends Seller 1 (ADM-03)
      render(
        <AdminJourneyApp
          initialEntries={['/admin/sellers']}
          initialUser={mockAdminUser}
        />
      );

      expect(await screen.findByTestId('sellers-table')).toBeInTheDocument();
      expect(screen.getByTestId('seller-name-1')).toHaveTextContent(
        'Arewa Fresh Farms'
      );
      expect(screen.getByTestId('seller-status-badge-1')).toHaveTextContent(
        /Approved/i
      );

      // Click Suspend button for Seller 1
      const suspendBtn = screen.getByTestId('suspend-seller-btn-1');
      await user.click(suspendBtn);

      // Confirm Dialog opens with warning about delisting products (ADM-03, TC-30)
      expect(
        await screen.findByTestId('seller-action-confirm-dialog')
      ).toBeInTheDocument();
      const confirmSuspendBtn = screen.getByTestId(
        'seller-action-confirm-dialog-confirm-button'
      );
      await user.click(confirmSuspendBtn);

      // Status badge updates to Suspended
      await waitFor(() => {
        expect(screen.getByTestId('seller-status-badge-1')).toHaveTextContent(
          /Suspended/i
        );
      });

      // Verify seller status in data store
      expect(mockStore.sellers.find((s) => s.id === 1).approval_status).toBe(
        'suspended'
      );

      // Step 3: Suspended seller products immediately disappear from public marketplace (BR-11)
      const publicListingsAfter = mockStore.getProducts();
      expect(publicListingsAfter.data.some((p) => p.seller_id === 1)).toBe(
        false
      );

      cleanup();
      render(
        <AdminJourneyApp initialEntries={['/products']} initialUser={null} />
      );

      expect(await screen.findByTestId('products-grid')).toBeInTheDocument();
      expect(screen.queryByText('Fresh Roma Tomatoes')).not.toBeInTheDocument();

      // Step 4: Suspended seller cannot log in (AUTH-12)
      cleanup();
      render(
        <AdminJourneyApp initialEntries={['/login']} initialUser={null} />
      );

      expect(
        await screen.findByTestId('login-email-input')
      ).toBeInTheDocument();
      await user.type(
        screen.getByTestId('login-email-input'),
        'seller@arewafarms.ng'
      );
      await user.type(
        screen.getByTestId('login-password-input'),
        'password123'
      );
      await user.click(screen.getByTestId('login-submit-btn'));

      // Error banner displays account suspended notification (AUTH-12)
      expect(
        await screen.findByTestId('login-error-message')
      ).toBeInTheDocument();
      expect(screen.getByTestId('login-error-message')).toHaveTextContent(
        /suspended/i
      );
      expect(screen.getByTestId('login-error-title')).toHaveTextContent(
        /Account Suspended/i
      );

      // Step 5: Open/past orders containing seller produce remain visible to buyer (ADM-03)
      const order1 = mockStore.orders.find((o) => o.id === 1);
      expect(order1).toBeDefined();
      expect(order1.buyer_id).toBe(6);
      expect(order1.items[0].product_name).toBe('Fresh Roma Tomatoes');

      cleanup();
      mockStore.currentUser = { ...mockBuyerUser };
      render(
        <AdminJourneyApp
          initialEntries={['/orders']}
          initialUser={mockBuyerUser}
        />
      );

      expect(await screen.findByTestId('my-orders-page')).toBeInTheDocument();
      expect(await screen.findByTestId('order-card-1')).toBeInTheDocument();
    }, 15000);
  });

  // ---------------------------------------------------------------------------
  // TC-31: Admin deletes category in use -> Blocked; option to deactivate (ADM-05, BR-09)
  // ---------------------------------------------------------------------------
  describe('TC-31: Admin deletes category in use -> Blocked; option to deactivate (ADM-05, BR-09)', () => {
    it('blocks deletion of in-use category, provides deactivation option, and allows deletion of unused category', async () => {
      const user = userEvent.setup();

      render(
        <AdminJourneyApp
          initialEntries={['/admin/categories']}
          initialUser={mockAdminUser}
        />
      );

      // Wait for categories table
      expect(await screen.findByTestId('category-row-1')).toBeInTheDocument();

      // Category 1 ("Tomato") has active products
      expect(screen.getByTestId('category-name-1')).toHaveTextContent('Tomato');
      expect(screen.getByTestId('category-status-badge-1')).toHaveTextContent(
        /Active/i
      );
      expect(screen.getByTestId('category-products-count-1')).toHaveTextContent(
        /product/i
      );

      // Step 1: Admin attempts to delete category in use
      const deleteCat1Btn = screen.getByTestId('delete-category-btn-1');
      await user.click(deleteCat1Btn);

      // Step 2: Blocked modal opens citing BR-09 and TC-31
      const blockedModal = await screen.findByTestId('blocked-delete-modal');
      expect(blockedModal).toBeInTheDocument();
      expect(
        within(blockedModal).getByTestId('blocked-delete-notice')
      ).toHaveTextContent(/has active products/i);
      expect(
        within(blockedModal).getAllByText(/BR-09/i)[0]
      ).toBeInTheDocument();
      expect(
        within(blockedModal).getAllByText(/TC-31/i)[0]
      ).toBeInTheDocument();

      // Step 3: Admin selects option to deactivate category instead (ADM-05, BR-09)
      const deactivateInsteadBtn = within(blockedModal).getByTestId(
        'deactivate-instead-btn'
      );
      expect(deactivateInsteadBtn).toBeInTheDocument();
      await user.click(deactivateInsteadBtn);

      // Category status updates to Inactive
      await waitFor(() => {
        expect(screen.getByTestId('category-status-badge-1')).toHaveTextContent(
          /Inactive/i
        );
      });
      expect(mockStore.categories.find((c) => c.id === 1).is_active).toBe(
        false
      );

      // Step 4: Admin creates a new unused category and permanently deletes it
      const addCategoryBtn = screen.getByTestId('add-category-btn');
      await user.click(addCategoryBtn);

      expect(await screen.findByTestId('category-modal')).toBeInTheDocument();

      await user.type(
        screen.getByTestId('category-name-input'),
        'Zucchini Squash'
      );
      await user.type(
        screen.getByTestId('category-description-input'),
        'Tender summer squash varieties.'
      );
      await user.click(screen.getByTestId('category-modal-save-btn'));

      // New unused category appears in table
      const newCategory = mockStore.categories.find(
        (c) => c.name === 'Zucchini Squash'
      );
      expect(newCategory).toBeDefined();
      expect(
        await screen.findByTestId(`category-name-${newCategory.id}`)
      ).toHaveTextContent('Zucchini Squash');
      expect(
        screen.getByTestId(`category-products-count-${newCategory.id}`)
      ).toHaveTextContent(/0 products/i);

      // Click delete for the unused category
      const deleteUnusedBtn = screen.getByTestId(
        `delete-category-btn-${newCategory.id}`
      );
      await user.click(deleteUnusedBtn);

      // Deletion confirmation dialog opens (allowed because unused per BR-09)
      expect(
        await screen.findByTestId('delete-category-confirm-dialog')
      ).toBeInTheDocument();
      const confirmDeleteBtn = screen.getByTestId(
        'delete-category-confirm-dialog-confirm-button'
      );
      await user.click(confirmDeleteBtn);

      // Unused category is removed
      await waitFor(() => {
        expect(
          screen.queryByTestId(`category-name-${newCategory.id}`)
        ).not.toBeInTheDocument();
      });
      expect(
        mockStore.categories.find((c) => c.id === newCategory.id)
      ).toBeUndefined();
    }, 15000);
  });

  // ---------------------------------------------------------------------------
  // Full End-to-End Admin Governance Workflow
  // ---------------------------------------------------------------------------
  describe('Full End-to-End Admin Governance Workflow', () => {
    it('executes full cycle of seller approval, category guardrails, and compliance suspension', async () => {
      const user = userEvent.setup();

      // 1. Admin views sellers and approves pending applicant
      render(
        <AdminJourneyApp
          initialEntries={['/admin/sellers']}
          initialUser={mockAdminUser}
        />
      );

      expect(await screen.findByTestId('sellers-table')).toBeInTheDocument();
      await user.click(screen.getByTestId('approve-seller-btn-4'));

      expect(
        await screen.findByTestId('seller-action-confirm-dialog')
      ).toBeInTheDocument();
      await user.click(
        screen.getByTestId('seller-action-confirm-dialog-confirm-button')
      );

      await waitFor(() => {
        expect(screen.getByTestId('seller-status-badge-4')).toHaveTextContent(
          /Approved/i
        );
      });

      // 2. Admin reviews categories and enforces BR-09 guardrails
      cleanup();
      render(
        <AdminJourneyApp
          initialEntries={['/admin/categories']}
          initialUser={mockAdminUser}
        />
      );

      expect(await screen.findByTestId('category-row-2')).toBeInTheDocument();
      await user.click(screen.getByTestId('delete-category-btn-2'));

      expect(
        await screen.findByTestId('blocked-delete-modal')
      ).toBeInTheDocument();
      await user.click(screen.getByTestId('deactivate-instead-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('category-status-badge-2')).toHaveTextContent(
          /Inactive/i
        );
      });

      // 3. Admin suspends non-compliant seller
      cleanup();
      render(
        <AdminJourneyApp
          initialEntries={['/admin/sellers']}
          initialUser={mockAdminUser}
        />
      );

      expect(await screen.findByTestId('sellers-table')).toBeInTheDocument();
      await user.click(screen.getByTestId('suspend-seller-btn-1'));

      expect(
        await screen.findByTestId('seller-action-confirm-dialog')
      ).toBeInTheDocument();
      await user.click(
        screen.getByTestId('seller-action-confirm-dialog-confirm-button')
      );

      await waitFor(() => {
        expect(screen.getByTestId('seller-status-badge-1')).toHaveTextContent(
          /Suspended/i
        );
      });

      expect(mockStore.sellers.find((s) => s.id === 1).approval_status).toBe(
        'suspended'
      );
    }, 15000);
  });
});
