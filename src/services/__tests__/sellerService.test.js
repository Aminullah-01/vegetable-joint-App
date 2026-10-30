import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sellerService } from '../sellerService.js';
import { apiClient } from '../apiClient.js';
import { mockSwitch } from '../mockSwitch.js';
import { mockStore } from '../../data/mockStore.js';
import { ApiError } from '../apiErrors.js';

describe('sellerService (FE-108 / SRS Section 4.4 & SEL-01 to SEL-14)', () => {
  beforeEach(() => {
    mockStore.reset();
    mockSwitch.reset();
    mockSwitch.setMockMode(true);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    mockSwitch.reset();
    vi.restoreAllMocks();
  });

  describe('Mock Mode Operations (mockSwitch: true)', () => {
    it('retrieves public verified sellers list with pagination', async () => {
      const result = await sellerService.getPublicSellers();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.meta).toBeDefined();
    });

    it('retrieves public seller profile and listed produce by ID', async () => {
      const seller = await sellerService.getPublicSellerById(1);

      expect(seller).toBeDefined();
      expect(seller.id).toBe(1);
      expect(seller.business_name).toBeDefined();
      expect(Array.isArray(seller.products)).toBe(true);
    });

    it('retrieves authenticated seller inventory via getSellerProducts', async () => {
      const result = await sellerService.getSellerProducts({ seller_id: 1 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('retrieves seller dashboard overview metrics (SEL-13)', async () => {
      const dashboard = await sellerService.getSellerDashboard({
        seller_id: 1,
      });

      expect(dashboard).toBeDefined();
      expect(dashboard.seller_id).toBe(1);
      expect(typeof dashboard.active_listings_count).toBe('number');
      expect(typeof dashboard.total_revenue).toBe('number');
      expect(Array.isArray(dashboard.recent_orders)).toBe(true);
    });

    it('retrieves seller sales metrics for selectable periods (SEL-12)', async () => {
      const sales = await sellerService.getSellerSales({
        seller_id: 1,
        period: 'month',
      });

      expect(sales).toBeDefined();
      expect(sales.seller_id).toBe(1);
      expect(typeof sales.total_sales).toBe('number');
      expect(Array.isArray(sales.products_sold)).toBe(true);
    });

    it('retrieves orders scoped to seller', async () => {
      const result = await sellerService.getSellerOrders({ seller_id: 1 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('retrieves seller order by ID', async () => {
      const order = await sellerService.getSellerOrderById(1, { seller_id: 1 });

      expect(order).toBeDefined();
      expect(order.id).toBe(1);
    });

    it('advances order status and cancels order', async () => {
      // Create a fresh pending order
      const newOrder = mockStore.createOrder({
        checkout_ref: 'chk-seller-service-test',
        delivery_name: 'Test Buyer',
        items: [{ product_id: 1, quantity: 1, price: 2500 }],
      });
      const orderId = newOrder.orders[0].id;

      const updated = await sellerService.updateOrderStatus(
        orderId,
        'confirmed',
        'Produce packed'
      );
      expect(updated.status).toBe('confirmed');

      const cancelled = await sellerService.cancelOrder(
        orderId,
        'Logistical disruption'
      );
      expect(cancelled.status).toBe('cancelled');
    });

    it('retrieves and updates authenticated seller profile (SEL-01, AUTH-11)', async () => {
      mockStore.currentUser = mockStore.users.find((u) => u.id === 2);
      const profile = await sellerService.getSellerProfile();
      expect(profile).toBeDefined();

      const updatedProfile = await sellerService.updateSellerProfile({
        business_name: 'Gombe Mega Agro Farms',
        location: 'Gombe Central',
      });

      const bName =
        updatedProfile.seller_profile?.business_name ||
        updatedProfile.business_name;
      const bLoc =
        updatedProfile.seller_profile?.location || updatedProfile.location;

      expect(bName).toBe('Gombe Mega Agro Farms');
      expect(bLoc).toBe('Gombe Central');
    });
  });

  describe('Live API Mode Operations (mockSwitch: false)', () => {
    beforeEach(() => {
      mockSwitch.setMockMode(false);
    });

    it('dispatches GET /sellers and normalizes collection', async () => {
      const mockSellers = {
        data: [
          { id: 1, business_name: 'Farm A', location: 'Kano' },
          { id: 2, business_name: 'Farm B', location: 'Kaduna' },
        ],
        meta: { total: 2 },
        links: null,
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockSellers);

      const result = await sellerService.getPublicSellers({ location: 'Kano' });

      expect(getSpy).toHaveBeenCalledWith('/sellers', {
        params: { location: 'Kano' },
      });
      expect(result.data).toHaveLength(2);
      expect(result.data[0].business_name).toBe('Farm A');
    });

    it('dispatches GET /sellers/{id} and normalizes item', async () => {
      const mockSeller = { id: 1, business_name: 'Green Field', products: [] };
      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: mockSeller,
      });

      const result = await sellerService.getPublicSellerById(1);

      expect(getSpy).toHaveBeenCalledWith('/sellers/1');
      expect(result.id).toBe(1);
      expect(result.business_name).toBe('Green Field');
    });

    it('dispatches GET /seller/dashboard for overview metrics', async () => {
      const mockDashboard = {
        seller_id: 1,
        active_listings_count: 8,
        total_revenue: 150000,
        pending_orders: [],
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: mockDashboard,
      });

      const result = await sellerService.getSellerDashboard();

      expect(getSpy).toHaveBeenCalledWith('/seller/dashboard', { params: {} });
      expect(result.seller_id).toBe(1);
      expect(result.active_listings_count).toBe(8);
      expect(result.total_revenue).toBe(150000);
    });

    it('dispatches GET /seller/sales for sales performance', async () => {
      const mockSales = {
        seller_id: 1,
        period: 'month',
        total_sales: 320000,
        average_order_value: 4500,
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: mockSales,
      });

      const result = await sellerService.getSellerSales({ period: 'month' });

      expect(getSpy).toHaveBeenCalledWith('/seller/sales', {
        params: { period: 'month' },
      });
      expect(result.total_sales).toBe(320000);
      expect(result.average_order_value).toBe(4500);
    });

    it('dispatches GET /seller/orders and /seller/orders/{id}', async () => {
      const mockOrders = {
        data: [{ id: 10, total_amount: 5000, status: 'confirmed' }],
        meta: { total: 1 },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockOrders);

      const listResult = await sellerService.getSellerOrders({
        status: 'confirmed',
      });
      expect(listResult.data).toHaveLength(1);

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { id: 10, total_amount: 5000 },
      });

      const detailResult = await sellerService.getSellerOrderById(10);
      expect(detailResult.id).toBe(10);
    });

    it('dispatches GET /seller/profile and PUT /seller/profile', async () => {
      const mockProfile = { id: 1, business_name: 'Original Agro' };
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockProfile });

      const profile = await sellerService.getSellerProfile();
      expect(profile.business_name).toBe('Original Agro');

      const updatedProfile = { id: 1, business_name: 'Updated Agro' };
      vi.spyOn(apiClient, 'put').mockResolvedValueOnce({
        data: updatedProfile,
      });

      const res = await sellerService.updateSellerProfile({
        business_name: 'Updated Agro',
      });
      expect(res.business_name).toBe('Updated Agro');
    });

    it('propagates API errors properly', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(
        new ApiError({ status: 404, message: 'Seller not found.' })
      );

      await expect(sellerService.getPublicSellerById(999)).rejects.toThrow(
        'Seller not found.'
      );

      vi.spyOn(apiClient, 'put').mockRejectedValueOnce(
        new ApiError({
          status: 422,
          message: 'The business name is required.',
          errors: { business_name: ['The business name is required.'] },
        })
      );

      await expect(sellerService.updateSellerProfile({})).rejects.toThrow(
        'The business name is required.'
      );
    });
  });
});
