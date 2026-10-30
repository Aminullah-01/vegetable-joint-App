import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { adminService } from '../adminService.js';
import { apiClient } from '../apiClient.js';
import { mockSwitch } from '../mockSwitch.js';
import { mockStore } from '../../data/mockStore.js';
import { ApiError } from '../apiErrors.js';

describe('adminService (FE-108 / SRS Section 4.4 & ADM-01 to ADM-13)', () => {
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
    it('retrieves platform users with filters and pagination (ADM-02)', async () => {
      const result = await adminService.getUsers({ role: 'buyer' });

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((u) => {
        expect(u.role).toBe('buyer');
      });
    });

    it('updates user account status between active and suspended (AUTH-12)', async () => {
      // User 6 is buyer
      const suspended = await adminService.updateUserStatus(6, 'suspended');
      expect(suspended.status).toBe('suspended');

      const reactivated = await adminService.updateUserStatus(6, 'active');
      expect(reactivated.status).toBe('active');
    });

    it('retrieves seller applications for moderation (ADM-03)', async () => {
      const result = await adminService.getSellers();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('moderates seller approval status: approve, reject, suspend (ADM-03)', async () => {
      // Seller 3 is pending in seed
      const approved = await adminService.updateSellerStatus(3, 'approved');
      expect(approved.approval_status).toBe('approved');

      const suspended = await adminService.updateSellerStatus(3, 'suspended');
      expect(suspended.approval_status).toBe('suspended');

      const rejected = await adminService.updateSellerStatus(
        3,
        'rejected',
        'Incomplete documentation.'
      );
      expect(rejected.approval_status).toBe('rejected');
    });

    it('retrieves products for admin moderation (ADM-04)', async () => {
      const result = await adminService.getProducts();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('unpublishes, publishes, and removes a product listing (ADM-04)', async () => {
      const unpublished = await adminService.unpublishProduct(
        1,
        'Misleading produce weight description.'
      );
      expect(unpublished.is_published).toBe(false);

      const published = await adminService.publishProduct(1);
      expect(published.is_published).toBe(true);

      const removed = await adminService.removeProduct(1, 'Policy violation.');
      expect(removed).toBeDefined();
    });

    it('retrieves marketplace orders for admin monitoring (ADM-06)', async () => {
      const result = await adminService.getOrders();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('retrieves order by ID for admin (ADM-06)', async () => {
      const order = await adminService.getOrderById(1);

      expect(order).toBeDefined();
      expect(order.id).toBe(1);
    });

    it('overrides order status with mandatory reason (ADM-07)', async () => {
      const overridden = await adminService.overrideOrderStatus(
        1,
        'cancelled',
        'Buyer and seller mutually requested cancellation via support.'
      );

      expect(overridden.id).toBe(1);
      expect(overridden.status).toBe('cancelled');

      // Rejects empty reason
      await expect(
        adminService.overrideOrderStatus(1, 'processing', '')
      ).rejects.toThrow(/mandatory/i);
    });

    it('retrieves and updates platform configuration settings (ADM-08)', async () => {
      const settings = await adminService.getSettings();

      expect(settings).toBeDefined();
      expect(settings.site_name).toBeDefined();

      const updated = await adminService.updateSettings({
        site_name: 'Vegetable Joint Nigeria',
        contact_email: 'governance@vegetablejoint.ng',
      });

      expect(updated.site_name).toBe('Vegetable Joint Nigeria');
      expect(updated.contact_email).toBe('governance@vegetablejoint.ng');
    });

    it('retrieves system audit logs with filters (ADM-09, NFR-OBS-01)', async () => {
      const result = await adminService.getAuditLogs();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('retrieves administrator overview KPI stats (ADM-01, ADM-10)', async () => {
      const stats = await adminService.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.total_users).toBe('number');
      expect(typeof stats.total_sellers).toBe('number');
      expect(typeof stats.total_orders).toBe('number');

      // Convenience alias
      const aliasStats = await adminService.getAdminStats();
      expect(aliasStats.total_users).toBe(stats.total_users);
    });
  });

  describe('Live API Mode Operations (mockSwitch: false)', () => {
    beforeEach(() => {
      mockSwitch.setMockMode(false);
    });

    it('dispatches GET /admin/users with query params and normalizes collection', async () => {
      const mockUsers = {
        data: [{ id: 1, name: 'Admin', role: 'admin' }],
        meta: { total: 1 },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockUsers);

      const result = await adminService.getUsers({ role: 'admin' });

      expect(getSpy).toHaveBeenCalledWith('/admin/users', {
        params: { role: 'admin' },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe('admin');
    });

    it('dispatches PATCH /admin/users/{id}/status for activation/suspension', async () => {
      const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
        data: { id: 6, status: 'suspended' },
      });

      const result = await adminService.updateUserStatus(6, 'suspended');

      expect(patchSpy).toHaveBeenCalledWith('/admin/users/6/status', {
        status: 'suspended',
      });
      expect(result.status).toBe('suspended');
    });

    it('dispatches GET /admin/sellers and PATCH /admin/sellers/{id}/status', async () => {
      const mockSellers = {
        data: [
          { id: 3, business_name: 'Pending Farm', approval_status: 'pending' },
        ],
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockSellers);

      const listResult = await adminService.getSellers({
        approval_status: 'pending',
      });
      expect(listResult.data).toHaveLength(1);

      const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
        data: { id: 3, approval_status: 'approved' },
      });

      const updated = await adminService.updateSellerStatus(3, 'approved');
      expect(patchSpy).toHaveBeenCalledWith('/admin/sellers/3/status', {
        approval_status: 'approved',
        rejection_reason: '',
      });
      expect(updated.approval_status).toBe('approved');
    });

    it('dispatches moderation actions for products', async () => {
      const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
        data: { id: 5, is_published: false },
      });

      const unpublished = await adminService.unpublishProduct(
        5,
        'Out of compliance'
      );
      expect(patchSpy).toHaveBeenCalledWith('/admin/products/5/unpublish', {
        reason: 'Out of compliance',
      });
      expect(unpublished.is_published).toBe(false);

      const publishSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
        data: { id: 5, is_published: true },
      });

      const published = await adminService.publishProduct(5);
      expect(publishSpy).toHaveBeenCalledWith('/admin/products/5/publish');
      expect(published.is_published).toBe(true);

      const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
        data: { message: 'Product deleted successfully' },
      });

      const removed = await adminService.removeProduct(
        5,
        'Copyright infringement'
      );
      expect(deleteSpy).toHaveBeenCalledWith('/admin/products/5', {
        data: { reason: 'Copyright infringement' },
      });
      expect(removed.message).toBe('Product deleted successfully');
    });

    it('dispatches GET /admin/settings and PUT /admin/settings', async () => {
      const mockSettings = {
        site_name: 'Marketplace Live',
        maintenance_mode: false,
      };
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockSettings });

      const settings = await adminService.getSettings();
      expect(settings.site_name).toBe('Marketplace Live');

      const updatedSettings = { site_name: 'Marketplace Live v2' };
      const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({
        data: updatedSettings,
      });

      const res = await adminService.updateSettings(updatedSettings);
      expect(putSpy).toHaveBeenCalledWith('/admin/settings', updatedSettings);
      expect(res.site_name).toBe('Marketplace Live v2');
    });

    it('dispatches GET /admin/audit-logs with query params', async () => {
      const mockLogs = {
        data: [{ id: 1, action: 'user.created', user_id: 1 }],
        meta: { total: 1 },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockLogs);

      const result = await adminService.getAuditLogs({
        action: 'user.created',
      });

      expect(getSpy).toHaveBeenCalledWith('/admin/audit-logs', {
        params: { action: 'user.created' },
      });
      expect(result.data).toHaveLength(1);
    });

    it('dispatches GET /admin/stats for dashboard overview counts and totals', async () => {
      const mockStats = {
        total_users: 120,
        total_sellers: 25,
        total_orders: 450,
        platform_gmv: 12500000,
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: mockStats,
      });

      const stats = await adminService.getStats();

      expect(getSpy).toHaveBeenCalledWith('/admin/stats');
      expect(stats.total_users).toBe(120);
      expect(stats.total_sellers).toBe(25);
      expect(stats.platform_gmv).toBe(12500000);
    });

    it('propagates API errors properly', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(
        new ApiError({ status: 403, message: 'Admin access required.' })
      );

      await expect(adminService.getStats()).rejects.toThrow(
        'Admin access required.'
      );

      vi.spyOn(apiClient, 'patch').mockRejectedValueOnce(
        new ApiError({ status: 404, message: 'User not found.' })
      );

      await expect(
        adminService.updateUserStatus(999, 'active')
      ).rejects.toThrow('User not found.');
    });
  });
});
