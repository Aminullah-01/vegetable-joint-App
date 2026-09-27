import { Link } from 'react-router-dom';

export function MyOrders() {
  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <h1 style={{ fontSize: '1.75rem', color: '#15803d', margin: 0 }}>
        My Orders (ORD-01)
      </h1>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#fafafa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
            Order History
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            1 active order
          </span>
        </div>

        <div
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <strong style={{ color: '#1e293b' }}>#ORD-2026-001</strong>
              <span
                style={{
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  fontWeight: '600',
                }}
              >
                Pending
              </span>
            </div>
            <p
              style={{
                margin: '0.25rem 0 0 0',
                fontSize: '0.85rem',
                color: '#64748b',
              }}
            >
              Placed on 25 Sep 2026 • 2 bunches Fresh Ugwu
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span
              style={{
                fontWeight: '700',
                color: '#15803d',
                fontSize: '1.05rem',
              }}
            >
              ₦3,400
            </span>
            <Link
              to="/account/orders/1"
              style={{
                backgroundColor: '#f1f5f9',
                color: '#334155',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: '500',
              }}
            >
              View Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyOrders;
