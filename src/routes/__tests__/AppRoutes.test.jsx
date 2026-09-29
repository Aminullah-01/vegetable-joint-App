import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider, CartProvider, ToastProvider } from '../../context';
import { AppRoutes } from '../AppRoutes';
import { authService } from '../../services/authService';

function TestProviders({ children, initialRole = null, initialUser = null }) {
  if (initialUser && initialRole) {
    const userWithRole = { ...initialUser, role: initialRole };
    localStorage.setItem('vegetable_joint_user', JSON.stringify(userWithRole));
    localStorage.setItem('vegetable_joint_token', 'mock-jwt-token');
    vi.spyOn(authService, 'getProfile').mockResolvedValue(userWithRole);
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

TestProviders.propTypes = {
  children: PropTypes.node.isRequired,
  initialRole: PropTypes.string,
  initialUser: PropTypes.object,
};

describe('AppRoutes & Route-level Code Splitting (FE-021, NFR-PERF-01)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders public home page eagerly on root route', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TestProviders>
          <AppRoutes />
        </TestProviders>
      </MemoryRouter>
    );

    expect(
      await screen.findByText(
        /Fresh Vegetables, Directly from Verified Sellers/i
      )
    ).toBeInTheDocument();
  });

  it('renders 404 NotFound page for invalid route', async () => {
    render(
      <MemoryRouter
        initialEntries={['/some-unknown-route-that-does-not-exist']}
      >
        <TestProviders>
          <AppRoutes />
        </TestProviders>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Page Not Found/i)).toBeInTheDocument();
  });

  it('lazy loads seller overview dashboard for authenticated seller', async () => {
    const sellerUser = {
      id: 1,
      name: 'Tanimu Farm',
      email: 'seller@example.com',
    };

    render(
      <MemoryRouter initialEntries={['/seller']}>
        <TestProviders initialRole="seller" initialUser={sellerUser}>
          <AppRoutes />
        </TestProviders>
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Seller Overview \(SEL-13\)/i)
    ).toBeInTheDocument();
  });

  it('lazy loads admin overview dashboard for authenticated admin', async () => {
    const adminUser = { id: 2, name: 'Admin Root', email: 'admin@example.com' };

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <TestProviders initialRole="admin" initialUser={adminUser}>
          <AppRoutes />
        </TestProviders>
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Admin Overview \(ADM-10\)/i)
    ).toBeInTheDocument();
  });
});
