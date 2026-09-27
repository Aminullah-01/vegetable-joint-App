export function AdminSellers() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
          Seller Verification & Management (ADM-03)
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.25rem 0 0 0',
          }}
        >
          Approve or reject pending seller applications.
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
                <th style={{ padding: '0.75rem 1rem' }}>
                  Business / Farm Name
                </th>
                <th style={{ padding: '0.75rem 1rem' }}>Location</th>
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
                  name: 'Kano Fresh Produce',
                  location: 'Dawanau Market, Kano',
                  status: 'Pending Review',
                },
                {
                  id: 2,
                  name: 'Ibrahim Agro Farms',
                  location: 'Mile 12, Lagos',
                  status: 'Approved',
                },
              ].map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>
                    {s.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.location}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        backgroundColor:
                          s.status === 'Approved' ? '#dcfce7' : '#fef3c7',
                        color: s.status === 'Approved' ? '#15803d' : '#b45309',
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        fontWeight: '600',
                      }}
                    >
                      {s.status}
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
                      Review
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

export default AdminSellers;
