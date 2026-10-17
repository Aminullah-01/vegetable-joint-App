import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ProtectedRoute } from '../../../routes/ProtectedRoute';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { SellerOverview } from '../SellerOverview';
import { SellerProducts } from '../SellerProducts';
import { SellerProductForm } from '../SellerProductForm';
import { AuthProvider, ToastProvider } from '../../../context';
import { authService } from '../../../services/authService';
import { mockStore } from '../../../data/mockStore';

const sellerNavItems = [
  { path: '/seller', label: 'Overview', icon: '📊', end: true },
  { path: '/seller/products', label: 'My Products', icon: '🥦', end: true },
  { path: '/seller/products/new', label: 'Add Product', icon: '➕' },
  { path: '/seller/orders', label: 'Orders', icon: '📦' },
];

function TestSellerDashboardApp({ initialEntries = ['/seller'] }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route
              element={
                <ProtectedRoute allowedRoles={['seller']}>
                  <DashboardLayout
                    title="Seller Portal"
                    role="seller"
                    navItems={sellerNavItems}
                  />
                </ProtectedRoute>
              }
            >
              <Route path="/seller" element={<SellerOverview />} />
              <Route path="/seller/products" element={<SellerProducts />} />
              <Route
                path="/seller/products/new"
                element={<SellerProductForm />}
              />
              <Route
                path="/seller/products/:id/edit"
                element={<SellerProductForm />}
              />
            </Route>
            <Route path="/login" element={<div data-testid="login-page" />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

TestSellerDashboardApp.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
};

async function loginAs(email) {
  await authService.login({ email, password: 'password123' });
  localStorage.setItem('vegetable_joint_token', 'mock-token-test');
}

describe('Seller Pending Approval Notice (FE-064 / AUTH-03 / ADM-03)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  describe('Pending seller after login (AUTH-03)', () => {
    beforeEach(async () => {
      await loginAs('pending@newfarm.ng');
    });

    it('sees the pending approval notice on the seller dashboard', async () => {
      render(<TestSellerDashboardApp initialEntries={['/seller']} />);

      const notice = await screen.findByTestId('seller-status-notice');
      expect(notice).toHaveAttribute('data-status', 'pending');
      expect(
        screen.getByText(/Your seller account is pending approval/i)
      ).toBeInTheDocument();
      expect(screen.getByTestId('seller-status-pending')).toHaveTextContent(
        /cannot create or publish/i
      );
    });

    it('shows the pending status badge in the dashboard header and locks the Add Product nav item', async () => {
      render(<TestSellerDashboardApp initialEntries={['/seller']} />);

      expect(
        await screen.findByTestId('header-seller-status-badge')
      ).toHaveTextContent(/Pending Approval/i);
      expect(screen.getByTestId('sidebar-locked-badge')).toBeInTheDocument();
    });

    it('disables the Add New Vegetable action on the overview (cannot publish)', async () => {
      render(<TestSellerDashboardApp initialEntries={['/seller']} />);

      const disabledBtn = await screen.findByTestId(
        'add-vegetable-disabled-btn'
      );
      expect(disabledBtn).toBeDisabled();
      expect(
        screen.getByTestId('overview-publishing-disabled-notice')
      ).toHaveTextContent(/Publishing disabled/i);
      expect(
        screen.queryByRole('link', { name: /\+ Add New Vegetable/i })
      ).not.toBeInTheDocument();
    });

    it('locks the Add Product action on the My Products page', async () => {
      render(<TestSellerDashboardApp initialEntries={['/seller/products']} />);

      expect(
        await screen.findByTestId('add-product-disabled-btn')
      ).toBeDisabled();
      expect(
        screen.getByTestId('products-publishing-disabled-notice')
      ).toHaveTextContent(/Publishing disabled/i);
      expect(screen.queryByTestId('add-product-link')).not.toBeInTheDocument();
    });

    it('blocks the add product form from creating listings', async () => {
      render(
        <TestSellerDashboardApp initialEntries={['/seller/products/new']} />
      );

      expect(
        await screen.findByTestId('product-form-publishing-locked')
      ).toHaveTextContent(/Product publishing is disabled/i);
      expect(
        screen.queryByRole('button', { name: /Save & Publish Listing/i })
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('product-form-blocked-back-link')
      ).toBeInTheDocument();
    });

    it('blocks editing an existing listing from the product form', async () => {
      render(
        <TestSellerDashboardApp initialEntries={['/seller/products/1/edit']} />
      );

      expect(
        await screen.findByTestId('product-form-publishing-locked')
      ).toHaveTextContent(/cannot edit or republish this listing/i);
    });

    it('mock API rejects product creation for a pending seller (AUTH-03)', () => {
      expect(() =>
        mockStore.createProduct({
          seller_id: 4,
          name: 'Blocked Pepper Mix',
          price: 1500,
          quantity: 10,
        })
      ).toThrowError(/seller account status is pending/i);
    });
  });

  describe('Rejected seller after login (ADM-03)', () => {
    it('sees the rejected notice with the administrator reason and cannot publish', async () => {
      await loginAs('rejected@farm.ng');
      render(<TestSellerDashboardApp initialEntries={['/seller']} />);

      const notice = await screen.findByTestId('seller-status-notice');
      expect(notice).toHaveAttribute('data-status', 'rejected');
      expect(screen.getByTestId('seller-rejection-reason')).toHaveTextContent(
        /Incomplete business registration documentation/i
      );
      expect(screen.getByTestId('add-vegetable-disabled-btn')).toBeDisabled();
    });
  });

  describe('Suspended seller after login (ADM-03 / AUTH-12)', () => {
    it('sees the suspended notice explaining hidden products and locked publishing', async () => {
      // FE-066 / AUTH-12 blocks login for suspended sellers (403). Seed the
      // session as an approved seller, then re-apply suspension so we verify the
      // FE-064 dashboard notice for a seller suspended after authenticating.
      const sellerProfile = mockStore.sellers.find((s) => s.user_id === 10);
      sellerProfile.approval_status = 'approved';
      await loginAs('suspended@seller.ng');
      sellerProfile.approval_status = 'suspended';

      render(<TestSellerDashboardApp initialEntries={['/seller']} />);

      const notice = await screen.findByTestId('seller-status-notice');
      expect(notice).toHaveAttribute('data-status', 'suspended');
      expect(screen.getByTestId('seller-status-suspended')).toHaveTextContent(
        /hidden from buyers/i
      );
      expect(screen.getByTestId('add-vegetable-disabled-btn')).toBeDisabled();
    });
  });

  describe('Approved seller after login', () => {
    it('sees no status notice and can publish products', async () => {
      await loginAs('seller@arewafarms.ng');
      render(<TestSellerDashboardApp initialEntries={['/seller']} />);

      await waitFor(() => {
        expect(
          screen.queryByTestId('seller-status-notice')
        ).not.toBeInTheDocument();
      });
      // Header shows a positive "Verified Seller" badge, not a warning
      expect(
        await screen.findByTestId('header-seller-status-badge')
      ).toHaveTextContent(/Verified Seller/i);
      expect(
        screen.queryByTestId('sidebar-locked-badge')
      ).not.toBeInTheDocument();

      const addLink = await screen.findByRole('link', {
        name: /\+ Add New Vegetable/i,
      });
      expect(addLink).toHaveAttribute('href', '/seller/products/new');
    });

    it('keeps the Add Product link active on the My Products page', async () => {
      await loginAs('seller@arewafarms.ng');
      render(<TestSellerDashboardApp initialEntries={['/seller/products']} />);

      const addLink = await screen.findByTestId('add-product-link');
      expect(addLink).toHaveAttribute('href', '/seller/products/new');
      expect(
        screen.queryByTestId('products-publishing-disabled-notice')
      ).not.toBeInTheDocument();
    });
  });
});
