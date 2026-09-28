/**
 * Mock Audit Logs conforming to `audit_logs` table in vegetable_joint_schema.sql
 * Conforms to SRS ADM-07 and NFR-OBS-01.
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
    id: 5,
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
];

export default mockAuditLogs;
