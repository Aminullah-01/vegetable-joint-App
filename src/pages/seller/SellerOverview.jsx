import { Link } from 'react-router-dom';

export function SellerOverview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
          Seller Overview (SEL-13)
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.25rem 0 0 0',
          }}
        >
          Welcome back to your vegetable store dashboard.
        </p>
      </div>

      {/* KPI Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <span
            style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}
          >
            Active Listings
          </span>
          <span
            style={{ fontSize: '1.75rem', fontWeight: '700', color: '#15803d' }}
          >
            8
          </span>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <span
            style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}
          >
            Pending Orders
          </span>
          <span
            style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f59e0b' }}
          >
            3
          </span>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <span
            style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}
          >
            Total Revenue
          </span>
          <span
            style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1e293b' }}
          >
            ₦142,500
          </span>
        </div>
      </div>

      {/* Action Quicklinks */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '1.5rem',
        }}
      >
        <h2
          style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '1rem' }}
        >
          Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            to="/seller/products/new"
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.6rem 1.2rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '0.9rem',
            }}
          >
            + Add New Vegetable
          </Link>
          <Link
            to="/seller/orders"
            style={{
              backgroundColor: '#f1f5f9',
              color: '#334155',
              padding: '0.6rem 1.2rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '0.9rem',
            }}
          >
            View Incoming Orders
          </Link>
          <Link
            to="/seller/inventory"
            style={{
              backgroundColor: '#f1f5f9',
              color: '#334155',
              padding: '0.6rem 1.2rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '0.9rem',
            }}
          >
            Manage Stock Levels
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SellerOverview;
