/**
 * Mock Audit Logs conforming to `audit_logs` table in vegetable_joint_schema.sql
 * Conforms to SRS ADM-09 and NFR-OBS-01.
 *
 * Events include:
 * - Security & Authentication (logins, failed logins)
 * - Role & Status Changes (user suspensions, seller approvals/rejections)
 * - Product Moderation (unpublishing, removals)
 * - Order Status Overrides
 * - Category Management
 * - Marketplace Settings Updates
 */
export const mockAuditLogs = [
  {
    id: 1,
    user_id: 1,
    action: 'seller.approved',
    entity_type: 'seller_profile',
    entity_id: 1,
    ip_address: '197.210.65.12',
    metadata: {
      business_name: 'Arewa Fresh Farms',
      reviewed_by: 'Platform Administrator',
    },
    created_at: '2026-01-11T10:00:00Z',
  },
  {
    id: 2,
    user_id: 1,
    action: 'seller.approved',
    entity_type: 'seller_profile',
    entity_id: 2,
    ip_address: '197.210.65.12',
    metadata: {
      business_name: 'Green Harvest Cooperative',
      reviewed_by: 'Platform Administrator',
    },
    created_at: '2026-01-13T12:00:00Z',
  },
  {
    id: 3,
    user_id: 1,
    action: 'seller.approved',
    entity_type: 'seller_profile',
    entity_id: 3,
    ip_address: '197.210.65.12',
    metadata: {
      business_name: 'Jos Plateau Organic Farms',
      reviewed_by: 'Platform Administrator',
    },
    created_at: '2026-01-16T15:00:00Z',
  },
  {
    id: 4,
    user_id: 1,
    action: 'category.created',
    entity_type: 'category',
    entity_id: 5,
    ip_address: '197.210.65.12',
    metadata: {
      name: 'Leafy Greens',
      slug: 'leafy-greens',
    },
    created_at: '2026-01-20T09:15:00Z',
  },
  {
    id: 5,
    user_id: null,
    action: 'auth.failed_login',
    entity_type: 'user',
    entity_id: null,
    ip_address: '102.89.23.44',
    metadata: {
      email: 'intruder@unknown.com',
      reason: 'Invalid credentials',
    },
    created_at: '2026-01-25T21:40:00Z',
  },
  {
    id: 6,
    user_id: 1,
    action: 'auth.login',
    entity_type: 'user',
    entity_id: 1,
    ip_address: '197.210.65.12',
    metadata: {
      method: 'password',
    },
    created_at: '2026-02-01T08:00:00Z',
  },
  {
    id: 7,
    user_id: 1,
    action: 'product.removed',
    entity_type: 'product',
    entity_id: 9,
    ip_address: '197.210.65.12',
    metadata: {
      name: 'Pesticide Treated Carrots',
      reason: 'Prohibited chemicals detected in listing report.',
    },
    created_at: '2026-02-05T11:30:00Z',
  },
  {
    id: 8,
    user_id: 1,
    action: 'user.suspended',
    entity_type: 'user',
    entity_id: 8,
    ip_address: '197.210.65.12',
    metadata: {
      reason: 'Repeated non-payment violation reported by sellers.',
    },
    created_at: '2026-02-10T16:00:00Z',
  },
  {
    id: 9,
    user_id: 1,
    action: 'settings.updated',
    entity_type: 'site_settings',
    entity_id: null,
    ip_address: '197.210.65.12',
    metadata: {
      keys_changed: ['support_text', 'contact_phone'],
    },
    created_at: '2026-02-15T09:40:00Z',
  },
  {
    id: 10,
    user_id: 1,
    action: 'seller.rejected',
    entity_type: 'seller_profile',
    entity_id: 5,
    ip_address: '197.210.65.12',
    metadata: {
      business_name: 'Musa Agro Ventures',
      reason: 'Missing CAC registration and farm verification documentation.',
    },
    created_at: '2026-02-20T14:10:00Z',
  },
  {
    id: 11,
    user_id: 1,
    action: 'order.status_override',
    entity_type: 'order',
    entity_id: 4,
    ip_address: '197.210.65.12',
    metadata: {
      order_number: 'ORD-2026-004',
      from_status: 'ready',
      to_status: 'cancelled',
      reason:
        'Buyer vehicle broke down; mutual agreement with seller to cancel.',
    },
    created_at: '2026-02-28T17:25:00Z',
  },
  {
    id: 12,
    user_id: 1,
    action: 'product.unpublished',
    entity_type: 'product',
    entity_id: 6,
    ip_address: '197.210.65.12',
    metadata: {
      name: 'Organic Cucumber',
      reason: 'Seasonal harvest paused; pending quality reinspection.',
    },
    created_at: '2026-03-02T13:45:00Z',
  },
  {
    id: 13,
    user_id: 2,
    action: 'auth.login',
    entity_type: 'user',
    entity_id: 2,
    ip_address: '105.112.98.54',
    metadata: {
      method: 'password',
    },
    created_at: '2026-03-05T07:50:00Z',
  },
  {
    id: 14,
    user_id: 1,
    action: 'category.deactivated',
    entity_type: 'category',
    entity_id: 4,
    ip_address: '197.210.65.12',
    metadata: {
      name: 'Exotic Herbs',
      is_active: false,
    },
    created_at: '2026-03-10T10:30:00Z',
  },
  {
    id: 15,
    user_id: 1,
    action: 'user.activated',
    entity_type: 'user',
    entity_id: 8,
    ip_address: '197.210.65.12',
    metadata: {
      name: 'Fatima Dangote',
      reason: 'Dispute resolved and buyer cleared with sellers.',
    },
    created_at: '2026-03-12T16:15:00Z',
  },
  {
    id: 16,
    user_id: 1,
    action: 'order.status_override',
    entity_type: 'order',
    entity_id: 2,
    ip_address: '197.210.65.12',
    metadata: {
      order_number: 'ORD-2026-002',
      from_status: 'ready',
      to_status: 'completed',
      reason: 'Manual proof of delivery verified via signed gate pass.',
    },
    created_at: '2026-03-15T11:00:00Z',
  },
  {
    id: 17,
    user_id: 1,
    action: 'settings.updated',
    entity_type: 'site_settings',
    entity_id: null,
    ip_address: '197.210.65.12',
    metadata: {
      keys_changed: ['site_name', 'footer_text'],
    },
    created_at: '2026-03-20T14:50:00Z',
  },
  {
    id: 18,
    user_id: 6,
    action: 'auth.login',
    entity_type: 'user',
    entity_id: 6,
    ip_address: '197.210.45.88',
    metadata: {
      method: 'password',
    },
    created_at: '2026-03-25T08:20:00Z',
  },
];

export default mockAuditLogs;
