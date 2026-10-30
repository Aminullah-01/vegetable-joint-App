import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateAgainstSchema,
  validateModel,
  validateModelList,
  validatePathResponse,
} from '../../utils/schemaValidator.js';
import { openApiSpec } from '../../api/openapi.js';
import { mockStore } from '../../data/mockStore.js';
import { mockUsers } from '../../data/mockUsers.js';
import { mockSellers } from '../../data/mockSellers.js';
import { mockCategories } from '../../data/mockCategories.js';
import { mockProducts } from '../../data/mockProducts.js';
import { mockOrders } from '../../data/mockOrders.js';
import { mockAuditLogs } from '../../data/mockAuditLogs.js';
import { mockSettings } from '../../data/mockSettings.js';

describe('FE-110: OpenAPI vs Mock Data Parity & Drift Verification (IF-06, NFR-MAIN-05)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  describe('OpenAPI Specification Structure & Metadata', () => {
    it('declares a valid OpenAPI 3.0.x specification with info and servers', () => {
      expect(openApiSpec.openapi).toMatch(/^3\.0\.\d+/);
      expect(openApiSpec.info).toBeDefined();
      expect(openApiSpec.info.title).toContain('Vegetable Joint');
      expect(openApiSpec.paths).toBeDefined();
      expect(openApiSpec.components?.schemas).toBeDefined();
    });

    it('contains all foundational component schemas required by the SRS and database schema', () => {
      const requiredSchemas = [
        'User',
        'SellerProfile',
        'Category',
        'Product',
        'Order',
        'OrderItem',
        'OrderStatusHistory',
        'AuditLog',
        'SiteSettings',
        'SellerDashboardStats',
        'SellerSalesMetrics',
        'AdminStats',
        'CartValidationResult',
        'PaginationMeta',
        'PaginationLinks',
        'ProductListEnvelope',
        'OrderListEnvelope',
        'CategoryListEnvelope',
        'SellerListEnvelope',
        'UserListEnvelope',
        'AuditLogListEnvelope',
      ];

      requiredSchemas.forEach((schemaName) => {
        expect(
          openApiSpec.components.schemas[schemaName],
          `Missing schema '${schemaName}' in OpenAPI spec`
        ).toBeDefined();
      });
    });
  });

  describe('Mock Seed Data Fixtures vs OpenAPI Component Schemas', () => {
    it('verifies all mockUsers conform strictly to the User schema', () => {
      const result = validateModelList(mockUsers, 'User');
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('verifies all mockSellers conform strictly to the SellerProfile schema', () => {
      const result = validateModelList(mockSellers, 'SellerProfile');
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('verifies all mockCategories conform strictly to the Category schema', () => {
      const result = validateModelList(mockCategories, 'Category');
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('verifies all mockProducts conform strictly to the Product schema', () => {
      const result = validateModelList(mockProducts, 'Product');
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('verifies all mockOrders conform strictly to the Order schema', () => {
      const result = validateModelList(mockOrders, 'Order');
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('verifies all order line items conform strictly to the OrderItem schema', () => {
      const items = mockOrders.flatMap((o) => o.items || []);
      expect(items.length).toBeGreaterThan(0);
      const result = validateModelList(items, 'OrderItem');
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('verifies all order status histories conform strictly to the OrderStatusHistory schema', () => {
      const histories = mockOrders.flatMap((o) => o.status_history || []);
      expect(histories.length).toBeGreaterThan(0);
      const result = validateModelList(histories, 'OrderStatusHistory');
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('verifies all mockAuditLogs conform strictly to the AuditLog schema', () => {
      const result = validateModelList(mockAuditLogs, 'AuditLog');
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('verifies mockSettings conforms strictly to the SiteSettings schema', () => {
      const result = validateModel(mockSettings, 'SiteSettings');
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });
  });

  describe('MockStore Operational Responses vs OpenAPI Paths (IF-06)', () => {
    it('validates GET /products response matching ProductListEnvelope', () => {
      const response = mockStore.getProducts();
      const result = validatePathResponse(response, '/products', 'get', 200);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /products/{id} response matching ProductEnvelope', () => {
      const response = mockStore.getProductById(1);
      const result = validatePathResponse(
        response,
        '/products/{id}',
        'get',
        200
      );
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /categories response matching CategoryListEnvelope', () => {
      const response = mockStore.getCategories();
      const result = validatePathResponse(response, '/categories', 'get', 200);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /categories/{id} response matching CategoryEnvelope', () => {
      const response = mockStore.getCategoryById(1);
      const result = validatePathResponse(
        response,
        '/categories/{id}',
        'get',
        200
      );
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /orders response matching OrderListEnvelope', () => {
      const response = mockStore.getOrders({ role: 'admin' });
      const result = validatePathResponse(response, '/orders', 'get', 200);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /orders/{id} response matching OrderEnvelope', () => {
      const response = mockStore.getOrderById(1);
      const result = validatePathResponse(response, '/orders/{id}', 'get', 200);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /sellers response matching SellerListEnvelope', () => {
      const response = mockStore.getPublicSellers();
      const result = validatePathResponse(response, '/sellers', 'get', 200);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /sellers/{id} response matching SellerEnvelope', () => {
      const response = mockStore.getPublicSellerById(1);
      const result = validatePathResponse(
        response,
        '/sellers/{id}',
        'get',
        200
      );
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /admin/users response matching UserListEnvelope', () => {
      const response = mockStore.getUsers();
      const result = validatePathResponse(response, '/admin/users', 'get', 200);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /admin/sellers response matching SellerListEnvelope', () => {
      const response = mockStore.getAdminSellers();
      const result = validatePathResponse(
        response,
        '/admin/sellers',
        'get',
        200
      );
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /admin/audit-logs response matching AuditLogListEnvelope', () => {
      const response = mockStore.getAuditLogs();
      const result = validatePathResponse(
        response,
        '/admin/audit-logs',
        'get',
        200
      );
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /admin/stats response matching AdminStatsEnvelope', () => {
      const response = mockStore.getAdminStats();
      const result = validatePathResponse(response, '/admin/stats', 'get', 200);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /seller/dashboard response matching SellerDashboardEnvelope', () => {
      const response = mockStore.getSellerDashboard(2);
      const result = validatePathResponse(
        response,
        '/seller/dashboard',
        'get',
        200
      );
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /seller/sales response matching SellerSalesEnvelope', () => {
      const response = mockStore.getSellerSales(2);
      const result = validatePathResponse(
        response,
        '/seller/sales',
        'get',
        200
      );
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates GET /admin/settings response matching SiteSettingsEnvelope', () => {
      const response = mockStore.getSettings();
      const result = validatePathResponse(
        response,
        '/admin/settings',
        'get',
        200
      );
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates POST /cart/validate response matching CartValidationResult', () => {
      const sampleItems = [{ product_id: 1, quantity: 2, price: 500 }];
      const response = mockStore.validateCart(sampleItems);
      const result = validatePathResponse(
        response,
        '/cart/validate',
        'post',
        200
      );
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates POST /auth/login response matching AuthResponseEnvelope', () => {
      const response = mockStore.loginUser({
        email: 'buyer@example.com',
        password: 'password123',
      });
      const result = validatePathResponse(response, '/auth/login', 'post', 200);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('validates POST /orders response matching OrderCreationResponseEnvelope', () => {
      const response = mockStore.createOrder({
        user_id: 1,
        checkout_ref: 'CHK-VITEST-001',
        delivery_name: 'Test Buyer',
        delivery_phone: '+2348011223344',
        delivery_address: '10 Victoria Island, Lagos',
        payment_method: 'pay_on_delivery',
        items: [{ product_id: 1, quantity: 1 }],
      });
      const result = validatePathResponse(response, '/orders', 'post', 201);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });
  });

  describe('Drift Detection Sensitivity & Error Reporting', () => {
    it('detects missing required properties in models', () => {
      const incompleteProduct = {
        id: 999,
        // name is missing
        price: 100,
      };
      const result = validateModel(incompleteProduct, 'Product');
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("missing required property 'name'")
        )
      ).toBe(true);
    });

    it('detects type mismatches in models', () => {
      const invalidProduct = {
        ...mockProducts[0],
        price: 'not-a-number',
      };
      const result = validateModel(invalidProduct, 'Product');
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("expected type 'number'"))
      ).toBe(true);
    });

    it('detects invalid enum values', () => {
      const invalidOrder = {
        ...mockOrders[0],
        status: 'shipped_by_drone',
      };
      const result = validateModel(invalidOrder, 'Order');
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('is not in allowed enum'))
      ).toBe(true);
    });

    it('handles nullable fields correctly without false positives', () => {
      const productWithNullFields = {
        ...mockProducts[0],
        description: null,
        image_url: null,
        deleted_at: null,
      };
      const result = validateModel(productWithNullFields, 'Product');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('validates pagination meta and pagination links envelope structure', () => {
      const validMeta = {
        current_page: 1,
        from: 1,
        last_page: 3,
        per_page: 15,
        to: 15,
        total: 45,
      };
      const result = validateModel(validMeta, 'PaginationMeta');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('validates arbitrary schema definitions with validateAgainstSchema directly', () => {
      const inlineSchema = {
        type: 'object',
        required: ['code', 'active'],
        properties: {
          code: { type: 'string' },
          active: { type: 'boolean' },
        },
      };
      const valid = validateAgainstSchema(
        { code: 'VEG-01', active: true },
        inlineSchema
      );
      expect(valid.valid).toBe(true);
      expect(valid.errors).toEqual([]);

      const invalid = validateAgainstSchema(
        { code: 123, active: 'yes' },
        inlineSchema
      );
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
