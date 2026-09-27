export function AdminOrders() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
          Marketplace Orders Monitoring (ADM-06, ADM-07)
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.25rem 0 0 0',
          }}
        >
          Global monitoring of orders across all buyers and sellers.
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
              <th style={{ padding: '0.75rem 1rem' }}>Order</th>
              <th style={{ padding: '0.75rem 1rem' }}>Buyer</th>
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
                buyer: 'Aminu Abubakar',
                amount: '₦3,400',
                status: 'Pending',
              },
            ].map((ord) => (
              <tr key={ord.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                  #{ord.ref}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{ord.buyer}</td>
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
                  <button
                    type="button"
                    style={{
                      border: '1px solid #cbd5e1',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      backgroundColor: '#fff',
                    }}
                  >
                    Override
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminOrders;
