import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SellerOverview } from '../SellerOverview';
import { AuthContext } from '../../../context/authContextDef';
import { sellerService } from '../../../services/sellerService';
import { mockStore } from '../../../data/mockStore';

// Mock approved seller user
const mockApprovedSeller = {
  id: 2,
  seller_id: 1,
  name: 'Ibrahim Danladi',
  email: 'seller@arewafarms.ng',
  role: 'seller',
  status: 'active',
  approval_status: 'approved',
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    approval_status: 'approved',
    location: 'Gombe',
  },
};

// Mock pending seller user (AUTH-03)
const mockPendingSeller = {
  id: 5,
  seller_id: 4,
  name: 'Musa Abdullahi',
  email: 'pending@newfarm.ng',
  role: 'seller',
  status: 'active',
  approval_status: 'pending',
  seller: {
    id: 4,
    business_name: 'New Horizon Vegetables',
    approval_status: 'pending',
    location: 'Kano',
  },
};

// Mock dashboard payload with rich data (SEL-13)
const sampleDashboardData = {
  seller_id: 1,
  seller_name: 'Arewa Fresh Farms',
  active_listings_count: 4,
  total_products_count: 4,
  pending_orders_count: 2,
  completed_orders_count: 3,
  total_revenue: 27500,
  total_products_sold: 14,
  low_stock_count: 2,
  low_stock_threshold: 5,
  pending_orders: [
    {
      id: 501,
      order_number: 'VJ-20261028-501',
      delivery_name: 'Amina Bello',
      delivery_phone: '+2348078901234',
      total_amount: 10000,
      status: 'pending',
      created_at: '2026-10-28T09:15:00Z',
      items: [
        {
          id: 1,
          product_name: 'Fresh Roma Tomatoes',
          quantity: 4,
          unit: 'basket',
          price: 2500,
        },
      ],
    },
    {
      id: 502,
      order_number: 'VJ-20261028-502',
      delivery_name: 'Emeka Nwosu',
      delivery_phone: '+2348089012345',
      total_amount: 5400,
      status: 'pending',
      created_at: '2026-10-28T10:30:00Z',
      items: [
        {
          id: 2,
          product_name: 'Fresh Scotch Bonnet',
          quantity: 3,
          unit: 'basket',
          price: 1800,
        },
      ],
    },
  ],
  low_stock_products: [
    {
      id: 101,
      name: 'Sweet Bell Pepper (Tatashe)',
      category: { name: 'Pepper' },
      quantity: 3,
      unit: 'basket',
      price: 2800,
      availability: 'low_stock',
    },
    {
      id: 102,
      name: 'Spring Onions (Albasa Mai Ganye)',
      category: { name: 'Onion' },
      quantity: 0,
      unit: 'bunch',
      price: 600,
      availability: 'out_of_stock',
    },
  ],
  latest_sales: [
    {
      id: 401,
      order_number: 'VJ-20261027-401',
      delivery_name: 'Fatima Yusuf',
      total_amount: 12500,
      status: 'completed',
      completed_at: '2026-10-27T16:00:00Z',
      items: [
        {
          id: 10,
          product_name: 'Fresh Roma Tomatoes',
          quantity: 5,
        },
      ],
    },
    {
      id: 402,
      order_number: 'VJ-20261027-402',
      delivery_name: 'Chidi Okonkwo',
      total_amount: 15000,
      status: 'completed',
      completed_at: '2026-10-27T17:30:00Z',
      items: [
        {
          id: 11,
          product_name: 'Fresh Scotch Bonnet',
          quantity: 6,
        },
      ],
    },
  ],
};

function renderSellerOverview({
  user = mockApprovedSeller,
  initialRoute = '/seller',
} = {}) {
  const authValue = {
    user,
    isAuthenticated: !!user,
    login: vi.fn(),
    logout: vi.fn(),
  };

  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthContext.Provider value={authValue}>
          <Routes>
            <Route path="/seller" element={children} />
            <Route
              path="/seller/orders"
              element={<div>Mock Seller Orders Page</div>}
            />
            <Route
              path="/seller/orders/:id"
              element={<div>Mock Seller Order Detail Page</div>}
            />
            <Route
              path="/seller/products"
              element={<div>Mock Seller Products Page</div>}
            />
            <Route
              path="/seller/products/new"
              element={<div>Mock Add Product Page</div>}
            />
            <Route
              path="/seller/inventory"
              element={<div>Mock Seller Inventory Page</div>}
            />
            <Route
              path="/seller/sales"
              element={<div>Mock Seller Sales Page</div>}
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  }

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return render(<SellerOverview />, { wrapper: Wrapper });
}

describe('FE-081 / SEL-13: Seller Dashboard Overview Page', () => {
  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    vi.restoreAllMocks();
  });

  describe('1. Summary KPI Cards (SEL-13, Figma Section 13)', () => {
    it('renders the 4 primary summary KPI cards with exact counts and currency values', async () => {
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue(
        sampleDashboardData
      );

      renderSellerOverview();

      // Verify loading state appears initially
      expect(screen.getByTestId('overview-loading-state')).toBeInTheDocument();

      // Wait for data load
      await screen.findByTestId('seller-overview-page');

      // 1. Pending Orders Card
      const pendingCard = screen.getByTestId('overview-kpi-pending-orders');
      expect(pendingCard).toBeInTheDocument();
      expect(
        screen.getByTestId('overview-pending-orders-count')
      ).toHaveTextContent('2');

      // 2. Total Products / Active Listings Card
      const productsCard = screen.getByTestId('overview-kpi-products');
      expect(productsCard).toBeInTheDocument();
      expect(screen.getByTestId('overview-products-count')).toHaveTextContent(
        '4'
      );

      // 3. Low Stock Items Card
      const lowStockCard = screen.getByTestId('overview-kpi-low-stock');
      expect(lowStockCard).toBeInTheDocument();
      expect(screen.getByTestId('overview-low-stock-count')).toHaveTextContent(
        '2'
      );

      // 4. Recent Sales / Total Revenue Card
      const salesCard = screen.getByTestId('overview-kpi-sales');
      expect(salesCard).toBeInTheDocument();
      expect(screen.getByTestId('overview-total-revenue')).toHaveTextContent(
        /₦27,500/i
      );
    });

    it('navigates to relevant portal sections when KPI cards are clicked', async () => {
      const user = userEvent.setup();
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue(
        sampleDashboardData
      );

      renderSellerOverview();
      await screen.findByTestId('seller-overview-page');

      // Clicking Pending Orders navigates to /seller/orders
      await user.click(screen.getByTestId('overview-kpi-pending-orders'));
      expect(
        await screen.findByText('Mock Seller Orders Page')
      ).toBeInTheDocument();
    });
  });

  describe('2. New (Pending) Orders Summary Section (SEL-13)', () => {
    it('displays list of new pending orders with order number, buyer, items, total, and action link', async () => {
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue(
        sampleDashboardData
      );

      renderSellerOverview();
      await screen.findByTestId('seller-overview-page');

      const pendingSection = screen.getByTestId(
        'overview-pending-orders-section'
      );
      expect(pendingSection).toBeInTheDocument();

      // Check first pending order
      const order1 = screen.getByTestId('overview-pending-order-501');
      expect(order1).toBeInTheDocument();
      expect(order1).toHaveTextContent('VJ-20261028-501');
      expect(order1).toHaveTextContent('Amina Bello');
      expect(order1).toHaveTextContent('Fresh Roma Tomatoes (x4)');
      expect(order1).toHaveTextContent('₦10,000');
      expect(order1).toHaveTextContent(/Pending/i);

      // Check second pending order
      const order2 = screen.getByTestId('overview-pending-order-502');
      expect(order2).toBeInTheDocument();
      expect(order2).toHaveTextContent('VJ-20261028-502');
      expect(order2).toHaveTextContent('Emeka Nwosu');
      expect(order2).toHaveTextContent('₦5,400');

      // Link to view full orders list
      expect(
        screen.getByTestId('overview-all-orders-link')
      ).toBeInTheDocument();
    });

    it('navigates to the specific order detail page when clicking an order action', async () => {
      const user = userEvent.setup();
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue(
        sampleDashboardData
      );

      renderSellerOverview();
      await screen.findByTestId('seller-overview-page');

      await user.click(screen.getByTestId('overview-view-order-501'));
      expect(
        await screen.findByText('Mock Seller Order Detail Page')
      ).toBeInTheDocument();
    });

    it('displays an accessible empty state when there are 0 pending orders', async () => {
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue({
        ...sampleDashboardData,
        pending_orders_count: 0,
        pending_orders: [],
      });

      renderSellerOverview();
      await screen.findByTestId('seller-overview-page');

      expect(
        screen.getByTestId('overview-no-pending-orders')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('overview-no-pending-orders')
      ).toHaveTextContent(/No pending orders to fulfill right now/i);
    });
  });

  describe('3. Low-Stock Items Section (SEL-13, Figma Section 13)', () => {
    it('summarises products with quantity at or below 5 units with stock level, unit price, and status badge', async () => {
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue(
        sampleDashboardData
      );

      renderSellerOverview();
      await screen.findByTestId('seller-overview-page');

      const lowStockSection = screen.getByTestId('overview-low-stock-section');
      expect(lowStockSection).toBeInTheDocument();

      // Check low stock item 101 (quantity 3)
      const item1 = screen.getByTestId('overview-low-stock-item-101');
      expect(item1).toBeInTheDocument();
      expect(item1).toHaveTextContent('Sweet Bell Pepper (Tatashe)');
      expect(item1).toHaveTextContent(/Pepper/i);
      expect(
        screen.getByTestId('overview-low-stock-qty-101')
      ).toHaveTextContent('3 baskets remaining');
      expect(item1).toHaveTextContent('Low Stock');
      expect(item1).toHaveTextContent('₦2,800 / basket');

      // Check out of stock item 102 (quantity 0)
      const item2 = screen.getByTestId('overview-low-stock-item-102');
      expect(item2).toBeInTheDocument();
      expect(item2).toHaveTextContent('Spring Onions');
      expect(
        screen.getByTestId('overview-low-stock-qty-102')
      ).toHaveTextContent(/0 in stock \(Sold Out\)/i);
      expect(item2).toHaveTextContent('Out of Stock');

      // Link to manage inventory
      expect(
        screen.getByTestId('overview-manage-stock-link')
      ).toBeInTheDocument();
    });

    it('navigates to inventory management when clicking Update Stock', async () => {
      const user = userEvent.setup();
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue(
        sampleDashboardData
      );

      renderSellerOverview();
      await screen.findByTestId('seller-overview-page');

      await user.click(screen.getByTestId('overview-update-stock-101'));
      expect(
        await screen.findByText('Mock Seller Inventory Page')
      ).toBeInTheDocument();
    });

    it('renders a reassuring empty state when all products are well stocked', async () => {
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue({
        ...sampleDashboardData,
        low_stock_count: 0,
        low_stock_products: [],
      });

      renderSellerOverview();
      await screen.findByTestId('seller-overview-page');

      expect(screen.getByTestId('overview-no-low-stock')).toBeInTheDocument();
      expect(screen.getByTestId('overview-no-low-stock')).toHaveTextContent(
        /All products are adequately stocked/i
      );
    });
  });

  describe('4. Latest Sales Figures & Performance Section (SEL-13, SEL-12)', () => {
    it('summarises latest sales with completed order metrics and transaction list', async () => {
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue(
        sampleDashboardData
      );

      renderSellerOverview();
      await screen.findByTestId('seller-overview-page');

      const salesSection = screen.getByTestId('overview-sales-section');
      expect(salesSection).toBeInTheDocument();

      // Highlights strip
      expect(screen.getByTestId('overview-sales-total')).toHaveTextContent(
        /₦27,500/i
      );
      expect(
        screen.getByTestId('overview-sales-orders-count')
      ).toHaveTextContent('3');
      expect(screen.getByTestId('overview-sales-units-sold')).toHaveTextContent(
        '14 units'
      );

      // Latest completed sales transactions list
      const sale1 = screen.getByTestId('overview-sale-item-401');
      expect(sale1).toBeInTheDocument();
      expect(sale1).toHaveTextContent('VJ-20261027-401');
      expect(sale1).toHaveTextContent('Fatima Yusuf');
      expect(sale1).toHaveTextContent('₦12,500');
      expect(sale1).toHaveTextContent(/Completed/i);

      const sale2 = screen.getByTestId('overview-sale-item-402');
      expect(sale2).toBeInTheDocument();
      expect(sale2).toHaveTextContent('VJ-20261027-402');
      expect(sale2).toHaveTextContent('Chidi Okonkwo');
      expect(sale2).toHaveTextContent('₦15,000');

      // Link to full sales report
      expect(
        screen.getByTestId('overview-full-sales-link')
      ).toBeInTheDocument();
    });

    it('renders empty state when no completed sales have been recorded yet', async () => {
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue({
        ...sampleDashboardData,
        total_revenue: 0,
        completed_orders_count: 0,
        total_products_sold: 0,
        latest_sales: [],
      });

      renderSellerOverview();
      await screen.findByTestId('seller-overview-page');

      expect(screen.getByTestId('overview-no-sales')).toBeInTheDocument();
      expect(screen.getByTestId('overview-no-sales')).toHaveTextContent(
        /No completed sales recorded yet/i
      );
    });
  });

  describe('5. Quick Actions & Seller Approval State (AUTH-03, SEL-01)', () => {
    it('renders active "+ Add New Vegetable" link when seller is approved', async () => {
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue(
        sampleDashboardData
      );

      renderSellerOverview({ user: mockApprovedSeller });
      await screen.findByTestId('seller-overview-page');

      const addLink = screen.getByTestId('add-vegetable-link');
      expect(addLink).toBeInTheDocument();
      expect(addLink).toHaveAttribute('href', '/seller/products/new');
      expect(
        screen.queryByTestId('add-vegetable-disabled-btn')
      ).not.toBeInTheDocument();
    });

    it('disables "+ Add New Vegetable" and shows notice when seller is unapproved / pending', async () => {
      vi.spyOn(sellerService, 'getSellerDashboard').mockResolvedValue(
        sampleDashboardData
      );

      renderSellerOverview({ user: mockPendingSeller });
      await screen.findByTestId('seller-overview-page');

      const disabledBtn = screen.getByTestId('add-vegetable-disabled-btn');
      expect(disabledBtn).toBeInTheDocument();
      expect(disabledBtn).toBeDisabled();
      expect(disabledBtn).toHaveAttribute('aria-disabled', 'true');

      const notice = screen.getByTestId('overview-publishing-disabled-notice');
      expect(notice).toBeInTheDocument();
      expect(notice).toHaveTextContent(/Publishing disabled/i);
    });
  });

  describe('6. Error Handling & Manual Refresh (ERR-01)', () => {
    it('displays error notice with retry button when API fails and successfully retries', async () => {
      const user = userEvent.setup();
      const mockFetch = vi
        .spyOn(sellerService, 'getSellerDashboard')
        .mockRejectedValueOnce(
          new Error('Network error loading seller metrics.')
        )
        .mockResolvedValueOnce(sampleDashboardData);

      renderSellerOverview();

      // Error banner is shown
      const errorBanner = await screen.findByTestId('overview-error-state');
      expect(errorBanner).toBeInTheDocument();
      expect(errorBanner).toHaveTextContent(
        /Network error loading seller metrics/i
      );

      // Click retry
      await user.click(screen.getByTestId('overview-retry-btn'));

      // Dashboard successfully loads
      await screen.findByTestId('overview-kpi-grid');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(
        screen.queryByTestId('overview-error-state')
      ).not.toBeInTheDocument();
    });

    it('triggers manual refresh when clicking the Refresh button in header', async () => {
      const user = userEvent.setup();
      const mockFetch = vi
        .spyOn(sellerService, 'getSellerDashboard')
        .mockResolvedValue(sampleDashboardData);

      renderSellerOverview();
      await screen.findByTestId('seller-overview-page');

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const refreshBtn = screen.getByTestId('overview-refresh-btn');
      await user.click(refreshBtn);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
