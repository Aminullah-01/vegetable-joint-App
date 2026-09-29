/**
 * Mock data fixtures and schemas conforming to API contracts
 * Conforms to SRS Section 4.4, Section 5.5, IF-06, and NFR-MAIN-05.
 */
export * from './mockCategories.js';
export { default as mockCategories } from './mockCategories.js';

export * from './mockUsers.js';
export { default as mockUsers } from './mockUsers.js';

export * from './mockSellers.js';
export { default as mockSellers } from './mockSellers.js';

export * from './mockProducts.js';
export { default as mockProducts } from './mockProducts.js';

export * from './mockOrders.js';
export { default as mockOrders } from './mockOrders.js';

export * from './mockSettings.js';
export { default as mockSettings } from './mockSettings.js';

export * from './mockAuditLogs.js';
export { default as mockAuditLogs } from './mockAuditLogs.js';

import { mockCategories } from './mockCategories.js';
import { mockUsers } from './mockUsers.js';
import { mockSellers } from './mockSellers.js';
import { mockProducts } from './mockProducts.js';
import { mockOrders } from './mockOrders.js';
import { mockSettings } from './mockSettings.js';
import { mockAuditLogs } from './mockAuditLogs.js';

/**
 * Creates standardized API pagination metadata conforming to IF-04.
 *
 * @param {number} totalItems - Total count before pagination.
 * @param {number} page - Current page (1-indexed).
 * @param {number} perPage - Items per page (capped at 50).
 * @returns {Object}
 */
export function createPaginationMeta(totalItems, page = 1, perPage = 20) {
  const safePerPage = Math.min(Math.max(Number(perPage) || 20, 1), 50);
  const totalPages = Math.max(Math.ceil(totalItems / safePerPage), 1);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);

  return {
    current_page: safePage,
    per_page: safePerPage,
    total: totalItems,
    last_page: totalPages,
    from: totalItems === 0 ? 0 : (safePage - 1) * safePerPage + 1,
    to: Math.min(safePage * safePerPage, totalItems),
  };
}

/**
 * Simulates API GET /products filtering, sorting, and pagination (IF-04, SRCH-01 to SRCH-08).
 *
 * @param {Object} [params={}]
 * @returns {{ data: Array, meta: Object, links: Object }}
 */
export function queryMockProducts(params = {}) {
  const {
    q,
    category,
    min_price,
    max_price,
    availability,
    seller,
    location,
    sort = 'newest',
    page = 1,
    // MKT-03: the public catalogue defaults to 12 listings per page.
    per_page = 12,
  } = params;

  let results = [...mockProducts].filter((p) => !p.deleted_at);

  // Full-text search emulation (SRCH-01)
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.seller?.business_name.toLowerCase().includes(term) ||
        p.category?.name.toLowerCase().includes(term)
    );
  }

  // Category filter (SRCH-02)
  if (category) {
    results = results.filter((p) => {
      if (typeof category === 'number' || !isNaN(Number(category))) {
        return p.category_id === Number(category);
      }
      return (
        p.category?.slug === category ||
        p.category?.name.toLowerCase() === String(category).toLowerCase()
      );
    });
  }

  // Price range filters (SRCH-04)
  if (min_price !== undefined && min_price !== '') {
    results = results.filter((p) => p.price >= Number(min_price));
  }
  if (max_price !== undefined && max_price !== '') {
    results = results.filter((p) => p.price <= Number(max_price));
  }

  // Availability filter (SRCH-05)
  if (availability && availability !== 'all') {
    results = results.filter((p) => p.availability === availability);
  }

  // Seller filter
  if (seller) {
    results = results.filter(
      (p) =>
        p.seller_id === Number(seller) ||
        p.seller?.business_name.toLowerCase() === String(seller).toLowerCase()
    );
  }

  // Location filter (SRCH-03)
  if (location && location !== 'all') {
    results = results.filter((p) =>
      p.seller?.location.toLowerCase().includes(String(location).toLowerCase())
    );
  }

  // Sorting
  switch (sort) {
    case 'price_asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      results.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      break;
    case 'newest':
    default:
      results.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      break;
  }

  // Pagination (IF-04)
  const meta = createPaginationMeta(results.length, page, per_page);
  const offset = (meta.current_page - 1) * meta.per_page;
  const paginatedData = results.slice(offset, offset + meta.per_page);

  return {
    data: paginatedData,
    meta,
    links: {
      first: `?page=1`,
      last: `?page=${meta.last_page}`,
      prev: meta.current_page > 1 ? `?page=${meta.current_page - 1}` : null,
      next:
        meta.current_page < meta.last_page
          ? `?page=${meta.current_page + 1}`
          : null,
    },
  };
}

/**
 * Simulates API GET /orders role-scoped query.
 *
 * @param {Object} [params={}]
 * @param {Object} [userContext={ role: 'buyer', id: 6 }]
 * @returns {{ data: Array, meta: Object, links: Object }}
 */
export function queryMockOrders(
  params = {},
  userContext = { role: 'buyer', id: 6 }
) {
  const { status, search, page = 1, per_page = 20 } = params;

  let results = [...mockOrders];

  // Role scoping (SRS 4.4 GET /orders)
  if (userContext.role === 'buyer') {
    results = results.filter((o) => o.buyer_id === userContext.id);
  } else if (userContext.role === 'seller') {
    results = results.filter(
      (o) => o.seller_id === userContext.id || o.seller?.id === userContext.id
    );
  }
  // Admin sees all orders

  if (status && status !== 'all') {
    results = results.filter((o) => o.status === status);
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    results = results.filter(
      (o) =>
        o.order_number.toLowerCase().includes(term) ||
        o.checkout_ref.toLowerCase().includes(term) ||
        o.delivery_name.toLowerCase().includes(term)
    );
  }

  results.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const meta = createPaginationMeta(results.length, page, per_page);
  const offset = (meta.current_page - 1) * meta.per_page;

  return {
    data: results.slice(offset, offset + meta.per_page),
    meta,
    links: {
      first: `?page=1`,
      last: `?page=${meta.last_page}`,
      prev: meta.current_page > 1 ? `?page=${meta.current_page - 1}` : null,
      next:
        meta.current_page < meta.last_page
          ? `?page=${meta.current_page + 1}`
          : null,
    },
  };
}

/**
 * Root mock data bundle
 */
export const mockData = {
  categories: mockCategories,
  users: mockUsers,
  sellers: mockSellers,
  products: mockProducts,
  orders: mockOrders,
  settings: mockSettings,
  auditLogs: mockAuditLogs,
};

export default mockData;
