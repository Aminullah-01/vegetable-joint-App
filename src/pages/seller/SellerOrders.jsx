import { Link } from 'react-router-dom';

export function SellerOrders() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
          Seller Orders (SEL-10)
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.25rem 0 0 0',
          }}
        >
          Customer orders containing your listed vegetables.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div className="table-responsive">
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <th style={{ padding: '0.75rem 1rem' }}>Order Ref</th>
                <th style={{ padding: '0.75rem 1rem' }}>Customer</th>
                <th style={{ padding: '0.75rem 1rem' }}>Items</th>
                <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  id: 1,
                  ref: 'ORD-2026-001',
                  customer: 'Amina Bello',
                  items: '2 bunches Ugwu',
                  amount: '₦2,400',
                  status: 'Pending',
                },
              ].map((ord) => (
                <tr key={ord.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                    #{ord.ref}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{ord.customer}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{ord.items}</td>
                  <td
                    style={{
                      padding: '0.75rem 1rem',
                      fontWeight: '600',
                      color: '#15803d',
                    }}
                  >
                    {ord.amount}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        backgroundColor: '#fef3c7',
                        color: '#b45309',
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {ord.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <Link
                      to={`/seller/orders/${ord.id}`}
                      style={{
                        color: '#15803d',
                        textDecoration: 'none',
                        fontWeight: '500',
                        fontSize: '0.85rem',
                      }}
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SellerOrders;
