import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '../DashboardLayout';
import { AuthProvider } from '../../../context/AuthContext.jsx';
import { ToastProvider } from '../../../context/ToastContext.jsx';
import { authService } from '../../../services/authService';
import { mockStore } from '../../../data/mockStore';

const STORAGE_TOKEN_KEY = 'vegetable_joint_token';
const STORAGE_USER_KEY = 'vegetable_joint_user';

const sellerUser = {
  id: 2,
  name: 'Arewá Farms',
  email: 'seller@arewafarms.ng',
  role: 'seller',
  approval_status: 'approved',
};

function TestDashboardApp() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={['/seller']}>
          <Routes>
            <Route
              path="/seller"
              element={
                <DashboardLayout title="Seller" role="seller" navItems={[]} />
              }
            />
            <Route
              path="/login"
              element={<div data-testid="login-page">Login</div>}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

describe('DashboardLayout session controls (FE-068 / AUTH-05)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  it('renders a Sign Out control in the dashboard header', async () => {
    localStorage.setItem(STORAGE_TOKEN_KEY, 'seed-token');
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(sellerUser));
    vi.spyOn(authService, 'getProfile').mockResolvedValue(sellerUser);

    render(<TestDashboardApp />);

    expect(
      await screen.findByRole('button', { name: /Sign Out/i })
    ).toBeInTheDocument();
  });

  it('clears the active session when Sign Out is clicked', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_TOKEN_KEY, 'seed-token');
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(sellerUser));
    vi.spyOn(authService, 'getProfile').mockResolvedValue(sellerUser);

    render(<TestDashboardApp />);

    const signOut = await screen.findByRole('button', { name: /Sign Out/i });
    await user.click(signOut);

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_TOKEN_KEY)).toBeNull();
    });
    expect(localStorage.getItem(STORAGE_USER_KEY)).toBeNull();
    expect(mockStore.currentUser).toBeNull();
  });
});
