import { useParams, Link } from 'react-router-dom';

export function SellerOrderDetail() {
  const { id } = useParams();

  return (
    <div
      style={{
        maxWidth: '800px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div>
        <Link
          to="/seller/orders"
          style={{
            color: '#15803d',
            textDecoration: 'none',
            fontSize: '0.85rem',
          }}
        >
          ← Back to Orders
        </Link>
        <h1
          style={{
            fontSize: '1.75rem',
            color: '#1e293b',
            margin: '0.5rem 0 0 0',
          }}
        >
          Seller Order Management #{id} (SEL-10, SEL-11)
        </h1>
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
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '1rem',
          }}
        >
          <div>
            <strong style={{ fontSize: '1.1rem' }}>
              Order Reference: #ORD-2026-00{id}
            </strong>
            <p
              style={{
                margin: '0.25rem 0 0 0',
                color: '#64748b',
                fontSize: '0.85rem',
              }}
            >
              Customer: Amina Bello (08098765432)
            </p>
          </div>
          <select
            defaultValue="pending"
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              fontSize: '0.85rem',
              fontWeight: '600',
            }}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <h2
            style={{
              fontSize: '1rem',
              color: '#334155',
              marginBottom: '0.5rem',
            }}
          >
            Your Items in This Order:
          </h2>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              borderBottom: '1px solid #f8fafc',
            }}
          >
            <span>Fresh Ugwu (Fluted Pumpkin) × 2 bunches</span>
            <span style={{ fontWeight: '600' }}>₦2,400</span>
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
            Delivery Location:
          </strong>
          <p style={{ margin: 0, color: '#475569' }}>
            14 Alade Market Street, Ikeja, Lagos State
          </p>
        </div>
      </div>
    </div>
  );
}

export default SellerOrderDetail;
