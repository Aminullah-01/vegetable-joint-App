export function AdminProducts() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
          Product Moderation (ADM-04)
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.25rem 0 0 0',
          }}
        >
          Moderate listings and ensure compliance with marketplace standards.
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
                <th style={{ padding: '0.75rem 1rem' }}>Listing</th>
                <th style={{ padding: '0.75rem 1rem' }}>Seller</th>
                <th style={{ padding: '0.75rem 1rem' }}>Price</th>
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
                  name: 'Fresh Ugwu',
                  seller: 'Ibrahim Agro Farms',
                  price: '₦1,200',
                  status: 'Approved',
                },
                {
                  id: 2,
                  name: 'Roma Tomatoes',
                  seller: 'Kano Fresh Produce',
                  price: '₦8,500',
                  status: 'Approved',
                },
              ].map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{p.seller}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{p.price}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {p.status}
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
                      Edit
                    </button>
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

export default AdminProducts;
