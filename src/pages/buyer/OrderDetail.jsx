import { useParams, Link } from 'react-router-dom';

export function OrderDetail() {
  const { id } = useParams();

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div>
        <Link
          to="/account/orders"
          style={{
            color: '#15803d',
            textDecoration: 'none',
            fontSize: '0.85rem',
          }}
        >
          ← Back to All Orders
        </Link>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '1rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.4rem', color: '#1e293b', margin: 0 }}>
              Order #ORD-2026-00{id}
            </h1>
            <p
              style={{
                margin: '0.25rem 0 0 0',
                fontSize: '0.85rem',
                color: '#64748b',
              }}
            >
              SRS ref: ORD-02, ORD-07
            </p>
          </div>
          <span
            style={{
              backgroundColor: '#fef3c7',
              color: '#b45309',
              fontSize: '0.8rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              fontWeight: '600',
            }}
          >
            Status: Pending
          </span>
        </div>

        <div>
          <h2
            style={{
              fontSize: '1rem',
              color: '#334155',
              marginBottom: '0.75rem',
            }}
          >
            Ordered Items
          </h2>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              fontSize: '0.9rem',
            }}
          >
            <span>Fresh Ugwu (Fluted Pumpkin) x 2 bunches</span>
            <span style={{ fontWeight: '600' }}>₦2,400</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              fontSize: '0.9rem',
              color: '#64748b',
            }}
          >
            <span>Delivery Fee</span>
            <span>₦1,000</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              borderTop: '1px solid #f1f5f9',
              fontWeight: '700',
              fontSize: '1.1rem',
              color: '#15803d',
            }}
          >
            <span>Total</span>
            <span>₦3,400</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#f8fafc',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
          }}
        >
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
            Delivery Address:
          </strong>
          <p style={{ margin: 0, color: '#475569' }}>
            14 Alade Market Street, Ikeja, Lagos State (Phone: 08012345678)
          </p>
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;
