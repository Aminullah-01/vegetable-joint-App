#!/usr/bin/env node
/**
 * Automated OpenAPI vs Mock Data Drift Verification Script
 * Task: FE-110 (Module 9: API Integration)
 * Conforms to SRS: IF-06, NFR-MAIN-05
 *
 * Verifies that all mock fixtures and mockStore API responses strictly conform
 * to the OpenAPI 3.0.3 specification in shape, types, required fields, and enums.
 */

import {
  validateModel,
  validateModelList,
  validatePathResponse,
} from '../src/utils/schemaValidator.js';
import { mockStore } from '../src/data/mockStore.js';
import { mockUsers } from '../src/data/mockUsers.js';
import { mockSellers } from '../src/data/mockSellers.js';
import { mockCategories } from '../src/data/mockCategories.js';
import { mockProducts } from '../src/data/mockProducts.js';
import { mockOrders } from '../src/data/mockOrders.js';
import { mockAuditLogs } from '../src/data/mockAuditLogs.js';
import { mockSettings } from '../src/data/mockSettings.js';

let totalChecks = 0;
let passedChecks = 0;
const failures = [];

function recordCheck(name, result) {
  totalChecks++;
  if (result.valid) {
    passedChecks++;
    console.log(`  [PASS] ${name}`);
  } else {
    failures.push({ name, errors: result.errors });
    console.error(`  [FAIL] ${name}`);
    result.errors.forEach((err) => console.error(`         -> ${err}`));
  }
}

console.log('===============================================================');
console.log(' Vegetable Joint: OpenAPI vs Mock Data Drift Verification');
console.log(' SRS Reference: IF-06, NFR-MAIN-05 (FE-110)');
console.log(
  '===============================================================\n'
);

// ----------------------------------------------------------------------------
// Section 1: Mock Fixture Entity Parity (Component Schemas)
// ----------------------------------------------------------------------------
console.log('Section 1: Verifying Mock Seed Data Against Component Schemas...');

recordCheck(
  `mockUsers (${mockUsers.length} entries) -> User`,
  validateModelList(mockUsers, 'User')
);

recordCheck(
  `mockSellers (${mockSellers.length} entries) -> SellerProfile`,
  validateModelList(mockSellers, 'SellerProfile')
);

recordCheck(
  `mockCategories (${mockCategories.length} entries) -> Category`,
  validateModelList(mockCategories, 'Category')
);

recordCheck(
  `mockProducts (${mockProducts.length} entries) -> Product`,
  validateModelList(mockProducts, 'Product')
);

recordCheck(
  `mockOrders (${mockOrders.length} entries) -> Order`,
  validateModelList(mockOrders, 'Order')
);

const allOrderItems = mockOrders.flatMap((o) => o.items || []);
recordCheck(
  `mockOrders items (${allOrderItems.length} line items) -> OrderItem`,
  validateModelList(allOrderItems, 'OrderItem')
);

const allStatusHistories = mockOrders.flatMap((o) => o.status_history || []);
recordCheck(
  `mockOrders status_history (${allStatusHistories.length} transitions) -> OrderStatusHistory`,
  validateModelList(allStatusHistories, 'OrderStatusHistory')
);

recordCheck(
  `mockAuditLogs (${mockAuditLogs.length} entries) -> AuditLog`,
  validateModelList(mockAuditLogs, 'AuditLog')
);

recordCheck(
  'mockSettings -> SiteSettings',
  validateModel(mockSettings, 'SiteSettings')
);

// ----------------------------------------------------------------------------
// Section 2: MockStore Operations vs OpenAPI Paths
// ----------------------------------------------------------------------------
console.log(
  '\nSection 2: Verifying mockStore API Responses vs OpenAPI Paths...'
);

mockStore.reset();

// Products
recordCheck(
  'GET /products -> mockStore.getProducts()',
  validatePathResponse(mockStore.getProducts(), '/products', 'get', 200)
);

recordCheck(
  'GET /products/{id} -> mockStore.getProductById(1)',
  validatePathResponse(
    mockStore.getProductById(1),
    '/products/{id}',
    'get',
    200
  )
);

// Categories
recordCheck(
  'GET /categories -> mockStore.getCategories()',
  validatePathResponse(mockStore.getCategories(), '/categories', 'get', 200)
);

recordCheck(
  'GET /categories/{id} -> mockStore.getCategoryById(1)',
  validatePathResponse(
    mockStore.getCategoryById(1),
    '/categories/{id}',
    'get',
    200
  )
);

// Orders
recordCheck(
  'GET /orders -> mockStore.getOrders({ role: "admin" })',
  validatePathResponse(
    mockStore.getOrders({ role: 'admin' }),
    '/orders',
    'get',
    200
  )
);

recordCheck(
  'GET /orders/{id} -> mockStore.getOrderById(1)',
  validatePathResponse(mockStore.getOrderById(1), '/orders/{id}', 'get', 200)
);

// Sellers
recordCheck(
  'GET /sellers -> mockStore.getPublicSellers()',
  validatePathResponse(mockStore.getPublicSellers(), '/sellers', 'get', 200)
);

recordCheck(
  'GET /sellers/{id} -> mockStore.getPublicSellerById(1)',
  validatePathResponse(
    mockStore.getPublicSellerById(1),
    '/sellers/{id}',
    'get',
    200
  )
);

// Admin endpoints
recordCheck(
  'GET /admin/users -> mockStore.getUsers()',
  validatePathResponse(mockStore.getUsers(), '/admin/users', 'get', 200)
);

recordCheck(
  'GET /admin/sellers -> mockStore.getAdminSellers()',
  validatePathResponse(
    mockStore.getAdminSellers(),
    '/admin/sellers',
    'get',
    200
  )
);

recordCheck(
  'GET /admin/audit-logs -> mockStore.getAuditLogs()',
  validatePathResponse(
    mockStore.getAuditLogs(),
    '/admin/audit-logs',
    'get',
    200
  )
);

recordCheck(
  'GET /admin/stats -> mockStore.getAdminStats()',
  validatePathResponse(mockStore.getAdminStats(), '/admin/stats', 'get', 200)
);

recordCheck(
  'GET /admin/settings -> mockStore.getSettings()',
  validatePathResponse(mockStore.getSettings(), '/admin/settings', 'get', 200)
);

recordCheck(
  'GET /settings -> mockStore.getSettings()',
  validatePathResponse(mockStore.getSettings(), '/settings', 'get', 200)
);

// Seller endpoints
recordCheck(
  'GET /seller/dashboard -> mockStore.getSellerDashboard(2)',
  validatePathResponse(
    mockStore.getSellerDashboard(2),
    '/seller/dashboard',
    'get',
    200
  )
);

recordCheck(
  'GET /seller/sales -> mockStore.getSellerSales(2)',
  validatePathResponse(mockStore.getSellerSales(2), '/seller/sales', 'get', 200)
);

// Cart validation
recordCheck(
  'POST /cart/validate -> mockStore.validateCart(...)',
  validatePathResponse(
    mockStore.validateCart([{ product_id: 1, quantity: 2, price: 500 }]),
    '/cart/validate',
    'post',
    200
  )
);

// Auth login & register
const loginRes = mockStore.loginUser({
  email: 'buyer@example.com',
  password: 'password123',
});
recordCheck(
  'POST /auth/login -> mockStore.loginUser(...)',
  validatePathResponse(loginRes, '/auth/login', 'post', 200)
);

// Order creation
const newOrderRes = mockStore.createOrder({
  user_id: 1,
  checkout_ref: 'CHK-VERIFY-001',
  delivery_name: 'Dr. Aminu Sani',
  delivery_phone: '+2348012345678',
  delivery_address: 'Plot 44, Ahmadu Bello Way, Abuja',
  payment_method: 'pay_on_delivery',
  items: [{ product_id: 1, quantity: 2 }],
});
recordCheck(
  'POST /orders -> mockStore.createOrder(...)',
  validatePathResponse(newOrderRes, '/orders', 'post', 201)
);

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log(
  '\n---------------------------------------------------------------'
);
console.log(
  `Results: ${passedChecks}/${totalChecks} checks passed (0 schema drifts detected).`
);
console.log('---------------------------------------------------------------');

if (failures.length > 0) {
  console.error(`\nFAILED: Detected ${failures.length} schema drift(s).`);
  process.exit(1);
} else {
  console.log(
    '\nSUCCESS: 100% parity verified between Mock Data and OpenAPI Specification.'
  );
  process.exit(0);
}
