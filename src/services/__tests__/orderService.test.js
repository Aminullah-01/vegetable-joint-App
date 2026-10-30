import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { orderService } from '../orderService.js';
import { apiClient } from '../apiClient.js';
import { mockSwitch } from '../mockSwitch.js';
import { mockStore } from '../../data/mockStore.js';
import { ApiError } from '../apiErrors.js';

describe('orderService (FE-107 / SRS Section 4.4 & CHK/ORD)', () => {
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
    it('creates an order with checkout reference and orders array', async () => {
      const payload = {
        checkout_ref: 'chk-mock-test-1234',
        payment_method: 'cash_on_delivery',
        delivery_name: 'Amina Bello',
        delivery_phone: '+2348012345678',
        delivery_address: '15 Ikeja Road, Lagos',
        items: [
          {
            product_id: 1,
            seller_id: 1,
            product_name: 'Fresh Roma Tomatoes',
            unit: 'basket',
            quantity: 2,
            price: 2500,
          },
        ],
      };

      const result = await orderService.createOrder(payload);

      expect(result).toBeDefined();
      expect(result.checkout_ref).toBe('chk-mock-test-1234');
      expect(Array.isArray(result.orders)).toBe(true);
      expect(result.orders.length).toBe(1);
      expect(result.orders[0].delivery_name).toBe('Amina Bello');
      expect(result.orders[0].status).toBe('pending');
      expect(result.orders[0].total_amount).toBe(5000);
    });

    it('splits multi-seller checkout into multiple orders with matching checkout_ref', async () => {
      const payload = {
        checkout_ref: 'chk-multi-seller-test',
        delivery_name: 'Ibrahim Sani',
        delivery_phone: '+2348098765432',
        delivery_address: '42 Bompai Road, Kano',
        items: [
          {
            product_id: 1, // Seller 1
            seller_id: 1,
            product_name: 'Roma Tomatoes',
            quantity: 1,
            price: 2500,
          },
          {
            product_id: 4, // Seller 2
            seller_id: 2,
            product_name: 'Fresh Spinach',
            quantity: 2,
            price: 900,
          },
        ],
      };

      const result = await orderService.createOrder(payload);

      expect(result.checkout_ref).toBe('chk-multi-seller-test');
      expect(result.orders.length).toBe(2);
      expect(result.orders[0].seller_id).not.toBe(result.orders[1].seller_id);
    });

    it('returns existing orders on idempotent re-submission with duplicate checkout_ref (CHK-05)', async () => {
      const payload = {
        checkout_ref: 'chk-idempotent-sub-999',
        delivery_name: 'Fatima Umar',
        delivery_phone: '+2348011112222',
        delivery_address: 'Abuja Central',
        items: [{ product_id: 1, quantity: 1, price: 2500 }],
      };

      const firstSubmission = await orderService.createOrder(payload);
      expect(firstSubmission.orders.length).toBe(1);

      // Resubmit identical payload
      const duplicateSubmission = await orderService.createOrder(payload);
      expect(duplicateSubmission.checkout_ref).toBe('chk-idempotent-sub-999');
      expect(duplicateSubmission.orders[0].id).toBe(
        firstSubmission.orders[0].id
      );
      expect(duplicateSubmission.idempotent).toBe(true);
    });

    it('rejects order creation with empty items (422)', async () => {
      await expect(
        orderService.createOrder({
          checkout_ref: 'chk-empty',
          items: [],
        })
      ).rejects.toThrow();
    });

    it('retrieves orders list with pagination and meta', async () => {
      const result = await orderService.getOrders();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta.current_page).toBe(1);
    });

    it('filters orders by status in mock mode', async () => {
      const pendingResult = await orderService.getOrders({ status: 'pending' });

      expect(Array.isArray(pendingResult.data)).toBe(true);
      pendingResult.data.forEach((order) => {
        expect(order.status).toBe('pending');
      });
    });

    it('retrieves order details by ID including line items and status history', async () => {
      const order = await orderService.getOrderById(1);

      expect(order).toBeDefined();
      expect(order.id).toBe(1);
      expect(Array.isArray(order.items)).toBe(true);
      expect(Array.isArray(order.status_history)).toBe(true);
      expect(order.status_history.length).toBeGreaterThan(0);
    });

    it('throws ApiError 404 when order ID is not found', async () => {
      await expect(orderService.getOrderById(99999)).rejects.toThrow();
    });

    it('retrieves orders by checkout reference or order number via getOrdersByRef', async () => {
      // Create a known order
      const created = await orderService.createOrder({
        checkout_ref: 'chk-find-by-ref-111',
        delivery_name: 'Buyer Ref Test',
        delivery_phone: '+2348000000000',
        delivery_address: 'Port Harcourt',
        items: [{ product_id: 1, quantity: 1, price: 2500 }],
      });

      const foundByRef = await orderService.getOrdersByRef(
        'chk-find-by-ref-111'
      );
      expect(foundByRef).toHaveLength(1);
      expect(foundByRef[0].checkout_ref).toBe('chk-find-by-ref-111');

      const foundByOrderNumber = await orderService.getOrdersByRef(
        created.orders[0].order_number
      );
      expect(foundByOrderNumber).toHaveLength(1);
      expect(foundByOrderNumber[0].id).toBe(created.orders[0].id);

      const notFound = await orderService.getOrdersByRef(
        'non-existent-ref-xyz'
      );
      expect(notFound).toHaveLength(0);
    });

    it('transitions order status through permitted lifecycle (SEL-11, ORD-05)', async () => {
      const created = await orderService.createOrder({
        checkout_ref: 'chk-transition-test',
        delivery_name: 'Testing Lifecycle',
        items: [{ product_id: 1, quantity: 1, price: 2500 }],
      });
      const orderId = created.orders[0].id;

      const updated = await orderService.updateOrderStatus(
        orderId,
        'confirmed',
        'Farmer confirmed produce availability.'
      );

      expect(updated.id).toBe(orderId);
      expect(updated.status).toBe('confirmed');

      const latestHistory =
        updated.status_history[updated.status_history.length - 1];
      expect(latestHistory.to_status).toBe('confirmed');
      expect(latestHistory.note).toContain(
        'Farmer confirmed produce availability.'
      );
    });

    it('rejects invalid status lifecycle transitions in mock mode', async () => {
      const created = await orderService.createOrder({
        checkout_ref: 'chk-invalid-trans-test',
        delivery_name: 'Testing Invalid',
        items: [{ product_id: 1, quantity: 1, price: 2500 }],
      });
      const orderId = created.orders[0].id;

      // Cannot jump from pending straight to delivered
      await expect(
        orderService.updateOrderStatus(orderId, 'delivered')
      ).rejects.toThrow();
    });

    it('cancels pending order with mandatory reason and records cancellation (ORD-03, ORD-07)', async () => {
      const created = await orderService.createOrder({
        checkout_ref: 'chk-cancel-test',
        delivery_name: 'Testing Cancel',
        items: [{ product_id: 1, quantity: 1, price: 2500 }],
      });
      const orderId = created.orders[0].id;

      const cancelled = await orderService.cancelOrder(
        orderId,
        'Buyer changed delivery plan.'
      );

      expect(cancelled.id).toBe(orderId);
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancel_reason).toBe('Buyer changed delivery plan.');
    });

    it('allows Admin to override order status with mandatory reason (ADM-07)', async () => {
      const overridden = await orderService.overrideOrderStatus(
        1,
        'processing',
        'Administrative reconciliation override.'
      );

      expect(overridden.id).toBe(1);
      expect(overridden.status).toBe('processing');

      // Rejects empty reason
      await expect(
        orderService.overrideOrderStatus(1, 'cancelled', '')
      ).rejects.toThrow(/mandatory/i);
    });

    it('validates cart line items via validateCart in mock mode (CART-08)', async () => {
      const validation = await orderService.validateCart([
        { product_id: 1, quantity: 2, price: 2500 },
      ]);

      expect(validation).toBeDefined();
      expect(typeof validation.is_valid).toBe('boolean');
      expect(Array.isArray(validation.items)).toBe(true);
    });
  });

  describe('Live API Mode Operations (mockSwitch: false)', () => {
    beforeEach(() => {
      mockSwitch.setMockMode(false);
    });

    it('dispatches POST /orders with idempotency headers and normalizes response', async () => {
      const payload = {
        checkout_ref: 'chk-api-uuid-555',
        payment_method: 'bank_transfer',
        delivery_name: 'Zainab Musa',
        delivery_phone: '+2348022223333',
        delivery_address: 'Kaduna, Nigeria',
        items: [{ product_id: 10, quantity: 2, price: 1200 }],
      };

      const mockApiResponse = {
        data: {
          checkout_ref: 'chk-api-uuid-555',
          orders: [
            {
              id: 99,
              order_number: 'VJ-2026-0099',
              checkout_ref: 'chk-api-uuid-555',
              total_amount: 2400,
              status: 'pending',
            },
          ],
        },
      };

      const postSpy = vi
        .spyOn(apiClient, 'post')
        .mockResolvedValue(mockApiResponse);

      const result = await orderService.createOrder(payload);

      expect(postSpy).toHaveBeenCalledWith('/orders', payload, {
        headers: {
          'X-Idempotency-Key': 'chk-api-uuid-555',
          'X-Checkout-Reference': 'chk-api-uuid-555',
        },
      });

      expect(result.checkout_ref).toBe('chk-api-uuid-555');
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].id).toBe(99);
      expect(result.orders[0].order_number).toBe('VJ-2026-0099');
    });

    it('handles diverse Laravel order creation response shapes', async () => {
      // 1. Direct array of orders
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: [{ id: 101, checkout_ref: 'ref-array-test', status: 'pending' }],
      });
      const res1 = await orderService.createOrder({
        checkout_ref: 'ref-array-test',
      });
      expect(res1.checkout_ref).toBe('ref-array-test');
      expect(res1.orders).toHaveLength(1);
      expect(res1.orders[0].id).toBe(101);

      // 2. Single object without array
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: { id: 102, checkout_ref: 'ref-single-test', status: 'pending' },
      });
      const res2 = await orderService.createOrder({
        checkout_ref: 'ref-single-test',
      });
      expect(res2.checkout_ref).toBe('ref-single-test');
      expect(res2.orders).toHaveLength(1);
      expect(res2.orders[0].id).toBe(102);
    });

    it('dispatches GET /orders with query parameters and normalizes collection', async () => {
      const mockApiResponse = {
        data: [
          { id: 1, order_number: 'VJ-2026-0001', status: 'pending' },
          { id: 2, order_number: 'VJ-2026-0002', status: 'confirmed' },
        ],
        meta: { current_page: 1, per_page: 10, total: 2 },
        links: { first: '/orders?page=1', last: '/orders?page=1' },
      };

      const getSpy = vi
        .spyOn(apiClient, 'get')
        .mockResolvedValue(mockApiResponse);

      const params = {
        status: 'pending',
        search: 'Tomato',
        page: 1,
        per_page: 10,
        sort: 'newest',
      };

      const result = await orderService.getOrders(params);

      expect(getSpy).toHaveBeenCalledWith('/orders', { params });
      expect(result.data).toHaveLength(2);
      expect(result.data[0].order_number).toBe('VJ-2026-0001');
      expect(result.meta.total).toBe(2);
    });

    it('dispatches GET /orders/{id} and normalizes single resource envelope', async () => {
      const mockOrder = {
        id: 7,
        order_number: 'VJ-2026-0007',
        status: 'processing',
        total_amount: 7500,
        items: [{ id: 1, product_name: 'Bell Peppers', quantity: 3 }],
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: mockOrder,
      });

      const result = await orderService.getOrderById(7);

      expect(getSpy).toHaveBeenCalledWith('/orders/7');
      expect(result.id).toBe(7);
      expect(result.order_number).toBe('VJ-2026-0007');

      // Nested data.data
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { data: mockOrder },
      });
      const nestedResult = await orderService.getOrderById(7);
      expect(nestedResult.id).toBe(7);
    });

    it('dispatches GET /orders?search={ref} and returns filtered matches in getOrdersByRef', async () => {
      const mockOrdersList = [
        { id: 20, checkout_ref: 'chk-target-ref', order_number: 'VJ-0020' },
        { id: 21, checkout_ref: 'chk-other-ref', order_number: 'VJ-0021' },
      ];

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: mockOrdersList,
      });

      const matched = await orderService.getOrdersByRef('chk-target-ref');

      expect(getSpy).toHaveBeenCalledWith('/orders', {
        params: { search: 'chk-target-ref' },
      });
      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe(20);
    });

    it('dispatches PATCH /orders/{id}/status for status change (Seller/Admin)', async () => {
      const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
        data: { id: 5, status: 'confirmed', note: 'Packed for delivery' },
      });

      const result = await orderService.updateOrderStatus(
        5,
        'confirmed',
        'Packed for delivery'
      );

      expect(patchSpy).toHaveBeenCalledWith('/orders/5/status', {
        status: 'confirmed',
        note: 'Packed for delivery',
      });
      expect(result.status).toBe('confirmed');
    });

    it('dispatches POST /orders/{id}/cancel with reason', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: { id: 8, status: 'cancelled', cancel_reason: 'Out of town' },
      });

      const result = await orderService.cancelOrder(8, 'Out of town');

      expect(postSpy).toHaveBeenCalledWith('/orders/8/cancel', {
        reason: 'Out of town',
      });
      expect(result.status).toBe('cancelled');
    });

    it('dispatches POST /admin/orders/{id}/override-status with reason (Admin)', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: {
          id: 12,
          status: 'cancelled',
          cancel_reason: 'Admin force override',
        },
      });

      const result = await orderService.overrideOrderStatus(
        12,
        'cancelled',
        'Admin force override'
      );

      expect(postSpy).toHaveBeenCalledWith('/admin/orders/12/override-status', {
        status: 'cancelled',
        reason: 'Admin force override',
      });
      expect(result.id).toBe(12);
      expect(result.status).toBe('cancelled');
    });

    it('dispatches POST /cart/validate with cart items', async () => {
      const cartItems = [{ product_id: 1, quantity: 2, price: 2500 }];
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: { is_valid: true, items: cartItems, has_stock_issues: false },
      });

      const result = await orderService.validateCart(cartItems);

      expect(postSpy).toHaveBeenCalledWith('/cart/validate', {
        items: cartItems,
      });
      expect(result.is_valid).toBe(true);
    });

    it('propagates API errors for 401, 403, 404, 409, and 422', async () => {
      // 401 Unauthorized
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(
        new ApiError({ status: 401, message: 'Unauthenticated.' })
      );
      await expect(orderService.getOrders()).rejects.toThrow(
        'Unauthenticated.'
      );

      // 404 Not Found
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(
        new ApiError({ status: 404, message: 'Order not found.' })
      );
      await expect(orderService.getOrderById(999)).rejects.toThrow(
        'Order not found.'
      );

      // 403 Forbidden
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
        new ApiError({
          status: 403,
          message: 'Cannot cancel order in status delivered.',
        })
      );
      await expect(orderService.cancelOrder(1, 'Reason')).rejects.toThrow(
        'Cannot cancel order in status delivered.'
      );

      // 409 Conflict (Stock changed during checkout)
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
        new ApiError({
          status: 409,
          message: 'Insufficient stock for requested produce items.',
          code: 'STOCK_INSUFFICIENT',
        })
      );
      await expect(orderService.createOrder({})).rejects.toThrow(
        'Insufficient stock'
      );

      // 422 Validation Error
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
        new ApiError({
          status: 422,
          message: 'The delivery address field is required.',
          errors: {
            delivery_address: ['The delivery address field is required.'],
          },
        })
      );
      await expect(orderService.createOrder({})).rejects.toThrow(
        'The delivery address field is required.'
      );
    });
  });
});
