/**
 * Mock Seller Profiles conforming to `seller_profiles` table in vegetable_joint_schema.sql
 * Approval Statuses: 'approved' | 'pending' | 'rejected' | 'suspended'
 */
export const mockSellers = [
  {
    id: 1,
    user_id: 2,
    business_name: 'Arewa Fresh Farms',
    description:
      'Premier commercial vegetable grower based in Gombe. We supply premium Roma tomatoes, bell peppers, and fresh northern onions directly to consumers and restaurants.',
    location: 'Gombe',
    phone: '+2348031234567',
    approval_status: 'approved',
    rejection_reason: null,
    reviewed_by: 1,
    reviewed_at: '2026-01-11T10:00:00Z',
    average_rating: 4.8,
    rating_count: 36,
    total_products: 6,
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-11T10:00:00Z',
  },
  {
    id: 2,
    user_id: 3,
    business_name: 'Green Harvest Cooperative',
    description:
      'Farmers cooperative association cultivating organic leafy greens, spinach, fluted pumpkin (ugwu), cabbage, and fresh cucumbers in Kano & Kaduna.',
    location: 'Kano',
    phone: '+2348023456789',
    approval_status: 'approved',
    rejection_reason: null,
    reviewed_by: 1,
    reviewed_at: '2026-01-13T12:00:00Z',
    average_rating: 4.6,
    rating_count: 24,
    total_products: 5,
    created_at: '2026-01-12T09:30:00Z',
    updated_at: '2026-01-13T12:00:00Z',
  },
  {
    id: 3,
    user_id: 4,
    business_name: 'Jos Plateau Organic Farms',
    description:
      'High-altitude cool climate farming in Jos, Plateau State. Specialists in crisp carrots, Irish potatoes, fresh head lettuce, and green peas.',
    location: 'Plateau',
    phone: '+2348056789012',
    approval_status: 'approved',
    rejection_reason: null,
    reviewed_by: 1,
    reviewed_at: '2026-01-16T15:00:00Z',
    average_rating: 4.9,
    rating_count: 42,
    total_products: 4,
    created_at: '2026-01-15T11:00:00Z',
    updated_at: '2026-01-16T15:00:00Z',
  },
  {
    id: 4,
    user_id: 5,
    business_name: 'Danbatta Agro Ventures',
    description:
      'Smallholder farm group specializing in dry chili peppers and scotch bonnets awaiting platform onboarding verification.',
    location: 'Kano',
    phone: '+2348067890123',
    approval_status: 'pending',
    rejection_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    average_rating: 0,
    rating_count: 0,
    total_products: 0,
    created_at: '2026-02-18T14:20:00Z',
    updated_at: '2026-02-18T14:20:00Z',
  },
];

export default mockSellers;
