import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider, ToastProvider } from '../../../context';
import { authService } from '../../../services/authService';
import { mockStore } from '../../../data/mockStore.js';
import { SellerApprovalNotice } from '../../../components/seller/SellerApprovalNotice.jsx';
import { SellerStatusBadge } from '../../../components/seller/SellerStatusBadge.jsx';
import { SellerOverview } from '../SellerOverview.jsx';
import { SellerProducts } from '../SellerProducts.jsx';
import { SellerProductForm } from '../SellerProductForm.jsx';
import { Register } from '../../auth/Register.jsx';
import { Login } from '../../auth/Login.jsx';
import { DashboardLayout } from '../../../components/layout/DashboardLayout.jsx';

const sellerNavItems = [
  { path: '/seller', label: 'Overview', icon: '📊', end: true },
  { path: '/seller/products', label: 'My Products', icon: '🥦', end: true },
  { path: '/seller/products/new', label: 'Add Product', icon: '➕' },
];

function TestApp({
  initialEntries = ['/seller'],
  currentUser = null,
  token = 'mock-jwt-token',
}) {
  if (currentUser) {
    localStorage.setItem('vegetable_joint_user', JSON.stringify(currentUser));
    localStorage.setItem('vegetable_joint_token', token);
    vi.spyOn(authService, 'getProfile').mockResolvedValue(currentUser);
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <DashboardLayout
                  title="Seller Portal"
                  role="seller"
                  navItems={sellerNavItems}
                />
              }
            >
              <Route path="/seller" element={<SellerOverview />} />
              <Route path="/seller/products" element={<SellerProducts />} />
              <Route path="/seller/products/new" element={<SellerProductForm />} />
              <Route path="/seller/products/:id/edit" element={<SellerProductForm />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

TestApp.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
  currentUser: PropTypes.object,
  token: PropTypes.string,
};

describe('Seller “Pending Approval” & Publishing Restrictions (FE-064 / AUTH-03, ADM-03)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    vi.restoreAllMocks();
  });

  describe('1. SellerApprovalNotice & SellerStatusBadge Component States', () => {
    it('renders pending approval notice with AUTH-03 reference and details', () => {
      const pendingUser = {
        id: 5,
        name: 'Musa Abdullahi',
        role: 'seller',
        status: 'active',
        seller_profile: {
          approval_status: 'pending',
          business_name: 'Danbatta Agro Ventures',
        },
      };

      render(<TestApp initialEntries={['/seller']} currentUser={pendingUser} />);

      const notice = screen.getByTestId('seller-approval-notice');
      expect(notice).toBeInTheDocument();
      expect(notice).toHaveAttribute('data-status', 'pending');
      expect(
        screen.getByRole('heading', {
          name: /Your seller account is pending approval \(AUTH-03\)/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /you cannot publish vegetable listings to the public marketplace/i
        )
      ).toBeInTheDocument();
      expect(screen.getByText('support@vegetablejoint.ng')).toBeInTheDocument();
    });

    it('renders application rejected notice with ADM-03 and rejection reason', () => {
      const rejectedUser = {
        id: 9,
        name: 'Tukur Mohammed',
        role: 'seller',
        status: 'active',
        seller_profile: {
          approval_status: 'rejected',
          rejection_reason: 'Incomplete business registration documentation.',
        },
      };

      render(<TestApp initialEntries={['/seller']} currentUser={rejectedUser} />);

      const notice = screen.getByTestId('seller-approval-notice');
      expect(notice).toBeInTheDocument();
      expect(notice).toHaveAttribute('data-status', 'rejected');
      expect(
        screen.getByRole('heading', {
          name: /Seller Account Application Rejected \(ADM-03\)/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Incomplete business registration documentation/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /You cannot publish vegetable listings or receive buyer orders/i
        )
      ).toBeInTheDocument();
    });

    it('renders suspended notice with ADM-03, hidden listings explanation, and open orders notice', () => {
      const suspendedUser = {
        id: 10,
        name: 'Suleiman Bello',
        role: 'seller',
        status: 'active',
        seller_profile: {
          approval_status: 'suspended',
        },
      };

      render(<TestApp initialEntries={['/seller']} currentUser={suspendedUser} />);

      const notice = screen.getByTestId('seller-approval-notice');
      expect(notice).toBeInTheDocument();
      expect(notice).toHaveAttribute('data-status', 'suspended');
      expect(
        screen.getByRole('heading', {
          name: /Seller Account Suspended \(AUTH-12, ADM-03\)/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/publishing new listings is disabled/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Open orders previously placed by buyers remain visible in your orders panel/i
        )
      ).toBeInTheDocument();
    });

    it('does not render notice for approved seller', () => {
      const approvedUser = {
        id: 2,
        name: 'Ibrahim Danladi',
        role: 'seller',
        status: 'active',
        seller_profile: {
          approval_status: 'approved',
        },
      };

      render(<TestApp initialEntries={['/seller']} currentUser={approvedUser} />);

      expect(screen.queryByTestId('seller-approval-notice')).not.toBeInTheDocument();
    });

    it('renders accessible SellerStatusBadge with icons and labels (Figma Section 17)', () => {
      render(
        <div>
          <SellerStatusBadge status="pending" />
          <SellerStatusBadge status="approved" />
          <SellerStatusBadge status="rejected" />
          <SellerStatusBadge status="suspended" />
        </div>
      );

      const badges = screen.getAllByTestId('seller-status-badge');
      expect(badges).toHaveLength(4);
      expect(badges[0]).toHaveTextContent(/Pending Approval/i);
      expect(badges[1]).toHaveTextContent(/Verified & Approved/i);
      expect(badges[2]).toHaveTextContent(/Application Rejected/i);
      expect(badges[3]).toHaveTextContent(/Account Suspended/i);
    });
  });

  describe('2. Registration Flow: Newly Registered Seller is Pending (AUTH-02, AUTH-03)', () => {
    it('sets status to pending upon seller registration and redirects to seller portal', async () => {
      const user = userEvent.setup();
      render(<TestApp initialEntries={['/register']} />);

      // Switch to Seller Tab (AUTH-02)
      await user.click(screen.getByTestId('register-role-seller-tab'));

      // Fill in registration details
      await user.type(screen.getByTestId('register-name-input'), 'Kano Organic Veggies');
      await user.type(screen.getByTestId('register-email-input'), 'kanoorganic@farm.ng');
      await user.type(screen.getByTestId('register-phone-input'), '+2348039991122');
      await user.type(screen.getByTestId('register-password-input'), 'SecurePass123');
      await user.type(screen.getByTestId('register-confirm-password-input'), 'SecurePass123');
      await user.type(screen.getByTestId('register-business-name-input'), 'Kano Organic Produce');
      await user.type(screen.getByTestId('register-location-input'), 'Kano');
      await user.type(screen.getByTestId('register-description-input'), 'Fresh organic vegetables');

      // Submit registration
      await user.click(screen.getByTestId('register-submit-btn'));

      // Arrives at Seller Portal with Pending Approval notice
      await waitFor(() => {
        expect(screen.getByTestId('seller-approval-notice')).toBeInTheDocument();
      });

      expect(screen.getByTestId('seller-approval-notice')).toHaveAttribute(
        'data-status',
        'pending'
      );
      expect(
        screen.getByRole('heading', {
          name: /Your seller account is pending approval \(AUTH-03\)/i,
        })
      ).toBeInTheDocument();

      // Verify publishing is disabled on landing
      expect(screen.getByTestId('add-vegetable-disabled-btn')).toBeInTheDocument();
      expect(screen.getByTestId('add-vegetable-disabled-btn')).toBeDisabled();
    });
  });

  describe('3. Login Flow: Pending Seller Sees Status & Cannot Publish', () => {
    it('allows pending seller to log in and prevents publishing on overview, products, and add form', async () => {
      const user = userEvent.setup();
      render(<TestApp initialEntries={['/login']} />);

      // Quick fill or enter credentials for Musa Abdullahi (pending seller)
      await user.click(screen.getByTestId('login-quick-fill-pending-seller'));
      await user.click(screen.getByRole('button', { name: /Sign In/i }));

      // Redirects to /seller overview with pending notice
      await waitFor(() => {
        expect(screen.getByTestId('seller-approval-notice')).toBeInTheDocument();
      });
      expect(screen.getByTestId('seller-status-badge')).toHaveTextContent(/Pending Approval/i);

      // On Overview: "+ Add New Vegetable" is disabled
      const addVegBtn = screen.getByTestId('add-vegetable-disabled-btn');
      expect(addVegBtn).toBeDisabled();
      expect(addVegBtn).toHaveAttribute('aria-disabled', 'true');
      expect(addVegBtn).toHaveTextContent(/Publishing Disabled/i);

      // Navigate to /seller/products
      render(
        <TestApp
          initialEntries={['/seller/products']}
          currentUser={mockStore.users.find((u) => u.id === 5)}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('add-product-btn-disabled')).toBeInTheDocument();
      });
      expect(screen.getByTestId('add-product-btn-disabled')).toBeDisabled();
      expect(
        screen.getByTestId('seller-products-restricted-notice')
      ).toBeInTheDocument();

      // Navigate to /seller/products/new
      render(
        <TestApp
          initialEntries={['/seller/products/new']}
          currentUser={mockStore.users.find((u) => u.id === 5)}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('save-product-submit-btn')).toBeInTheDocument();
      });
      const saveBtn = screen.getByTestId('save-product-submit-btn');
      expect(saveBtn).toBeDisabled();
      expect(saveBtn).toHaveTextContent(/Publishing Disabled \(Pending Approval\)/i);
    });
  });

  describe('4. Login Flow: Suspended Seller Cannot Publish', () => {
    it('shows suspended notice and disables publishing when suspended seller accesses dashboard', async () => {
      const suspendedUser = mockStore.users.find((u) => u.id === 10);

      render(<TestApp initialEntries={['/seller']} currentUser={suspendedUser} />);

      await waitFor(() => {
        expect(screen.getByTestId('seller-approval-notice')).toBeInTheDocument();
      });
      expect(screen.getByTestId('seller-approval-notice')).toHaveAttribute(
        'data-status',
        'suspended'
      );

      expect(screen.getByTestId('add-vegetable-disabled-btn')).toBeDisabled();
      expect(screen.getByTestId('add-vegetable-disabled-btn')).toHaveTextContent(
        /Publishing Disabled/i
      );
    });
  });

  describe('5. Login Flow: Rejected Seller Cannot Publish', () => {
    it('shows rejected notice with reason and disables publishing', async () => {
      const rejectedUser = mockStore.users.find((u) => u.id === 9);

      render(<TestApp initialEntries={['/seller']} currentUser={rejectedUser} />);

      await waitFor(() => {
        expect(screen.getByTestId('seller-approval-notice')).toBeInTheDocument();
      });
      expect(screen.getByTestId('seller-approval-notice')).toHaveAttribute(
        'data-status',
        'rejected'
      );
      expect(
        screen.getByTestId('seller-rejection-reason')
      ).toBeInTheDocument();

      expect(screen.getByTestId('add-vegetable-disabled-btn')).toBeDisabled();
    });
  });

  describe('6. Approved Seller Can Publish', () => {
    it('enables "+ Add New Vegetable" and "Save & Publish" for approved seller', async () => {
      const approvedUser = mockStore.users.find((u) => u.id === 2);

      render(<TestApp initialEntries={['/seller']} currentUser={approvedUser} />);

      await waitFor(() => {
        expect(screen.getByTestId('add-vegetable-link')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('seller-approval-notice')).not.toBeInTheDocument();
      expect(screen.getByTestId('seller-status-badge')).toHaveTextContent(/Verified & Approved/i);

      // On /seller/products/new
      render(
        <TestApp
          initialEntries={['/seller/products/new']}
          currentUser={approvedUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('save-product-submit-btn')).toBeInTheDocument();
      });
      const saveBtn = screen.getByTestId('save-product-submit-btn');
      expect(saveBtn).not.toBeDisabled();
      expect(saveBtn).toHaveTextContent(/Save & Publish Listing/i);
    });
  });

  describe('7. Mock Store Enforcement (BR-11, AUTH-03, ADM-03)', () => {
    it('throws 403 ApiError if non-approved seller attempts to createProduct in mockStore', () => {
      // Pending seller (id 4 in sellers)
      expect(() => {
        mockStore.createProduct({
          seller_id: 4,
          name: 'Restricted Tomato',
          price: 500,
        });
      }).toThrowError(/pending administrator approval.*AUTH-03/i);

      // Rejected seller (id 5 in sellers)
      expect(() => {
        mockStore.createProduct({
          seller_id: 5,
          name: 'Restricted Spinach',
          price: 300,
        });
      }).toThrowError(/application was rejected.*ADM-03/i);

      // Suspended seller (id 6 in sellers)
      expect(() => {
        mockStore.createProduct({
          seller_id: 6,
          name: 'Restricted Carrot',
          price: 400,
        });
      }).toThrowError(/suspended.*ADM-03/i);

      // Approved seller (id 1 in sellers) succeeds
      const product = mockStore.createProduct({
        seller_id: 1,
        name: 'Allowed Pepper',
        price: 800,
      });
      expect(product.id).toBeDefined();
      expect(product.name).toBe('Allowed Pepper');
    });
  });
});
