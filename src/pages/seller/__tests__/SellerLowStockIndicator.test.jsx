import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SellerInventory } from '../SellerInventory';
import { SellerProducts } from '../SellerProducts';
import { sellerService } from '../../../services/sellerService';
import { categoryService } from '../../../services/categoryService';
import { AuthContext } from '../../../context/authContextDef';
import { ToastContext } from '../../../context/toastContextDef';

/**
 * Task FE-089 / SEL-09: Low-stock indicator Integration Tests
 *
 * SRS References:
 * - SEL-09: The Inventory view shall flag low stock (default threshold 5 units, configurable per product). [ASSUMPTION A-09]
 * - SEL-08: Inventory listings with current stock, unit, price, and quick updates.
 * - SEL-07 / BR-01: Quantity = 0 -> Out of Stock.
 */

const mockSeller = {
  id: 2,
  name: 'Bello Ibrahim',
  email: 'seller@example.com',
  role: 'seller',
  seller_id: 1,
  approval_status: 'approved',
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Produce',
    approval_status: 'approved',
  },
};

const mockCategories = [
  { id: 1, name: 'Leafy Greens', slug: 'leafy-greens' },
  { id: 2, name: 'Root Vegetables', slug: 'root-vegetables' },
];

const mockProducts = [
  {
    id: 201,
    seller_id: 1,
    name: 'Standard Healthy Produce',
    price: 1000,
    quantity: 20,
    unit: 'kg',
    availability: 'in_stock',
    is_available: true,
    low_stock_threshold: 5, // Default threshold: 20 > 5 -> Healthy
    updated_at: '2026-10-25T14:30:00Z',
  },
  {
    id: 202,
    seller_id: 1,
    name: 'Produce Exactly At Default Threshold',
    price: 1500,
    quantity: 5,
    unit: 'basket',
    availability: 'low_stock',
    is_available: true,
    low_stock_threshold: 5, // 5 <= 5 -> LOW STOCK (SEL-09)
    updated_at: '2026-10-26T10:15:00Z',
  },
  {
    id: 203,
    seller_id: 1,
    name: 'Produce Below Default Threshold',
    price: 800,
    quantity: 2,
    unit: 'bunch',
    availability: 'low_stock',
    is_available: true,
    low_stock_threshold: 5, // 2 <= 5 -> LOW STOCK (SEL-09)
    updated_at: '2026-10-27T16:45:00Z',
  },
  {
    id: 204,
    seller_id: 1,
    name: 'High-Volume Custom Threshold Produce',
    price: 3500,
    quantity: 8,
    unit: 'bag',
    availability: 'low_stock',
    is_available: true,
    low_stock_threshold: 10, // Custom threshold 10: 8 <= 10 -> LOW STOCK (SEL-09)
    updated_at: '2026-10-28T09:00:00Z',
  },
  {
    id: 205,
    seller_id: 1,
    name: 'Exhausted Sold-out Produce',
    price: 1200,
    quantity: 0,
    unit: 'kg',
    availability: 'out_of_stock',
    is_available: false,
    low_stock_threshold: 5, // 0 -> OUT OF STOCK (TC-21, BR-01)
    updated_at: '2026-10-29T08:00:00Z',
  },
];

function renderInventoryPage(toast = { success: vi.fn(), error: vi.fn() }) {
  const authContextValue = {
    user: mockSeller,
    isAuthenticated: true,
    isSeller: true,
    isAdmin: false,
    isBuyer: false,
  };

  return {
    toast,
    ...render(
      <AuthContext.Provider value={authContextValue}>
        <ToastContext.Provider value={toast}>
          <MemoryRouter initialEntries={['/seller/inventory']}>
            <SellerInventory />
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
  };
}

renderInventoryPage.propTypes = {
  toast: PropTypes.object,
};

function renderProductsPage(toast = { success: vi.fn(), error: vi.fn() }) {
  const authContextValue = {
    user: mockSeller,
    isAuthenticated: true,
    isSeller: true,
    isAdmin: false,
    isBuyer: false,
  };

  return {
    toast,
    ...render(
      <AuthContext.Provider value={authContextValue}>
        <ToastContext.Provider value={toast}>
          <MemoryRouter initialEntries={['/seller/products']}>
            <SellerProducts />
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
  };
}

renderProductsPage.propTypes = {
  toast: PropTypes.object,
};

describe('FE-089 / SEL-09: Low-Stock Indicator Integration in Seller Views', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(
      mockCategories
    );
    vi.spyOn(sellerService, 'getSellerProducts').mockResolvedValue({
      data: JSON.parse(JSON.stringify(mockProducts)),
      meta: { total: 5, current_page: 1, last_page: 1, per_page: 10 },
    });
    vi.spyOn(sellerService, 'updateProductStock').mockImplementation(
      async (id, data) => {
        const prod = mockProducts.find((p) => p.id === Number(id));
        return { ...prod, ...data, updated_at: new Date().toISOString() };
      }
    );
  });

  describe('1. Inventory View Low-Stock Indicators (SEL-09)', () => {
    it('flags items at or below default threshold (5) with low-stock indicator', async () => {
      renderInventoryPage();

      await waitFor(() => {
        expect(screen.getByTestId('inventory-table')).toBeInTheDocument();
      });

      // Item 202 has quantity 5 (exactly at threshold 5)
      const warning202 = screen.getByTestId('inventory-low-stock-warning-202');
      expect(warning202).toBeInTheDocument();
      expect(warning202).toHaveTextContent(/Low \(≤ 5\)/i);
      expect(warning202).toHaveAttribute('data-status', 'low_stock');

      // Item 203 has quantity 2 (below threshold 5)
      const warning203 = screen.getByTestId('inventory-low-stock-warning-203');
      expect(warning203).toBeInTheDocument();
      expect(warning203).toHaveTextContent(/Low \(≤ 5\)/i);

      // Item 201 has quantity 20 (above threshold 5) -> NO warning
      expect(
        screen.queryByTestId('inventory-low-stock-warning-201')
      ).not.toBeInTheDocument();
    });

    it('respects configurable per-product threshold (SEL-09, A-09)', async () => {
      renderInventoryPage();

      await waitFor(() => {
        expect(screen.getByTestId('inventory-table')).toBeInTheDocument();
      });

      // Item 204 has quantity 8 and custom threshold 10 (8 <= 10 -> Low stock)
      const warning204 = screen.getByTestId('inventory-low-stock-warning-204');
      expect(warning204).toBeInTheDocument();
      expect(warning204).toHaveTextContent(/Low \(≤ 10\)/i);
      expect(warning204).toHaveAttribute('data-threshold', '10');
    });

    it('flags 0 quantity produce as Out of Stock (SEL-07, TC-21)', async () => {
      renderInventoryPage();

      await waitFor(() => {
        expect(screen.getByTestId('inventory-table')).toBeInTheDocument();
      });

      // Item 205 has quantity 0
      const outOfStock205 = screen.getByTestId(
        'inventory-out-of-stock-warning-205'
      );
      expect(outOfStock205).toBeInTheDocument();
      expect(outOfStock205).toHaveTextContent(/Out of Stock/i);
    });

    it('dynamically displays low-stock indicator when stock is reduced inline to <= threshold (SEL-08, SEL-09)', async () => {
      const user = userEvent.setup();
      renderInventoryPage();

      await waitFor(() => {
        expect(screen.getByTestId('edit-stock-btn-201')).toBeInTheDocument();
      });

      // Product 201 originally has 20 units (healthy stock)
      expect(
        screen.queryByTestId('inventory-low-stock-warning-201')
      ).not.toBeInTheDocument();

      // Quick inline edit to 4 units (<= default threshold 5)
      await user.click(screen.getByTestId('edit-stock-btn-201'));
      const input = screen.getByTestId('inline-stock-input-201');
      await user.clear(input);
      await user.type(input, '4');
      await user.click(screen.getByTestId('save-stock-btn-201'));

      // Low stock indicator should now be displayed
      await waitFor(() => {
        expect(
          screen.getByTestId('inventory-low-stock-warning-201')
        ).toBeInTheDocument();
      });
      expect(
        screen.getByTestId('inventory-low-stock-warning-201')
      ).toHaveTextContent(/Low \(≤ 5\)/i);
    });

    it('removes low-stock indicator when stock is increased above threshold (SEL-08, SEL-09)', async () => {
      const user = userEvent.setup();
      renderInventoryPage();

      await waitFor(() => {
        expect(screen.getByTestId('edit-stock-btn-202')).toBeInTheDocument();
      });

      // Product 202 originally has 5 units (low stock)
      expect(
        screen.getByTestId('inventory-low-stock-warning-202')
      ).toBeInTheDocument();

      // Quick inline edit to 30 units (> threshold 5)
      await user.click(screen.getByTestId('edit-stock-btn-202'));
      const input = screen.getByTestId('inline-stock-input-202');
      await user.clear(input);
      await user.type(input, '30');
      await user.click(screen.getByTestId('save-stock-btn-202'));

      // Low stock indicator should now disappear
      await waitFor(() => {
        expect(
          screen.queryByTestId('inventory-low-stock-warning-202')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('2. Products List View Low-Stock Indicators', () => {
    it('renders dedicated low-stock indicator in products table (SEL-09)', async () => {
      renderProductsPage();

      await waitFor(() => {
        expect(screen.getByTestId('seller-products-table')).toBeInTheDocument();
      });

      // Product 202 has low stock
      const lowStockInd202 = screen.getByTestId(
        'product-low-stock-indicator-202'
      );
      expect(lowStockInd202).toBeInTheDocument();
      expect(lowStockInd202).toHaveAttribute('data-status', 'low_stock');

      // Product 201 has healthy stock -> indicator not rendered
      expect(
        screen.queryByTestId('product-low-stock-indicator-201')
      ).not.toBeInTheDocument();
    });
  });
});
